// <video-slot> — user-fillable MP4 placeholder, sibling to <image-slot>.
// Drag a video file onto it (or click to browse). The file is stored in the
// browser's IndexedDB (per-origin, persists across reloads on this device).
// By default it plays back muted+looped like a reel preview, pausing itself
// when scrolled out of view. Set `manual="true"` to disable all autoplay —
// the clip only ever plays when the viewer presses the on-video play button
// (use this on any grid with many clips, e.g. a filterable video gallery,
// to avoid dozens of videos decoding at once).
//
// Attributes:
//   id           Persistence key. REQUIRED to survive reload.
//   shape        'rect' | 'rounded'   (default 'rounded')
//   radius       Corner radius in px for 'rounded'.       (default 14)
//   placeholder  Empty-state caption.
//   manual       'true' to require a manual tap/click to ever play.
//   style        Size via ordinary CSS (width/height/aspect-ratio).
//
// Usage:
//   <video-slot id="reel-1" placeholder="Reel 9:16" style="width:100%;aspect-ratio:9/16"></video-slot>
//   <video-slot id="reel-2" manual="true" placeholder="Reel 9:16" style="width:100%;aspect-ratio:9/16"></video-slot>

(() => {
  const DB_NAME = 'video-slots-db';
  const STORE = 'slots';
  const ACCEPT = ['video/mp4', 'video/quicktime', 'video/webm'];

  let dbP = null;
  function openDB() {
    if (dbP) return dbP;
    dbP = new Promise((resolve, reject) => {
      const req = indexedDB.open(DB_NAME, 1);
      req.onupgradeneeded = () => req.result.createObjectStore(STORE);
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error);
    });
    return dbP;
  }
  async function dbGet(id) {
    const db = await openDB();
    return new Promise((resolve) => {
      const tx = db.transaction(STORE, 'readonly');
      const r = tx.objectStore(STORE).get(id);
      r.onsuccess = () => resolve(r.result || null);
      r.onerror = () => resolve(null);
    });
  }
  async function dbPut(id, blob) {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE, 'readwrite');
      tx.objectStore(STORE).put(blob, id);
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  }
  async function dbDel(id) {
    const db = await openDB();
    return new Promise((resolve) => {
      const tx = db.transaction(STORE, 'readwrite');
      tx.objectStore(STORE).delete(id);
      tx.oncomplete = () => resolve();
      tx.onerror = () => resolve();
    });
  }

  const stylesheet =
    ':host{display:inline-block;position:relative;vertical-align:top;' +
    '  font:13px/1.3 system-ui,-apple-system,sans-serif;color:rgba(0,0,0,.55);width:220px;height:390px;' +
    '  background:rgba(0,0,0,.04);overflow:hidden}' +
    'video{position:absolute;inset:0;width:100%;height:100%;object-fit:cover;display:none;background:#000}' +
    '.empty{position:absolute;inset:0;display:flex;flex-direction:column;align-items:center;' +
    '  justify-content:center;gap:6px;text-align:center;padding:12px;box-sizing:border-box;cursor:pointer}' +
    '.empty svg{opacity:.45}' +
    '.empty .cap{max-width:90%;font-weight:500}' +
    '.empty .sub{font-size:11px}' +
    '.empty .sub u{text-underline-offset:2px}' +
    ':host([data-over]) {outline:2px solid #c96442;outline-offset:-2px;background:rgba(201,100,66,.10)}' +
    ':host([data-filled]) .empty{display:none}' +
    // Read-only (published site, outside the omelette editor): no upload
    // invitation on an empty slot — it can't do anything for a visitor.
    ':host(:not([data-editable])) .empty{cursor:default}' +
    ':host(:not([data-editable])) .empty .sub{display:none}' +
    '.bar{position:absolute;left:0;right:0;bottom:0;display:flex;justify-content:space-between;' +
    '  padding:8px;opacity:0;transition:opacity .15s;pointer-events:none;z-index:2}' +
    ':host([data-filled]:hover) .bar,:host([data-filled][data-paused]) .bar{opacity:1;pointer-events:auto}' +
    '.bar button{appearance:none;border:0;border-radius:50%;width:30px;height:30px;cursor:pointer;' +
    '  background:rgba(0,0,0,.55);color:#fff;display:flex;align-items:center;justify-content:center;' +
    '  backdrop-filter:blur(4px)}' +
    '.bar button:hover{background:rgba(0,0,0,.75)}' +
    '.ctl{position:absolute;top:6px;right:6px;display:flex;gap:6px;opacity:0;transition:opacity .15s;z-index:2}' +
    ':host([data-filled][data-editable]:hover) .ctl{opacity:1}' +
    '.ctl button{appearance:none;border:0;border-radius:6px;padding:4px 8px;cursor:pointer;' +
    '  background:rgba(0,0,0,.65);color:#fff;font:11px/1 system-ui,-apple-system,sans-serif}' +
    '.ctl button:hover{background:rgba(0,0,0,.8)}' +
    '.big-play{position:absolute;inset:0;display:none;align-items:center;justify-content:center;' +
    '  cursor:pointer;background:rgba(0,0,0,.18);z-index:2}' +
    ':host([data-manual][data-filled]) .big-play{display:flex}' +
    ':host([data-manual][data-filled]:not([data-paused])) .big-play{background:transparent}' +
    '.big-play .disc{width:56px;height:56px;border-radius:50%;background:rgba(0,0,0,.6);' +
    '  display:flex;align-items:center;justify-content:center;backdrop-filter:blur(4px);' +
    '  transition:transform .15s ease, opacity .15s ease}' +
    ':host([data-manual][data-filled]:not([data-paused])) .big-play .disc{opacity:0}' +
    ':host([data-manual][data-filled]:not([data-paused])):hover .big-play .disc{opacity:1}' +
    '.big-play:hover .disc{transform:scale(1.08)}' +
    '.err{position:absolute;left:8px;bottom:44px;right:8px;color:#b3261e;font-size:11px;' +
    '  background:rgba(255,255,255,.9);padding:4px 6px;border-radius:5px;pointer-events:none;z-index:3}';

  const icon =
    '<svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" ' +
    'stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round">' +
    '<polygon points="5 3 19 12 5 21 5 3"/></svg>';
  const soundOn = '<svg width="15" height="15" viewBox="0 0 24 24" fill="currentColor"><path d="M4 9v6h4l5 5V4L8 9H4z"/><path d="M16.5 12a4.5 4.5 0 0 0-2.5-4v8a4.5 4.5 0 0 0 2.5-4z"/></svg>';
  const soundOff = '<svg width="15" height="15" viewBox="0 0 24 24" fill="currentColor"><path d="M4 9v6h4l5 5V4L8 9H4z"/><line x1="17" y1="9" x2="23" y2="15" stroke="currentColor" stroke-width="2"/><line x1="23" y1="9" x2="17" y2="15" stroke="currentColor" stroke-width="2"/></svg>';
  const restartIcon = '<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="1 4 1 10 7 10"/><path d="M3.51 15a9 9 0 1 0 2.13-9.36L1 10"/></svg>';
  const playIcon = '<svg width="22" height="22" viewBox="0 0 24 24" fill="#fff"><polygon points="6 4 20 12 6 20 6 4"/></svg>';
  const pauseIcon = '<svg width="22" height="22" viewBox="0 0 24 24" fill="#fff"><rect x="6" y="4" width="4" height="16"/><rect x="14" y="4" width="4" height="16"/></svg>';

  class VideoSlot extends HTMLElement {
    static get observedAttributes() { return ['shape', 'radius', 'placeholder', 'manual']; }

    constructor() {
      super();
      const root = this.attachShadow({ mode: 'open' });
      root.innerHTML =
        '<style>' + stylesheet + '</style>' +
        '<video muted loop playsinline></video>' +
        '<div class="empty">' + icon + '<div class="cap"></div><div class="sub">or <u>browse files</u></div></div>' +
        '<div class="bar">' +
        '  <button data-act="restart" title="Revenir au début">' + restartIcon + '</button>' +
        '  <button data-act="sound" title="Son">' + soundOff + '</button>' +
        '</div>' +
        '<div class="ctl"><button data-act="replace">Remplacer</button><button data-act="clear">Retirer</button></div>' +
        '<div class="big-play"><div class="disc" data-act="bigplay"></div></div>' +
        '<input type="file" accept="' + ACCEPT.join(',') + '" hidden>';
      this._video = root.querySelector('video');
      this._empty = root.querySelector('.empty');
      this._cap = root.querySelector('.cap');
      this._soundBtn = root.querySelector('[data-act="sound"]');
      this._bigPlay = root.querySelector('.disc');
      this._input = root.querySelector('input');
      this._err = null;
      this._depth = 0;
      this._objUrl = null;

      this._empty.addEventListener('click', () => { if (this._editable()) this._input.click(); });
      root.addEventListener('click', (e) => {
        const act = e.target.closest && e.target.closest('button') && e.target.closest('button').getAttribute('data-act');
        if (act === 'replace' && this._editable()) this._input.click();
        if (act === 'clear' && this._editable()) this._clear();
        if (act === 'restart') {
          this._video.currentTime = 0;
          this._video.play().catch(() => {});
          this._video.muted = false;
          this._soundBtn.innerHTML = soundOn;
          this.removeAttribute('data-paused');
          this._syncBigPlay();
        }
        if (act === 'sound') {
          this._video.muted = !this._video.muted;
          this._soundBtn.innerHTML = this._video.muted ? soundOff : soundOn;
        }
        const bp = e.target.closest && e.target.closest('.big-play');
        if (bp) this._togglePlay();
      });
      this._video.addEventListener('click', () => {
        if (this._manual()) { this._togglePlay(); return; }
        this._togglePlay();
      });
      this._input.addEventListener('change', () => {
        const f = this._input.files && this._input.files[0];
        if (f) this._ingest(f);
        this._input.value = '';
      });
    }

    _manual() {
      return (this.getAttribute('manual') || '').toLowerCase() === 'true';
    }

    // Drops only ever land in this browser's own IndexedDB (there's no
    // shared sidecar for video like image-slot.js has), so outside the
    // omelette editor this must be read-only — otherwise any visitor to
    // the published site could "fill" a slot for themselves, and it looks
    // like an open upload box on an empty one.
    _editable() {
      return !!(window.omelette && window.omelette.writeFile);
    }

    _togglePlay() {
      const wasPaused = this._video.paused;
      if (wasPaused) {
        this._video.play().catch(() => {});
        this.removeAttribute('data-paused');
        // Pressing play is an explicit user action — turn sound on so they
        // don't have to make two clicks (play, then unmute) to hear a reel.
        this._video.muted = false;
        this._soundBtn.innerHTML = soundOn;
      } else {
        this._video.pause();
        this.setAttribute('data-paused', '');
      }
      this._syncBigPlay();
    }

    _syncBigPlay() {
      if (!this._bigPlay) return;
      this._bigPlay.innerHTML = this._video.paused ? playIcon : pauseIcon;
    }

    connectedCallback() {
      if (!this.id && !VideoSlot._warned) {
        VideoSlot._warned = true;
        console.warn('<video-slot> without an id will not persist its dropped video.');
      }
      if (this._editable()) {
        this.addEventListener('dragenter', this);
        this.addEventListener('dragover', this);
        this.addEventListener('dragleave', this);
        this.addEventListener('drop', this);
      }
      this.toggleAttribute('data-editable', this._editable());
      this._render();
      this._hydrate();
    }

    disconnectedCallback() {
      this.removeEventListener('dragenter', this);
      this.removeEventListener('dragover', this);
      this.removeEventListener('dragleave', this);
      this.removeEventListener('drop', this);
      if (this._objUrl) URL.revokeObjectURL(this._objUrl);
      if (this._io) { this._io.disconnect(); this._io = null; }
    }

    attributeChangedCallback() { if (this.shadowRoot) this._render(); }

    handleEvent(e) {
      if (e.type === 'dragenter' || e.type === 'dragover') {
        e.preventDefault(); e.stopPropagation();
        if (e.dataTransfer) e.dataTransfer.dropEffect = 'copy';
        if (e.type === 'dragenter') this._depth++;
        this.setAttribute('data-over', '');
      } else if (e.type === 'dragleave') {
        if (--this._depth <= 0) { this._depth = 0; this.removeAttribute('data-over'); }
      } else if (e.type === 'drop') {
        e.preventDefault(); e.stopPropagation();
        this._depth = 0; this.removeAttribute('data-over');
        const f = e.dataTransfer && e.dataTransfer.files && e.dataTransfer.files[0];
        if (f) this._ingest(f);
      }
    }

    async _hydrate() {
      if (!this.id) return;
      try {
        const blob = await dbGet(this.id);
        // Don't blast-autoplay every reel on page load — only the ones
        // already in view get to play (unless manual mode); the rest wait
        // for the IO callback.
        if (blob) this._show(blob, { autoplay: false });
      } catch (err) { console.warn('<video-slot> load failed:', err); }
    }

    async _ingest(file) {
      if (!this._editable()) return;
      this._setError(null);
      if (!file || (ACCEPT.indexOf(file.type) < 0 && !/\.mp4$/i.test(file.name))) {
        this._setError('Dépose un fichier MP4, MOV ou WebM.');
        return;
      }
      this._show(file);
      if (this.id) {
        try { await dbPut(this.id, file); } catch (err) { console.warn('<video-slot> save failed:', err); }
      }
    }

    _show(blob, opts) {
      opts = opts || {};
      if (this._objUrl) URL.revokeObjectURL(this._objUrl);
      this._objUrl = URL.createObjectURL(blob);
      this._video.src = this._objUrl;
      this._video.style.display = 'block';
      this.setAttribute('data-filled', '');
      this._video.muted = true;
      this._soundBtn.innerHTML = soundOff;
      const manual = this._manual();
      if (manual) {
        this.toggleAttribute('data-manual', true);
        this.setAttribute('data-paused', '');
        this._syncBigPlay();
      } else if (opts.autoplay !== false) {
        this._video.play().catch(() => {});
      }
      if (!manual) this._observeVisibility();
    }

    _observeVisibility() {
      if (this._io || this._manual()) return;
      this._io = new IntersectionObserver((entries) => {
        entries.forEach((entry) => {
          if (!this._video.src) return;
          if (entry.isIntersecting) {
            if (this._video.paused && !this.hasAttribute('data-paused')) this._video.play().catch(() => {});
          } else {
            if (!this._video.paused) this._video.pause();
          }
        });
      }, { threshold: 0.25 });
      this._io.observe(this);
    }

    async _clear() {
      if (this._objUrl) { URL.revokeObjectURL(this._objUrl); this._objUrl = null; }
      this._video.removeAttribute('src');
      this._video.style.display = 'none';
      this.removeAttribute('data-filled');
      if (this.id) { try { await dbDel(this.id); } catch (err) {} }
    }

    _setError(msg) {
      if (this._err) { this._err.remove(); this._err = null; }
      if (!msg) return;
      const d = document.createElement('div');
      d.className = 'err'; d.textContent = msg;
      this.shadowRoot.appendChild(d);
      this._err = d;
      setTimeout(() => { if (this._err === d) { d.remove(); this._err = null; } }, 3000);
    }

    _render() {
      const shape = (this.getAttribute('shape') || 'rounded').toLowerCase();
      let radius = '0px';
      if (shape === 'rounded') {
        const n = parseFloat(this.getAttribute('radius'));
        radius = (Number.isFinite(n) ? n : 14) + 'px';
      }
      this.style.borderRadius = radius;
      this._cap.textContent = this.getAttribute('placeholder') || 'Dépose une vidéo';
    }
  }

  if (!customElements.get('video-slot')) {
    customElements.define('video-slot', VideoSlot);
  }
})();
