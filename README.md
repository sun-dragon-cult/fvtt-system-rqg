# RuneQuest Glorantha (Unofficial) system for Foundry Virtual Table Top

## Usage

Most things are items and needs to be added to an actor. There are a couple of compendiums supplied
with the system like runes and skills to make it easier to build a character. There is only one actor type 
since that can handle everything from humans to spirits & dinosaurs.

## Development

Written in typescript wih the help of the fantastic [League of Foundry Developers Foundry VTT Types](https://github.com/League-of-Foundry-Developers/foundry-vtt-types)
After a `yarn install` to get the dependencies, do `yarn build` that will build the system into a `dist` folder. For easy development make a softlink from `foundrydata/Data/systems/rqg` to that `dist` folder.
If you want to have hotload on save you can do `yarn build:watch`. 

If you like to remove the system from foundry then remove the file system softlink.

## Project Status

Still very much work in progress. 🚧 But closing in on a release version...

## Credits

Originally based on [Create Foundry Project](https://www.npmjs.com/package/create-foundry-project). Inspiration to use a typed template.json (template.ts) is from [Blue Rose](https://gitlab.com/studio315b/blue-rose) by studio315b, additional ideas from other systems like [D&D5E](https://gitlab.com/foundrynet/dnd5e) and [extended FATE](https://github.com/anvil-vtt/FATEx) by PatrickBauer.

[Rune icons](https://runequest-glorantha.fandom.com/wiki/Category:Runes) by [Phil Hibbs](https://basicroleplaying.org/profile/9-philhibbs) are used and they are an adaptation of the The Glorantha Core Runes font and Sorcery rune files are copyright © 2019 Moon Design Publications. Permission is granted for use in products in Chaosium’s Jonstown Compendium on DriveThruRPG. It is also granted for personal and fanzine use, as long as a credit and copyright notice is included, the font is not altered, and no fee of any kind is charged for its use.

This FoundryVTT System uses trademarks and/or copyrights owned by Chaosium Inc/Moon Design Publications LLC, which are used under Chaosium Inc’s Fan Material Policy. We are expressly prohibited from charging you to use or access this content. This Foundry system is not published, endorsed, or specifically approved by Chaosium Inc. For more information about Chaosium Inc’s products, please visit www.chaosium.com.


### Icon Attributions
<div>Some icons made by <a href="https://www.freepik.com" title="Freepik">Freepik</a> from <a href="https://www.flaticon.com/" title="Flaticon">www.flaticon.com</a></div>
<div>Icons made by <a href="https://www.flaticon.com/authors/nikita-golubev" title="Nikita Golubev">Nikita Golubev</a> from <a href="https://www.flaticon.com/" title="Flaticon">www.flaticon.com</a></div>
