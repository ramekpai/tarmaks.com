const lightningcss = require('lightningcss');
const packageJson = require('./package.json');

module.exports = (config) => {

  // CSS

  const styles = [
		'./src/styles/index.css',
		'./src/styles/light.css',
		'./src/styles/dark.css',
	];

	const processStyles = async (path) => {
		return await lightningcss.bundle({
			filename: path,
			minify: true,
			sourceMap: false,
			targets: lightningcss.browserslistToTargets(
				packageJson.browserslist,
			),
			include:
				lightningcss.Features.MediaQueries |
				lightningcss.Features.Nesting,
		});
	};

	config.addTemplateFormats('css');

	config.addExtension('css', {
		outputFileExtension: 'css',
		compile: async (content, path) => {
			if (!styles.includes(path)) {
				return;
			}

			console.log('path - ', path);

			return async () => {
				let { code } = await processStyles(path);

				return code;
			};
		},
	});

	config.addFilter('css', async (path) => {
		let { code } = await processStyles(path);

		return code;
	});

  return {
		dir: {
			input: 'src',
			output: 'dist',
			layouts: 'layouts',
		},
		dataTemplateEngine: 'njk',
		markdownTemplateEngine: 'njk',
		htmlTemplateEngine: 'njk',
		templateFormats: ['md', 'njk'],
	};
};
