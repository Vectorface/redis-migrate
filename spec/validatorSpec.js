var redis     = require('fakeredis').createClient('0', '0.0.0.0', {fast: true});
var expect    = require('expect.js');
var fixtures  = require('./fixtures');
var sinon     = require('sinon');

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

    it('invokes the callback with an error if either action was invalid', function(done) {
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
});
