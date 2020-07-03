export const preloadTemplates = async function() {
	const templatePaths = [
		// Add paths to "systems/foundry-vtt-runequest-glorantha/templates"
	];

	return loadTemplates(templatePaths);
}
