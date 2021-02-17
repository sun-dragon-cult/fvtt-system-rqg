# [0.9.0](https://github.com/wakeand/fvtt-system-rqg/compare/v0.8.0...v0.9.0) (2021-02-14)


### Bug Fixes

* exclude natural weapons from gear by-location view ([bae724d](https://github.com/wakeand/fvtt-system-rqg/commit/bae724d))
* HP is not correctly calculated ([9f7a734](https://github.com/wakeand/fvtt-system-rqg/commit/9f7a734))
* MOV not initialised properly ([4b5b86b](https://github.com/wakeand/fvtt-system-rqg/commit/4b5b86b))
* remove description field from cultSheet and rephrase sub cult field label ([c588731](https://github.com/wakeand/fvtt-system-rqg/commit/c588731))
* write protect background tab unless GM ([ed5084c](https://github.com/wakeand/fvtt-system-rqg/commit/ed5084c))


### Features

* display effective SR in combat section ([2f9073f](https://github.com/wakeand/fvtt-system-rqg/commit/2f9073f))
* hide menu tabs/sections without content ([604f9e3](https://github.com/wakeand/fvtt-system-rqg/commit/604f9e3))
* make spirit combat & damage bonus rollable ([2ff9965](https://github.com/wakeand/fvtt-system-rqg/commit/2ff9965))
* show the actor's elemental runes next to name ([202a651](https://github.com/wakeand/fvtt-system-rqg/commit/202a651))




# [0.8.0](https://github.com/wakeand/fvtt-system-rqg/compare/v0.7.0...v0.8.0) (2021-02-10)


### Bug Fixes

* armor don't update hitlocation AP ([54723db](https://github.com/wakeand/fvtt-system-rqg/commit/54723db))
* hitlocation compendium name wrong ([822a0b6](https://github.com/wakeand/fvtt-system-rqg/commit/822a0b6))


### Features

* add location, isContainer & physicalItemType to gear-page items also added a separate tab on gear that shows nested objects ([17e4f7f](https://github.com/wakeand/fvtt-system-rqg/commit/17e4f7f))
* define hitlocation HP delta on hitlocation item ([92cfeae](https://github.com/wakeand/fvtt-system-rqg/commit/92cfeae))
* equipStatus is now synced across contained items also split gear / currency / consumables view ([b973624](https://github.com/wakeand/fvtt-system-rqg/commit/b973624))




# [0.7.0](https://github.com/wakeand/fvtt-system-rqg/compare/v0.6.1...v0.7.0) (2021-02-02)


### Features

* add race as text field also fix rune context menu ([fe49d85](https://github.com/wakeand/fvtt-system-rqg/commit/fe49d85))
* allow link to journalentry with description from items Now implemented for: skill, rune, cult, spirit-magic & rune-magic ([5e83fc0](https://github.com/wakeand/fvtt-system-rqg/commit/5e83fc0))
* allow link to journalentry with description from rune magic item ([2bed846](https://github.com/wakeand/fvtt-system-rqg/commit/2bed846))
* apply armor penalties to the move quietly skill ([db187d9](https://github.com/wakeand/fvtt-system-rqg/commit/db187d9))
* autoset passion image depending on passion type ([0c9be18](https://github.com/wakeand/fvtt-system-rqg/commit/0c9be18))
* chatcards for characteristics also implement click/doubleclick on characteristics ([c695128](https://github.com/wakeand/fvtt-system-rqg/commit/c695128))
* implement 3-state equipped flag: notCarried, carried, equipped also implement CONFIG.RQG ([18a2fc5](https://github.com/wakeand/fvtt-system-rqg/commit/18a2fc5))
* let GM edit move ([e52c666](https://github.com/wakeand/fvtt-system-rqg/commit/e52c666))
* make characteristics rollable also make them editable for GM only ([fe55a2d](https://github.com/wakeand/fvtt-system-rqg/commit/fe55a2d))
* possibility to remove skill check for skills that needs to be studied ([6f5204d](https://github.com/wakeand/fvtt-system-rqg/commit/6f5204d))




## [0.6.1](https://github.com/wakeand/fvtt-system-rqg/compare/v0.6.0...v0.6.1) (2021-01-20)




# [0.6.0](https://github.com/wakeand/fvtt-system-rqg/compare/v0.5.0...v0.6.0) (2021-01-20)


### Bug Fixes

* Display item type in item sheet dialogs. ([d3dd30a](https://github.com/wakeand/fvtt-system-rqg/commit/d3dd30a))
* Make it possible to create non Embedded Rune Spell Items. Also connect spells dragged to actor, and disconnect spells from deleted Cults. ([58d4e6e](https://github.com/wakeand/fvtt-system-rqg/commit/58d4e6e))
* NPE if weapon was equipped but didn't have a associated skill. ([9887cd4](https://github.com/wakeand/fvtt-system-rqg/commit/9887cd4))
* only prevent items with same type & name, also display a notification when adding an item is blocked ([a3540ee](https://github.com/wakeand/fvtt-system-rqg/commit/a3540ee))
* passion honor automatically gets subject Since passions always will be created directly as ownedItems, the name autofill fix is not needed here. ([00ab88a](https://github.com/wakeand/fvtt-system-rqg/commit/00ab88a))
* Set default Power Rune chance to 50. ([f92e5ce](https://github.com/wakeand/fvtt-system-rqg/commit/f92e5ce))
* show itemsheet if weapon skill could not be found ([6c639ec](https://github.com/wakeand/fvtt-system-rqg/commit/6c639ec))


### Features

* Add Cult tagline. Also remove redundant data-dtype attributes. ([01303d0](https://github.com/wakeand/fvtt-system-rqg/commit/01303d0))
* Add dropdown to choose RuneItem minor runes. ([7b2c6a1](https://github.com/wakeand/fvtt-system-rqg/commit/7b2c6a1))
* Add isNatural checkbox for melee weaponsheet ([a93cccf](https://github.com/wakeand/fvtt-system-rqg/commit/a93cccf))
* Add price field for gear including all kinds of weapons. ([0d4ae07](https://github.com/wakeand/fvtt-system-rqg/commit/0d4ae07))
* Add proper RuneMagic data. Also refactor adding cult runes etc to a BaseItem#onEmbedItem & BaseItem#onDeleteItem. ([0209fe0](https://github.com/wakeand/fvtt-system-rqg/commit/0209fe0))
* Add runes to cults and correct chance calculation of magic runes spells. Also show rune icons för cults and rune magic. ([8c05693](https://github.com/wakeand/fvtt-system-rqg/commit/8c05693))
* Add runes to skills for Sorcery Magic. ([02c076f](https://github.com/wakeand/fvtt-system-rqg/commit/02c076f))
* Add skill specializations - like "Speak (Trade talk)" ([517f6b2](https://github.com/wakeand/fvtt-system-rqg/commit/517f6b2))
* Add spell focus field to spirit magic items. Change name of "spellType" to "concentration" and hide/set that field depending on duration. Improve actor sheet display of spirit magic variable value (yes/no instead of readonly checkbox). ([902017b](https://github.com/wakeand/fvtt-system-rqg/commit/902017b))
* Add support for magic crystals affecting "data.attributes.magicPoints.max". Also round ENC calculations. ([dec21f7](https://github.com/wakeand/fvtt-system-rqg/commit/dec21f7))
* Allow edit of current cult runepoints from actorsheet. ([70ffa64](https://github.com/wakeand/fvtt-system-rqg/commit/70ffa64))
* Auto add linked weapon skill ([#44](https://github.com/wakeand/fvtt-system-rqg/issues/44)) ([7b3fdb6](https://github.com/wakeand/fvtt-system-rqg/commit/7b3fdb6))
* Automatically add Cult runes to the Actor when "embedding" the Cult. ([fe657db](https://github.com/wakeand/fvtt-system-rqg/commit/fe657db))
* calculate and use encumbrance penalties for dodge & skill category bonuses ([ef8ad01](https://github.com/wakeand/fvtt-system-rqg/commit/ef8ad01))
* Change create Actor to create a bare bone actor that can be added to by dragging hitlocations, skills etc to it. ([7b171df](https://github.com/wakeand/fvtt-system-rqg/commit/7b171df))
* Implement an onUpdateItem "lifecycle" function for BaseItem. Also remove some of the excessive logging. ([1446ff3](https://github.com/wakeand/fvtt-system-rqg/commit/1446ff3))
* item context menus first unfinished version ([66f666d](https://github.com/wakeand/fvtt-system-rqg/commit/66f666d))
* Limit HP to max HP. ([069e25f](https://github.com/wakeand/fvtt-system-rqg/commit/069e25f))
* Make the covered hit locations in armor items selectable from a dropdow populated from a compendium pointer to by a game setting. Also various smaller fixes. ([4076460](https://github.com/wakeand/fvtt-system-rqg/commit/4076460))
* new ui look, first iteration ([486ad7a](https://github.com/wakeand/fvtt-system-rqg/commit/486ad7a))
* Populate Skill, Rune & Passion from initial name when created. ([3bd04a9](https://github.com/wakeand/fvtt-system-rqg/commit/3bd04a9))
* prevent adding duplicate items (based on name) This might need some modification at some point ([23e63dd](https://github.com/wakeand/fvtt-system-rqg/commit/23e63dd))
* show item image in actor sheet (gear, magic, ...) ([0c94979](https://github.com/wakeand/fvtt-system-rqg/commit/0c94979))
* Show melee weapon SR in actorsheet Combat section. Also correct size of HP input field length. ([1cfb25f](https://github.com/wakeand/fvtt-system-rqg/commit/1cfb25f))
* show spirit magic CHA limit and sorcery free INT ([93bcc8c](https://github.com/wakeand/fvtt-system-rqg/commit/93bcc8c))
* Sort skills. ([d8734b7](https://github.com/wakeand/fvtt-system-rqg/commit/d8734b7))
* Use Runes from compendium. ([#42](https://github.com/wakeand/fvtt-system-rqg/issues/42)) ([c97b3d4](https://github.com/wakeand/fvtt-system-rqg/commit/c97b3d4))




# [0.5.0](https://github.com/wakeand/fvtt-system-rqg/compare/v0.4.0...v0.5.0) (2020-11-17)


### Bug Fixes

* Communication Skill bonus was wrong. ([332961e](https://github.com/wakeand/fvtt-system-rqg/commit/332961e))
* Correct damage bonus & spirir combat damage calculations. ([2218b98](https://github.com/wakeand/fvtt-system-rqg/commit/2218b98))


### Features

* Add Rune Magic Item ([b9c7ee7](https://github.com/wakeand/fvtt-system-rqg/commit/b9c7ee7))
* Cult item v1. ([67f52e2](https://github.com/wakeand/fvtt-system-rqg/commit/67f52e2))
* Make Passions name reflect the whole passion. Also makes honor work with the passion system. ([a5c3c91](https://github.com/wakeand/fvtt-system-rqg/commit/a5c3c91))




# [0.4.0](https://github.com/wakeand/fvtt-system-rqg/compare/v0.3.0...v0.4.0) (2020-11-09)


### Bug Fixes

* Make Armor is only applied once, even when editing hit location item. Updated ts type definition and removed some ts-ignores. ([cbe1fc3](https://github.com/wakeand/fvtt-system-rqg/commit/cbe1fc3))


### Features

* Add and edit active effects to select item types via a rough GUI. ([0510b82](https://github.com/wakeand/fvtt-system-rqg/commit/0510b82))
* Calculate ENC movement penalty and show current MOV on ActorSheet. ([ea30b72](https://github.com/wakeand/fvtt-system-rqg/commit/ea30b72))




# [0.3.0](https://github.com/wakeand/fvtt-system-rqg/compare/v0.2.0...v0.3.0) (2020-10-22)


### Bug Fixes

* A roll of 01-05 is always a success. ([300dada](https://github.com/wakeand/fvtt-system-rqg/commit/300dada))
* Changed armor references to hitlocation. Layout fixes, including moving runes to a tab. Type fixes in ActorSheet ([5c79e8f](https://github.com/wakeand/fvtt-system-rqg/commit/5c79e8f))
* Cleaned up layout of items in actor sheet. ([e20ab89](https://github.com/wakeand/fvtt-system-rqg/commit/e20ab89))
* Hide "natural" weapons on the gear tab. ([06d053c](https://github.com/wakeand/fvtt-system-rqg/commit/06d053c))
* Hide "natural" weapons on the gear tab. ([2d35a3f](https://github.com/wakeand/fvtt-system-rqg/commit/2d35a3f))
* Missed a classname. ([a010aaf](https://github.com/wakeand/fvtt-system-rqg/commit/a010aaf))
* show AP value. ([3685ebd](https://github.com/wakeand/fvtt-system-rqg/commit/3685ebd))


### Features

* Add input field for weapon HP. Also move total actor hitpoints closer to hitlocation/wounds. ([93f2846](https://github.com/wakeand/fvtt-system-rqg/commit/93f2846))
* Add natural weapons. Also add "combat maneuvers" to melee weapons to specify what you can do with them. ([6d2c9df](https://github.com/wakeand/fvtt-system-rqg/commit/6d2c9df))
* Add Spirit Combat to the Actor Sheet. Also add Dodge skill roll to Combat section and move Damage Bonus & Healing rate to the their sections. ([6d019c8](https://github.com/wakeand/fvtt-system-rqg/commit/6d019c8))
* Added Experience checkboxes to Combat (and all other experience). Made Equipped a checkbox. Added some todo-tabs. ([8831604](https://github.com/wakeand/fvtt-system-rqg/commit/8831604))
* Connect skillItem to meleeWeapon item and make it rollable from actorsheet. ([8b0b462](https://github.com/wakeand/fvtt-system-rqg/commit/8b0b462))
* Include shields in MeleeWeaponItems. ([ba0ad62](https://github.com/wakeand/fvtt-system-rqg/commit/ba0ad62))
* Sort combat tracker on increasing initiative (SR) and prefill SIZ + DEX SR. So far weapon SR isn't used. ([c1eba23](https://github.com/wakeand/fvtt-system-rqg/commit/c1eba23))




# [0.2.0](https://github.com/wakeand/fvtt-system-rqg/compare/v0.1.11...v0.2.0) (2020-09-16)


### Features

* Add Armor Item. ([#28](https://github.com/wakeand/fvtt-system-rqg/issues/28)) ([6b845b2](https://github.com/wakeand/fvtt-system-rqg/commit/6b845b2))
* Add Gear Item. ([#26](https://github.com/wakeand/fvtt-system-rqg/issues/26)) ([e49141a](https://github.com/wakeand/fvtt-system-rqg/commit/e49141a))
* Calculate embedded item data from actor. Added default skills & a skill compendium. Add owned item listener (passions example) ([19ec695](https://github.com/wakeand/fvtt-system-rqg/commit/19ec695))




## [0.1.11](https://github.com/wakeand/fvtt-system-rqg/compare/v0.1.10...v0.1.11) (2020-09-01)




## [0.1.10](https://github.com/wakeand/fvtt-system-rqg/compare/v0.1.9...v0.1.10) (2020-08-31)




## [0.1.9](https://github.com/wakeand/fvtt-system-rqg/compare/v0.1.8...v0.1.9) (2020-08-30)




## [0.1.8](https://github.com/wakeand/fvtt-system-rqg/compare/v0.1.7...v0.1.8) (2020-08-30)




## [0.1.7](https://github.com/wakeand/fvtt-system-rqg/compare/v0.1.6...v0.1.7) (2020-08-30)





## [0.1.5](https://github.com/wakeand/fvtt-system-rqg/compare/v0.1.4...v0.1.5) (2020-08-30)




## [0.1.4](https://github.com/wakeand/fvtt-system-rqg/compare/v0.1.3...v0.1.4) (2020-08-30)




## [0.1.3](https://github.com/wakeand/fvtt-system-rqg/compare/v0.1.2...v0.1.3) (2020-08-30)
