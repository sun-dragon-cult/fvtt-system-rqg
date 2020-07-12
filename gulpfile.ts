import * as gulp from "gulp";
import * as fs from "fs-extra";
import * as path from "path";
import * as chalk from "chalk";
import * as archiver from "archiver";
import * as stringify from "json-stringify-pretty-compact";
import {
  Node,
  LiteralExpression,
  TransformerFactory,
  isImportDeclaration,
  isExportDeclaration,
  isStringLiteral,
  createLiteral,
  updateImportDeclaration,
  updateExportDeclaration,
  visitEachChild,
  visitNode,
  TransformationContext,
  Transformer as TSTransformer,
} from "typescript";
import * as Vinyl from "vinyl";
import { Readable } from "stream";

import * as ts from "gulp-typescript";
import * as sass from "gulp-sass";
import * as git from "gulp-git";

const argv = require('yargs').argv;

sass.compiler = require('node-sass');

function getConfig() {
	const configPath = path.resolve(process.cwd(), 'foundryconfig.json');
	let config;

	if (fs.existsSync(configPath)) {
		config = fs.readJSONSync(configPath);
		return config;
	} else {
		return;
	}
}

function getManifest() {
	const json: any = {};

	if (fs.existsSync('src')) {
		json.root = 'src';
	} else {
		json.root = 'dist';
	}

	const modulePath = path.join(json.root, 'module.json');
	const systemPath = path.join(json.root, 'system.json');

	if (fs.existsSync(modulePath)) {
		json.file = fs.readJSONSync(modulePath);
		json.name = 'module.json';
	} else if (fs.existsSync(systemPath)) {
		json.file = fs.readJSONSync(systemPath);
		json.name = 'system.json';
	} else {
		return;
	}

	return json;
}

/**
 * TypeScript transformers
 * @returns {typescript.TransformerFactory<typescript.SourceFile>}
 */
function createTransformer(): TransformerFactory<any> {
	/**
	 * @param {typescript.Node} node
	 */
	function shouldMutateModuleSpecifier(node: Node) {
		if (!isImportDeclaration(node) && !isExportDeclaration(node)) { return false; }
		if (node.moduleSpecifier === undefined) { return false; }
		if (!isStringLiteral(node.moduleSpecifier)) { return false; }
		if (!node.moduleSpecifier.text.startsWith('./') &&!node.moduleSpecifier.text.startsWith('../')) { return false; }
		if (path.extname(node.moduleSpecifier.text) !== '') { return false; }
		return true;
	}

	/**
	 * Transforms import/export declarations to append `.js` extension
	 * @param {typescript.TransformationContext} context
	 */
	function importTransformer(context: TransformationContext): TSTransformer<any> {
		return (node: Node) => {
			function visitor(node: Node) {
				if (shouldMutateModuleSpecifier(node)) {
					if (isImportDeclaration(node)) {
						const newModuleSpecifier = createLiteral(
							`${(node.moduleSpecifier as LiteralExpression).text}.js`
						);
						return updateImportDeclaration(
							node,
							node.decorators,
							node.modifiers,
							node.importClause,
							newModuleSpecifier
						);
					} else if (isExportDeclaration(node)) {
						const newModuleSpecifier = createLiteral(
							`${(node.moduleSpecifier as LiteralExpression).text}.js`
						);
						return updateExportDeclaration(
							node,
							node.decorators,
							node.modifiers,
							node.exportClause,
							newModuleSpecifier,
              false
						);
					}
				}
				return visitEachChild(node, visitor, context);
			}
			return visitNode(node, visitor);
		};
	}
	return importTransformer;
}

const tsConfig = ts.createProject('tsconfig.json', {
	getCustomTransformers: (_program) => ({
		after: [createTransformer()],
	}),
});


/**
 * Build template.json
 */

function string_src(filename, contents) {
  let src = new Readable({ objectMode: true });
  src._read = function () {
    this.push(
      new Vinyl({
        cwd: "",
        base: "./",
        path: filename,
        contents: Buffer.from(contents),
      })
    );
    this.push(null);
  };
  return src;
}

const json_src = (filename, contents) => string_src(filename, JSON.stringify(contents));
/********************/
/*		BUILD		*/
/********************/

/**
 * Build TypeScript
 */
function buildTS() {
	return gulp
    .src('src/**/*.ts')
    .pipe(tsConfig())
    .pipe(gulp.dest('dist'));
}

/**
 * Build SASS
 */
function buildSASS() {
	return gulp
		.src('src/**/*.scss')
		.pipe(sass().on('error', sass.logError))
		.pipe(gulp.dest('dist'));
}

/**
 * Build Template.json
 */
import { Actors, Items } from "./src/template";
import {ActorDataRqg} from "./src/module/data-model/Actor/actor-data-rqg";

async function buildTemplates() {
  const template = {
    Actor: {
      types: Object.keys(Actors),
      ...Actors
    },
    Item: {
      types: Object.keys(Items),
      ...Items
    },
  };
  return json_src("template.json", template).pipe(gulp.dest("dist"));
}

/**
 * Copy static files
 */
async function copyFiles() {
	const statics = [
		'i18n',
		'fonts',
		'icons',
		'module',
		'module.json',
		'system.json',
	];
	try {
		for (const file of statics) {
			if (fs.existsSync(path.join('src', file))) {
				await fs.copy(path.join('src', file), path.join('dist', file));
			}
		}
		return Promise.resolve();
	} catch (err) {
		Promise.reject(err);
	}
}

/**
 * Watch for changes for each build step
 */
function buildWatch() {
	gulp.watch('src/**/*.ts', { ignoreInitial: false }, buildTS);
	gulp.watch('src/**/*.scss', { ignoreInitial: false }, buildSASS);
	gulp.watch(
		['src/fonts', 'src/i18n', 'src/**/*.html', 'src/*.json'],
		{ ignoreInitial: false },
		copyFiles
	);
}

/********************/
/*		CLEAN		*/
/********************/

/**
 * Remove built files from `dist` folder
 * while ignoring source files
 */
async function clean() {
	const name = path.basename(path.resolve('.'));
	const files = [];

  files.push(
    'i18n',
    'icons',
    'module',
    `${name}.js`,
    'module.json',
    'system.json'
  );

	files.push('fonts', `${name}.css`);

	console.log(' ', chalk.yellow('Files to clean:'));
	console.log('   ', chalk.blueBright(files.join('\n    ')));

	// Attempt to remove the files
	try {
		for (const filePath of files) {
			await fs.remove(path.join('dist', filePath));
		}
		return Promise.resolve();
	} catch (err) {
		Promise.reject(err);
	}
}

/********************/
/*		LINK		*/
/********************/

/**
 * Link build to User Data folder
 */
async function linkUserData() {
	const name = path.basename(path.resolve('.'));
	const config = fs.readJSONSync('foundryconfig.json');

	let destDir;
	try {
		if (
			fs.existsSync(path.resolve('.', 'dist', 'module.json')) ||
			fs.existsSync(path.resolve('.', 'src', 'module.json'))
		) {
			destDir = 'modules';
		} else if (
			fs.existsSync(path.resolve('.', 'dist', 'system.json')) ||
			fs.existsSync(path.resolve('.', 'src', 'system.json'))
		) {
			destDir = 'systems';
		} else {
			throw Error(
				`Could not find ${chalk.blueBright(
					'module.json'
				)} or ${chalk.blueBright('system.json')}`
			);
		}

		let linkDir;
		if (config.dataPath) {
			if (!fs.existsSync(path.join(config.dataPath, 'Data')))
				throw Error('User Data path invalid, no Data directory found');

			linkDir = path.join(config.dataPath, 'Data', destDir, name);
		} else {
			throw Error('No User Data path defined in foundryconfig.json');
		}

		if (argv.clean || argv.c) {
			console.log(
				chalk.yellow(`Removing build in ${chalk.blueBright(linkDir)}`)
			);

			await fs.remove(linkDir);
		} else if (!fs.existsSync(linkDir)) {
			console.log(
				chalk.green(`Copying build to ${chalk.blueBright(linkDir)}`)
			);
			await fs.symlink(path.resolve('./dist'), linkDir);
		}
		return Promise.resolve();
	} catch (err) {
		Promise.reject(err);
	}
}

/*********************/
/*		RELEASE 	 */
/*********************/

/**
 * Release build
 */
async function releaseBuild() {
	const manifest = getManifest();

	return new Promise((resolve, reject) => {
		try {
			// Remove the releases dir without doing anything else
			if (argv.clean || argv.c) {
				console.log(chalk.yellow('Removing all released files'));
				fs.removeSync('releases');
				return;
			}

			// Ensure there is a directory to hold all the release versions
			fs.ensureDirSync('releases');

			// Initialize the zip file
			const zipName = `${manifest.file.name}-v${manifest.file.version}.zip`;
			const zipFile = fs.createWriteStream(path.join('releases', zipName));
			const zip = archiver('zip', { zlib: { level: 9 } });

			zipFile.on('close', () => {
				console.log(chalk.green(zip.pointer() + ' total bytes'));
				console.log(
					chalk.green(`Zip file ${zipName} has been written`)
				);
				return resolve();
			});

			zip.on('error', (err) => {
				throw err;
			});

			zip.pipe(zipFile);

			// Add the directory with the final code
			zip.directory('dist/', manifest.file.name);

			zip.finalize();
		} catch (err) {
			return reject(err);
		}
	});
}

/*********************/
/*		RELEASE 	 */
/*********************/

/**
 * Update version and URLs in the manifest JSON
 */
function updateManifest(cb) {
	const packageJson = fs.readJSONSync('package.json');
	const config = getConfig(),
		manifest = getManifest(),
		rawURL = config.rawURL,
		repoURL = config.repository,
		manifestRoot = manifest.root;

	if (!config) cb(Error(chalk.red('foundryconfig.json not found')));
	if (!manifest) cb(Error(chalk.red('Manifest JSON not found')));
	if (!rawURL || !repoURL) cb(Error(chalk.red('Repository URLs not configured in foundryconfig.json')));

	try {
		const version = argv.update || argv.u;

		/* Update version */

		const versionMatch = /^(\d{1,}).(\d{1,}).(\d{1,})$/;
		const currentVersion = manifest.file.version;
		let targetVersion = '';

		if (!version) { cb(Error('Missing version number')); }

		if (versionMatch.test(version)) {
			targetVersion = version;
		} else {
			targetVersion = currentVersion.replace(
				versionMatch,
				(substring, major, minor, patch) => {
					console.log(substring, Number(major) + 1, Number(minor) + 1, Number(patch) + 1);
					if (version === 'major') {
						return `${Number(major) + 1}.0.0`;
					} else if (version === 'minor') {
						return `${major}.${Number(minor) + 1}.0`;
					} else if (version === 'patch') {
						return `${major}.${minor}.${Number(patch) + 1}`;
					} else {
						return '';
					}
				}
			);
		}

		if (targetVersion === '') {
			return cb(Error(chalk.red('Error: Incorrect version arguments.')));
		}

		if (targetVersion === currentVersion) {
			return cb(Error(chalk.red('Error: Target version is identical to current version.')));
		}
		console.log(`Updating version number to '${targetVersion}'`);

		packageJson.version = targetVersion;
		manifest.file.version = targetVersion;

		/* Update URLs */

		const result = `${rawURL}/v${manifest.file.version}/releases/${manifest.file.name}-v${manifest.file.version}.zip`;

		manifest.file.url = repoURL;
		manifest.file.manifest = `${rawURL}/master/${manifestRoot}/${manifest.name}`;
		manifest.file.download = result;

		const prettyProjectJson = stringify(manifest.file, {
			maxLength: 35,
			indent: '\t',
		});

		fs.writeJSONSync('package.json', packageJson, { spaces: '\t' });
		fs.writeFileSync(path.join(manifest.root, manifest.name),	prettyProjectJson, 'utf8');

		return cb();
	} catch (err) {
		cb(err);
	}
}

function gitAdd() {
	return gulp.src('package').pipe(git.add({ args: '--no-all' }));
}

function gitCommit() {
	return gulp.src('./*').pipe(
		git.commit(`v${getManifest().file.version}`, {
			args: '-a',
			disableAppendPaths: true,
		})
	);
}

function gitTag() {
	const manifest = getManifest();
	return git.tag(`v${manifest.file.version}`, `Updated to ${manifest.file.version}`, (err) => {
    if (err) throw err;
	});
}

const execGit = gulp.series(gitAdd, gitCommit, gitTag);

const execBuild = gulp.parallel(buildTS, buildSASS, copyFiles, buildTemplates);

exports.build = gulp.series(clean, execBuild);
exports.watch = buildWatch;
exports.clean = clean;
exports.link = linkUserData;
exports.release = releaseBuild;
exports.update = updateManifest;
exports.publish = gulp.series(clean, updateManifest, execBuild,	releaseBuild, execGit);
