/**
 * This is your TypeScript entry file for Foundry VTT.
 * Register custom settings, sheets, and constants using the Foundry API.
 * Change this heading to be more descriptive to your system, or remove it.
 * Author: [Wake]
 * Content License: [copyright and-or license] If using an existing system
 * 					you may want to put a (link to a) license or copyright
 * 					notice here (e.g. the OGL).
 * Software License: [your license] Put your desired license here, which
 * 					 determines how others may use and modify your system
 */

// Import TypeScript modules
import { registerSettings } from './module/settings.js';
import { preloadTemplates } from './module/preloadTemplates.js';

import { SimpleItemSheet } from "./module/item-sheet.js";
import { SimpleActorSheet } from "./module/actor-sheet.js";
import { ActorRqg } from "./module/actor-rqg";

/* ------------------------------------ */
/* Initialize system					*/
/* ------------------------------------ */
Hooks.once('init', async function() {
	console.log('RQG | Initializing the Runequest Glorantha Game System');

	// Assign custom classes and constants here
	/**
	 * Set an initiative formula for the system
	 * @type {String}
	 */
	CONFIG.Combat.initiative = { // TODO Calculate initiative (SR) instead
		formula: "1d20",
		decimals: 2
	};

	// Define custom Entity classes
	CONFIG.Actor.entityClass = ActorRqg;
	
	// Register custom system settings
	registerSettings();
	
	// Preload Handlebars templates
	await preloadTemplates();

	// Register custom sheets (if any)
	Actors.unregisterSheet("core", ActorSheet);
	Actors.registerSheet("rqg", SimpleActorSheet, { makeDefault: true });

	Items.unregisterSheet("core", ItemSheet);
	Items.registerSheet("rqg", SimpleItemSheet, {makeDefault: true});
});

/* ------------------------------------ */
/* Setup system							*/
/* ------------------------------------ */
Hooks.once('setup', function() {
	// Do anything after initialization but before
	// ready
});

/* ------------------------------------ */
/* When ready							*/
/* ------------------------------------ */
Hooks.once('ready', function() {
	// Do anything once the system is ready
});

// Add any additional hooks if necessary
