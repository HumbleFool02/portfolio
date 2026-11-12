/**
 * The page feels the gravity well too, like the stars and the sun or moon. While you hold, every word near the black
 * hole leans in toward it on its own, curving the way the stars spiral in, twisting a little and shrinking a touch as
 * it falls, so a paragraph comes apart word by word. The nearer a word is the harder it's pulled. Things that are one
 * object on the page (the nav, chips, cards, buttons) move as one piece, and big ones, being heavier, move less.
 * When you let go everything is flung outward with the burst and springs back with a small wobble.
 *
 * A word can only move on its own in a box of its own, so when a hold starts the text on screen is cut into one
 * inline block per word (the lines break exactly where they did), and once everything has settled the original
 * text nodes go back, so the page is left as it was for screen readers, copying and find in page.
 *
 * It sets the separate translate, rotate and scale properties, never transform, so each element's own transform
 * (the cards riding in, the timeline sliding, the headlines rising) carries on underneath. It runs only while the
 * well is held or something is still settling, and only moves what's on screen.
 */

// one piece each: things that are a single object on the page
const WHOLE = [
  '.site-header .brand', '.site-nav a', '.dock > a', '.sky-hint',
  '.gate__lines', '.gate__enter', '.gate__quiet',  // the cycling line retypes itself every few letters, so it stays whole
  '.avail', '.chip', '.pcards > li', '.contact__links > li', '.site-footer > button',
].join(',');
// word by word
const WORDY = [
  '.gate__hello', '.hero__coords', '.hero__name', '.hero__role',
  '.section__label', '.headline', '.about__body', '.about__note', '.stack__label',
  '.timeline__head', '.timeline__note', '.timeline__points > li',
  '.contact__lede', '.site-footer > span',
].join(',');
// inside the text but one piece each: icons, the caret, and the sidereal clock, which rewrites itself every second
const SOLID = 'svg, img, .tw, .gate__caret, [data-lst]';
const UNSEEN = '.sr-only';
const WORD = /[^ \t\n\r\f]+/g;  // split at spaces, not at a no break space: words joined by one stay one word
const INK = /[^ \t\n\r\f]/;
const ROW = /flex|grid/;

const LEAN = 10, LEAN_CHARGED = 46;    // px toward the hole for something right beside it: as a hold starts, fully charged
const KICK = 140, KICK_CHARGED = 420;  // px/s outward when you let go
const REACH = 260;                     // px from the hole to a word's edge where the pull is at half strength
const SPIRAL = 0.35;                   // rad the lean curves at full charge, like the stars' spiral
const TWIST = 2.5;                     // degrees of twist at full lean
const SINK = 0.05;                     // how much smaller at full lean
const STIFF = 70, DAMP = 6;            // the same spring as the sun and moon (gravity-bend.js)
const LIGHT = 160;                     // px: half sizes up to this move fully; bigger pieces move proportionally less
const MARGIN = 120;                    // px beyond the window still worth moving

const falloff = (d) => 1 / (1 + (Math.max(0, d) / REACH) ** 2);
// how far a point is from a box (0 inside it)
const gap = (s, x, y) => Math.hypot(Math.max(0, Math.abs(x - s.cx) - s.hw), Math.max(0, Math.abs(y - s.cy) - s.hh));

// ── cutting text into words and putting it back ────────────────────────────────────────────────────────────────

const range = document.createRange();
const rectOf = (node, from, to) => { range.setStart(node, from); range.setEnd(node, to); return range.getBoundingClientRect(); };
const median = (xs) => (xs.length ? [...xs].sort((a, b) => a - b)[xs.length >> 1] : null);

// Where a word sits in its shimmer's sweep. A shimmer that wraps paints as if its lines were laid end to end, so a
// word's place counts the widths of the lines before its own.
const place = ({ lines }, r) => {
  const mid = (r.top + r.bottom) / 2;
  let before = 0;
  for (const line of lines) {
    if (mid >= line.top && mid <= line.bottom) return before + r.left - line.left;
    before += line.width;
  }
  return r.left - (lines[0]?.left ?? r.left);
};

// The reads first: every word of the text and where it sits now, whether its text sits straight in a flex or grid
// row, the icons, and the shimmers' sweeps.
const plan = (el) => {
  const texts = [], solids = [], shimmers = new Map();
  const sweep = (sh) => {
    if (!shimmers.has(sh)) {
      const lines = [...sh.getClientRects()].filter((r) => r.width > 0);
      shimmers.set(sh, { lines, width: lines.reduce((a, r) => a + r.width, 0) });
    }
    return shimmers.get(sh);
  };
  const walk = (node) => {
    for (const child of node.childNodes) {
      if (child.nodeType === Node.TEXT_NODE) {
        if (!INK.test(child.data)) continue;
        const sh = node.closest('.shimmer'), words = [];
        for (const m of child.data.matchAll(WORD)) {
          const r = rectOf(child, m.index, m.index + m[0].length);
          words.push({ text: m[0], at: m.index, left: r.left, top: r.top, ox: sh ? place(sweep(sh), r) : null, span: null });
        }
        texts.push({ node: child, row: ROW.test(getComputedStyle(node).display), words });
      } else if (child.nodeType === Node.ELEMENT_NODE && !child.matches(UNSEEN)) {
        if (child.matches(SOLID)) solids.push(child); else walk(child);
      }
    }
  };
  walk(el);
  return { texts, solids, shimmers };
};

// Then the writes: each word into a span of its own, the spaces between left as they were. In a flex row the text
// was one item, so it's kept in one span, or the row's gap would open between the words. A shimmer cut into words
// gives each word its own slice of the sweep, as wide as the whole phrase and shifted to where the word sits in it.
const cut = ({ texts, solids, shimmers }) => {
  const parts = [...solids], swaps = [];
  for (const { node, row, words } of texts) {
    const data = node.data;
    let put = [], at = 0;
    for (const w of words) {
      if (w.at > at) put.push(document.createTextNode(data.slice(at, w.at)));
      const span = document.createElement('span');
      span.className = 'pk-word';
      span.textContent = w.text;
      if (w.ox !== null) span.style.setProperty('--pk-ox', `${w.ox.toFixed(2)}px`);
      w.span = span; put.push(span); parts.push(span);
      at = w.at + w.text.length;
    }
    if (at < data.length) put.push(document.createTextNode(data.slice(at)));
    if (row) { const run = document.createElement('span'); run.append(...put); put = [run]; }
    node.replaceWith(...put);
    swaps.push([node, put]);
  }
  for (const [sh, { width }] of shimmers) { sh.style.setProperty('--pk-sw', `${width.toFixed(2)}px`); sh.dataset.pkSplit = ''; }
  return { parts, swaps, texts, shimmers: [...shimmers.keys()], whole: false };
};

// The font kerns some letters against the space beside them (a comma, a T), and a word in a box of its own loses
// that, so a line comes out a pixel or two longer and could break somewhere else. Each word gets a margin that puts
// the next word back exactly where it was. Reads now, writes after.
const fit = ({ texts }) => {
  const fixes = [];
  for (const { words } of texts) {
    if (words.length < 2) continue;
    const now = words.map((w) => w.span.getBoundingClientRect());
    const same = (i) => Math.abs(now[i + 1].top - now[i].top) < 1;
    const gaps = [];
    for (let i = 0; i + 1 < words.length; i++) if (same(i)) gaps.push(now[i + 1].left - now[i].right);
    const space = median(gaps);
    for (let i = 0; i + 1 < words.length; i++) {
      const a = words[i], b = words[i + 1];
      if (Math.abs(b.top - a.top) > 1 || b.left <= a.left) continue;  // the next word starts the next line
      const gapNow = same(i) ? now[i + 1].left - now[i].right : space;
      if (gapNow === null) continue;
      const m = b.left - a.left - now[i].width - gapNow;
      if (Math.abs(m) > 0.005 && Math.abs(m) < 4) fixes.push([a.span, m]);
    }
  }
  return () => fixes.forEach(([span, m]) => { span.style.marginRight = `${m.toFixed(3)}px`; });
};

// Did every word land where it was? If one didn't (a line broke somewhere else after all), the block is put back
// together and moves as one piece.
const landed = ({ texts }) => texts.every(({ words }) => words.every((w) => Math.abs(w.span.getBoundingClientRect().left - w.left) < 1.5));

// Drops a style attribute we've emptied. Chrome writes the attribute back from the style lazily, so it's read first,
// or the removal can come too early and leave style="" behind.
const tidy = (el) => { if (!el.getAttribute('style')) el.removeAttribute('style'); };

// The original text nodes go back where they were. If something rewrote the text meanwhile (the greeting typing,
// say), its new text is already there and there's nothing to put back.
const mend = (rec) => {
  for (const [text, put] of rec.swaps) {
    if (!put[0].isConnected) continue;
    put[0].before(text);
    put.forEach((n) => n.remove());
  }
  for (const sh of rec.shimmers) {
    delete sh.dataset.pkSplit;
    sh.style.removeProperty('--pk-sw');
    tidy(sh);
  }
  rec.swaps = []; rec.shimmers = []; rec.texts = []; rec.parts = [];
};

// ── the pull ───────────────────────────────────────────────────────────────────────────────────────────────────

export function attachPageBend(sky) {
  const reduce = matchMedia('(prefers-reduced-motion: reduce)');
  if (!sky?.onWell) return;
  const states = new Map();  // piece → its spring: resting centre and half size, offset and velocity
  const splits = new Map();  // block of text → its words, and how to put its text back
  let active = [], raf = 0, last = 0, dirty = true;

  // A chip or card is measured by its text (a range around its contents), so a block as wide as the column pulls
  // like the text in it; a word by its own box.
  const box = (el) => {
    range.selectNodeContents(el);
    const t = range.getBoundingClientRect();
    return t.width > 0 && t.height > 0 ? t : el.getBoundingClientRect();
  };
  const shown = (el) => el.checkVisibility?.({ opacityProperty: true, visibilityProperty: true }) ?? true;

  // Where everything on screen rests: where it is now, minus our own offset. Text that has come on screen is cut
  // into words first, its reads and writes in batches so the page lays out as few times as it can.
  const measure = () => {
    dirty = false;
    const W = innerWidth, H = innerHeight;
    const near = (r) => r.width > 0 && r.height > 0 && r.bottom > -MARGIN && r.top < H + MARGIN && r.right > -MARGIN && r.left < W + MARGIN;

    const plans = [];
    for (const el of document.querySelectorAll(WORDY)) {
      if (!splits.has(el) && near(el.getBoundingClientRect()) && shown(el)) plans.push([el, plan(el)]);
    }
    const fresh = plans.map(([el, p]) => { const s = cut(p); splits.set(el, s); return s; });
    fresh.map(fit).forEach((write) => write());
    for (const s of fresh) if (!landed(s)) { mend(s); s.whole = true; }

    const next = [];
    const take = (el, r, seen) => {
      let s = states.get(el);
      if (!seen && !s) return;
      if (!s) { s = { el, x: 0, y: 0, vx: 0, vy: 0, on: false }; states.set(el, s); }
      const k = 1 - SINK * Math.min(1, Math.hypot(s.x, s.y) / LEAN_CHARGED);  // undo our own shrink in the size
      s.cx = r.left + r.width / 2 - s.x; s.cy = r.top + r.height / 2 - s.y;
      s.hw = r.width / 2 / k; s.hh = r.height / 2 / k;
      s.mass = Math.min(1, Math.max(0.3, LIGHT / Math.max(s.hw, s.hh)));
      next.push(s);
    };
    for (const el of document.querySelectorAll(WHOLE)) { const r = box(el); take(el, r, near(r) && shown(el)); }
    for (const [el, { parts, whole }] of splits) {
      if (whole) { const r = box(el); take(el, r, near(r) && shown(el)); continue; }
      const vis = shown(el);
      for (const p of parts) { const r = p.getBoundingClientRect(); take(p, r, vis && near(r)); }
    }
    active = next;
  };

  const apply = (s) => {
    const k = Math.min(1, Math.hypot(s.x, s.y) / LEAN_CHARGED), st = s.el.style;
    if (!s.on) { s.on = true; st.willChange = 'translate, rotate, scale'; }
    st.translate = `${s.x.toFixed(2)}px ${s.y.toFixed(2)}px`;
    st.rotate = `${(TWIST * k).toFixed(3)}deg`;
    st.scale = (1 - SINK * k).toFixed(4);
  };
  const rest = (s) => {
    s.x = s.y = s.vx = s.vy = 0;
    if (!s.on) return;
    s.on = false;
    const st = s.el.style;
    st.translate = st.rotate = st.scale = st.willChange = '';
    tidy(s.el);
  };

  const frame = (now) => {
    const dt = Math.min(0.05, (now - last) / 1000 || 0.016); last = now;
    if (dirty) measure();
    const w = sky.well();
    let moving = false;
    for (const s of active) {
      let tx = 0, ty = 0;
      if (w.down) {
        const dx = w.x - s.cx, dy = w.y - s.cy, d = Math.hypot(dx, dy) || 1;
        // never so far that its middle would cross into the hole
        const lean = Math.min(d * 0.6, (LEAN + (LEAN_CHARGED - LEAN) * w.charge) * s.mass * falloff(gap(s, w.x, w.y)));
        const ang = Math.atan2(dy, dx) + SPIRAL * w.charge;
        tx = Math.cos(ang) * lean; ty = Math.sin(ang) * lean;
      }
      s.vx += (STIFF * (tx - s.x) - DAMP * s.vx) * dt;
      s.vy += (STIFF * (ty - s.y) - DAMP * s.vy) * dt;
      s.x += s.vx * dt; s.y += s.vy * dt;
      if (!w.down && Math.hypot(s.x, s.y) < 0.05 && Math.hypot(s.vx, s.vy) < 0.5) { rest(s); continue; }
      moving = true;
      apply(s);
    }
    if (!w.down && !moving) {
      // all home: put the text back together
      active.forEach(rest); states.clear(); active = [];
      splits.forEach(mend); splits.clear();
      raf = 0; dirty = true;
      return;
    }
    raf = requestAnimationFrame(frame);
  };
  const wake = () => { if (!raf) { last = performance.now(); raf = requestAnimationFrame(frame); } };

  // scrolling or resizing while things are bent moves where they rest, and may bring new text on screen
  const remeasure = () => { if (raf) dirty = true; };
  window.addEventListener('scroll', remeasure, { passive: true });
  window.addEventListener('resize', remeasure);

  sky.onWell((type, e) => {
    if (reduce.matches) return;
    if (type === 'hold' && !raf) dirty = true;
    if (type === 'release') {
      if (dirty) measure();
      // the burst flings everything outward, like the stars, then the springs bring it home
      const boost = KICK + (KICK_CHARGED - KICK) * e.c;
      for (const s of active) {
        const dx = s.cx - e.x, dy = s.cy - e.y, d = Math.hypot(dx, dy) || 1;
        const kick = boost * s.mass * falloff(gap(s, e.x, e.y));
        s.vx += (dx / d) * kick; s.vy += (dy / d) * kick;
      }
    }
    wake();
  });
}
