const exec = require('child_process').exec;

async function execPromise(command, opt = {
	verbose: false
}) {
	return new Promise((resolve, reject) => {

		let child = exec(command, {}, (err, stdout, stderr) => {
			if (err) return reject(stderr);
			return resolve(stdout);
		});

		if (opt.verbose == true) {
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