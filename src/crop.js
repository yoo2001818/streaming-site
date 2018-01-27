'use strict';

const Router = require('express').Router;
const path = require('path');
const fs = require('fs-promise');
const crypto = require('crypto');
const { spawn } = require('child_process');

const config = require('../config');

const router = new Router();

const PATH_FILTER = /(?:^|[\\\/])\.\.(?:[\\\/]|$)/;

function decode(url) {
  try {
    return decodeURIComponent(url);
  } catch (e) {
    return '';
  }
}

router.get('/crop', (req, res, next) => {
  if (config.cropCmd == null) return res.status(400).send('Disabled in server');
  // Validate the path
  if (req.body.path != null) return res.status(400).send('Path invalid');
  let pathVal = decode(req.query.path);
  if (PATH_FILTER.test(pathVal)) return res.status(400).send('Path invalid');
  if (pathVal.indexOf('\0') !== -1) return res.status(400).send('Path invalid');
  // Check if the path exists
  let realPath = path.join(config.video, pathVal);
  fs.stat(realPath)
  .then(stats => {
    if (!stats.isFile()) return res.status(404).send('Invalid file');
    // Now, validate the start and end..
    let start = parseFloat(req.query.start);
    let end = parseFloat(req.query.end);
    if (isNaN(start) || isNaN(end) || start < 0 || end < 0 || start >= end) {
      return res.status(400).send('Not a valid duration');
    }
    if (start - end >= 120) {
      return res.status(400).send('Duration too long');
    }
    // Generate filename...
    let digest = crypto.createHash('sha1');
    digest.update(path.resolve(pathVal));
    digest.update('+' + start.toFixed(2));
    digest.update('+' + end.toFixed(2));
    let filename = digest.digest('hex') + '.mp4';
    let destFile = path.join(config.cropPath, filename);
    fs.stat(destFile)
    .then(stats => {
      if (!stats.isFile()) return res.status(404).send('Invalid file');
      res.sendFile(destFile);
    }, () => {
      // Then run ffmpeg! :O
      if (!req.session.authorized) {
        return res.status(401).send('Unauthorized to create a new video crop.');
      }
      let proc = spawn(config.cropCmd,
        ['-ss', start.toFixed(2), '-i', realPath,
          '-t', (end - start).toFixed(2),
          '-vcodec', 'copy', '-acodec', 'copy', '-f', 'mp4',
          '-movflags', '+faststart', destFile],
        { stdio: ['pipe', 'pipe', 'inherit'] });
      proc.on('exit', () => {
        res.sendFile(destFile);
      });
    });
  }, err => {
    if (err.code !== 'ENOENT') throw err;
    res.status(404).send('Not a valid file');
  });
});

module.exports = router;
