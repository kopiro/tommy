const util = require('./util');

async function syncFromRemote(tommy) {
	if (tommy.config.s3Bucket == null) throw new Error('Invalid bucket');
	return util.execPromise(`aws s3 sync "s3://${tommy.config.s3Bucket}" "${tommy.dst}" --exclude ".DS_Store"`, {
		verbose: true
	});
}

async function syncToRemote(tommy) {
	if (tommy.config.s3Bucket == null) throw new Error('Invalid bucket');
	return util.execPromise(`aws s3 sync "${tommy.dst}" "s3://${tommy.config.s3Bucket}" --exclude ".DS_Store" --delete`, {
		verbose: true
	});
}

exports.syncFromRemote = syncFromRemote;
exports.syncToRemote = syncToRemote;