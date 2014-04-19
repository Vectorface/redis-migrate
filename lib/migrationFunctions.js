var async = require('async');

/**
 * Defines the functions available for use in a migration. The module is invoked
 * by passing the redis client instance to the db which should be used, in
 * addition to the Multi object holding the migration transaction with all
 * modifications to apply.
 *
 * @param   {RedisClient} redis The node_redis client to use
 * @param   {Multi}       multi A node_redis Multi object for the transaction
 * @returns {Object}      An object whose key value pairs are the available
 *                        migration functions
 */
module.exports = function(redis, multi) {
  var migrationFunctions = {};

  /**
   * Moves all matching key values to a hash field. Uses HSETNX, and DEL.
   *
   * @param {Object|RegExp} src
   * @param {Object|string} dst
   * @param {array}         keys An array of keys eligible for migration
   * @param {function}      fn
   */
  migrationFunctions.moveKeysToHashFields = function(src, dst, keys, fn) {
    async.eachSeries(keys, function(key, next) {
      if (!dst.field) return next(new Error('Missing dst.field'));
      if (!src.key.test(key)) return next();

      var newKey = key.replace(src.key, dst.key);
      redis.get(key, function(err, value) {
        if (err) return next(err);

        multi.hsetnx(newKey, dst.field, value);
        multi.del(key);

        return next();
      });
    }, fn);
  };

  /**
   * Moves all matching key fields to their own key.
   *
   * @param {Object|RegExp} src
   * @param {Object|string} dst
   * @param {array}         keys An array of keys eligible for migration
   * @param {function}      fn
   */
  migrationFunctions.moveHashFieldsToKeys = function(src, dst, keys, fn) {
    async.eachSeries(keys, function(key, next) {
      if (!src.field) return next(new Error('Missing src.field'));
      if (!src.key.test(key)) return next();

      var newKey = key.replace(src.key, dst.key);
      redis.hget(key, src.field, function(err, value) {
        if (err) return next(err);

        multi.set(newKey, value);
        multi.hdel(key, src.field);

        return next();
      });
    }, fn);
  };

  /**
   * Renames matching keys. Uses Redis' RENAMENX.
   *
   * @param {Object|RegExp} src
   * @param {Object|string} dst
   * @param {array}         keys An array of keys eligible for migration
   * @param {function}      fn
   */
  migrationFunctions.renameKeys = function(src, dst, keys, fn) {
    async.eachSeries(keys, function(key, next) {
      if (!src.key.test(key)) return next();

      var newKey = key.replace(src.key, dst.key);
      multi.renamenx(key, newKey);

      return next();
    }, fn);
  };

  return migrationFunctions;
};
