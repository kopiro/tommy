const util = require('./util');

async function syncFromRemote(bucket) {
	return util.execPromise(`aws s3 sync "s3://${bucket}" "${global.__dst}" --exclude ".DS_Store"`, {
		verbose: true
	});
}

async function syncToRemote(bucket) {
	return util.execPromise(`aws s3 sync "${global.__dst}" "s3://${bucket}" --exclude ".DS_Store"`, {
		verbose: true
	});
}

exports.syncFromRemote = syncFromRemote;
exports.syncToRemote = syncToRemote;