var redis    = require('fakeredis').createClient('0', '0.0.0.0', {fast: true});
var expect   = require('expect.js');
var fixtures = require('./fixtures');
var sinon    = require('sinon');
var async    = require('async');

var Validator = require('../lib/validator');

describe('Validator', function() {
  var cmdNames, validator;

  before(function() {
    cmdNames = ['moveKeysToHashFields', 'moveHashFieldsToKeys', 'renameKeys'];
    validator = new Validator(cmdNames);
  });

  describe('constructor', function() {
    it('accepts and assigns an array of command names as a property', function() {
      expect(validator.cmdNames).to.be(cmdNames);
    });
  });

  describe('validator.validateMigration', function() {
    var stub;

    afterEach(function() {
      if (stub.restore) stub.restore();
    });

    it('invokes validateAction for both migration.up and migration.down', function(done) {
      var migration = {up: ['foo'], down: ['bar']};
      stub = sinon.stub(validator, 'validateAction', function(action, fn) {
        return fn();
      });

      validator.validateMigration(migration, function(err) {
        expect(err).to.be(undefined);
        expect(stub.calledTwice).to.be(true);
        expect(stub.calledWith(migration.up)).to.be(true);
        expect(stub.calledWith(migration.down)).to.be(true);
        done();
      });
    });

    it('returns an error if either action was invalid', function(done) {
      stub = sinon.stub(validator, 'validateAction', function(action, fn) {
        return fn(new Error('Invalid migration action'));
      });

      validator.validateMigration({up: ['foo'], down: ['bar']}, function(err) {
        expect(stub.calledOnce).to.be(true);
        expect(err).to.be.an(Error);
        expect(err.message).to.be('Invalid migration action');
        done();
      });
    });

    it('invokes the callback with no error if all actions were valid', function(done) {
      var migration = {};
      migration.up = [
        {
          cmd: 'moveKeysToHashFields',
          src: {key: /(app:user:\d+):address/},
          dst: {key: '$1:properties', field: 'address'}
        },
      ];

      migration.down = [
        {
          cmd: 'renameKeys',
          src: {key: /(app:post:\d+):lastModified/},
          dst: {key: '$1:lastModifiedTimestamp'}
        }
      ];

      validator.validateMigration(migration, function(err) {
        expect(err).to.be(undefined);
        done();
      });
    });
  });

  describe('validator.validateAction', function() {
    var stub;

    afterEach(function() {
      if (stub && stub.restore) stub.restore();
    });

    it('returns an error if the action is not an array', function(done) {
      validator.validateAction({}, function(err) {
        expect(err).to.be.an(Error);
        expect(err.message).to.be('Invalid migration action');
        done();
      });
    });

    it('invokes validateEntry for each entry', function(done) {
      var action = ['entry1', 'entry2'];
      stub = sinon.stub(validator, 'validateEntry', function(entry, fn) {
        return fn();
      });

      validator.validateAction(action, function(err) {
        expect(err).to.be(undefined);
        expect(stub.calledTwice).to.be(true);
        expect(stub.calledWith(action[0])).to.be(true);
        expect(stub.calledWith(action[1])).to.be(true);
        done();
      });
    });

    it('returns an error if either entry was invalid', function(done) {
      stub = sinon.stub(validator, 'validateEntry', function(entry, fn) {
        return fn(new Error('Error in migration entry: ' + entry));
      });

      validator.validateAction(['entry1', 'entry2'], function(err) {
        expect(stub.calledOnce).to.be(true);
        expect(err).to.be.an(Error);
        expect(err.message).to.be('Error in migration entry: entry1');
        done();
      });
    });

    it('invokes the callback with no error if all entries are valid', function(done) {
      var action = [
        {
          cmd: 'moveKeysToHashFields',
          src: {key: /(app:user:\d+):address/},
          dst: {key: '$1:properties', field: 'address'}
        },
        {
          cmd: 'moveKeysToHashFields',
          src: {key: /(app:user:\d+):firstname/},
          dst: {key: '$1:properties', field: 'firstname'}
        },
      ];

      validator.validateAction(action, function(err) {
        expect(err).to.be(undefined);
        done();
      });
    });
  });

  describe('validator.validateEntry', function() {
    it('returns an error if the entry is not an object', function(done) {
      validator.validateEntry(1, function(err) {
        expect(err).to.be.an(Error);
        expect(err.message).to.be('Error in migration entry: 1');
        done();
      });
    });

    it('returns an error if cmd, src, or dst are missing', function(done) {
      var entries = [
        {
          src: {key: /(app:user:\d+):address/},
          dst: {key: '$1:properties', field: 'address'}
        },
        {
          cmd: 'moveKeysToHashFields',
          dst: {key: '$1:properties', field: 'firstname'}
        },
        {
          cmd: 'moveKeysToHashFields',
          src: {key: /(app:user:\d+):lastname/},
        },
      ];

      async.map(entries, function(entry, next) {
        validator.validateEntry(entry, function(err) {
          return next(null, err);
        });
      }, function(err, errors) {
        expect(errors[0].message).to.contain('Missing cmd in migration entry');
        expect(errors[1].message).to.contain('Missing src in migration entry');
        expect(errors[2].message).to.contain('Missing dst in migration entry');
        done();
      });
    });

    it('returns an error if cmd is not a command', function(done) {
      var entry = {
        cmd: 'invalidCommandName',
        src: {key: /(app:user:\d+):address/},
        dst: {key: '$1:properties', field: 'address'}
      };

      validator.validateEntry(entry, function(err) {
        expect(err).to.be.an(Error);
        expect(err.message).to.contain('Invalid cmd');
        done();
      });
    });

    it('returns an error if src.key is not a RegExp', function(done) {
      var entry = {
        cmd: 'moveKeysToHashFields',
        src: {key: ''},
        dst: {key: '$1:properties', field: 'address'}
      };

      validator.validateEntry(entry, function(err) {
        expect(err).to.be.an(Error);
        expect(err.message).to.contain('Invalid src');
        done();
      });
    });

    it('returns an error if dst.key is not a string', function(done) {
      var entry = {
        cmd: 'moveKeysToHashFields',
        src: {key: /(app:user:\d+):address/},
        dst: {key: /invalid/, field: 'address'}
      };

      validator.validateEntry(entry, function(err) {
        expect(err).to.be.an(Error);
        expect(err.message).to.contain('Invalid dst');
        done();
      });
    });
  });
});
