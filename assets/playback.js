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

// Handle left / right, frame seeking, capturing.
function handleKeyDown(e) {
  const { keyCode, ctrlKey, shiftKey, altKey } = e;
  switch (keyCode) {
    case 69:
      // Frame seek
      // Assume 23.97fps, as majority of video library uses 24fps
      video.pause();
      if (!shiftKey && video.seekToNextFrame) {
        // Firefox non-standard stuff
        video.seekToNextFrame();
      } else {
        video.currentTime += 1 / 23.97 * (shiftKey ? -1 : 1);
      }
      break;
    case 37:
      // Left
      video.currentTime -= getOffset(e);
      break;
    case 39:
      // Right
      video.currentTime += getOffset(e);
      break;
    case 83:
      // Capture. Not implemented yet
      break;
    case 70:
      // Fullscreen.
      toggleFullscreen();
      break;
    case 32:
      // Play / pause.
      if (video.paused) video.play();
      else video.pause();
      break;
    default:
      return;
  }
  e.preventDefault();
}

window.addEventListener('keydown', handleKeyDown);
