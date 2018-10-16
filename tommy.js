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
		this.db = null;
	}

	getFileHash(file) {
		const filepath = path.join(this.src, file);
		return VERSION + '-' + this.config.version + '-' + md5.sync(filepath);
	}

	async createDatabase() {
		return new Promise(resolve => {
			if (this.db != null) return resolve();

			const dbpath = path.join(this.dst, DB_FILENAME);
			this.db = new sqlite3.Database(dbpath);

			this.db.run(
				'CREATE TABLE IF NOT EXISTS files (file VARCHAR(255) PRIMARY KEY, hash VARCHAR(64))',
				() => {
					resolve();
				}
			);
		});
	}

	async indexFile(file) {
		return new Promise((resolve, reject) => {
			if (this.force) return resolve(true);

			const fetch_stmt = this.db.prepare('SELECT * FROM files WHERE file = ?');
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
		return new Promise(resolve => {
			const insert_stmt = this.db.prepare(
				'REPLACE INTO files (file, hash) VALUES (?, ?)'
			);
			const hash = this.getFileHash(file);
			insert_stmt.run([file, hash], resolve);
		});
	}

	async indexFiles() {
		return new Promise(resolve => {
			let files_to_process = [];
			find.file(this.src, async files => {
				for (let filepath of files) {

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
		await util.execPromise(`/bin/mkdir -p "${dst_dir}"`);
		await util.execPromise(`/bin/cp "${filepath}" "${dst_file}"`);

		return dst_file;
	}

	async processFiles(files) {
		return new Promise(async (resolve, reject) => {
			const processed_files = [];

			for (let file of files) {
				try {
					console.info(`Processing <${file}>`);
					console.group(file);

					const filepath = await this.copyFile(file);

					if (/\.(jpg|jpeg|png)$/i.test(filepath)) {
						let format = /\.png$/.test(filepath) ? 'PNG' : 'JPG';

						const resized_files = await processor.resize(this, filepath);
						for (let e of (resized_files || [])) {
							await processor[format.toUpperCase()](this, e);
						}

						await processor.image(this, filepath);
						await processor[format.toUpperCase()](this, filepath);

						const webp_file = await converter.toWEBP(this, filepath);
						if (webp_file) {
							await processor.resize(this, webp_file);
						}

						await processor.lazyLoadBlurried(this, filepath);

						await tester.image(this, filepath, format.toLowerCase());

					} else if (/\.gif$/i.test(filepath)) {
						await processor.GIF(this, filepath);

					} else if (/\.svg$/i.test(filepath)) {
						await processor.SVG(this, filepath);

					} else if (/\.(mov|avi|m4v|3gp|m2v|ogg)$/i.test(filepath)) {
						await converter.toMP4(this, filepath);
						await converter.toWEBM(this, filepath);
						await processor.poster(this, filepath);
						await processor.videoThumbs(this, filepath);

						await tester.video(this, filepath);

					} else if (/\.(mp4)$/i.test(filepath)) {
						await converter.toWEBM(this, filepath);
						await processor.poster(this, filepath);
						await processor.videoThumbs(this, filepath);

						await tester.video(this, filepath);

					} else if (/\.(ogg|wav|aif|ac3|aac)$/i.test(filepath)) {
						await converter.toMP3(this, filepath);

						await tester.audio(this, filepath);

					} else if (/\.(ttf)$/i.test(filepath)) {
						await converter.toOTF(this, filepath);
						await converter.toSVG(this, filepath);
						await converter.toEOT(this, filepath);
						await converter.toWOFF(this, filepath);
						await converter.toWOFF2(this, filepath);
						await tester.font(this, filepath);

					} else if (/\.(otf)$/i.test(filepath)) {
						await converter.toTTF(this, filepath);
						await converter.toSVG(this, filepath);
						await converter.toEOT(this, filepath);
						await converter.toWOFF(this, filepath);
						await converter.toWOFF2(this, filepath);
						await tester.font(this, filepath);

					}

					console.groupEnd();
					console.info(`Successfully processed <${file}>`);

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

		if (this.config.remoteSync == true) {
			console.info('Syncing from remote...');
			await uploader.syncFromRemote(this.config.s3Bucket);
		}

		console.info('Opening database...');
		await this.createDatabase();

		console.info('Indexing files...');
		let files = await this.indexFiles();

		console.info('Processing files...');
		let processed_files = await this.processFiles(files);

		if (this.config.remoteSync == true) {
			console.info('Syncing to remote...');
			await uploader.syncToRemote(this.config.s3Bucket);
		}

		this.db.close();

		console.info('Done');
		return processed_files;
	}
}

module.exports = Tommy;