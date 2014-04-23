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

var threadData = {
  'app:thread:1:properties': {views: 1, replies: 4},
  'app:thread:2:properties': {views: 2, replies: 5},
  'app:thread:3:properties': {views: 3, replies: 6},
};

/**
 * Given an object, performs the given redis command to each key value pair.
 *
 * @param {string}   command The redis command to be applied to each pair
 * @param {Object}   data    Fixtures to iterate
 * @param {function} fn      The callback to invoke
 */
function applyToFixtures(command, data, fn) {
  var multi = redis.multi();

  async.each(Object.keys(data), function(key, next) {
    multi[command](key, data[key]);
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
      applyToFixtures('set', userData, next);
    },
    function(next) {
      applyToFixtures('set', postData, next);
    },
    function(next) {
      applyToFixtures('hmset', threadData, next);
    }
  ], fn);
};

/**
 * Returns an array of keys populated by the module's loadFixtures function.
 *
 * @returns {string[]} An array of strings indicating the inserted keys
 */
exports.getKeys = function() {
  var userKeys   = Object.keys(userData);
  var postKeys   = Object.keys(postData);
  var threadKeys = Object.keys(threadData);

  return userKeys.concat(postKeys).concat(threadKeys);
};

/**
 * Returns an example migration file's contents as a string.
 *
 * @returns {string} The file contents
 */
exports.getMigrationFileExample = function() {
  return [
    "exports.up = [",
    "  {",
    "    cmd:  'moveKeysToHashFields',",
    "    src:  {key: /(namespace:model:\\d+):example/},",
    "    dst:  {key: '$1:properties', field: 'example'}",
    "  }",
    "];\n",
    "exports.down = [",
    "  {",
    "    cmd:  'moveHashFieldsToKeys',",
    "    src:  {key: /(namespace:model:\\d+):properties/, field: 'example'},",
    "    dst:  {key: '$1:example'}",
    "  }",
    "];\n"
  ].join("\n");
};
