export const preloadTemplates = async function() {

	const templatePaths = [

		"systems/rqg/templates/actor-sheet.html",
		"systems/rqg/templates/item-sheet.html",
	];

	return loadTemplates(templatePaths);
}
