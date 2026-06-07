/**
 * Central logging module for the RQG system.
 *
 * Exports the general RqgLogger and specialized migration logger.
 */

export { RqgLogger, type LogOptions } from "./rqg-logger";
export { MigrationLogger, type MigrationLogOptions } from "./migration-logger";
