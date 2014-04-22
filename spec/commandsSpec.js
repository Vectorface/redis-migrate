var redis          = require('fakeredis').createClient('0', '0.0.0.0', {fast: true});
var expect         = require('expect.js');
var fixtures       = require('./fixtures');
var commandsModule = require('../lib/commands');

var commands, multi;

describe('commands', function() {
  var keys;

  before(function(done) {
    redis.flushdb(function(err) {
      keys = fixtures.getKeys();

      fixtures.loadFixtures(done);
    });
  });

  beforeEach(function(done) {
    // Initialize a new commands module with an empty Multi
    multi = redis.multi();
    commands = commandsModule(redis, multi);
    done();
  });

  describe('moveKeysToHashFields', function() {
    it('returns an Error if missing dst.field', function(done) {
      var src = {key: /bar/};
      var dst = {key: 'foo'};

      commands.moveKeysToHashFields(src, dst, keys, function(err) {
        expect(err).to.be.an(Error);
        expect(err.message).to.be('Missing dst.field');
        done();
      });
    });

    it('skips keys that do not match the src RegExp', function(done) {
      var src = {key: /foo/};
      var dst = {key: 'bar', field: 'foo'};
      var keys = ['invalidKey', 'nonMatchingKey'];

      commands.moveKeysToHashFields(src, dst, keys, function(err) {
        expect(err).to.be(undefined);
        expect(multi.queue).to.have.length(1);
        done();
      });
    });

    it('updates the multi to move matching keys to a hash field', function(done) {
      var src = {key: /(app:user:[12]):username/};
      var dst = {key: '$1:properties', field: 'username'};

      var expectedQueue = [
        ['MULTI'],
        ['hsetnx', 'app:user:1:properties', 'username', 'username1'],
        ['del', 'app:user:1:username'],
        ['hsetnx', 'app:user:2:properties', 'username', 'username2'],
        ['del', 'app:user:2:username']
      ];

      commands.moveKeysToHashFields(src, dst, keys, function(err) {
        expect(err).to.be(undefined);
        expect(multi.queue).to.have.length(5);
        expect(multi.queue).to.eql(expectedQueue);
        done();
      });
    });
  });
});
