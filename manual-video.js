// Wires up the <div data-manual-video><video data-src>…<button data-vidplay>
// pattern used by the hero carousel and the reel gallery. Neither support.js
// nor video-slot.js ever promotes data-src to src or handles the play
// button, so without this these videos never load — clicking did nothing.
(() => {
  const playIcon = '<svg width="14" height="14" viewBox="0 0 24 24" fill="#fff"><polygon points="6 4 20 12 6 20 6 4"/></svg>';
  const pauseIcon = '<svg width="14" height="14" viewBox="0 0 24 24" fill="#fff"><rect x="6" y="4" width="4" height="16"/><rect x="14" y="4" width="4" height="16"/></svg>';

  function init(container) {
    const video = container.querySelector('video[data-src]');
    const btn = container.querySelector('[data-vidplay]');
    if (!video || !btn || container.dataset.wired) return;
    container.dataset.wired = 'true';
    btn.innerHTML = playIcon;

    function togglePlay() {
      if (!video.getAttribute('src')) video.src = video.dataset.src;
      if (video.paused) {
        document.querySelectorAll('[data-manual-video] video').forEach((v) => {
          if (v !== video && !v.paused) v.pause();
        });
        video.play().catch(() => {});
      } else {
        video.pause();
      }
    }

    btn.addEventListener('click', (e) => { e.stopPropagation(); togglePlay(); });
    video.addEventListener('click', togglePlay);
    video.addEventListener('play', () => { btn.innerHTML = pauseIcon; });
    video.addEventListener('pause', () => { btn.innerHTML = playIcon; });
  }

  document.querySelectorAll('[data-manual-video]').forEach(init);
})();
