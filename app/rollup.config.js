import pkg from './package.json';

export default [{
	input: 'tommy.js',
	external: ['ms'],
	output: [{
			file: pkg.main,
			format: 'cjs',
			exports: 'named'
		},
		{
			file: pkg.module,
			format: 'es',
			exports: 'named'
		}
	]
}];