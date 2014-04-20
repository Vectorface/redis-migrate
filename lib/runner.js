var fs        = require('fs');
var path      = require('path');
var async     = require('async');

var commands  = require('./commands');
var utils     = require('./utils');

var Migration = require('./migration');
var Validator = require('./validator');

var redis, multi;

exports.create = function(directoryPath, migrationName, fn) {
  Migration.createFile(directoryPath, migrationName, fn);
};

exports.up = function(redis, directoryPath, migrationName, fn) {
  migrate('up', redis, directoryPath, migrationName, fn);
};

exports.down = function(redis, directoryPath, migrationName, fn) {
  migrate('down', redis, directoryPath, migrationName, fn);
};

function migrate(action, redisClient, directoryPath, migrationName, fn) {
  var avilableCommands, validator;

  redis = redisClient;
  multi = redis.multi();

  Migration.loadFromFile(directoryPath, migrationName, function(err, migration) {
    if (err) return fn(err);

    avilableCommands = commands(redis, multi);
    validator = new Validator(Object.keys(avilableCommands));

    validator.validateMigration(migration, function(err) {
      if (err) return fn(err);

      run(action, migration, avilableCommands, fn);
    });
  });
}

/**
 * Runs the migration within a single transaction.
 *
 * @param {object} migration The migration to run
 */
function run(action, migration, commands, fn) {
  getKeys(migration[action], function(err, keys) {
    if (err) return fn(err);

    async.forEach(migration[action], function(entry, next) {
      var cmd = commands[entry.cmd];
      var pattern = utils.getGlobPattern(entry);

      cmd(entry.src, entry.dst, keys[pattern], next);
    }, function(err) {
      console.log('Updates to perform:', (multi.queue.length - 1));

      multi.exec(function(err, res) {
        if (err || !res.length) return fn(err);

        console.log('Migration complete');
        fn();
      });
    });
  });
}

/**
 * Retrieves keys from redis pertaining to the given src key regular
 * expressions. This is a blocking operation and should not be ran in
 * production. Replace with a scan later on. Returns an object mapping
 * glob patterns to their returned keys.
 *
 * @param {RegExp}   entries The migration's entries
 * @param {function} fn      Callback to invoke, passing it a keys object
 */
function getKeys(entries, fn) {
  var keys = {};
  async.forEach(entries, function(entry, next) {
    var pattern = utils.getGlobPattern(entry);
    if (keys[pattern]) return next();

    redis.keys(pattern, function(err, res) {
      if (err) return next(err);
      keys[pattern] = res;

      return next();
    });
  }, function(err) {
    if (err) return fn(err);

    return fn(null, keys);
  });
}
