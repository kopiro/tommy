#!/usr/bin/env node

require("console-ultimate/global").replace();

const fs = require("fs");
const exec = require("child_process").exec;
const sqlite3 = require("sqlite3").verbose();
const find = require("find");
const path = require("path");
const md5 = require("md5-file");
const sizeOf = require("image-size");
const argv = require('yargs').argv

const DB_FILEPATH = ".tommy.db";

let config = require("./config.json");

let db;
let __src;
let __dst;

function getExtension(filename) {
	return filename
		.split(".")
		.slice(0, -1)
		.join(".");
}

async function execPromise(command) {
	return new Promise((resolve, reject) => {
		console.debug(command);
		exec(command, {}, (err, stdout, stderr) => {
			if (err) return reject(stderr);
			return resolve(stdout);
		});
	});
}

function getFileHash(file) {
	const filepath = path.join(__src, file);
	return config.version + '-' + md5.sync(filepath);
}

async function createDatabase() {
	return new Promise(resolve => {
		const dbpath = path.join(__src, DB_FILEPATH);
		console.info(`Opening database <${dbpath}>`);
		db = new sqlite3.Database(dbpath);
		db.run(
			'CREATE TABLE IF NOT EXISTS files (file VARCHAR(255) PRIMARY KEY, hash VARCHAR(32))',
			() => {
				resolve();
			}
		);
	});
}

async function indexFile(file) {
	return new Promise((resolve, reject) => {
		const fetch_stmt = db.prepare('SELECT * FROM files WHERE file = ?');
		const hash = getFileHash(file);

		fetch_stmt.get([file], (err, row) => {
			if (err) return reject(err);
			if (row == null || row.hash !== hash) {
				return resolve(true);
			}

			return resolve(false);
		});
	});
}

async function markFileAsProcessed(file) {
	return new Promise(resolve => {
		const insert_stmt = db.prepare(
			'REPLACE INTO files (file, hash) VALUES (?, ?)'
		);
		const hash = getFileHash(file);
		insert_stmt.run([file, hash], resolve);
	});
}

async function indexFiles() {
	return new Promise(resolve => {
		let files_to_process = [];
		find.file(__src, async files => {
			for (let filepath of files) {

				// Ignore our DB directory
				if (filepath === path.join(__src, DB_FILEPATH)) continue;

				if (config.ignore.indexOf(path.basename(filepath)) >= 0) {
					console.debug(`Ignoring <${filepath}>`);
					continue;
				}

				const file = filepath.replace(__src, '');

				let should_process = await indexFile(file);
				if (!should_process) continue;

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

	console.debug(`Copying <${filepath}> to <${dst_file}>`);

	// Create directory of file
	await execPromise(`/bin/mkdir -p "${dst_dir}"`);
	await execPromise(`/bin/cp -v "${filepath}" "${dst_file}"`);

	return dst_file;
}

async function copyFiles(files) {
	return new Promise(async resolve => {
		for (let file of files) {
			await copyFile(file);
		}
		resolve();
	});
}

async function processFiles(files) {
	return new Promise(async (resolve, reject) => {
		const processed_files = [];
		for (let file of files) {
			try {
				console.info(`Processing <${file}>`);

				const filepath = await copyFile(file);

				if (/\.(jpg|jpeg)$/i.test(filepath)) {
					const resized_files = await resizeImage(filepath);
					for (let e of resized_files) {
						await processJPG(e);
					}

					await processImage(filepath);
					await processJPG(filepath);

					const webp_file = await convertToWEBP(filepath);
					await resizeImage(webp_file);

				} else if (/\.png$/i.test(filepath)) {
					const resized_files = await resizeImage(filepath);
					for (let e of resized_files) {
						await processPNG(e);
					}

					await processImage(filepath);
					await processPNG(filepath);

					const webp_file = await convertToWEBP(filepath);
					await resizeImage(webp_file);

				} else if (/\.gif$/i.test(filepath)) {
					await processGIF(filepath);

				} else if (/\.svg$/i.test(filepath)) {
					await processSVG(filepath);

				} else if (/\.(mov|avi|m4v|3gp|m2v|ogg)$/i.test(filepath)) {
					await convertToMP4(filepath);
					await convertToWEBM(filepath);
					await extractPoster(filepath);

				} else if (/\.(mp4)$/i.test(filepath)) {
					await convertToWEBM(filepath);
					await extractPoster(filepath);

				}

				console.info(`Successfully processed <${file}>`);

				await markFileAsProcessed(file);
				processed_files.push(file);
			} catch (err) {
				console.error(`Error in processing ${file}: ${err}`);
			}
		}
		resolve(processed_files);
	});
}

async function resizeImage(filepath) {
	const resized_images = [];

	const size = sizeOf(filepath);
	const largest_side = Math.max(size.width, size.height);

	for (let px of config.resize) {
		if (px < largest_side) {
			const dst_path = filepath.replace(/\.(.+)$/g, `-resized-${px}.$1`);
			console.debug(`Resizing image <${filepath}> to <${dst_path}>`);

			try {
				await execPromise(
					`convert "${filepath}" -strip -quality 80 -resize "${px}^>" "${dst_path}"`
				);
				resized_images.push(dst_path);
			} catch (err) {
				console.error(`Error during resizing to ${px} of <${filepath}>`);
			}
		} else {
			console.debug(
				`Skipping resizing to ${px} of <${filepath}> because ${px} is greater than image largest side (${largest_side})`
			);
		}
	}

	return resized_images;
}

async function processImage(filepath) {
	const dst_path = filepath;
	console.debug(`Stripping image <${filepath}>`);
	await execPromise(`convert "${filepath}" -strip -quality 80 "${dst_path}"`);
	return dst_path;
}

async function processJPG(filepath) {
	const dst_path = filepath;
	console.debug(`Optimizing JPEG <${filepath}>`);
	await execPromise(`jpegoptim "${filepath}"`);
	return dst_path;
}

async function processPNG(filepath) {
	const dst_path = filepath;
	console.debug(`Optimizing PNG <${filepath}>`);
	await execPromise(`pngquant --ext .png --force "${filepath}"`);
	return dst_path;
}

async function processGIF(filepath) {
	const dst_path = filepath;
	console.debug(`Optimizing GIF <${filepath}>`);
	await execPromise(`gifsicle -O2 "${filepath}" -f -o "${dst_path}"`);
	return dst_path;
}

async function overwriteProtection(filepath, dst_path) {
	const src_path = dst_path.replace(__dst, __src);
	if (fs.existsSync(src_path)) {
		throw new Error(
			`Unable to convert <${filepath}> because original <${src_path}> will be overwritten`
		);
	}
	return true;
}

async function convertToWEBP(filepath) {
	const dst_path = filepath.replace(/\..+$/g, '.webp');
	await overwriteProtection(filepath, dst_path);

	console.debug(`Converting to WEBP <${filepath}>`);
	await execPromise(`cwebp \
	"${filepath}" \
	-o "${dst_path}"`);
	return dst_path;
}

async function convertToMP4(filepath) {
	const dst_path = filepath.replace(/\..+$/g, '.mp4');
	await overwriteProtection(filepath, dst_path);

	console.debug(`Converting to MP4 <${filepath}>`);
	await execPromise(`ffmpeg -y \
      -i "${filepath}" \
      -preset fast \
      "${dst_path}" \
		-hide_banner`);
	return dst_path;
}

async function convertToWEBM(filepath) {
	const dst_path = filepath.replace(/\..+$/g, '.webm');
	await overwriteProtection(filepath, dst_path);

	console.debug(`Converting to WEBM <${filepath}>`);
	await execPromise(`ffmpeg -y \
      -i "${filepath}" \
      -preset fast \
      "${dst_path}" \
		-hide_banner`);
	return dst_path;
}

async function extractPoster(filepath) {
	const dst_path = filepath.replace(/\..+$/g, '-poster.jpg');

	console.debug(`Extracting poster of <${filepath}> to <${dst_path}>`);
	await execPromise(`ffmpeg -y \
	-i "${filepath}" \
	-vframes 1 \
	-f image2 \
	"${dst_path}"`);

	await processImage(dst_path);
	await processJPG(dst_path);
	await convertToWEBP(dst_path);

	return dst_path;
}

async function processSVG(filepath) {
	const dst_path = filepath;

	console.debug(`Optimizing SVG <${filepath}>`);
	await execPromise(`svgo \
	"${filepath}" \
	-o "${dst_path}"`);

	return dst_path;
}

// Init

(async function main() {

	try {

		if (argv.src == null) {
			throw new Error('Set --src as input source directory');
		}

		if (argv.dst == null) {
			throw new Error('Set --dst as output source directory');
		}

		__src = fs.realpathSync(argv.src);
		__dst = fs.realpathSync(argv.dst);

		if (argv.config != null) {
			console.info(`Extending configuration with file <${argv.config}>`);
			config = Object.assign(
				config,
				require(argv.config)
			);
		}

		await createDatabase();

		console.info('Indexing files...');
		let files = await indexFiles();

		console.info('Processing files...');
		let processed_files = await processFiles(files);

		process.exit(0);

	} catch (err) {
		console.error(err.message);
		process.exit(err.code || 1);
	}

})();