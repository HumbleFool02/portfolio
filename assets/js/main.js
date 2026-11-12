import { createSky, loadConstellations } from './sky.js';
import { startTimeline } from './timeline.js';
import { startSiderealClock } from './sidereal.js';
import { attachComet } from './comet.js';
import { createSunMoon } from './sunmoon.js';
import { attachGravityBend } from './gravity-bend.js';
import { attachPageBend } from './page-bend.js';
import { startProjectCards } from './project-cards.js';
import { startProjectDeck } from './project-deck.js';
import { playWarpSound } from './warp-sound.js';
import { startEmailLinks } from './email-links.js';
import { startEnterGate } from './enter-gate.js';
import { startShipCursor } from './ship-cursor.js';

const MELBOURNE_FL_LONGITUDE = -80.6081;  // degrees, east positive

const root = document.documentElement;
root.setAttribute('data-pk-ready', '');  // tells intro-gate.js the page's code is running
const gated = root.hasAttribute('data-pk-gate');  // the Enter screen is up: the warp waits for the click

// night sky
const canvas = document.querySelector('[data-sky]');
let sky = null;
if (canvas) {
  sky = createSky(canvas, {
    hint: document.querySelector('[data-sky-hint]'),
    intro: root.hasAttribute('data-pk-intro') && !gated,  // data-pk-intro is set by intro-gate.js in <head>
  });
  loadConstellations('data/sky.json')
    .then((data) => {
      sky.setConstellations(data);
      const count = document.querySelector('[data-constellation-count]');
      if (count) count.textContent = String(data.length);
    })
    .catch((err) => console.warn('Night sky: constellations unavailable, showing dust only.', err));
  // the page's text and cards feel the gravity well too, like the stars
  attachPageBend(sky);
  // replaying the warp is a click, so the browser lets it play sound
  document.querySelector('[data-replay-intro]')?.addEventListener('click', () => { playWarpSound(); sky.replayIntro(); });
}

// the cursor is a little spacecraft; holding on the sky, it falls into the black hole
startShipCursor({ sky });

// the Enter screen: its click starts the warp, and lets it play sound
if (gated) {
  startEnterGate({
    onEnter: (withSound) => {
      if (withSound) playWarpSound();
      if (sky) sky.replayIntro(); else root.removeAttribute('data-pk-intro');
    },
  });
}

// sun by day, moon by night in the hero; its heavy drawing waits until the warp intro has finished
const orb = document.querySelector('.pk-orb-wrap');
if (orb) {
  createSunMoon({
    wrap: orb,
    inner: orb.querySelector('.pk-orb-inner'),
    canvas: orb.querySelector('canvas'),
    caption: orb.querySelector('.pk-orb-cap'),
    mode: 'local',   // 'local' | 'melbourne' | 'sun' | 'moon' | 'off'; preview with ?sky=sun or ?sky=moon&phase=full
    phase: 'real',   // 'real' | 'full' | 'half' | 'crescent'
    canStart: () => !document.documentElement.hasAttribute('data-pk-intro'),
  });
  // it feels the gravity well too: leans in while you hold, recoils when you let go
  if (sky) attachGravityBend(orb, sky);
  // keep it level with the name however the hero reflows. Layout offsets, not on-screen boxes, so the
  // intro's slide-up and the parallax don't throw the measurement off.
  const hero = orb.closest('#hero'), name = hero?.querySelector('.hero__name');
  if (hero && name) {
    const level = () => orb.style.setProperty('--orb-y', `${name.offsetTop + name.offsetHeight / 2}px`);
    // the hero and every line in it: a web font arriving changes their heights and moves the name
    const watch = new ResizeObserver(level);
    [hero, ...hero.children].forEach((el) => { if (el !== orb) watch.observe(el); });
    level();
  }
}

// project cards open their write-ups in dialogs; on wider screens they ride in one by one
startProjectCards();
const deck = document.querySelector('[data-deck]');
if (deck) startProjectDeck(deck);

// the copyright year keeps itself current
document.querySelectorAll('[data-year]').forEach((el) => { el.textContent = String(new Date().getFullYear()); });

// email links copy the address and offer Gmail or the mail app
startEmailLinks();

// comet-trail buttons
document.querySelectorAll('[data-comet]').forEach(attachComet);

// experience trajectory
const timeline = document.querySelector('[data-timeline]');
if (timeline) startTimeline(timeline);

// sidereal clock in the hero
const lst = document.querySelector('[data-lst]');
if (lst) startSiderealClock(lst, MELBOURNE_FL_LONGITUDE);

// header: mark the section in the middle of the viewport
const navLinks = new Map(
  Array.from(document.querySelectorAll('.site-nav a[href^="#"]'), (a) => [a.hash.slice(1), a]),
);
const sectionObserver = new IntersectionObserver((entries) => {
  for (const entry of entries) {
    if (!entry.isIntersecting) continue;
    for (const [id, link] of navLinks) {
      if (id === entry.target.id) link.setAttribute('aria-current', 'true');
      else link.removeAttribute('aria-current');
    }
  }
}, { rootMargin: '-45% 0px -50% 0px' });
document.querySelectorAll('main > section[id]').forEach((section) => sectionObserver.observe(section));

// the gravity hint only belongs on the hero; the dock steps aside while the contact links are on screen
const awayWhen = (el, target, away, options) => {
  if (!el || !target) return;
  new IntersectionObserver(([entry]) => el.toggleAttribute('data-away', away(entry)), options).observe(target);
};
awayWhen(document.querySelector('[data-sky-hint]'), document.querySelector('#hero'), (e) => e.intersectionRatio < 0.5, { threshold: 0.5 });
awayWhen(document.querySelector('.dock'), document.querySelector('.contact__links'), (e) => e.isIntersecting);
