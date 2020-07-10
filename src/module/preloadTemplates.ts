export const preloadTemplates = async function() {

	const templatePaths = [
		"systems/rqg/module/actor/actor-sheet.html",
		"systems/rqg/module/actor/parts/main-tab.html",
		"systems/rqg/module/actor/parts/skills-tab.html",
		"systems/rqg/module/actor/parts/inventory-tab.html",
		"systems/rqg/module/actor/parts/background-tab.html",

		"systems/rqg/module/item/item-sheet.html",
	];

	return loadTemplates(templatePaths);
}
