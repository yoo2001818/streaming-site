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
      format: 'access',
    },
  },
  auth: {
    secret: 'gorani cat',
  },
  video: path.resolve(__dirname, '../video'),
  passwd: {
    test: '53'
  }
};

if (process.env.CONFIG_PATH != null) {
  module.exports = require(path.resolve(__dirname, process.env.CONFIG_PATH));
}
