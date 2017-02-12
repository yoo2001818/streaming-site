'use strict';

// Validates the username / password pair. Returns true if valid.
module.exports = function (username, password) {
  if (username === 'test' && password === '53') return true;
  return false;
}
