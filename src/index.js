'use strict';

const path = require('path');
const http = require('http');
const https = require('https');
const express = require('express');
const serveStatic = require('serve-static');
const bodyParser = require('body-parser');
const session = require('express-session');
const Throttle = require('throttle');

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

app.get('/robots.txt', (req, res) => res.type('text/plain')
  .send('User-Agent: *\nDisallow: /'));

app.use('/assets', serveStatic(path.resolve(__dirname, '../assets')));
app.use(require('./auth'));

const createThrottle = () => new Throttle(config.bandwidth);
let videoStatic = serveStatic(config.video);
app.use((req, res, next) => {
  // stream emits 'pipe' event when piped
  res.on('pipe', function (readStream) {
      // protects against infinite loop
      if (readStream instanceof Throttle) return;
      // ignore if downloading
      if (req.query.download != null) return;
      // first unpipe streams
      readStream.unpipe(res);
      // then reattach with Transform type between streams
      // Throttle class extends require('stream').Transform
      readStream.pipe(createThrottle()).pipe(res);
  });
  videoStatic(req, res, next);
});
app.use(require('./listing'));

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
