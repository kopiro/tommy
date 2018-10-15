const util = require('./util');

async function syncFromRemote(tommy) {
	return util.execPromise(`aws s3 sync "s3://${tommy.s3Bucket}" "${tommy.dst}" --exclude ".DS_Store"`, {
		verbose: true
	});
}

async function syncToRemote(tommy) {
	return util.execPromise(`aws s3 sync "${tommy.dst}" "s3://${tommy.s3Bucket}" --exclude ".DS_Store"`, {
		verbose: true
	});
}

exports.syncFromRemote = syncFromRemote;
exports.syncToRemote = syncToRemote;