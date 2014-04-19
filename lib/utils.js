/**
 * A file containing a variety of utility functions used throughout the library.
 */

/**
 * Returns a glob pattern corresponding to a given migration entry.
 *
 * @params  {Object} entry A migration entry
 * @returns {string} A glob pattern corresponding to the entry's src key
 */
exports.getGlobPattern = function(entry) {
  var regex, pattern;
  var src = entry.src;

  regex = (src instanceof RegExp) ? src : src.key;
  pattern = String(regex);

  // The RegExp isn't ideal, but works for now
  // TODO: Accommodate variable namespace delimiters
  pattern = /\(([A-Za-z0-9:]+).*\)/.exec(pattern)[1] + '*';

  return pattern;
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
