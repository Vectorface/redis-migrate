var async = require('async');

/**
 * Defines the commands available for use in a migration. The module is invoked
 * by passing the redis client instance to the db which should be used, in
 * addition to the Multi object holding the migration transaction with all
 * modifications to apply. It returns an object with commands that operate
 * on the provided redis client and transaction.
 *
 * @param   {RedisClient} redis The node_redis client to use
 * @param   {Multi}       multi A node_redis Multi object for the transaction
 * @returns {Object}      An object whose key value pairs are the available
 *                        migration commands
 */
module.exports = function(redis, multi) {
  var commands = {};

  /**
   * Moves all matching key values to a hash field. Uses HSETNX, and DEL.
   * The src argument is expected to be an object of the form {key: RegExp},
   * and dst, {key: string, field: string}.
   *
   * @example
   * moveKeysToHashFields(
   *   {key: /(app:user:\d+):address/},
   *   {key: '$1:properties', field: 'address'},
   *   ['app:user:1:address', 'app:user:2:address'],
   *   callbackFunction
   * );
   *
   * @param {Object}   src  Object whose only key, 'key', maps to a RegExp
   * @param {Object}   dst  Object with two keys, both of which containing a
   *                        string: key and field
   * @param {array}    keys Array of keys eligible for migration
   * @param {function} fn   The callback to invoke
   */
  commands.moveKeysToHashFields = function(src, dst, keys, fn) {
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
   * Moves all matching key fields to their own key. The src argument is
   * expected to be an object of the form {key: RegExp, field: string},
   * and dst, {key: string}.
   *
   * @example
   * moveHashFieldsToKeys(
   *   {key: /(app:user:\d+):properties/, field: 'address'},
   *   {key: '$1:address'},
   *   ['app:user:1:properties', 'app:user:2:properties'],
   *   callbackFunction
   * );
   *
   * @param {Object}   src  Object with two keys: key, which maps to a RegExp,
   *                        and 'field', with a string value
   * @param {Object}   dst  Object whose only key, 'key', maps to a string
   * @param {array}    keys Array of keys eligible for migration
   * @param {function} fn   The callback to invoke
   */
  commands.moveHashFieldsToKeys = function(src, dst, keys, fn) {
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
   * Renames matching keys. Uses Redis' RENAMENX. The src argument is expected
   * to be an objet of the form {key: RegExp}, and dst, {key: string}.
   *
   * @example
   * renameKeys(
   *   {key: /(app:post:\d+):lastModifiedTimestamp/},
   *   {key: '$1:lastModified'}
   *   ['app:post:1:lastModifiedTimestamp', 'app:post:2:lastModifiedTimestamp'],
   *   callbackFunction
   * );
   *
   * @param {Object}   src  Object whose only key, 'key', maps to a RegExp
   * @param {Object}   dst  Object with a single key, 'key', and a string value
   * @param {array}    keys An array of keys eligible for migration
   * @param {function} fn   The callback to invoke
   */
  commands.renameKeys = function(src, dst, keys, fn) {
    async.eachSeries(keys, function(key, next) {
      if (!src.key.test(key)) return next();

      var newKey = key.replace(src.key, dst.key);
      multi.renamenx(key, newKey);

      return next();
    }, fn);
  };

  return commands;
};
