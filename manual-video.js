// Wires up the <div data-manual-video><video data-src>…<button data-vidplay>
// pattern used by the hero carousel and the reel gallery. Neither support.js
// nor video-slot.js ever promotes data-src to src or handles play, so
// without this these videos never load at all.
//
// Behavior: each clip lazy-loads and autoplays (muted) once its card is
// mostly in view, and pauses once it scrolls back out — like an Instagram/
// TikTok grid preview. The button/video click is just a manual pause/resume
// override, not required to see anything.
(() => {
  const playIcon = '<svg width="14" height="14" viewBox="0 0 24 24" fill="#fff"><polygon points="6 4 20 12 6 20 6 4"/></svg>';
  const pauseIcon = '<svg width="14" height="14" viewBox="0 0 24 24" fill="#fff"><rect x="6" y="4" width="4" height="16"/><rect x="14" y="4" width="4" height="16"/></svg>';

  function init(container) {
    const video = container.querySelector('video[data-src]');
    const btn = container.querySelector('[data-vidplay]');
    if (!video || !btn || container.dataset.wired) return;
    container.dataset.wired = 'true';
    btn.innerHTML = playIcon;

    // Always muted — these are silent preview reels, never auto-blast sound.
    // Enforced here, on every play(), and on any stray 'volumechange' so
    // nothing (this script, a browser extension, dev-tools poking) can ever
    // make one of these produce sound on its own.
    video.muted = true;
    video.addEventListener('volumechange', () => { if (!video.muted) video.muted = true; });

    // Set when the user explicitly pauses via click, so scrolling the card
    // out of view and back doesn't override their choice by resuming it.
    let userPaused = false;

    function ensureLoaded() {
      if (!video.getAttribute('src') && video.dataset.src) video.src = video.dataset.src;
    }

    function attemptPlay() {
      ensureLoaded();
      video.muted = true;
      // The very first play() right after assigning src can be aborted by
      // the browser's own load kicking off (AbortError, silently caught) —
      // retry once the video reports it's actually ready, but only if
      // nothing has paused it again in the meantime.
      const tryPlay = () => { if (!userPaused && video.paused) video.play().catch(() => {}); };
      tryPlay();
      video.addEventListener('canplay', tryPlay, { once: true });
    }

    // Lazy load + autoplay: fetch and play once the card is mostly in view,
    // pause once it isn't. rootMargin is deliberately tight — 600px was
    // generous enough that, on this grid's column count, most of the
    // gallery loaded (and would have autoplayed) immediately on page load.
    const io = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          if (!userPaused) attemptPlay();
        } else if (!video.paused) {
          video.pause();
        }
      });
    }, { rootMargin: '80px 0px', threshold: 0.4 });
    io.observe(container);

    function togglePlay() {
      if (video.paused) {
        userPaused = false;
        attemptPlay();
      } else {
        userPaused = true;
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
