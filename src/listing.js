'use strict';

const encodeurl = require('encodeurl');
const parseurl = require('parseurl');
const path = require('path');
const fs = require('fs-promise');
const srt2vtt = require('srt-to-vtt');
const replaceStream = require('replacestream');

const formatDate = require('./util/formatDate');
const config = require('../config');

const PATH_FILTER = /(?:^|[\\\/])\.\.(?:[\\\/]|$)/;

function decode(url) {
  try {
    return decodeURIComponent(url);
  } catch (e) {
    return '';
  }
}

function stringifySize(_size) {
  let size = _size;
  if (size < 1024) return size + 'B';
  size /= 1024;
  if (size < 1024) return size.toFixed(1) + 'kB';
  size /= 1024;
  if (size < 1024) return size.toFixed(1) + 'MB';
  size /= 1024;
  return size.toFixed(1) + 'GB';
}

function readdir(readPath) {
  return fs.readdir(readPath)
  .then(list => Promise.all(list.map(v =>
    fs.stat(path.resolve(readPath, v)).then(stats => {
      stats.filename = v;
      return stats;
    }))));
}

module.exports = function listing(req, res, next) {
  if (req.method !== 'GET' && req.method !== 'HEAD') return next();
  let pathVal = decode(parseurl(req).pathname);
  if (PATH_FILTER.test(pathVal)) return res.status(400).send('Path invalid');
  if (pathVal.indexOf('\0') !== -1) return res.status(400).send('Path invalid');
  let convertVTT = pathVal.endsWith('.vtt');
  if (convertVTT) pathVal = pathVal.slice(0, -4) + '.srt';
  let listingPath = path.join(pathVal);
  let realPath = path.join(config.video, pathVal);
  let pathSliced = listingPath.split('/');
  if (pathSliced[pathSliced.length - 1] === '') pathSliced.pop();
  let baseLocals = {
    path: listingPath,
    breadcrumbs: pathSliced.map((v, i, arr) => ({
      name: v,
      sliced: encodeurl(pathSliced.slice(0, i + 1).join('/')) || '/',
    })),
    ascendPath: encodeurl(path.join(listingPath, '..')),
  };
  fs.stat(realPath)
  .then(stats => {
    if (stats.isFile() && convertVTT) {
      // Convert srt to vtt
      fs.createReadStream(realPath)
      .pipe(replaceStream('\\h', ' '))
      .pipe(srt2vtt()).pipe(res);
      return;
    }
    if (!stats.isDirectory()) return next();
    // Show the filesystem listing
    return Promise.all([readdir(realPath)].concat(config.videoEncode ? [
      readdir(path.join(config.videoEncode, pathVal))
      // Ignore errors
      .then(v => v, () => [])
    ] : [Promise.resolve([])]))
    .then(([list, encodeList]) => {
      // For directories, we can just show it without any problem.
      // However, for files, we should only allow mp4 files, without extension.
      let directories = list.filter(stats => stats.isDirectory())
        // Hide video encode directory
        .filter(stats => path.resolve(realPath, stats.filename) !==
          config.videoEncode)
        .map(stats => ({
          filename: stats.filename,
          path: encodeurl(path.resolve(listingPath,
            encodeURIComponent(stats.filename))),
          updated: stats.mtime,
        }));
      let files = list.filter(stats => stats.isFile() &&
        /\.(mp4|mkv|m4v)$/.test(stats.filename)).map(stats => ({
          filename: stats.filename.slice(0, -4),
          path: encodeurl(path.resolve(listingPath,
            encodeURIComponent(stats.filename.slice(0, -4)))),
          size: stringifySize(stats.size),
          updated: stats.mtime,
          hasSubtitle:
            list.some(v => v.filename.startsWith(stats.filename.slice(0, -4))
              && v.filename.endsWith('.srt')),
          encodes: encodeList
            .filter(v => v.filename.startsWith(stats.filename.slice(0, -4))
              && /\.(mp4|mkv|m4v)$/.test(v.filename))
            .map(v => ({
              name: /\.(.+?)\.(mp4|mkv|m4v)$/.exec(v.filename)[1],
              size: stringifySize(v.size),
            })),
        }));
      // I don't feel good for including formatting function inside here,
      // but there's no other way.
      res.render('listing', Object.assign({ root: listingPath === '/',
       directories, files, formatDate }, baseLocals));
    });
  }, err => {
    if (err.code !== 'ENOENT') throw err;
    // Check if we should start a player. This simply reimplements glob...
    let parentEncodePath = path.join(config.videoEncode, pathVal, '..');
    let parentEncodeListingPath = path.join(config.videoEncodePublic,
      pathVal, '..');
    let parentPath = path.join(realPath, '..');
    let remainingPath = realPath.slice(parentPath.length + 1);
    let parentListingPath = path.join(listingPath, '..');
    return Promise.all([readdir(parentPath)].concat(config.videoEncode ? [
      readdir(parentEncodePath)
      // Ignore errors
      .then(v => v, () => [])
    ] : [Promise.resolve([])]))
    .then(lists => lists.map(list => list.filter(v => v.isFile() &&
      v.filename.startsWith(remainingPath))))
    .then(([list, encodeList]) => {
      if (list.length === 0) return next();
      // Look for mp4 file
      let mp4File = list.find(v => /\.(mp4|mkv|m4v)$/.test(v.filename));
      if (mp4File == null) return next();
      mp4File = {
        encoding: 'Original',
        name: mp4File.filename,
        path: encodeurl(path.resolve(parentListingPath,
          encodeURIComponent(mp4File.filename))),
        size: stringifySize(mp4File.size),
      };
      let mp4Files = encodeList.filter(v =>
        v.filename.startsWith(mp4File.name.slice(0, -4)) &&
        /\.(mp4|mkv|m4v)$/.test(v.filename))
        .map(v => ({
          encoding: /\.(.+?)\.(mp4|mkv|m4v)$/.exec(v.filename)[1],
          name: v.filename,
          path: encodeurl(path.resolve(parentEncodeListingPath,
            encodeURIComponent(v.filename))),
          size: stringifySize(v.size),
        }));
      // Prepend original mp4 file
      mp4Files.unshift(mp4File);
      // srt files. No language will be detected, though.
      // If srt file is detected, convert it to vtt. (It'll be converted
      // by listing handler too)
      let srtFiles = list.filter(v => v.filename.endsWith('.srt')).map(v => ({
        name: v.filename,
        path: encodeurl(path.resolve(parentListingPath,
          encodeURIComponent(v.filename))),
        lang: v.filename.endsWith('.Korean.srt') ? 'ko' : 'en',
        label: v.filename.endsWith('.Korean.srt') ? '한국어' : 'English',
      }));
      let vttFiles = srtFiles.map(v => Object.assign({}, v, {
        path: v.path.slice(0, -4) + '.vtt'
      }));
      // Render it....
      res.render('playback', Object.assign({ name: remainingPath, mp4Files,
        srtFiles, vttFiles }, baseLocals));
    });
  })
  .catch(err => {
    console.error(err.stack);
    res.status(500).send('Something went wrong with the filesystem');
  });
}
