#!/usr/bin/env node

require('console-ultimate/global').replace();

const argv = require('yargs').argv;

const Tommy = require('.');

if (argv.webserver) {

	const express = require('express');
	const app = express();

	app.use(express.json());

	app.post('/', async (req, res) => {
		try {
			const files = await Tommy.run(req.body.src, req.body.dst, req.body.config, req.body.force);
			res.json({
				status: 'OK',
				files: files
			});
		} catch (err) {
			res.status(400).send(err.message ? {
				status: 'ERR',
				error: {
					message: err.message
				}
			} : {
				status: 'ERR',
				error: err
			});
		}
	});

	app.listen(argv.port || 80, () => {
		console.log('Running Tommy WebServer on port: ' + (argv.port || 80));
	});

} else {

	(async () => {
		try {
			await Tommy.run(argv.src, argv.dst, argv.config, argv.force);
			process.exit(0);
		} catch (err) {
			console.error(err);
			process.exit(1);
		}
	})();

}