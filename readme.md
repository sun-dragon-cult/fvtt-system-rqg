# Runequest Gloranta (Unofficial) system for Foundry Virtual Table Top

## Usage

Because Runequest Gloranta (Unofficial) doesn't have an SRD or anything other than the quick start the system lacks compendiums. GMs will need to create all of the skills, spells and other items they want to use for character creation.

## Item Creation

Lorem Ipsum.

## Character Creation

Lorem Ipsum.

## Starting a game

Lorem Ipsum.

## Project Status
Still work in progress.

## Roadmap / TODO / Ideas etc
* [x] Setup Dev environment
* [x] Setup basic template.json
* [x] Display data (template.json) value on character sheet
* [x] Update character data from character sheet
* [x] Handle translation
* [x] Move template/*.html next to relevant ts
* [x] Flesh out template.json with variables
* [x] Scrap template.json and build data-models (with typescript types) instead that are initialized in the gulp build to generate a template.json in the dist folder
* [x] Get styling to work (gulp error) -
* [x] Modularize scss.
* [x] Use Actor prepareData() to add modifyers/bonuses to skills (for lookup)
    * [x] Investigate tables (for modifiers)
* [x] Design Character html sheet
    * [x] Show all data
    * [x] Implement tabs for **Main** - **Skills** - **Inventory** - **Background**
* [x] Figure out how to handle variable data (skills with basic keys + extra)
* [x] Implement typed Item system
* [ ] Show occupation dropdown on background tab
* [ ] Create Items / Item sheets / Corresponding Actor-sheet list
    * [ ] Skills
    * [ ] Passions
    * [ ] Weapons
    * [ ] Gear (items, possessions, belongings, ...?) 
    * [ ] Armour
    * [ ] Spirit Magic
    * [ ] Rune Magic
    * [ ] Sorcerous Magic
* [ ] Auto import default Items (skills etc) on Actor creation. Store as external Compendium(s).
* [ ] Combat
* [ ] Spirit Magic
* [ ] Rune Magic
* [ ] Races: Filter displayed locations on race (and add them all to character)
* [ ] Optimise svg's - Have to open and resave them :-(
* [ ] When clicking characteristics show a "roll against" dialog (and make it harder to change the value)
* [ ] Display POW experience checkbox in some way
* [ ] Good defaults: Link token for characters, value=max for "Tracked" data, ...
* [ ] NPC sheets
* [ ] Calendar - see about-time module https://gitlab.com/tposney/about-time
---
* [ ] Figure out how releases work (why they didn't work... gulp?)
* [ ] Character creation? (far future)
* [ ] Go through all texts and include in translation system

## Credits
Based on [Create Foundry Project](https://www.npmjs.com/package/create-foundry-project). Inspiration to use a typed "template.ts" is from [Blue Rose](https://gitlab.com/studio315b/blue-rose) by studio315b, additional ideas from D&D5E System by Atropos among others.	

[Rune icons](https://runequest-glorantha.fandom.com/wiki/Category:Runes) by [Phil Hibbs](https://basicroleplaying.org/profile/9-philhibbs) are used and they are an adaptation of the The Glorantha Core Runes font and Sorcery rune files are copyright © 2019 Moon Design Publications. Permission is granted for use in products in Chaosium’s Jonstown Compendium on DriveThruRPG. It is also granted for personal and fanzine use, as long as a credit and copyright notice is included, the font is not altered, and no fee of any kind is charged for its use. 

This FoundryVTT System uses trademarks and/or copyrights owned by Chaosium Inc/Moon Design Publications LLC, which are used under Chaosium Inc’s Fan Material Policy. We are expressly prohibited from charging you to use or access this content. This [website, character sheet, or whatever it is] is not published, endorsed, or specifically approved by Chaosium Inc. For more information about Chaosium Inc’s products, please visit www.chaosium.com.	
