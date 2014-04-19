var fs    = require('fs');
var path  = require('path');
var async = require('async');
var utils = require('./utils');

module.exports = Migration;

/**
 * Creates a new Migration given two arrays defining the migrate up and
 * migrate down actions.
 *
 * @constructor
 *
 * @param {Object[]} up        Array of entries describing the up action
 * @param {Object[]} down      Array of entries describing the down action
 */
function Migration(up, down) {
  this.up = up;
  this.down = down;
}

/**
 * Creates a new migration file with example entries.
 * TODO: Accept a list of functions and generate a template for each
 *
 * @param {string}   directoryPath
 * @param {string}   migrationName
 * @param {function} fn
 */
Migration.createFile = function(directoryPath, migrationName, fn) {
  var migrationFile, formattedDate;

  formattedDate = utils.formatDate(new Date());

  migrationFile = formattedDate + '-' + migrationName;
  migrationFile = path.resolve(directoryPath, migrationFile);

  fs.exists(migrationFile, function(exists) {
    if (exists) return fn(new Error('Migration file already exists'));

    var contents = [
      "exports.up = [",
      "  {",
      "    func: 'moveKeysToHashFields',",
      "    src:  {key: /(namespace:model:\\d+):example/},",
      "    dst:  {key: '$1:properties', field: 'example'}",
      "  }",
      "];\n",
      "exports.down = [",
      "  {",
      "    func: 'moveHashFieldsToKeys',",
      "    src:  {key: /(namespace:model:\\d+):properties/, field: 'example'},",
      "    dst:  {key: '$1:example'}",
      "  }",
      "];\n"
    ].join("\n");

    fs.writeFile(migrationFile, contents, fn);
  });
};

/**
 * Loads a migration given a migration filepath. Passes an error to the
 * callback if the file could not be found. Otherwise it invokes the callback
 * with the loaded Migration instance. Loading the migration file is done
 * synchronously using 'require'.
 *
 * @param {string}   directoryPath
 * @param {string}   migrationName The path to the migration file
 * @param {function} fn            Callback to invoke
 */
Migration.loadFromFile = function(directoryPath, migrationName, fn) {
  var loadedMigration, migration, migrationFile;

  migrationFile = path.resolve(directoryPath, migrationName);

  fs.exists(migrationFile, function(exists) {
    if (!exists) return fn(new Error('Migration file not found'));

    // Load the migration; blocking I/O to avoid reflection
    loadedMigration = require(migrationFile);
    migration = new Migration(loadedMigration.up, loadedMigration.down);

    return fn(null, migration);
  });
};
