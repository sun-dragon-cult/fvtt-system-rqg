![Supported Foundry Versions](https://img.shields.io/endpoint?url=https://foundryshields.com/version?url=https://github.com/wakeand/fvtt-system-rqg/releases/latest/download/system.json)
[![GitHub Release](https://img.shields.io/github/release/wakeand/fvtt-system-rqg)]()
[![Issues](https://img.shields.io/github/issues-raw/wakeand/fvtt-system-rqg?maxAge=25000)](https://github.com/wakeand/fvtt-system-rqg/issues)
![Latest Release Download Count](https://img.shields.io/github/downloads/wakeand/fvtt-system-rqg/latest/rqg.zip)
[![License](https://img.shields.io/badge/License-Apache_2.0-blue.svg)](https://github.com/wakeand/fvtt-module-reverseinitiativeorder/blob/master/LICENSE)
[![Tests](https://github.com/sun-dragon-cult/fvtt-system-rqg/actions/workflows/test.yml/badge.svg)](https://github.com/sun-dragon-cult/fvtt-system-rqg/actions/workflows/test.yml)

# RuneQuest Glorantha system for Foundry Virtual Table Top

## Installing

Paste this into Foundry VTT Install System -> Manifest URL
https://github.com/sun-dragon-cult/fvtt-system-rqg/releases/latest/download/system.json

## Usage

Se the [Wiki](https://github.com/sun-dragon-cult/fvtt-system-rqg/wiki) for more details.

## Development

Written in typescript wih the help of the fantastic [League of Foundry Developers Foundry VTT Types](https://github.com/League-of-Foundry-Developers/foundry-vtt-types).
After a `yarn install` to get the dependencies, do `yarn build` to build the system and compile the compendium packs into a `dist` folder.
For easy development make a softlink from `foundrydata/Data/systems/rqg` to that `dist` folder.

To decrease the time it takes to build the system you can skip generating the compendium packs by running `yarn build:system`.
This assumes that you previously have compiled the compendium packs with `yarn build` or `yarn build:packs`.
These commands builds the pack db files to `src/assets/packs/` from the yaml file sources under `src/assets/compendiums/`

If you like to remove the system from foundry then remove the file system softlink.

### Development in Windows
The build scripts make use of [Husky](https://typicode.github.io/husky/) which means that you need to use the 
Git Bash shell that is supplied by the nodejs windows install when you run the yarn commands to build the system.

### Conventional Commit message standard

The changelog of this project is autogenerated from the commit messages. To make this work they must follow the [conventional commit](https://www.conventionalcommits.org/)
standard. There is a pre-commit hook to check if the commit message follows the rules so if you get an error when committing this could be the cause.
The most common types of commmits are additions of new features: `feat: add quantity to all items`
and fixing of bugs: `fix: dropping items generates a NPE`.

### Prettier formatting

The code should be formatted with [Prettier](https://prettier.io/) and a pre-commit hook will autoformat the code you commit. It is recommended to
install a formatter in your IDE to format your code on the fly.

### Editing compendium Yaml files

To make it easier to edit the yaml files that is used to create to compendium packs, you can
use the supplied json schema for Rqg Items located here: `src/data-model/jsonSchemas/rqg-item-schema.json`.

#### Visual Studio Code

To enable yaml validation in vs code, you first need to install this [YAML plugin](https://marketplace.visualstudio.com/items?itemName=redhat.vscode-yaml)
and then configure it to use the RqgItem schema, use the setting below.

```json
{
  "yaml.schemas": {
    "https://raw.githubusercontent.com/sun-dragon-cult/fvtt-system-rqg/master/src/data-model/jsonSchemas/rqg-item-schema.json": ".yaml"
  }
}
```

For details see this article: https://dev.to/brpaz/how-to-create-your-own-auto-completion-for-json-and-yaml-files-on-vs-code-with-the-help-of-json-schema-k1i

#### Jetbrains Idea

Open a yaml file and click "No JSON Schema" at the bottom left. Choose "+ New Schema Mapping" and paste `https://raw.githubusercontent.com/sun-dragon-cult/fvtt-system-rqg/master/src/data-model/jsonSchemas/rqg-item-schema.json`
into the "Schema file or URL" input field. Name the schema to for example Rqg Item and set the schema
version to 7.

## Project Status

Still very much work in progress. 🚧 But closing in on a release version...

## [Credits and Attributions](docs/credits.md)
