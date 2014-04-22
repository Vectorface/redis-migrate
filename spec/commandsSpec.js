var redis          = require('fakeredis').createClient('0', '0.0.0.0', {fast: true});
var expect         = require('expect.js');
var fixtures       = require('./fixtures');
var commandsModule = require('../lib/commands');

var commands, multi, keys;

describe('commands', function() {
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

    it('does not modify the multi queue if no keys match the RegExp', function(done) {
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

  describe('moveHashFieldsToKeys', function() {
    it('returns an Error if missing src.field', function(done) {
      var src = {key: /bar/};
      var dst = {key: 'foo'};

      commands.moveHashFieldsToKeys(src, dst, keys, function(err) {
        expect(err).to.be.an(Error);
        expect(err.message).to.be('Missing src.field');
        done();
      });
    });

    it('does not modify the multi queue if no keys match the RegExp', function(done) {
      var src = {key: /foo/, field: 'bar'};
      var dst = {key: 'bar'};
      var keys = ['invalidKey', 'nonMatchingKey'];

      commands.moveHashFieldsToKeys(src, dst, keys, function(err) {
        expect(err).to.be(undefined);
        expect(multi.queue).to.have.length(1);
        done();
      });
    });

    it('updates the multi to move matching fields to keys', function(done) {
      var src = {key: /(app:thread:[12]):properties/, field: 'replies'};
      var dst = {key: '$1:replies'};

      var expectedQueue = [
        ['MULTI'],
        ['set', 'app:thread:1:replies', 4],
        ['hdel', 'app:thread:1:properties', 'replies'],
        ['set', 'app:thread:2:replies', 5],
        ['hdel', 'app:thread:2:properties', 'replies']
      ];

      commands.moveHashFieldsToKeys(src, dst, keys, function(err) {
        expect(err).to.be(undefined);
        expect(multi.queue).to.have.length(5);
        expect(multi.queue).to.eql(expectedQueue);
        done();
      });
    });
  });

  describe('renameKeys', function() {
    it('does not modify the multi queue if no keys match the RegExp', function(done) {
      var src = {key: /foo/};
      var dst = {key: 'bar', field: 'foo'};
      var keys = ['invalidKey', 'nonMatchingKey'];

      commands.renameKeys(src, dst, keys, function(err) {
        expect(err).to.be(undefined);
        expect(multi.queue).to.have.length(1);
        done();
      });
    });

    it('updates the multi to rename matching keys', function(done) {
      var src = {key: /(app:post:[1]):lastModifiedTimestamp/};
      var dst = {key: '$1:lastModified'};

      var expectedQueue = [
        ['MULTI'],
        ['renamenx', 'app:post:1:lastModifiedTimestamp', 'app:post:1:lastModified']
      ];

      commands.renameKeys(src, dst, keys, function(err) {
        expect(err).to.be(undefined);
        expect(multi.queue).to.have.length(2);
        expect(multi.queue).to.eql(expectedQueue);
        done();
      });
    });
  });
});
