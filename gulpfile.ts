import * as gulp from "gulp";
import * as fs from "fs-extra";
import * as path from "path";
import * as chalk from "chalk";
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

sass.compiler = require("node-sass");

/**
 * TypeScript transformers
 */
function createTransformer(): TransformerFactory<any> {
  /**
   * @param {typescript.Node} node
   */
  function shouldMutateModuleSpecifier(node: Node) {
    if (!isImportDeclaration(node) && !isExportDeclaration(node)) {
      return false;
    }
    if (node.moduleSpecifier === undefined) {
      return false;
    }
    if (!isStringLiteral(node.moduleSpecifier)) {
      return false;
    }
    if (
      !node.moduleSpecifier.text.startsWith("./") &&
      !node.moduleSpecifier.text.startsWith("../")
    ) {
      return false;
    }
    return path.extname(node.moduleSpecifier.text) === "";
  }

  /**
   * Transforms import/export declarations to append `.js` extension
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

const tsConfig = ts.createProject("tsconfig.json", {
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
  return gulp.src("src/**/*.ts").pipe(tsConfig()).pipe(gulp.dest("dist"));
}

/**
 * Build SASS
 */
function buildSASS() {
  return gulp.src("src/**/*.scss").pipe(sass().on("error", sass.logError)).pipe(gulp.dest("dist/"));
}

/**
 * Build Template.json
 */
import { Actors, Items } from "./src/template";

async function buildTemplates() {
  const template = {
    Actor: {
      types: Object.keys(Actors),
      ...Actors,
    },
    Item: {
      types: Object.keys(Items),
      ...Items,
    },
  };
  return json_src("template.json", template).pipe(gulp.dest("dist"));
}

/**
 * Copy static files
 */
async function copyFiles() {
  const statics = ["i18n", "assets", "actors", "items", "chat", "system", "system.json"];
  try {
    for (const file of statics) {
      if (fs.existsSync(path.join("src", file))) {
        await fs.copy(path.join("src", file), path.join("dist", file));
      }
    }
    return Promise.resolve();
  } catch (err) {
    await Promise.reject(err);
  }
}

/**
 * Watch for changes for each build step
 */
function buildWatch() {
  gulp.watch("src/**/*.ts", { ignoreInitial: false }, buildTS);
  gulp.watch("src/**/*.scss", { ignoreInitial: false }, buildSASS);
  gulp.watch(
    ["src/assets/fonts", "src/i18n", "src/assets/default-items", "src/**/*.html", "src/*.json"],
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
  const name = path.basename(path.resolve("."));
  const files = [];

  files.push(
    "i18n",
    "assets",
    "actors",
    "items",
    "chat",
    "system",
    `${name}.js`,
    "system.json",
    `${name}.css`
  );

  // files.push(`${name}.css`);

  console.log(" ", chalk.yellow("Files to clean:"));
  console.log("   ", chalk.blueBright(files.join("\n    ")));

  // Attempt to remove the files
  try {
    for (const filePath of files) {
      await fs.remove(path.join("dist", filePath));
    }
    return Promise.resolve();
  } catch (err) {
    await Promise.reject(err);
  }
}

const execBuild = gulp.parallel(buildTS, buildSASS, copyFiles, buildTemplates);

exports.build = gulp.series(clean, execBuild);
exports.watch = buildWatch;
