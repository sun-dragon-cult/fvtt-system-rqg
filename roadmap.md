# Roadmap 
#### Runequest Gloranta system for Foundry Virtual Table Top

* [x] Setup Dev environment
* [x] Setup basic template.json
* [x] Display data (template.json) value on character sheet
* [x] Update character data from character sheet
* [x] Handle translation
* [x] Move template/*.html next to relevant ts?
* [x] Flesh out template.json with variables
* [x] Scrap template.json and build models instead that are initialized in the prepareData() method in Actor
      (Build template.json setup as objects (with typescript types) and build/export the template.json to dist)
* [x] Get styling to work (gulp error) - TODO Modularize? css classes can be added by actor-sheet.ts !
* [x] Use Actor prepareData() to add modifyers/bonuses to skills (for lookup)
    * [x] Investigate tables (for modifiers)
* [x] Design Character html sheet
    * [x] Show all data
    * [x] Implement tabs for **Main** - **Skills** - **Inventory** - **Background** - ...
* [ ] Figure out how to handle variable data (skills with basic keys + extra)
* [ ] Implement Items
    * [ ] template.json
    * [ ] item-sheet
    * [ ] Look over **Items** tab
* [ ] Create Item sheet (skills, items etc...)
* [ ] Combat
* [ ] Spirit Magic
* [ ] Rune Magic
* [ ] Races / NPC ?? Split hitlocations etc into race specific -> filter displayed locations on race (and add them all to character)
* [ ] Optimise svg's - Have to open and resave them :-(
* [ ] When clicking characteristics show a "roll against" dialog (and make it harder to change them)
* [ ] Display POW experience checkbox in some way
* [ ] Show occupation dropdown on background tab
* [ ] Calendar ?!?
---
* [ ] Figure out how releases work (why they didn't work... gulp?)
* [ ] Character creation (far future)
* [ ] Use Compendium for other races than humanoid? -- probably not
