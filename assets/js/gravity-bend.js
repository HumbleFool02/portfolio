/**
 * Lets the hero's sun or moon feel the gravity well, a little, so it belongs to the same sky.
 *
 * While you hold, it leans toward the well, curving the way the stars spiral in, and stretches slightly
 * toward it. When you let go it recoils with the burst and springs back with a small wobble.
 * It moves the wrapper (body and caption together) and stretches only the canvas, so sunmoon.js's
 * drawing and its scroll parallax are untouched. Runs only while the well is held or the spring is settling.
 */
const LEAN = 22, LEAN_CHARGED = 64;    // px toward the well: as a hold starts, and fully charged (desktop-size body)
const KICK = 180, KICK_CHARGED = 460;  // px/s away from the burst when you let go
const REACH = 700;                     // px from the body's edge where the pull is felt at half strength
const SPIRAL = 0.35;                   // rad: how far the lean curves at full charge, like the stars' spiral
const STRETCH = 0.06;                  // the most the body stretches along the lean (6%)
const STIFF = 70, DAMP = 6;            // spring: about 1.3 Hz, settling after a short wobble
const REF_RADIUS = 165;                // the body's radius at 1440 px wide; smaller bodies lean proportionally less

export function attachGravityBend(wrap, sky) {
  const canvas = wrap.querySelector('canvas');
  const reduce = matchMedia('(prefers-reduced-motion: reduce)');
  if (!canvas || !sky?.onWell) return;
  const p = { x: 0, y: 0, vx: 0, vy: 0 };
  let raf = 0, last = 0;

  // where the body rests on screen: where it is now, minus our own lean
  const body = () => {
    const r = canvas.getBoundingClientRect();
    return { x: r.left + r.width / 2 - p.x, y: r.top + r.height / 2 - p.y, R: r.width / 4, bottom: r.bottom };
  };
  const falloff = (d) => 1 / (1 + (Math.max(0, d) / REACH) ** 2);
  const scaleFor = (R) => Math.min(1, Math.max(0.5, R / REF_RADIUS));

  const apply = () => {
    wrap.style.transform = `translate3d(${p.x.toFixed(2)}px, ${p.y.toFixed(2)}px, 0)`;
    const len = Math.hypot(p.x, p.y), s = STRETCH * Math.min(1, len / LEAN_CHARGED), a = Math.atan2(p.y, p.x);
    canvas.style.transform = `rotate(${a.toFixed(4)}rad) scale(${(1 + s).toFixed(4)}, ${(1 - s * 0.5).toFixed(4)}) rotate(${(-a).toFixed(4)}rad)`;
  };
  const rest = () => { p.x = p.y = p.vx = p.vy = 0; wrap.style.transform = ''; canvas.style.transform = ''; };

  const frame = (now) => {
    const dt = Math.min(0.05, (now - last) / 1000 || 0.016); last = now;
    const w = sky.well(), b = body(), k = scaleFor(b.R);
    let tx = 0, ty = 0;
    if (w.down) {
      const dx = w.x - b.x, dy = w.y - b.y, d = Math.hypot(dx, dy) || 1;
      const lean = (LEAN + (LEAN_CHARGED - LEAN) * w.charge) * k * falloff(d - b.R);
      const ang = Math.atan2(dy, dx) + SPIRAL * w.charge;
      tx = Math.cos(ang) * lean; ty = Math.sin(ang) * lean;
    }
    p.vx += (STIFF * (tx - p.x) - DAMP * p.vx) * dt;
    p.vy += (STIFF * (ty - p.y) - DAMP * p.vy) * dt;
    p.x += p.vx * dt; p.y += p.vy * dt;
    if (!w.down && Math.hypot(p.x, p.y) < 0.05 && Math.hypot(p.vx, p.vy) < 0.5) { rest(); raf = 0; return; }
    apply();
    raf = requestAnimationFrame(frame);
  };
  const wake = () => { if (!raf) { last = performance.now(); raf = requestAnimationFrame(frame); } };

  sky.onWell((type, e) => {
    if (reduce.matches || !wrap.hasAttribute('data-ready')) return;
    const b = body();
    if (b.bottom < 0) return;  // the hero is scrolled away
    if (type === 'release') {
      // the burst flings it outward, like the stars, then the spring brings it home
      const dx = b.x - e.x, dy = b.y - e.y, d = Math.hypot(dx, dy) || 1;
      const kick = (KICK + (KICK_CHARGED - KICK) * e.c) * scaleFor(b.R) * falloff(d - b.R);
      p.vx += (dx / d) * kick; p.vy += (dy / d) * kick;
    }
    wake();
  });
}
