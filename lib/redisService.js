var async = require('async');
var utils = require('./utils');

/**
 * Defines a set of functions related to retrieving data from redis for the
 * purpose of executing a migration.
 *
 * @param   {RedisClient} redis The node_redis client to use
 * @returns {Object}      The available service functions
 */
module.exports = function(redis) {
  var service = {};

  /**
   * Retrieves the keys from redis pertaining to the given src key regular
   * expressions. This is a blocking operation and should not be ran in
   * production on a potentially large dataset. Replace with a scan later on.
   * Returns an object mapping glob patterns to their returned keys.
   *
   * @param {RegExp}   entries The migration's entries
   * @param {function} fn      Callback to invoke, passing it a keys object
   */
  service.getKeys = function(entries, fn) {
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
  };

  return service;
};
