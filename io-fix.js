// Chrome computes IntersectionObserver ratios wrongly inside elements with CSS `zoom`, and the
// desktop and tablet sections use zoom (custom.css). There, replace IntersectionObserver with one that
// measures getBoundingClientRect, which is correct under zoom. Must load before Framer's scripts.
(() => {
  const Native = window.IntersectionObserver;
  if (!Native) return;
  // desktop and tablet (600px+) both scale sections with zoom
  const desktop = () => matchMedia('(min-width: 600px)').matches;

  const observers = new Set();
  let scheduled = false;
  const schedule = () => {
    if (scheduled) return;
    scheduled = true;
    requestAnimationFrame(() => { scheduled = false; observers.forEach(o => o._check()); });
  };
  addEventListener('scroll', schedule, { passive: true, capture: true });
  addEventListener('resize', schedule);
  // layout also moves without scrolling (animations, images loading)
  setInterval(schedule, 200);

  const parseMargin = (m) => {
    const parts = String(m || '0px').trim().split(/\s+/);
    while (parts.length < 4) parts.push(parts[parts.length === 3 ? 1 : parts.length === 2 ? 0 : 0]);
    return parts.map(p => ({ v: parseFloat(p) || 0, pct: p.endsWith('%') }));
  };

  class ZoomSafeIntersectionObserver {
    constructor(callback, options = {}) {
      // phones have no zoom: keep the browser's own observer there
      if (!desktop()) return new Native(callback, options);
      this._cb = callback;
      this.root = options.root || null;
      this.rootMargin = options.rootMargin || '0px';
      const t = options.threshold ?? 0;
      this.thresholds = (Array.isArray(t) ? t : [t]).slice().sort((a, b) => a - b);
      this._margin = parseMargin(this.rootMargin);
      this._state = new Map();
      observers.add(this);
    }
    observe(el) {
      if (!this._state.has(el)) this._state.set(el, { index: -1, inter: null });
      schedule();
    }
    unobserve(el) { this._state.delete(el); }
    disconnect() { this._state.clear(); observers.delete(this); }
    takeRecords() { return []; }
    _rootRect() {
      const r = this.root && this.root.getBoundingClientRect
        ? this.root.getBoundingClientRect()
        : { top: 0, left: 0, right: innerWidth, bottom: innerHeight, width: innerWidth, height: innerHeight };
      const [mt, mr, mb, ml] = this._margin;
      const px = (m, size) => (m.pct ? (m.v / 100) * size : m.v);
      const top = r.top - px(mt, r.height), bottom = r.bottom + px(mb, r.height);
      const left = r.left - px(ml, r.width), right = r.right + px(mr, r.width);
      return { top, bottom, left, right, width: right - left, height: bottom - top, x: left, y: top };
    }
    _check() {
      if (!this._state.size) return;
      const root = this._rootRect();
      const entries = [];
      const time = performance.now();
      for (const [el, st] of this._state) {
        if (!el.isConnected) continue;
        const b = el.getBoundingClientRect();
        const top = Math.max(b.top, root.top), bottom = Math.min(b.bottom, root.bottom);
        const left = Math.max(b.left, root.left), right = Math.min(b.right, root.right);
        const intersects = bottom >= top && right >= left && !(b.width === 0 && b.height === 0 && (bottom === top || right === left) && false);
        const iw = Math.max(0, right - left), ih = Math.max(0, bottom - top);
        const area = b.width * b.height;
        const ratio = intersects ? (area > 0 ? (iw * ih) / area : 1) : 0;
        let index = 0;
        while (index < this.thresholds.length && ratio >= this.thresholds[index]) index++;
        const minT = this.thresholds[0] || 0;
        const isIntersecting = intersects && (minT === 0 ? true : ratio >= minT);
        if (index !== st.index || isIntersecting !== st.inter) {
          st.index = index; st.inter = isIntersecting;
          entries.push({
            target: el, time, isIntersecting, intersectionRatio: ratio,
            boundingClientRect: b, rootBounds: root,
            intersectionRect: intersects ? { top, bottom, left, right, width: iw, height: ih, x: left, y: top } : { top: 0, bottom: 0, left: 0, right: 0, width: 0, height: 0, x: 0, y: 0 },
          });
        }
      }
      if (entries.length) this._cb(entries, this);
    }
  }
  window.IntersectionObserver = ZoomSafeIntersectionObserver;
})();
