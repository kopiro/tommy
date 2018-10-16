const fs = require('fs');
const path = require('path');

const processor = require('./processor');
const util = require('./util');

const css = `<style>
body { background: #fff; color: #111; font-family: sans-serif; padding: 40px; }
hr { display: block; border: none; height: 1px; background: rgba(0,0,0,.2); }
img, video { max-width: 100%; border: 1px solid #ccc; }
</style>`;

async function testFont(tommy, filepath) {
	if (tommy.config.tester.font == false) return false;

	const file_url = filepath.replace(util.REGEX_EXT, '').replace(tommy.dst, '');
	const name = path.basename(file_url);

	const css_file = path.join(path.dirname(filepath), name + '.css');
	const css_string = `@font-face {
		font-family: '${name}';
		src: url('${file_url}.eot'); /* IE9 Compat Modes */
		src: url('${file_url}.eot?#iefix') format('embedded-opentype'), /* IE6-IE8 */
			  url('${file_url}.woff2') format('woff2'), /* Super Modern Browsers */
			  url('${file_url}.woff') format('woff'), /* Pretty Modern Browsers */
			  url('${file_url}.ttf')  format('truetype'), /* Safari, Android, iOS */
			  url('${file_url}.svg#${name}') format('svg'); /* Legacy iOS */
	}`;

	console.debug(`Extracting CSS font-face declaration to <${css_file}>`);
	fs.writeFileSync(css_file, css_string);

	const html_file = css_file.replace('.css', '-test.html');
	const sentence = 'The quick brown fox jumps over the lazy dog';
	const html_string = `<!doctype html>
		${css}
		<style>${css_string.replace(new RegExp(file_url, 'g'), `./${name}`)}</style>
		<style>body { font-family: "${name}"; }</style>
		<h1>${name}</h1>
		<hr/>
		<h1>${sentence}</h1>
		<h2>${sentence}</h2>
		<h3>${sentence}</h3>
		<p>${sentence}</p>
	`;

	console.debug(`Extracting HTML test for font-face declaration to <${html_file}>`);
	fs.writeFileSync(html_file, html_string);

	return css_file;
}

async function testImage(tommy, filepath, format) {
	if (tommy.config.tester.image == false) return false;

	const file_name = path.basename(filepath.replace(util.REGEX_EXT, ''));
	const html_file = filepath.replace(util.REGEX_EXT, '-test.html');

	const html_string = `<!doctype html>
		<body>
		${css}
		
		<h1>${file_name}.${format}</h1>
		<hr/>` +

		`<h2>Conversions</h2>
		<h3>${file_name}.${format}</h3>
		<img src="${file_name}.${format}" />
		<h3>${file_name}.webp</h3>
		<img src="${file_name}.webp" />
		<hr/>` +

		`<h2>Resizes</h2>` +
		(tommy.config.resize.dimensions || []).map(px => {
			const url = file_name + tommy.config.resize.suffix.replace('${i}', px).replace('${ext}', format);
			return `<h3>${url}</h3><img src="${url}" />`;
		}).join('') +
		`<hr/>` +

		`<h2>Resizes WEBP</h2>` +
		(tommy.config.resize.dimensions || []).map(px => {
			const url = file_name + tommy.config.resize.suffix.replace('${i}', px).replace('${ext}', 'webp');
			return `<h3>${url}</h3><img src="${url}" />`;
		}).join('') +
		`<hr/>` +

		`<h2>Lazy Load Blurried</h2>
		<h3>${file_name}${tommy.config.lazyLoadBlurried.suffix}</h3>
		<img style="width: 100%" src="${file_name}${tommy.config.lazyLoadBlurried.suffix}" />
		<hr/>` +

		`</body>`;

	console.debug(`Extracting HTML test for image in <${html_file}>`);
	fs.writeFileSync(html_file, html_string);

	return html_file;
}


async function testVideo(tommy, filepath) {
	if (tommy.config.tester.video == false) return false;

	const file_name_with_ext = path.basename(filepath);
	const file_name = file_name_with_ext.replace(util.REGEX_EXT, '');
	const html_file = filepath.replace(util.REGEX_EXT, '-test.html');

	const html_string = `<!doctype html>
		<body>
		${css}
		
		<h1>${file_name_with_ext}</h1>
		<hr/>` +

		`<h2>Conversions</h2>
		<h3>${file_name}.mp4</h3>
		<video src="${file_name}.mp4" controls></video>
		<h3>${file_name}.webm</h3>
		<video src="${file_name}.webm" controls></video>
		<hr/>` +

		`<h2>Video Thumbs</h2>` +
		(new Array(tommy.config.videoThumbs.count).fill(0).map((_, i) => (i + 1))).map(i => {
			const url = `${file_name}${tommy.config.videoThumbs.suffix.replace('${i}', i)}`;
			return `<h3>${url}</h3><img src="${url}" />`;
		}).join('') +
		`<hr/>` +

		`<h2>Poster</h2>
		<h3>${file_name}${tommy.config.poster.suffix}</h3>
		<img src="${file_name}${tommy.config.poster.suffix}" />
		<hr/>` +

		`</body>`;

	console.debug(`Extracting HTML test for video in <${html_file}>`);
	fs.writeFileSync(html_file, html_string);

	return html_file;
}

exports.font = testFont;
exports.image = testImage;
exports.video = testVideo;