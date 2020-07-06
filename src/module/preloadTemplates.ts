export const preloadTemplates = async function() {
	console.log('*** PreloadTemplates js *** DEBUG');

	const templatePaths = [

		"systems/rqg/templates/actor-sheet.html",
		"systems/rqg/templates/item-sheet.html",
	];

	return loadTemplates(templatePaths);
}
