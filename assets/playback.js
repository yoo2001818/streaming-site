// Playback video src set script
const video = document.getElementById('playback');

// If location.hash is set, swap to that video.
function swapVideo(name) {
  // Query selector injection is possible, however, who cares?
  // This is client side script anyway, and XSS isn't possible with this.
  let source = video.querySelector(`source[name='${name}']`);
  if (source != null) {
    let time = video.currentTime;
    video.src = source.src;
    video.currentTime = time;
  }
}

swapVideo(location.hash.slice(1));
window.addEventListener('hashchange', () => swapVideo(location.hash.slice(1)),
  false);

const videoSavedId = 'saved-' + location.pathname;
// Set previous position on leave, however, if the position is close enough
// to the end, just forget it.
window.addEventListener('beforeunload', () => {
  let position = video.duration - video.currentTime < 10 ?
    0 :
    video.currentTime;
  window.localStorage[videoSavedId] = position;
});

if (window.localStorage[videoSavedId] != null) {
  video.currentTime = window.localStorage[videoSavedId];
}

video.addEventListener('ended', () => {
  // Continue to next video, if available.
  let link = document.querySelector('.listing .file.selected + .file .title a');
  if (link != null) {
    location.href = link.href + location.hash;
  }
});

function getOffset(e) {
  let bitSet = 0;
  if (e.shiftKey) bitSet |= 1;
  if (e.ctrlKey) bitSet |= 2;
  if (e.altKey) bitSet |= 4;
  if (bitSet === 1) return 3;
  if (bitSet === 4) return 10;
  if (bitSet === 0) return 30;
  if (bitSet === 2) return 60;
  if (bitSet === 6) return 300;
}

// Handle non-standard fullscreen API hell
const fullscreenAPIs = {
  requestFullscreen: [
    'requestFullscreen',
    'webkitRequestFullscreen',
    'mozRequestFullScreen',
    'msRequestFullscreen',
  ].find(v => document.body[v]),
  exitFullscreen: [
    'exitFullscreen',
    'webkitExitFullscreen',
    'mozCancelFullScreen',
    'msExitFullscreen',
  ].find(v => document[v]),
  fullscreenElement: [
    'fullscreenElement',
    'webkitFullscreenElement',
    'mozFullScreenElement',
    'msFullscreenElement',
  ].find(v => typeof document[v] !== 'undefined'),
};

function toggleFullscreen() {
  if (!document[fullscreenAPIs.fullscreenElement]) {
    video[fullscreenAPIs.requestFullscreen]();
  } else {
    if (document[fullscreenAPIs.exitFullscreen]) {
      document[fullscreenAPIs.exitFullscreen]();
    }
  }
}

// Copied from the old version of left-pad
/*
DO WHAT THE FUCK YOU WANT TO PUBLIC LICENSE
        Version 2, December 2004

Copyright (C) 2014 Azer Koçulu <azer@roadbeats.com>

Everyone is permitted to copy and distribute verbatim or modified
copies of this license document, and changing it is allowed as long
as the name is changed.

DO WHAT THE FUCK YOU WANT TO PUBLIC LICENSE
TERMS AND CONDITIONS FOR COPYING, DISTRIBUTION AND MODIFICATION

0. You just DO WHAT THE FUCK YOU WANT TO.
*/
function leftPad(str, len, ch) {
  str = String(str);
  let i = -1;
  if (!ch && ch !== 0) ch = ' ';
  len = len - str.length;
  while (++i < len) {
    str = ch + str;
  }
  return str;
}

function formatDate(date) {
  return leftPad(date.getFullYear(), 4, '0') + '-' +
  leftPad(date.getMonth() + 1, 2, '0') + '-' +
  leftPad(date.getDate(), 2, '0') + '-' +
  leftPad(date.getHours(), 2, '0') + 'h' +
  leftPad(date.getMinutes(), 2, '0') + 'm' +
  leftPad(date.getSeconds(), 2, '0') + 's' +
  leftPad(date.getMilliseconds(), 3, '0');
}

function captureVideo() {
  // Create canvas element
  let canvas = document.createElement('canvas');
  canvas.width = video.videoWidth;
  canvas.height = video.videoHeight;
  // Draw video to canvas
  let ctx = canvas.getContext('2d');
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  ctx.drawImage(video, 0, 0);
  canvas.toBlob(b => {
    // Trick mimetype to store to special location
    let blob = b.slice(0, b.size, 'type/x-vlcsnap+png');
    // let blob = new Blob(b, { type: 'type/x-vlcsnap+png'});
    // Create anchor element
    let pom = document.createElement('a');
    let url = URL.createObjectURL(blob);
    pom.setAttribute('href', url);
    // Include video information
    let videoName = document.querySelector('.breadcrumb li:last-child a').text;
    videoName = videoName.replace(/\s+/g, '-');
    pom.setAttribute('download', 'vlcsnap-' + formatDate(new Date()) + '-' +
    videoName + '.png');
    // And process the image
    if (document.createEvent) {
      let event = document.createEvent('MouseEvents');
      event.initEvent('click', true, true);
      pom.dispatchEvent(event);
    } else {
      pom.click();
    }
    // 60s later, destroy the URL.
    setTimeout(() => URL.revokeObjectURL(url), 60 * 1000);
  }, 'image/png');
}

const playbackRates = [
  0.02, 0.03, 0.06, 0.12, 0.25, 0.33, 0.5, 0.66, 0.75,
  1,
  1.5, 2, 3, 4, 8, 16, 32, 64,
];

let playbackPos = playbackRates.indexOf(1);

function updatePlaybackRate() {
  if (video.playbackRate > 0) {
    video.playbackRate = playbackRates[playbackPos];
  } else {
    video.playbackRate = -playbackRates[playbackPos];
  }
}

function seekRelative(v) {
  if (video.fastSeek) {
    video.fastSeek(video.currentTime + v);
  } else {
    video.currentTime += v;
  }
}

let cropStart = 0;
let cropEnd = 0;

function updateCrop() {
  // Use the 2nd source, if any.
  let sources = video.querySelectorAll('source');
  let source = sources[1] || sources[0];
  let url = location.origin + '/crop?path=' +
    encodeURIComponent(source.src.slice(location.origin.length)) +
    '&start=' + cropStart.toFixed(2) + '&end=' + cropEnd.toFixed(2);
  // Copy the generated link to clipboard.
  let input = document.createElement('input');
  document.body.appendChild(input);
  input.value = url;
  input.select();
  document.execCommand('copy', false);
  input.remove();
}

// Handle left / right, frame seeking, capturing.
function handleKeyDown(e) {
  const { keyCode, ctrlKey, shiftKey, altKey } = e;
  switch (keyCode) {
    case 69:
      // Frame seek
      // Assume 23.97fps, as majority of video library uses 24fps
      video.pause();
      video.currentTime += 1 / 23.97 * (shiftKey ? -1 : 1);
      break;
    case 188:
      // Seeking by comma and period
      video.pause();
      video.currentTime -= 1 / 23.97;
      break;
    case 190:
      video.pause();
      video.currentTime += 1 / 23.97;
      break;
    case 37:
      // Left
      seekRelative(-getOffset(e));
      break;
    case 39:
      // Right
      seekRelative(getOffset(e));
      break;
    case 83:
      // Capture.
      if (!shiftKey) return;
      captureVideo();
      break;
    case 70:
      if (shiftKey) {
        // Set crop start
        cropStart = video.currentTime;
        updateCrop();
      } else {
        // Fullscreen.
        toggleFullscreen();
      }
      break;
    case 71:
      if (shiftKey) {
        // Set crop end
        cropEnd = video.currentTime;
        updateCrop();
      }
      break;
    case 32:
      // Play / pause.
      if (video.paused) video.play();
      else video.pause();
      break;
    // U: Invert direction
    case 85:
      video.playbackRate *= -1;
      console.log(video.playbackRate);
      break;
    // I-O-P
    case 73:
      playbackPos = Math.max(0, playbackPos - 1);
      updatePlaybackRate();
      break;
    case 79:
      playbackPos = playbackRates.indexOf(1);
      updatePlaybackRate();
      break;
    case 80:
      playbackPos = Math.min(playbackRates.length - 1, playbackPos + 1);
      updatePlaybackRate();
      break;
    default:
      return;
  }
  e.preventDefault();
}

window.addEventListener('keydown', handleKeyDown);
