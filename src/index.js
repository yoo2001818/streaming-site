'use strict';

const path = require('path');
const http = require('http');
const https = require('https');
const express = require('express');
const serveStatic = require('serve-static');
const bodyParser = require('body-parser');
const session = require('express-session');

const logger = require('./util/logger');

const config = require('../config');

// Just a simple express app.
let app = express();
app.set('view engine', 'pug');
app.set('views', path.resolve(__dirname, 'view'));

// App middlewares. Since there aren't many of them, I've decied to put them
// right into index file.
app.use(logger);
app.use(bodyParser.urlencoded({ extended: true }));
app.use(session({
  resave: false,
  saveUninitialized: false,
  secret: config.auth.secret,
}))

app.use('/assets', serveStatic(path.resolve(__dirname, '../assets')));
app.use(require('./auth'));

if (config.network.https) {
  https.createServer(config.network.https, app)
  .listen(config.network.port, config.network.host, () => {
    console.log(`Listening on port ${config.network.port}`);
  });
} else {
  http.createServer(app)
  .listen(config.network.port, config.network.host, () => {
    console.log(`Listening on port ${config.network.port}`);
  });
}
