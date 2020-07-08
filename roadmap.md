# Roadmap 
#### Runequest Gloranta system for Foundry Virtual Table Top

* [x] Setup Dev environment
* [x] Setup basic template.json
* [x] Display data (template.json) value on character sheet
* [x] Update character data from character sheet
* [x] Handle translation
* [x] Move template/*.html next to relevant ts?
* [ ] Optimise svg's
* [ ] Flesh out template.json with variables
    * [ ] Races / NPC ?? Split hitlocations etc into race specific
* [x] Get styling to work (gulp error) - TODO Modularize? css classes can be added by actor-sheet.ts !
* [ ] Use Actor prepareData() to add modifyers/bonuses to skills (for lookup)
    * [ ] Investigate tables (for modifiers)
* [ ] Design Character html 
    * [ ] Show all data
    * [ ] Implement tabs for **Main** - **Skills** - **Inventory** - **Biography** - ...
* [ ] Figure out how to handle variable data (skills with basic keys + extra)
* [ ] Implement Items
    * [ ] template.json
    * [ ] item-sheet
    * [ ] Look over **Items** tab
* [ ] Combat
* [ ] Spirit Magic
* [ ] Rune Magic
* [ ] Calendar ?!?
---
* [ ] Figure out how releases work (why they didn't work... gulp?)
* [ ] Character creation (far future)
* [ ] Scrap template.json and build models instead that are initialized in the prepareData() method in Actor
      (Build template.json setup as objects (with typescript types) and build/export the template.json to dist)
* [ ] Use Compendium for other races than humanoid
