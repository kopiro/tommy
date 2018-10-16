const exec = require('child_process').exec;

async function execPromise(command, opt = {
	verbose: false,
	debug: false
}) {
	return new Promise((resolve, reject) => {
		if (opt.debug == true) {
			console.warn('command :', command);
		}
		let child = exec(command, {
			shell: '/bin/bash'
		}, (err, stdout, stderr) => {
			if (err) return reject(stderr || stdout);
			return resolve(stdout);
		});

		if (opt.verbose || opt.debug) {
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
	return filename
		.split('.')
		.slice(0, -1)
		.join('.');
}


exports.execPromise = execPromise;
exports.getExtension = getExtension;