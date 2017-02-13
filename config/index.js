'use strict';

const path = require('path');

module.exports = {
  network: {
    host: '0.0.0.0',
    port: 8000,
  },
  log: {
    stdout: 'dev',
    access: {
      directory: 'logs',
      filename: 'access.log',
      format: 'combined',
    },
  },
  auth: {
    secret: 'gorani cat',
  },
  video: path.resolve(__dirname, '../video'),
  // Bandwidth limit in bps.
  bandwidth: 5500 * 1024,
  passwd: {
    test: '53'
  }
};

if (process.env.CONFIG_PATH != null) {
  module.exports = require(path.resolve(__dirname, process.env.CONFIG_PATH));
}
