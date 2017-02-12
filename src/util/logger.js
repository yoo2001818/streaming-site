'use strict';

const mkdirp = require('mkdirp');
const fs = require('fs');
const path = require('path');
const morgan = require('morgan');
const Router = require('express').Router;

const logConfig = require('../../config').log;
const router = new Router();

// Set up stdout logger
if (logConfig.stdout != null) {
  router.use(morgan(logConfig.stdout));
}

// Set up access logger
if (logConfig.access != null) {
  let options = logConfig.access;
  mkdirp.sync(path.resolve(__dirname, '../../', options.directory));
  let stream = fs.createWriteStream(path.resolve(__dirname, '../../',
    options.directory, options.filename), { flags: 'a' });
  router.use(morgan(options.format, { stream }));
}

module.exports = router;
