'use strict';

const leftPad = require('left-pad');

module.exports = function formatDate(date) {
  const yyyy = leftPad(date.getFullYear(), 4, 0);
  const mm = leftPad(date.getMonth() + 1, 2, 0);
  const dd = leftPad(date.getDate(), 2, 0);
  return [yyyy, mm, dd].join('-');
}
