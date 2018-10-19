const fs = require('fs');
const sqlite3 = require('sqlite3');
const find = require('find');
const path = require('path');
const md5 = require('md5-file');
const objectAssignDeep = require('object-assign-deep');
const chokidar = require('chokidar');

const util = require('./lib/util');
const processor = require('./lib/processor');
const converter = require('./lib/converter');
const uploader = require('./lib/uploader');
const tester = require('./lib/tester');

const runnables = {
	'processor': processor,
	'converter': converter,
	'tester': tester
};

// Global vars

const DB_FILENAME = '.tommy.db';
const TABLE_VERSION = 'v1';
const TABLE_NAME = `outputs_${TABLE_VERSION}`;

class Tommy {

	constructor(src, dst, config = null, force = false, watch = false) {
		this.src = src;
		this.dst = dst;
		this.config = objectAssignDeep(
			require('./config.json'),
			config || {}
		);
		this.force = force;
		this.watch = watch;
	}

	getRunnableConfig(runnable_key) {
		return this.config[runnable_key] || {};
	}

	getRunnableAlgoVersion(runnable_key) {
		const r = runnable_key.split('.');
		return (runnables[r[0]][r[1]]).ALGO_VERSION;
	}

	getFileHash(file) {
		return md5.sync(this.getSrcFilePath(file));
	}

	async createDatabase() {
		return new Promise((resolve, reject) => {
			if (Tommy.db) return resolve();

			console.info('Creating database...');

			const dbpath = path.join(this.dst, DB_FILENAME);

			try {
				Tommy.db = new sqlite3.Database(dbpath);
			} catch (err) {
				return reject(err);
			}

			Tommy.db.run(`
			CREATE TABLE IF NOT EXISTS ${TABLE_NAME} (
				input_file VARCHAR(255), 
				input_hash VARCHAR(64), 
				run_at NUMBER, 
				output_files VARCHAR(255),
				runnable_key VARCHAR(32),
				runnable_algo_version VARCHAR(8),
				runnable_config TEXT,
				PRIMARY KEY (input_file, runnable_key) 
			)`, (err) => {
				if (err) return reject();
				resolve();
			});
		});
	}

	mapOutput(row) {
		row.output_files = JSON.parse(row.output_files);
		if (typeof row.output_files === 'string') row.output_files = [row.output_files];
		return row;
	}

	async getOutputByInputFileAndRunnableKey(input_file, runnable_key) {
		return new Promise((resolve, reject) => {
			const fetch_stmt = Tommy.db.prepare(`SELECT * FROM ${TABLE_NAME} WHERE input_file = ? AND runnable_key = ?`);

			fetch_stmt.get([input_file, runnable_key], (err, row) => {
				if (err) return reject(err);
				if (row == null) return resolve(null);
				return resolve(this.mapOutput(row));
			});
		});
	}

	async getOutputsByInputFile(input_file) {
		return new Promise((resolve, reject) => {
			const fetch_stmt = Tommy.db.prepare(`SELECT * FROM ${TABLE_NAME} WHERE input_file = ?`);

			fetch_stmt.all([input_file], (err, rows) => {
				if (err) return reject(err);
				return resolve(rows.map(this.mapOutput));
			});
		});
	}

	async getAllOutputs() {
		return new Promise((resolve, reject) => {
			const fetch_stmt = Tommy.db.prepare(`SELECT * FROM ${TABLE_NAME}`);

			fetch_stmt.all([], (err, rows) => {
				if (err) return reject(err);
				return resolve(rows.map(this.mapOutput));
			});
		});
	}

	async indexFiles() {
		let files = [];
		for (let filepath of find.fileSync(this.src)) {
			if (this.config.ignore.indexOf(path.basename(filepath)) >= 0) {
				console.debug(`Ignoring <${filepath}>`);
				continue;
			}

			// console.debug(`Adding to file list <${filepath}>`);
			files.push(this.getCleanFileName(filepath));
		}

		return files;
	}

	getSrcFilePath(file) {
		return path.join(this.src, file);
	}

	getDstFilePath(file) {
		return path.join(this.dst, file);
	}

	getCleanFileName(filepath) {
		return filepath.replace(this.src, '').replace(this.dst, '');
	}

	async runDbStatement(stmt, data) {
		return new Promise((resolve, reject) => {
			stmt.run(data, (err, result) => {
				if (err) return reject(err);
				return resolve(result);
			});
		});
	}

	async saveOutput({
		input_file,
		input_hash,
		output_files,
		runnable_key,
		runnable_algo_version,
		runnable_config
	}) {
		return new Promise(async resolve => {
			if (!output_files) {
				return resolve(false);
			}

			// Wrap everything in an array
			if (typeof output_files === 'string') output_files = [output_files];
			output_files = output_files.map(e => this.getCleanFileName(e));

			await this.runDbStatement(
				Tommy.db.prepare(`DELETE FROM ${TABLE_NAME} WHERE input_file = ? AND runnable_key = ?`),
				[input_file, runnable_key]
			);

			try {
				await this.runDbStatement(Tommy.db.prepare(`
				INSERT INTO ${TABLE_NAME} 
				(input_file, input_hash, run_at, output_files, runnable_key, runnable_algo_version, runnable_config) 
				VALUES 
				(?, 			 ?, 			 ?, 		?,				 ?,		  ?,							 ?)
				`), [
					input_file,
					input_hash,
					Date.now(),
					JSON.stringify(output_files),
					runnable_key,
					runnable_algo_version,
					JSON.stringify(runnable_config)
				]);
			} catch (err) {
				console.error(err);
			}

			resolve(true);
		});
	}

	async deleteDstFile(file) {
		console.log(`Deleting file <${file}>`);
		const dst_path = this.getDstFilePath(file);

		if (fs.existsSync(dst_path)) {
			fs.unlinkSync(dst_path);
		}

		return true;
	}

	async cleanOutput(row) {
		if (row == null) return;

		try {
			for (let file of row.output_files) {
				await this.deleteDstFile(file);
			}

			await this.runDbStatement(Tommy.db.prepare(`DELETE FROM ${TABLE_NAME} WHERE input_file = ? AND runnable_key = ?`), [
				row.input_file,
				row.runnable_key
			]);
		} catch (err) {
			console.error(`Error while cleaning output for <${row.input_file}, ${row.runnable_key}>`, err);
		}
	}

	async cleanOutputByInputFile(input_file) {
		const rows = await this.getOutputsByInputFile(input_file);
		for (let row of rows) {
			await this.cleanOutput(row);
		}
	}

	async cleanDstDirectory(files, outputs) {
		// Remove from outputs all files that are yet present in files
		for (let file of files) {
			let i = outputs.length;
			while (i--) {
				if (outputs[i].input_file === file) {
					outputs.splice(i, 1);
				}
			}
		}

		// So remaining files are to delete :)
		for (let out of outputs) {
			await this.cleanOutput(out);
		}
	}

	async runAllRunnables(files) {
		return new Promise(async (resolve, reject) => {
			const pfiles = [];

			for (let file of files) {
				try {
					console.info(`Processing <${file}>`);
					console.group(file);

					const extension = util.getExtension(file).toLowerCase();

					// Define the runnables keys that will
					// be executed at the end.
					// The first task MUST always be processor.copy
					let runnables_keys = ['processor.copy'];

					if (/\.(jpg|jpeg|png)$/i.test(file)) {
						const format = /\.png$/.test(file) ? 'png' : 'jpg';
						runnables_keys = runnables_keys.concat([
							'processor.resize',
							'processor.image',
							`processor.${format}`,
							'processor.lazyLoadBlurried',
							'converter.webp',
							'tester.image'
						]);

					} else if (/\.gif$/i.test(file)) {
						runnables_keys = runnables_keys.concat(['processor.gif']);

					} else if (/\.svg$/i.test(file)) {
						runnables_keys = runnables_keys.concat(['processor.svg']);

					} else if (/\.(mov|avi|m4v|3gp|m2v|ogg|mp4)$/i.test(file)) {
						for (let format of ['mp4', 'webm']) {
							if (extension != format) {
								runnables_keys = runnables_keys.concat([`converter.${format}`]);
							}
						}
						runnables_keys = runnables_keys.concat([
							'processor.poster',
							'processor.videoThumbs',
							'tester.video'
						]);

					} else if (/\.(ogg|wav|aif|ac3|aac)$/i.test(file)) {
						runnables_keys = runnables_keys.concat(['converter.mp3']);

					} else if (/\.(ttf|otf)$/i.test(file)) {
						for (let format of ['ttf', 'otf', 'svg', 'eot', 'woff', 'woff2']) {
							if (extension != format) {
								runnables_keys = runnables_keys.concat([`converter.${format}`]);
							}
						}
						runnables_keys = runnables_keys.concat([
							'tester.font'
						]);

					} else if (/\.(sass|scss)$/i.test(file)) {
						runnables_keys = runnables_keys.concat(['processor.sass']);

					} else if (/\.(less)$/i.test(file)) {
						runnables_keys = runnables_keys.concat(['processor.less']);

					}

					// Run all runnables defined
					for (let e of runnables_keys) {
						await this.runRunnable(e, file);
					}

					console.groupEnd();
					pfiles.push(file);

				} catch (err) {
					console.groupEnd();
					console.error(`Error in processing ${file}`, err);
				}

			}

			resolve(pfiles);
		});
	}

	compareOutput(row, input_hash, runnable_algo_version, runnable_config) {
		if (row == null) return false;
		return (
			row.input_hash == input_hash &&
			row.runnable_algo_version == runnable_algo_version &&
			row.runnable_config == JSON.stringify(runnable_config)
		);
	}

	checkOutputSafeness(row) {
		// Check if all output files are sanes
		for (let file of row.output_files) {
			if (!fs.existsSync(this.getDstFilePath(file))) {
				return false;
			}
		}
		return true;
	}

	/**
	 * Run a runnable item
	 *
	 * @param {String} runnable_key The key of the runnable to execute
	 * @param {String} input_file Input file (it should be in /SRC)
	 * @returns {[String]} Output files
	 * @memberof Tommy
	 */
	async runRunnable(runnable_key, input_file) {
		return new Promise(async (resolve, reject) => {
			const input_hash = this.getFileHash(input_file);
			const runnable_algo_version = this.getRunnableAlgoVersion(runnable_key);
			const runnable_config = this.getRunnableConfig(runnable_key);

			let row;
			try {
				row = await this.getOutputByInputFileAndRunnableKey(input_file, runnable_key);
			} catch (err) {
				row = null;
			}

			if (runnable_config.enabled == false) {
				console.warn(`Runnable <${runnable_key}> will not run over <${input_file}> because it has been disabled`);

				// Delete old items processed by this item
				await this.cleanOutput(row);

				return resolve(null);
			}

			if (
				this.force == false &&
				this.compareOutput(row, input_hash, runnable_algo_version, runnable_config) == true
			) {
				// console.debug(`Runnable <${input_file}, ${runnable_key}> has already been processed`);

				if (this.checkOutputSafeness(row)) {
					return resolve(row.output_files);
				}

				console.warn(`Output for <${input_file}, ${runnable_key}> is unsafe, probably some files have been deleted in your destination directory (you should not do it) - reprocessing item`);
			}

			// Clean old files generated by and old configuration or different file
			await this.cleanOutput(row);

			// Ensure that always Destination file is processed
			try {

				const r = runnable_key.split('.');
				const output_files = await runnables[r[0]][r[1]](this, this.getDstFilePath(input_file));

				await this.saveOutput({
					input_file: input_file,
					input_hash: input_hash,
					output_files: output_files,
					runnable_key: runnable_key,
					runnable_algo_version: runnable_algo_version,
					runnable_config: runnable_config
				});

				resolve(output_files);

			} catch (err) {
				console.error(`Error while executing runnable <${input_file}, ${runnable_key}>`, err);
				resolve(null);
			}
		});
	}

	async processFiles() {
		if (this.config.remoteSync == true) {
			console.info('Syncing from remote...');
			await uploader.syncFromRemote(this);
		}

		console.info('Collecting files...');
		const files = await this.indexFiles();
		const outputs = await this.getAllOutputs();

		console.info('Cleaning destination directory...');
		await this.cleanDstDirectory(files, outputs);

		console.info('Run runnables...');
		const pfiles = await this.runAllRunnables(files);

		if (this.config.remoteSync == true) {
			console.info('Syncing to remote...');
			await uploader.syncToRemote(this);
		}

		this.isProcessing = false;
		console.info('Done!');

		return pfiles;
	}

	async respondToWatchEvent(event, path) {
		if (this.watchProcessing) {
			return setTimeout(() => {
				this.respondToWatchEvent(event, path);
			}, 500);
		}

		this.watchProcessing = true;

		const file = this.getCleanFileName(path);
		console.info(`Processing watch event: ${event} <${file}>`);

		try {
			switch (event) {
				case 'change':
				case 'add':
					await this.runAllRunnables([file]);
					break;
				case 'unlink':
					await this.cleanOutputByInputFile(file);
					break;
			}
		} catch (err) {
			console.error(`Error while processing <${path}>`, err);
		}

		this.watchProcessing = false;
	}

	// Init

	async run() {
		return new Promise(async (resolve, reject) => {
			if (this.src == null) {
				return reject('Set --src as input source directory');
			}
			this.src = fs.realpathSync(this.src);

			if (this.dst == null) {
				return reject('Set --dst as output source directory');
			}
			this.dst = fs.realpathSync(this.dst);

			if (this.src === this.dst) {
				return reject('Codardly refusing to run when SRC directory is equal to DST');
			}

			let pfiles;
			try {
				await this.createDatabase();
				pfiles = await this.processFiles();
			} catch (err) {
				return reject(err);
			}

			if (!this.watch) {
				return resolve(pfiles);
			}

			console.info(`Start watching <${this.src}>...`);
			this.watchProcessing = false;

			chokidar.watch(this.src, {
				persistent: true,
				ignoreInitial: true
			}).on('all', this.respondToWatchEvent.bind(this));
		});
	}
}

module.exports = Tommy;