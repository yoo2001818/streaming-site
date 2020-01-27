'use strict';

const passwd = require('../../config').passwd;
const fs = require('fs-promise');
const Netmask = require('netmask').Netmask;

// Validates the username / password pair. Returns true if valid.
module.exports = function (username, password) {
  return fs.readFile(passwd, 'utf-8')
  .then(data => {
    let passwds = data.split('\n').map(v => v.split(':'));
    if (passwds.some(v => v[0] === username && v[1] === password)) return true;
    return false;
  })
  .catch(() => {
    return false;
  });
}

module.exports.fileCheck = function (path) {
  return fs.readFile(passwd, 'utf-8')
  .then(data => {
    let passwds = data.split('\n').filter(v => v[0] === '~');
    if (passwds.some(v => path.indexOf(v.slice(1)) !== -1)) return true;
    return false;
  })
  .catch(() => {
    return false;
  });
}

module.exports.ipCheck = function (ip) {
  return fs.readFile(passwd, 'utf-8')
  .then(data => {
    let passwds = data.split('\n').filter(v => v[0] === '#');
    if (passwds.some(v => new Netmask(v.slice(1)).contains(ip))) return true;
    return false;
  })
  .catch(() => {
    return false;
  });
}
