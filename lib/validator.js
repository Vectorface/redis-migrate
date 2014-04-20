var fs    = require('fs');
var path  = require('path');
var async = require('async');
var util  = require('util');

module.exports = Validator;

/**
 * Creates a new Validator for verifying a given migration, its actions,
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
 * @param {Migration} migration The instance to validate
 * @param {function}  fn        The callback to invoke
 */
Validator.prototype.validateMigration = function(migration, fn) {
  var validator = this;

  async.eachSeries([migration.up, migration.down], function(action, next) {
    validator.validateAction(action, next);
  }, fn);
};

/**
 * Validates an array of migration entries.
 *
 * @param {Object[]} entries Array of objects
 * @param {function} fn      The callback to invoke
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
 * Validates a given migration entry. A valid entry is expected to contain
 * the following three keys: cmd, src and dst. In addition, the values of each
 * key must be either a string or RegExp.
 *
 * @param {Object}   entry A migration entry
 * @param {function} fn    The callback to invoke
 */
Validator.prototype.validateEntry = function(entry, fn) {
  var validator, errorMsg;
  validator = this;

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
 * Helper function used by validateEntry to retrieve any errors related to the
 * entry's format. Verifies that entry.cmd is one of the available migration
 * commands, and that both entry.src and entry.dst have either a string
 * or RegExp value. Returns an instance of Error if the entry failed to conform
 * to the expected format, otherwise it returns null.
 *
 * @param   {Object}     entry A migration entry
 * @returns {null|Error} An error on failure, or null
 */
Validator.prototype._getEntryFormatError = function(entry) {
  var src, dst;

  src = entry.src;
  dst = entry.dst;

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
