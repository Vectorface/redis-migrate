var async = require('async');
var redis = require('fakeredis').createClient('0', '0.0.0.0', {fast: true});

var userData = {
  'app:user:1:username': 'username1',
  'app:user:2:username': 'username2',
  'app:user:3:username': 'username3',
  'app:user:1:address':  'user1 address',
  'app:user:2:address':  'user2 address',
  'app:user:3:address':  'user3 address'
};

var postData = {
  'app:post:1:content':               'post1 content',
  'app:post:2:content':               'post2 content',
  'app:post:3:content':               'post3 content',
  'app:post:1:lastModifiedTimestamp': '1397825120',
  'app:post:2:lastModifiedTimestamp': '1397825130',
  'app:post:3:lastModifiedTimestamp': '1397825140'
};

exports.loadData = loadData;

/**
 * Given an object, saves each key value pair to redis using SET.
 *
 * @param {Object}   data Object to save
 * @param {function} fn   The callback to invoke
 */
function loadData(data, fn) {
  var multi = redis.multi();

  async.each(Object.keys(data), function(key, next) {
    multi.set(key, data[key]);
    next();
  }, function(err) {
    multi.exec(fn);
  });
}

/**
 * Loads example user and post data for use in specs.
 *
 * @param {function} fn The callback to invoke
 */
exports.loadFixtures = function(fn) {
  async.series([
    function(next) {
      loadData(userData, next);
    },
    function(next) {
      loadData(postData, next);
    }
  ], fn);
};

/**
 * Returns an array of keys populated by the module's loadFixtures function.
 *
 * @returns {string[]} An array of strings indicating the inserted keys
 */
exports.getKeys = function() {
  var userKeys = Object.keys(userData);
  var postKeys = Object.keys(postData);

  return userKeys.concat(postKeys);
};
