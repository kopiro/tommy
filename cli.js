#!/usr/bin/env node

const argv = require('yargs').argv;

const Tommy = require('.');

if (argv.webserver) {

	const express = require('express');
	const app = express();

	app.use(express.json());

	app.post('/', async (req, res) => {
		try {

			let tommy = new Tommy(req.body.src, req.body.dst, req.body.config, req.body.force);
			const files = await tommy.run();

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

		require('console-ultimate/global').replace();

		try {
			let config = null;
			if (argv.config) {
				config = require(require('fs').realpathSync(argv.config));
			}

			let tommy = new Tommy(argv.src, argv.dst, config, argv.force);
			await tommy.run();
			process.exit(0);

		} catch (err) {
			console.error(err || 'Unexpected error');
			process.exit(1);
		}

	})();

}