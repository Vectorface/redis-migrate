var redis  = require('fakeredis').createClient('0', '0.0.0.0', {fast: true});
var expect = require('expect.js');
var utils  = require('../lib/utils');

describe('utils', function() {
  describe('getGlobPattern', function() {
    it("returns a glob pattern that is a superset of the RegExp", function() {
      var result = utils.getGlobPattern(/(app:user:\d+):address/);
      expect(result).to.be('app:user:*');
    });
  });

  describe('endsWith', function() {
    it('returns false if the string does not end with the suffix', function() {
      var result = utils.endsWith('invalid.js.test.j', '.js');
      expect(result).to.be(false);
    });

    it('returns true if the string ends with the given suffix', function() {
      var result = utils.endsWith('test.js', '.js');
      expect(result).to.be(true);
    });
  });

  describe('formatDate', function() {
    it('formats the date as YY-MM-DD-HHMMSS', function() {
      var date = new Date('2014-04-23T00:34:45Z');
      var formattedDate = utils.formatDate(date);

      expect(formattedDate).to.be('2014-04-23-003445');
    });
  });
});
