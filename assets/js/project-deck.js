/**
 * The project deck: on wider screens the Projects section pins while you scroll, and the cards ride up into
 * their row one at a time, the way a scroll-scrubbed timeline would. Each card's position follows the
 * scrollbar, so scrolling back sends them down again. The last stretch of the pin is a short hold with all
 * cards in place before the page moves on.
 *
 * Writes --rise (0 below the screen, 1 in place) on each card; the CSS turns it into the movement.
 * Only when all four cards share a row (1000px and wider, as in site.css) and the window is tall enough; narrower
 * screens, where the cards stack two to a row or one under another, short windows and reduced motion get no pin.
 */
const HOLD = 0.6;  // the closing hold, in card-sized slices of the scroll

export function startProjectDeck(deck) {
  const items = [...deck.querySelectorAll('.pcards > li')];
  const wide = matchMedia('(min-width: 1000px) and (min-height: 600px)');
  const reduce = matchMedia('(prefers-reduced-motion: reduce)');
  const slice = 1 / (items.length + HOLD);
  let raf = 0;

  const update = () => {
    raf = 0;
    if (!deck.hasAttribute('data-pinned')) return;
    const r = deck.getBoundingClientRect(), span = r.height - window.innerHeight;
    const p = span > 0 ? Math.min(1, Math.max(0, -r.top / span)) : 1;
    items.forEach((li, i) => {
      const t = Math.min(1, Math.max(0, (p - i * slice) / slice));
      li.style.setProperty('--rise', (1 - (1 - t) ** 3).toFixed(4));  // ease out: quick start, soft landing
    });
  };
  const queue = () => { if (!raf) raf = requestAnimationFrame(update); };
  const setup = () => {
    const pin = wide.matches && !reduce.matches;
    deck.toggleAttribute('data-pinned', pin);
    if (!pin) items.forEach((li) => li.style.removeProperty('--rise'));
    update();
  };

  window.addEventListener('scroll', queue, { passive: true });
  window.addEventListener('resize', queue);
  wide.addEventListener('change', setup);
  reduce.addEventListener('change', setup);
  setup();
}
