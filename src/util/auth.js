'use strict';

const passwd = require('../../config').passwd;

// Validates the username / password pair. Returns true if valid.
module.exports = function (username, password) {
  if (username in passwd && passwd[username] === password) return true;
  return false;
}
