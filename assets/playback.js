// Playback video src set script
// If location.hash is set, swap to that video.
function swapVideo(name) {
  let video = document.getElementById('playback');
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
