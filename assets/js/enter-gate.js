/**
 * The Enter screen, shown over the starfield on a visitor's first arrival (intro-gate.js decides when).
 * "Hi! I am Piyush." types itself out, then a second line types, deletes and retypes through a few lines,
 * while a small satellite circles the greeting. "Click here" starts the warp with sound; "come in quietly",
 * or Esc, starts it silently. Until then the page behind is inert, so keyboard focus can't wander into
 * content that isn't shown yet.
 */
const TYPE_START = 450;    // ms before the first letter
const HOLD_LINE = 1700;    // ms a cycling line stays before it's deleted
const ORBIT_PERIOD = 18;   // seconds for one lap of the satellite
const ORBIT_TILT = -12;    // degrees, matching .gate__ring

const pause = (ch) => (ch === '!' || ch === '.' ? 360 : ch === ' ' ? 70 : 45 + Math.random() * 60);

// types data-type-plain, then data-type-accent in the shimmering accent, a letter at a time
const typeGreeting = (el, timers, done) => {
  const plain = document.createTextNode(''), accent = document.createElement('span');
  accent.className = 'shimmer';
  el.replaceChildren(plain, accent);
  const letters = [...(el.dataset.typePlain || '')].map((ch) => [plain, ch])
    .concat([...(el.dataset.typeAccent || '')].map((ch) => [accent, ch]));
  let i = 0;
  const next = () => {
    if (i >= letters.length) { done(); return; }
    const [node, ch] = letters[i++];
    node.textContent += ch;
    timers.t = setTimeout(next, pause(ch));
  };
  timers.t = setTimeout(next, TYPE_START);
};

// types each line of data-lines (split on |), holds it, deletes it, and moves on to the next, round and round
const cycleLines = (el, timers) => {
  const lines = (el.dataset.lines || '').split('|').filter(Boolean);
  let k = 0, text = '';
  const type = () => {
    const line = lines[k];
    if (text.length < line.length) {
      const ch = line[text.length]; text += ch; el.textContent = text;
      timers.t = setTimeout(type, ch === ' ' ? 60 : 35 + Math.random() * 45);
    } else timers.t = setTimeout(erase, HOLD_LINE);
  };
  const erase = () => {
    if (text.length) { text = text.slice(0, -1); el.textContent = text; timers.t = setTimeout(erase, 18); }
    else { k = (k + 1) % lines.length; timers.t = setTimeout(type, 280); }
  };
  if (lines.length) type();
};

// the satellite rides a tilted ellipse; on the far half of the orbit it passes behind the text, smaller and dimmer
const orbit = (ring, sat) => {
  let raf = 0;
  const t0 = performance.now(), tilt = (ORBIT_TILT * Math.PI) / 180, cos = Math.cos(tilt), sin = Math.sin(tilt);
  const frame = (now) => {
    const a = ring.offsetWidth / 2, b = ring.offsetHeight / 2;
    const th = ((now - t0) / 1000 / ORBIT_PERIOD) * Math.PI * 2;
    const ex = a * Math.cos(th), ey = b * Math.sin(th);
    const near = Math.sin(th);  // +1 nearest to us (the lower edge of the ellipse), -1 farthest
    const scale = 0.82 + 0.22 * near;
    sat.style.transform = `translate(${(ex * cos - ey * sin).toFixed(1)}px, ${(ex * sin + ey * cos).toFixed(1)}px) rotate(${ORBIT_TILT}deg) scale(${scale.toFixed(3)})`;
    sat.style.zIndex = near > 0 ? '2' : '0';
    sat.style.opacity = (0.55 + 0.45 * (near + 1) / 2).toFixed(2);
    raf = requestAnimationFrame(frame);
  };
  raf = requestAnimationFrame(frame);
  return () => cancelAnimationFrame(raf);
};

export function startEnterGate({ onEnter }) {
  const root = document.documentElement;
  const gate = document.querySelector('[data-gate]');
  if (!gate) { root.removeAttribute('data-pk-gate'); onEnter(false); return; }
  const behind = [...document.body.children].filter((el) => el !== gate && el.tagName !== 'SCRIPT');
  behind.forEach((el) => el.setAttribute('inert', ''));

  const timers = { t: 0 };
  const typed = gate.querySelector('.gate__typed'), line = gate.querySelector('.gate__line');
  const ready = () => { gate.classList.add('is-typed'); if (line) cycleLines(line, timers); };
  if (typed) typeGreeting(typed, timers, ready); else ready();
  const ring = gate.querySelector('.gate__ring'), sat = gate.querySelector('.gate__sat');
  const stopOrbit = ring && sat ? orbit(ring, sat) : () => {};

  let done = false;
  const enter = (withSound) => {
    if (done) return;
    done = true;
    clearTimeout(timers.t);
    try { sessionStorage.setItem('pk-entered', '1'); } catch { /* storage blocked: the gate shows again next visit */ }
    behind.forEach((el) => el.removeAttribute('inert'));
    document.removeEventListener('keydown', onKey);
    gate.classList.add('is-leaving');
    onEnter(withSound);
    setTimeout(() => { stopOrbit(); root.removeAttribute('data-pk-gate'); }, 550);
  };
  const onKey = (e) => { if (e.key === 'Escape') enter(false); };

  gate.querySelector('[data-enter="sound"]')?.addEventListener('click', () => enter(true));
  gate.querySelector('[data-enter="quiet"]')?.addEventListener('click', () => enter(false));
  document.addEventListener('keydown', onKey);
  // focus the screen itself, so it's announced; Tab reaches the button first, since everything behind is inert
  gate.setAttribute('tabindex', '-1');
  gate.focus({ preventScroll: true });
}
