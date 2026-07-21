// Wires up the <div data-manual-video><video data-src>…<button data-vidplay>
// pattern used by the hero carousel and the reel gallery. Neither support.js
// nor video-slot.js ever promotes data-src to src or handles playback, so
// without this these videos never load at all.
//
// Behavior:
//  - Hero carousel (the rotating cards at the top, inside [data-carousel-card])
//    lazy-load and autoplay muted as they come into view — there are only 5,
//    it's the first thing a visitor sees.
//  - Every other clip (the full reel gallery, potentially dozens of large
//    files) is click-to-load-and-play only. Nothing about them fetches or
//    plays until the visitor actually clicks — this is deliberately the
//    lightest option for a page with this much video.
// In both cases the button is a sound on/off toggle (starts muted);
// clicking the video itself pauses/resumes it.
(() => {
  const soundOff = '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M11 5 6 9H2v6h4l5 4z" fill="#fff" stroke="none"/><line x1="16" y1="9" x2="22" y2="15"/><line x1="22" y1="9" x2="16" y2="15"/></svg>';
  const soundOn = '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M11 5 6 9H2v6h4l5 4z" fill="#fff" stroke="none"/><path d="M15.5 8.5a5 5 0 0 1 0 7"/><path d="M18.5 5.5a9 9 0 0 1 0 13"/></svg>';

  function init(container) {
    const video = container.querySelector('video[data-src]');
    const btn = container.querySelector('[data-vidplay]');
    if (!video || !btn || container.dataset.wired) return;
    container.dataset.wired = 'true';

    const isHero = !!container.closest('[data-carousel-card]');

    // Starts muted so autoplaying the hero carousel never blasts sound —
    // the button lets the visitor deliberately turn it on per clip.
    video.muted = true;
    btn.innerHTML = soundOff;

    // Set when the user explicitly pauses via clicking the video, so
    // scrolling the card out of view and back doesn't override their
    // choice by resuming it.
    let userPaused = false;

    // Some mobile engines (iOS Safari especially) leave the frame solid
    // black/blank until the video has actually advanced past 0 — even once
    // readyState is 4 and playback has "started". Nudging currentTime the
    // instant data is available forces a real frame to paint.
    video.addEventListener('loadeddata', () => {
      if (video.currentTime < 0.05) video.currentTime = 0.08;
    }, { once: true });

    function ensureLoaded() {
      if (!video.getAttribute('src') && video.dataset.src) video.src = video.dataset.src;
    }

    function attemptPlay() {
      ensureLoaded();
      // The very first play() right after assigning src can be aborted by
      // the browser's own load kicking off (AbortError, silently caught) —
      // retry once the video reports it's actually ready, but only if
      // nothing has paused it again in the meantime.
      const tryPlay = () => { if (!userPaused && video.paused) video.play().catch(() => {}); };
      tryPlay();
      video.addEventListener('canplay', tryPlay, { once: true });
    }

    if (isHero) {
      // Only the 5 hero clips lazy-load + autoplay as they scroll into view.
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
    }
    // Everything else (the reel gallery, the Wilgo feature card, etc.) does
    // nothing until clicked — no fetch, no observer, no autoplay.

    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      video.muted = !video.muted;
      btn.innerHTML = video.muted ? soundOff : soundOn;
    });

    video.addEventListener('click', () => {
      if (video.paused) { userPaused = false; attemptPlay(); }
      else { userPaused = true; video.pause(); }
    });
  }

  document.querySelectorAll('[data-manual-video]').forEach(init);
})();
