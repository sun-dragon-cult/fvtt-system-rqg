export const preloadTemplates = async function() {

	const templatePaths = [

		"systems/rqg/module/actor/actor-sheet.html",
		"systems/rqg/module/item/item-sheet.html",
	];

	return loadTemplates(templatePaths);
}
