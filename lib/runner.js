var fs        = require('fs');
var path      = require('path');
var async     = require('async');

var commands  = require('./commands');
var utils     = require('./utils');

var Migration = require('./migration');
var Validator = require('./validator');

var redis, multi;

/**
 * Creates an example migration file given a path to the directory in which
 * to create the file, and a non-timestamped name. Invokes the callback upon
 * completion, or error.
 *
 * @param {string}   directoryPath Path to the dir in which to create the file
 * @param {string}   migrationName Non-timestamped name to give the migration
 * @param {function} fn            The callback to invoke
 */
exports.create = function(directoryPath, migrationName, fn) {
  Migration.createFile(directoryPath, migrationName, fn);
};

/**
 * Loads the migration file given by directoryPath and migrationName, and
 * runs the 'migrate up' action on the supplied redis client db.
 *
 * @param {RedisClient} redis         A connected redis client
 * @param {string}      directoryPath Path to the dir where the file is located
 * @param {string}      migrationName Full name of the migration file
 * @param {function}    fn            The callback to invoke
 */
exports.up = function(redis, directoryPath, migrationName, fn) {
  migrate('up', redis, directoryPath, migrationName, fn);
};

/**
 * Loads the migration file given by directoryPath and migrationName, and
 * runs the 'migrate down' action on the supplied redis client db.
 *
 * @param {RedisClient} redis         A connected redis client
 * @param {string}      directoryPath Path to the dir where the file is located
 * @param {string}      migrationName Full name of the migration file
 * @param {function}    fn            The callback to invoke
 */
exports.down = function(redis, directoryPath, migrationName, fn) {
  migrate('down', redis, directoryPath, migrationName, fn);
};

/**
 * A helper function used by runner.up and runner.down to load and validate the
 * given migration, and perform the specified action on the selected redis db.
 *
 * @param {string}      action        One of 'up' or 'down'
 * @param {RedisClient} redis         A connected redis client
 * @param {string}      directoryPath Path to the dir where the file is located
 * @param {string}      migrationName Full name of the migration file
 * @param {function}    fn            The callback to invoke
 */
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
 * @param {string}   action    One of 'up' or 'down'
 * @param {object}   migration The migration to run
 * @param {object}   commands  An object containing all available commands
 * @param {function} fn        The callback to invoke
 */
function run(action, migration, commands, fn) {
  getKeys(migration[action], function(err, keys) {
    if (err) return fn(err);

    async.eachSeries(migration[action], function(entry, next) {
      var cmd = commands[entry.cmd];
      var pattern = utils.getGlobPattern(entry.src.key);

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
 * Retrieves the keys from redis pertaining to the given src key regular
 * expressions. This is a blocking operation and should not be ran in
 * production on a potentially large dataset. Replace with a scan later on.
 * Returns an object mapping glob patterns to their returned keys.
 *
 * @param {RegExp}   entries The migration's entries
 * @param {function} fn      Callback to invoke, passing it a keys object
 */
function getKeys(entries, fn) {
  var keys = {};

  async.eachSeries(entries, function(entry, next) {
    var pattern = utils.getGlobPattern(entry.src.key);
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
