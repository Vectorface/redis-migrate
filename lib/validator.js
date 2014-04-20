var fs    = require('fs');
var path  = require('path');
var async = require('async');
var util  = require('util');

module.exports = Validator;

/**
 * Creates a new validator for validating a given migration, its actions,
 * as well as its individual entries.
 *
 * @constructor
 *
 * @param {string[]} cmdNames Array of command names available to migrations
 */
function Validator(cmdNames) {
  this.cmdNames = cmdNames;
}

/**
 * Validates a migration, ensuring that all entries for both actions adhere
 * to the correct format.
 *
 * @params {function} fn Callback to invoke
 */
Validator.prototype.validateMigration = function(migration, fn) {
  var validator = this;

  async.each([migration.up, migration.down], function(action, next) {
    validator.validateAction(action, next);
  }, fn);
};

/**
 * Validates an array of migration entries.
 *
 * @param {Object[]} entries
 * @param {function} fn
 */
Validator.prototype.validateAction = function(entries, fn) {
  var validator = this;

  if (!(entries instanceof Array)) {
    return fn(new Error('Invalid migration loaded'));
  }

  async.eachSeries(entries, function(entry, next) {
    validator.validateEntry(entry, next);
  }, fn);
};

/**
 * Validates a given migration entry.
 *
 * @param {Object}   entry
 * @param {function} fn
 */
Validator.prototype.validateEntry = function(entry, fn) {
  var validator = this;
  var errorMsg;

  if (typeof entry !== 'object') {
    errorMsg = util.format('Error in migration entry:', entry);
    return fn(new Error(errorMsg));
  }

  async.eachSeries(['cmd', 'src', 'dst'], function(key, next) {
    if (!entry[key]) {
      errorMsg = util.format('Missing', key, 'in migration entry:', entry);
      return next(new Error(errorMsg));
    }

    return next();
  }, function(err) {
    if (err) return fn(err);

    fn(validator._getEntryFormatError(entry));
  });
};

/**
 * Helper function used by Migration.validateEntry to retrieve any errors
 * related to the entry's format.
 *
 * @param {Object}   entry
 */
Validator.prototype._getEntryFormatError = function(entry) {
  var src = entry.src;
  var dst = entry.dst;

  if (this.cmdNames.indexOf(entry.cmd) === -1) {
    return new Error(util.format('Invalid cmd', entry));
  }

  if (typeof src !== 'object' || !(src.key instanceof RegExp)) {
    return new Error(util.format('Invalid src', entry));
  }

  if (typeof dst !== 'object' || typeof dst.key !== 'string') {
    return new Error(util.format('Invalid dst', entry));
  }
};
