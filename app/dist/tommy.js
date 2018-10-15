'use strict';

const fs = require('fs');
const sqlite3 = require('sqlite3').verbose();
const find = require('find');
const path = require('path');
const md5 = require('md5-file');
const objectAssignDeep = require('object-assign-deep');

const pkgDir = require('pkg-dir').sync();

const util = require(pkgDir + '/lib/util');
const processor = require(pkgDir + '/lib/processor');
const converter = require(pkgDir + '/lib/converter');
const uploader = require(pkgDir + '/lib/uploader');

// Global vars

exports.DB_FILENAME = '.tommy.db';
exports.VERSION = 'v1';

exports.config = require(pkgDir + '/config.json');

exports.db = null;
exports.__src = null;
exports.__dst = null;

function getFileHash(file) {
	const filepath = path.join(exports.__src, file);
	return exports.VERSION + '-' + exports.config.version + '-' + md5.sync(filepath);
}

async function createDatabase() {
	return new Promise(resolve => {
		const dbpath = path.join(exports.__dst, exports.DB_FILENAME);
		exports.db = new sqlite3.Database(dbpath);
		exports.db.run(
			'CREATE TABLE IF NOT EXISTS files (file VARCHAR(255) PRIMARY KEY, hash VARCHAR(64))',
			() => {
				resolve();
			}
		);
	});
}

async function indexFile(file) {
	return new Promise((resolve, reject) => {
		if (exports.config.force) return resolve(true);

		const fetch_stmt = exports.db.prepare('SELECT * FROM files WHERE file = ?');
		const hash = getFileHash(file);

		fetch_stmt.get([file], (err, row) => {
			if (err) return reject(err);
			if (row == null) return resolve(true);
			if (row.hash !== hash) return resolve(true);

			return resolve(false);
		});
	});
}

async function markFileAsProcessed(file) {
	return new Promise(resolve => {
		const insert_stmt = exports.db.prepare(
			'REPLACE INTO files (file, hash) VALUES (?, ?)'
		);
		const hash = getFileHash(file);
		insert_stmt.run([file, hash], resolve);
	});
}

async function indexFiles() {
	return new Promise(resolve => {
		let files_to_process = [];
		find.file(exports.__src, async files => {
			for (let filepath of files) {

				// Ignore our DB directory
				if (filepath === path.join(exports.__src, exports.DB_FILENAME)) continue;

				if (exports.config.ignore.indexOf(path.basename(filepath)) >= 0) {
					console.debug(`Ignoring <${filepath}>`);
					continue;
				}

				const file = filepath.replace(exports.__src, '');

				let should_process = await indexFile(file);
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

async function copyFile(file) {
	const dir = path.dirname(file);
	const filepath = path.join(__src, file);
	const filename = path.basename(file);
	const dst_dir = path.join(__dst, dir);
	const dst_file = path.join(dst_dir, filename);

	console.debug(`Copying to <${dst_file}>`);

	// Create directory of file
	await util.execPromise(`/bin/mkdir -p "${dst_dir}"`);
	await util.execPromise(`/bin/cp "${filepath}" "${dst_file}"`);

	return dst_file;
}

async function processFiles(files) {
	return new Promise(async (resolve, reject) => {
		const processed_files = [];
		for (let file of files) {
			try {
				console.info(`Processing <${file}>`);
				console.group(file);

				const filepath = await copyFile(file);

				if (/\.(jpg|jpeg|png)$/i.test(filepath)) {
					let format = /\.png$/.test(filepath) ? 'PNG' : 'JPG';

					const resized_files = await processor.resize(filepath);
					for (let e of (resized_files || [])) {
						await processor[format](e);
					}

					await processor.image(filepath);
					await processor[format](filepath);

					const webp_file = await converter.toWEBP(filepath);
					if (webp_file) {
						await processor.resize(webp_file);
					}

					await processor.lazyLoadBlurried(filepath);

				} else if (/\.gif$/i.test(filepath)) {
					await processor.GIF(filepath);

				} else if (/\.svg$/i.test(filepath)) {
					await processor.SVG(filepath);

				} else if (/\.(mov|avi|m4v|3gp|m2v|ogg)$/i.test(filepath)) {
					await converter.toMP4(filepath);
					await converter.toWEBM(filepath);
					await processor.poster(filepath);
					await processor.videoThumbs(filepath);

				} else if (/\.(mp4)$/i.test(filepath)) {
					await converter.toWEBM(filepath);
					await processor.poster(filepath);
					await processor.videoThumbs(filepath);

				} else if (/\.(ogg|wav|aif|ac3|aac)$/i.test(filepath)) {
					await converter.toMP3(filepath);

				}

				console.groupEnd();
				console.info(`Successfully processed <${file}>`);

				await markFileAsProcessed(file);
				processed_files.push(file);

			} catch (err) {
				console.groupEnd();
				console.error(`Error in processing ${file}: ${err.message}`);
			}

		}
		resolve(processed_files);
	});
}

// Init

exports.run = async function main(src, dst, config, force) {

	try {

		if (src == null) {
			throw new Error('Set --src as input source directory');
		}
		exports.__src = fs.realpathSync(src);

		if (dst == null) {
			throw new Error('Set --dst as output source directory');
		}
		exports.__dst = fs.realpathSync(dst);

		if (config != null) {
			console.info(`Extending configuration with file <${config}>`);
			exports.config = objectAssignDeep(
				exports.config,
				require(fs.realpathSync(config))
			);
		}

		if (force) {
			exports.config.force = true;
		}

		console.dir(exports.config);

		if (exports.config.remoteSync) {
			console.info('Syncing from remote...');
			await uploader.syncFromRemote(exports.config.s3Bucket);
		}

		console.info('Opening database...');
		await createDatabase();

		console.info('Indexing files...');
		let files = await indexFiles();

		console.info('Processing files...');
		let processed_files = await processFiles(files);

		if (exports.config.remoteSync) {
			console.info('Syncing to remote...');
			await uploader.syncToRemote(exports.config.s3Bucket);
		}

		console.info('Done');
		process.exit(0);

	} catch (err) {
		console.error(err);
		process.exit(err.code || 1);
	}

};
