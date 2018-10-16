const exec = require('child_process').exec;
const fs = require('fs');

exports.REGEX_EXT = exports.REGEXP_EXT = /\.([^/.]+)$/;

async function overwriteProtection(tommy, filepath, dst_path) {
	const from_ext = getExtension(filepath);
	const to_ext = getExtension(dst_path);
	if (from_ext == to_ext) return true;

	const src_path = dst_path.replace(tommy.dst, tommy.src);
	if (fs.existsSync(src_path)) {
		throw new Error(
			`Unable to convert <${filepath}> to <${dst_path}> because original <${src_path}> will be overwritten`
		);
	}
	return true;
}

async function execPromise(command, opt = {
	verbose: false,
	debug: false
}) {
	return new Promise((resolve, reject) => {
		if (process.env.DEBUG) {
			console.warn('command :', command.replace(/\t/g, ' '));
		}
		let child = exec(command, {
			shell: '/bin/bash'
		}, (err, stdout, stderr) => {
			if (err) return reject(stderr || stdout);
			return resolve(stdout);
		});

		if (opt.verbose || process.env.DEBUG) {
			child.stdout.on('data', function (data) {
				if (data) console.debug(data);
			});
			child.stderr.on('data', function (data) {
				if (data) console.error(data);
			});
		}
	});
}

function getExtension(filename) {
	try {
		return filename.match(exports.REGEX_EXT)[1];
	} catch (err) {
		return '';
	}
}

exports.overwriteProtection = overwriteProtection;
exports.execPromise = execPromise;
exports.getExtension = getExtension;