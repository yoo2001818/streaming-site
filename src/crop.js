'use strict';

const Router = require('express').Router;
const path = require('path');
const fs = require('fs-promise');
const crypto = require('crypto');
const { spawn } = require('child_process');
const encodeurl = require('encodeurl');

const config = require('../config');

const formatSize = require('./util/formatSize');
const formatDate = require('./util/formatDate');

const router = new Router();

const PATH_FILTER = /(?:^|[\\\/])\.\.(?:[\\\/]|$)/;

function decode(url) {
  try {
    return decodeURIComponent(url);
  } catch (e) {
    return '';
  }
}

router.get('/crop/:path', (req, res, next) => {
  let pathVal = decode(req.params.path);
  if (PATH_FILTER.test(pathVal)) return res.status(400).send('Path invalid');
  if (pathVal.indexOf('\0') !== -1) return res.status(400).send('Path invalid');
  if (pathVal.endsWith('.mp4')) {
    let realPath = path.join(config.cropPath, pathVal);
    fs.stat(realPath)
    .then(stats => {
      if (!stats.isFile()) return res.status(404).send('Invalid file');
      res.sendFile(realPath);
    }, err => {
      if (err.code !== 'ENOENT') {
        console.error(err.stack);
        return res.status(500).send('Something went wrong with the filesystem');
      }
      res.status(404).send('Not a valid file');
    });
  } else {
    // Check if the path exists
    let realPath = path.join(config.cropPath, pathVal + '.mp4');
    fs.stat(realPath)
    .then(stats => {
      if (!stats.isFile()) return res.status(404).send('Invalid file');
      let mp4File = {
        encoding: 'Original',
        name: pathVal + '.mp4',
        path: encodeurl('/crop/' + pathVal + '.mp4'),
        size: stats.size,
      };
      res.render('playback', {
        breadcrumbs: null,
        name: pathVal,
        mp4Files: [mp4File],
        srtFiles: [],
        vttFiles: [],
        listing: null,
        formatDate,
        formatSize,
        protocol: req.protocol,
        host: req.get('host'),
      });
    }, err => {
      if (err.code !== 'ENOENT') {
        console.error(err.stack);
        return res.status(500).send('Something went wrong with the filesystem');
      }
      res.status(404).send('Not a valid file');
    });
  }
});

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
    let hash = digest.digest('hex');
    let filename = hash + '.mp4';
    let destFile = path.join(config.cropPath, filename);
    fs.stat(destFile)
    .then(stats => {
      if (!stats.isFile()) return res.status(404).send('Invalid file');
      res.redirect('/crop/' + hash);
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
        res.redirect('/crop/' + hash);
      });
    });
  }, err => {
    if (err.code !== 'ENOENT') {
      console.error(err.stack);
      return res.status(500).send('Something went wrong with the filesystem');
    }
    res.status(404).send('Not a valid file');
  });
});

module.exports = router;
