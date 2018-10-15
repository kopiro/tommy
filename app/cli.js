#!/usr/bin/env node

require('console-ultimate/global').replace();

const argv = require('yargs').argv;

const Tommy = require('.');
Tommy.run(argv.src, argv.dst, argv.config, argv.force)
	.then(_ => process.exit(0))
	.catch(_ => process.exit(1));