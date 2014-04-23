var redis     = require('fakeredis').createClient('0', '0.0.0.0', {fast: true});
var expect    = require('expect.js');
var fixtures  = require('./fixtures');
var sinon     = require('sinon');
var fs        = require('fs');
var mockfs    = require('mock-fs');

var Migration = require('../lib/migration');

describe('Migration', function() {
  before(function(done) {
    redis.flushdb(function(err) {
      keys = fixtures.getKeys();

      fixtures.loadFixtures(done);
    });
  });

  describe('constructor', function() {
    it('assigns the up and down argument as properties', function() {
      var up = {test: 'foo'};
      var down = {test: 'bar'};
      var migration = new Migration(up, down);

      expect(migration.up).to.eql(up);
      expect(migration.down).to.eql(down);
    });
  });

  describe('createFile', function(done) {
    var clock, time;

    before(function() {
      // Create an existing migration with which to conflict, and set the time
      mockfs({'/test/2014-04-23-003445-test.js': 'fake-migration-content'});

      time = new Date('2014-04-23T00:34:45Z').getTime();
      clock = sinon.useFakeTimers(time);
    });

    after(function() {
      mockfs.restore();
      clock.restore();
    });

    it('invokes the callback with an error if the file exists', function(done) {
      Migration.createFile('/test', 'test.js', function(err) {
        expect(err).to.be.an(Error);
        expect(err.message).to.be('Migration file already exists');
        done();
      });
    });

    it('prepends the filename with a formatted datetime', function(done) {
      Migration.createFile('/test', 'testDateTime.js', function(err) {
        expect(err).to.be(null);

        fs.exists('/test/2014-04-23-003445-testDateTime.js', function(exists) {
          expect(exists).to.be(true);
          done();
        });
      });
    });

    it('appends .js to the end of the filename if not present', function(done) {
      Migration.createFile('/test', 'testAppend', function(err) {
        expect(err).to.be(null);

        fs.exists('/test/2014-04-23-003445-testAppend.js', function(exists) {
          expect(exists).to.be(true);
          done();
        });
      });
    });

    it('writes valid js that exports up and down properties', function(done) {
      Migration.createFile('/test', 'testExport.js', function(err) {
        expect(err).to.be(null);

        var migration = require('/test/2014-04-23-003445-testExport.js');

        expect(migration.up).to.be.an(Array);
        expect(migration.down).to.be.an(Array);
        expect(migration.up[0].cmd).to.be('moveKeysToHashFields');
        done();
      });
    });
  });

  describe('loadFromFile', function() {
    var previousWrite;

    before(function() {
      var fileContents = fixtures.getMigrationFileExample();
      mockfs({
        '/test/validMigration.js': fileContents,
        '/test/invalid.js': 'exports.up ==== test &&',
      });
    });

    after(function() {
      mockfs.restore();
    });

    it('invokes the callback with an error if the file does not exist', function(done) {
      Migration.loadFromFile('/test', 'notFound', function(err, migration) {
        expect(err).to.be.an(Error);
        expect(err.message).to.be('Migration file not found');
        expect(migration).to.be(undefined);
        done();
      });
    });

    /**
     * This spec, due to requiring an invalid file, will result in the
     * following console output:
     *
     * /test/invalid.js:1
     * on (exports, require, module, __filename, __dirname) { exports.up ==== test &&
     *
     * This is to be expected, however, the output can't be suppressed by
     * simply overwriting process.stdout.write. As such, it will be skipped
     * until I find an appropriate solution.
     */
    it.skip('invokes the callback with an error if the file is not valid js', function(done) {
      Migration.loadFromFile('/test', 'invalid.js', function(err, migration) {
        expect(err).to.be.an(Error);
        expect(err.message).to.be('Invalid migration file');
        expect(migration).to.be(undefined);
        done();
      });
    });

    it('invokes the callback with a new Migration instance on success', function(done) {
      Migration.loadFromFile('/test', 'validMigration.js', function(err, migration) {
        expect(err).to.be(null);
        expect(migration).to.be.an(Migration);

        expect(migration.up[0]).to.eql({
          cmd:  'moveKeysToHashFields',
          src:  {key: /(namespace:model:\d+):example/},
          dst:  {key: '$1:properties', field: 'example'}
        });
        expect(migration.down[0]).to.eql({
          cmd:  'moveHashFieldsToKeys',
          src:  {key: /(namespace:model:\d+):properties/, field: 'example'},
          dst:  {key: '$1:example'}
        });
        done();
      });
    });
  });
});
