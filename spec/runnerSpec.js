var redis     = require('fakeredis').createClient('0', '0.0.0.0', {fast: true});
var expect    = require('expect.js');
var fixtures = require('./fixtures');
var sinon    = require('sinon');
var fs       = require('fs');
var mockfs   = require('mock-fs');

var runner = require('../lib/runner');

describe('runner', function() {
  it('exports create, up and down actions', function() {
    expect(runner).to.have.keys('create', 'up', 'down');
  });
});
