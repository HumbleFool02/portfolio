/**
 * The cursor is a little spacecraft, for a mouse or trackpad (touch screens keep their own behaviour). Its nose is
 * the hotspot, so it clicks exactly where the arrow would. It turns to face the way it's flying and its engine burns
 * harder the faster it goes; over a link or button a ring lights up at the nose.
 * Holding the mouse down on the sky opens the gravity well in sky.js, drawn as a black hole: the ship spins down
 * into it and stays gone while the hole holds, then flies back out when it lets go. The hole is drawn on a canvas
 * that rides along with the ship, so it shows above the page, the sun and the dialogs.
 * The page's own cursor is hidden only once the ship is up (html[data-pk-ship]), so if this never runs, the normal
 * cursor stays. The ship is a manual popover, which puts it in the top layer, above the project dialogs too.
 */
const REST = -135;   // degrees: until it first flies, it points up and to the left, like the arrow cursor
const TURN = 0.2;    // how much of the way to its heading it turns each frame
const CLICKABLE = 'a[href], button, summary, label, select, [role="button"]';

export function startShipCursor({ sky = null } = {}) {
  const ship = document.querySelector('[data-ship]');
  const craft = ship?.querySelector('[data-ship-craft]');
  if (!ship || !craft || typeof ship.showPopover !== 'function') return;
  if (!matchMedia('(hover: hover) and (pointer: fine)').matches) return;
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const root = document.documentElement;

  let x = 0, y = 0, lastX = null, lastY = null, vx = 0, vy = 0;
  let angle = REST, thrust = 0, raf = 0, live = false, over = null;

  // back on top of the top layer, above a dialog that has just opened
  const raise = () => {
    try { if (ship.matches(':popover-open')) ship.hidePopover(); ship.showPopover(); } catch { /* not connected */ }
  };

  const frame = () => {
    raf = 0;
    const speed = Math.hypot(vx, vy);
    let turning = false;
    if (!reduce && speed > 0.5) {
      const heading = (Math.atan2(vy, vx) * 180) / Math.PI;
      const d = ((heading - angle + 540) % 360) - 180;  // the short way round
      angle += d * TURN;
      turning = Math.abs(d) > 0.5;
    }
    thrust += (Math.min(1, speed / 16) - thrust) * 0.22;
    vx *= 0.78; vy *= 0.78;
    ship.style.transform = `translate3d(${x}px, ${y}px, 0)`;
    craft.style.transform = `rotate(${angle.toFixed(2)}deg)`;
    ship.style.setProperty('--thrust', thrust.toFixed(3));
    if (speed > 0.05 || thrust > 0.005 || turning) raf = requestAnimationFrame(frame);
  };
  const kick = () => { if (!raf) raf = requestAnimationFrame(frame); };

  // the ring at the nose: lit over anything that can be clicked
  const aim = (target) => {
    const next = target?.closest?.(CLICKABLE) || null;
    if (next === over) return;
    over = next;
    ship.classList.toggle('is-target', !!over);
  };

  const onMove = (e) => {
    if (e.pointerType === 'touch') return;
    x = e.clientX; y = e.clientY;
    if (lastX !== null) { vx += (x - lastX - vx) * 0.5; vy += (y - lastY - vy) * 0.5; }
    lastX = x; lastY = y;
    if (!live) {
      live = true;
      root.setAttribute('data-pk-ship', '');
      sky?.setReticle?.(false);
      sky?.setHoleLayer?.(ship.querySelector('[data-ship-hole]'));
      raise();
    }
    ship.classList.add('is-on');
    aim(e.target);
    kick();
  };
  window.addEventListener('pointermove', onMove, { passive: true });

  // a touch on a hybrid laptop: give the screen back its own behaviour until the mouse moves again
  window.addEventListener('pointerdown', (e) => {
    if (e.pointerType === 'touch') { ship.classList.remove('is-on'); root.removeAttribute('data-pk-ship'); live = false; return; }
    if (over) ship.classList.add('is-press');
  }, { passive: true });
  window.addEventListener('pointerup', () => ship.classList.remove('is-press'), { passive: true });
  root.addEventListener('mouseleave', () => { ship.classList.remove('is-on'); lastX = lastY = null; });

  // scrolling moves the page under a still pointer, so check what's under the nose now
  let scrollQueued = false;
  window.addEventListener('scroll', () => {
    if (!live || scrollQueued) return;
    scrollQueued = true;
    requestAnimationFrame(() => { scrollQueued = false; aim(document.elementFromPoint(x, y)); });
  }, { passive: true });

  // the black hole swallows the ship while it's held, and lets it go again
  sky?.onWell?.((type) => ship.classList.toggle('is-swallowed', type === 'hold'));

  // a project dialog opening goes on top of the top layer, so the ship climbs back above it
  const dialogs = document.querySelectorAll('dialog');
  if (dialogs.length) {
    const watch = new MutationObserver(() => { if (live) raise(); });
    dialogs.forEach((d) => watch.observe(d, { attributes: true, attributeFilter: ['open'] }));
  }

  ship.style.transform = 'translate3d(-200px, -200px, 0)';
  craft.style.transform = `rotate(${REST}deg)`;
}
