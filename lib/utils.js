/**
 * A file containing a variety of utility functions for use throughout the lib.
 */

/**
 * Returns a glob pattern that includes a superset of keys matched by a
 * given regular expression.
 *
 * @params  {RegExp} regex A regular expression
 * @returns {string} A glob pattern for use with redis' commands
 */
exports.getGlobPattern = function(regex) {
  // The RegExp isn't ideal, but works for now
  // TODO: Accommodate variable namespace delimiters
  // TODO: Reduce set of keys matched by glob
  var pattern = String(regex);
  var glob = /\(([A-Za-z0-9:]+).*\)/.exec(pattern)[1] + '*';

  return glob;
};

/**
 * Returns whether or not the given string ends with the specified suffix.
 *
 * @param   {string}  str    The string to compare
 * @param   {string}  suffix The substring for which to check its presence
 * @returns {boolean} Whether or not the string ends with the given suffix
 */
exports.endsWith = function(str, suffix) {
  return str.indexOf(suffix, str.length - suffix.length) !== -1;
};

/**
 * Generates a migration date to be prepended to a migration file name.
 *
 * @param   {Date}   date The date object to format
 * @returns {String} A string date with the format: YY-MM-DD-HHMMSS
 */
exports.formatDate = function(date) {
  return [
    date.getUTCFullYear(),
    padDateInt(date.getUTCMonth() + 1),
    padDateInt(date.getUTCDate()),
    padDateInt(date.getUTCHours()) +
    padDateInt(date.getUTCMinutes()) +
    padDateInt(date.getUTCSeconds())
  ].join('-');
};

/**
 * Pads the string to the specified length.
 *
 * @param   {string} str    String to pad
 * @param   {int}    length The length to which to pad the string
 * @param   {string} padStr Character to pad with
 * @returns {string} A padded string with the provided length
 */
function leftPad(str, length, padStr) {
  str = String(str);
  padStr = String(padStr);

  var padding = Array((length - str.length) + 1).join(padStr);

  return padding + str;
}

/**
 * Pads a date int by prepending a '0'.
 *
 * @param   {int}    dateInt The int to pad
 * @returns {string} The padded date value
 */
function padDateInt(dateInt) {
  return leftPad(dateInt, 2, 0);
}
