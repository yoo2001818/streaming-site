'use strict';

module.exports = function formatSize(_size) {
  let size = _size;
  if (size < 1024) return size + 'B';
  size /= 1024;
  if (size < 1024) return size.toFixed(1) + 'kB';
  size /= 1024;
  if (size < 1024) return size.toFixed(1) + 'MB';
  size /= 1024;
  return size.toFixed(1) + 'GB';
}
