const util = require('./util');


async function syncFromRemote(bucket) {
	return util.execPromise(`aws s3 sync "s3://${bucket}" "${global.__dst}"`, {
		verbose: true
	});
}

async function syncToRemote(bucket) {
	return util.execPromise(`aws s3 sync "${global.__dst}" "s3://${bucket}"`, {
		verbose: true
	});
}

exports.syncFromRemote = syncFromRemote;
exports.syncToRemote = syncToRemote;