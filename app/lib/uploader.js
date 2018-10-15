const util = require('./util');
const Tommy = require('..');

async function syncFromRemote(bucket) {
	return util.execPromise(`aws s3 sync "s3://${bucket}" "${Tommy.__dst}" --exclude ".DS_Store"`, {
		verbose: true
	});
}

async function syncToRemote(bucket) {
	return util.execPromise(`aws s3 sync "${Tommy.__dst}" "s3://${bucket}" --exclude ".DS_Store"`, {
		verbose: true
	});
}

exports.syncFromRemote = syncFromRemote;
exports.syncToRemote = syncToRemote;