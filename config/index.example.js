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
  videoEncode: path.resolve(__dirname, '../video/Workload'),
  // Bandwidth limit in bps.
  bandwidth: 5500 * 1024,
  passwd: path.resolve(__dirname, 'passwd'),
};

if (process.env.CONFIG_PATH != null) {
  module.exports = require(path.resolve(__dirname, process.env.CONFIG_PATH));
}
