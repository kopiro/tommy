const fs = require('fs');
const sqlite3 = require('sqlite3');
const find = require('find');
const path = require('path');
const md5 = require('md5-file');
const objectAssignDeep = require('object-assign-deep');

const util = require('./lib/util');
const processor = require('./lib/processor');
const converter = require('./lib/converter');
const uploader = require('./lib/uploader');
const tester = require('./lib/tester');

// Global vars

const DB_FILENAME = '.tommy.db';
const VERSION = 'v1';

class Tommy {

	constructor(src, dst, config = null, force = false) {
		this.src = src;
		this.dst = dst;
		this.config = objectAssignDeep(
			require('./config.json'),
			config || {}
		);
		this.force = force;
	}

	getFileHash(file) {
		const filepath = path.join(this.src, file);
		return VERSION + '-' + this.config.version + '-' + md5.sync(filepath);
	}

	async createDatabase() {
		return new Promise((resolve, reject) => {
			if (Tommy.db) return resolve();

			try {
				Tommy.db = new sqlite3.Database(path.join(this.dst, DB_FILENAME));
			} catch (err) {
				return reject(err);
			}

			Tommy.db.run('CREATE TABLE IF NOT EXISTS files (file VARCHAR(255) PRIMARY KEY, hash VARCHAR(64))', (err) => {
				if (err) return reject(err);
				Tommy.db.run('CREATE TABLE IF NOT EXISTS outputs (file VARCHAR(255), hash VARCHAR(64), ts NUMBER, output VARCHAR(255), PRIMARY KEY (file, output))', (err) => {
					if (err) return reject();
					resolve();
				});
			});
		});
	}

	async getOutputs() {
		return new Promise((resolve, reject) => {
			const fetch_stmt = Tommy.db.prepare('SELECT * FROM outputs');

			fetch_stmt.all([], (err, rows) => {
				if (err) return reject(err);
				return resolve(rows);
			});
		});
	}

	async indexFile(file) {
		return new Promise((resolve, reject) => {
			if (this.force) return resolve(true);

			const fetch_stmt = Tommy.db.prepare('SELECT * FROM files WHERE file = ?');
			const hash = this.getFileHash(file);

			fetch_stmt.get([file], (err, row) => {
				if (err) return reject(err);
				if (row == null) return resolve(true);
				if (row.hash !== hash) return resolve(true);

				return resolve(false);
			});
		});
	}

	async markFileAsProcessed(file) {
		const insert_stmt = Tommy.db.prepare('REPLACE INTO files (file, hash) VALUES (?, ?)');
		return this.runStatement(insert_stmt, [file, this.getFileHash(file)]);
	}

	async indexFiles() {
		return new Promise(async resolve => {
			let files_to_process = [];
			for (let filepath of find.fileSync(this.src)) {

				// Ignore our DB directory
				if (filepath === path.join(this.src, DB_FILENAME)) continue;

				if (this.config.ignore.indexOf(path.basename(filepath)) >= 0) {
					console.debug(`Ignoring <${filepath}>`);
					continue;
				}

				const file = filepath.replace(this.src, '');

				let should_process = await this.indexFile(file);
				if (!should_process) {
					console.debug(`Already processed <${filepath}>`);
					continue;
				}

				console.debug(`Adding to file list <${filepath}>`);
				files_to_process.push(file);
			}

			resolve(files_to_process);
		});
	}

	async copyFile(file) {
		const dir = path.dirname(file);
		const filepath = path.join(this.src, file);
		const filename = path.basename(file);
		const dst_dir = path.join(this.dst, dir);
		const dst_file = path.join(dst_dir, filename);

		console.debug(`Copying to <${dst_file}>`);

		// Create directory of file
		await util.execPromise(`mkdir -p "${dst_dir}"`);
		await util.execPromise(`cp "${filepath}" "${dst_file}"`);

		return dst_file;
	}

	async runStatement(stmt, data) {
		return new Promise((resolve, reject) => {
			stmt.run(data, (err, result) => {
				if (err) return reject(err);
				return resolve(result);
			});
		});
	}

	async appendToOutput(file, output) {
		if (output == false || output == null) return;
		if (typeof output === 'string') output = [output];

		return new Promise(async resolve => {
			const stmt = Tommy.db.prepare('REPLACE INTO outputs (file, hash, ts, output) VALUES (?, ?, ?, ?)');
			for (let e of output) {
				try {
					await this.runStatement(stmt, [file, this.getFileHash(file), Date.now(), e.replace(this.dst, '')]);
				} catch (err) {
					console.error(err);
				}
			}
			resolve();
		});
	}

	async deleteDstFile(e) {
		console.log(`Deleting file <${e}>`);
		const full_path = path.join(this.dst, e);

		if (fs.existsSync(full_path)) {
			fs.unlinkSync(full_path);
		}

		await this.runStatement(Tommy.db.prepare('DELETE FROM outputs WHERE output = ?'), [e]);

		return true;
	}

	async cleanDst() {
		const files = find.fileSync(this.src).map(filepath => filepath.replace(this.src, ''));
		const outputs = await this.getOutputs();

		// Remove from outputs all files that are yet present in files
		for (let file of files) {
			let i = outputs.length;
			while (i--) {
				if (outputs[i].file === file) {
					outputs.splice(i, 1);
				}
			}
		}

		// So remaining files are to delete :)
		for (let e of outputs) {
			try {
				await this.deleteDstFile(e.output);
			} catch (err) {
				console.error(`Error while removing file <${e.output}>`, err);
			}
		}
	}

	async processFiles(files) {
		return new Promise(async (resolve, reject) => {
			const processed_files = [];

			for (let file of files) {
				try {
					console.info(`Processing <${file}>`);
					console.group(file);

					const filepath = await this.copyFile(file);
					const extension = util.getExtension(file);
					await this.appendToOutput(file, filepath);

					if (/\.(jpg|jpeg|png)$/i.test(filepath)) {
						const format = /\.png$/.test(filepath) ? 'png' : 'jpg';

						const images_resized = await processor.resize(this, filepath);
						await this.appendToOutput(file, images_resized);

						const image_processed = await processor.image(this, filepath);
						await this.appendToOutput(file, image_processed);

						const image_optimized = await processor[format.toUpperCase()](this, filepath);
						await this.appendToOutput(file, image_optimized);

						const image_webp = await converter.toWEBP(this, filepath);
						await this.appendToOutput(file, image_webp);

						const images_webp_resized = await processor.resize(this, image_webp);
						await this.appendToOutput(file, images_webp_resized);

						const lazy_load_blurred_image = await processor.lazyLoadBlurried(this, filepath);
						await this.appendToOutput(file, lazy_load_blurred_image);

						const test_image = await tester.image(this, filepath, format.toLowerCase());
						await this.appendToOutput(file, test_image);

					} else if (/\.gif$/i.test(filepath)) {
						const image_optimized = await processor.GIF(this, filepath);
						await this.appendToOutput(file, image_optimized);

					} else if (/\.svg$/i.test(filepath)) {
						const image_optimized = await processor.SVG(this, filepath);
						await this.appendToOutput(file, image_optimized);

					} else if (/\.(mov|avi|m4v|3gp|m2v|ogg|mp4)$/i.test(filepath)) {
						for (let format of ['mp4', 'webm']) {
							if (extension.toLowerCase() != format) {
								const video_converted = await converter['to' + format.toUpperCase()](this, filepath);
								await this.appendToOutput(file, video_converted);
							}
						}

						const video_poster = await processor.poster(this, filepath);
						await this.appendToOutput(file, video_poster);

						const video_thumbs = await processor.videoThumbs(this, filepath);
						await this.appendToOutput(file, video_thumbs);

						const test_video = await tester.video(this, filepath);
						await this.appendToOutput(file, test_video);

					} else if (/\.(ogg|wav|aif|ac3|aac)$/i.test(filepath)) {
						const audio_mp3 = await converter.toMP3(this, filepath);
						await this.appendToOutput(file, audio_mp3);

					} else if (/\.(ttf|otf)$/i.test(filepath)) {
						for (let format of ['TTF', 'OTF', 'SVG', 'EOT', 'WOFF', 'WOFF2']) {
							if (extension.toLowerCase() != format) {
								const font_converted = await converter['to' + format.toUpperCase()](this, filepath);
								await this.appendToOutput(file, font_converted);
							}
						}

						const test_font = await tester.font(this, filepath);
						await this.appendToOutput(file, test_font);
					}

					console.groupEnd();

					await this.markFileAsProcessed(file);
					processed_files.push(file);

				} catch (err) {
					console.groupEnd();
					console.error(`Error in processing ${file}`, err);
				}

			}

			resolve(processed_files);
		});
	}

	// Init

	async run() {
		if (this.src == null) {
			throw new Error('Set --src as input source directory');
		}
		this.src = fs.realpathSync(this.src);

		if (this.dst == null) {
			throw new Error('Set --dst as output source directory');
		}
		this.dst = fs.realpathSync(this.dst);

		if (this.src === this.dst) {
			throw new Error('Codardly refusing to run when SRC directory is equal to DST');
		}

		if (this.config.remoteSync == true) {
			console.info('Syncing from remote...');
			await uploader.syncFromRemote(this.config.s3Bucket);
		}

		console.info('Opening database...');
		await this.createDatabase();

		console.info('Cleaning deleted files...');
		await this.cleanDst();

		console.info('Indexing files...');
		let files = await this.indexFiles();

		console.info('Processing files...');
		let processed_files = await this.processFiles(files);

		if (this.config.remoteSync == true) {
			console.info('Syncing to remote...');
			await uploader.syncToRemote(this.config.s3Bucket);
		}

		console.info('Done');
		return processed_files;
	}
}

module.exports = Tommy;