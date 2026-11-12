/**
 * Experience "trajectory": the accent line fills down the rail as you scroll, and each stop lights
 * up (star bursts, entry comes into focus) once it passes the reading line.
 */
const clamp01 = (v) => Math.max(0, Math.min(1, v));

export function startTimeline(box) {
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const fill = box.querySelector('.timeline__fill');
  const items = Array.from(box.querySelectorAll('.timeline__item'));
  box.setAttribute('data-armed', '');

  let frame = 0;
  const run = () => {
    frame = 0;
    const vh = window.innerHeight || 800;
    const doc = document.documentElement;
    const atEnd = vh + (window.scrollY || doc.scrollTop || 0) >= doc.scrollHeight - 4;
    const mark = vh * 0.62;
    const r = box.getBoundingClientRect();
    const total = Math.max(0, r.height - 20);
    const p = reduce || atEnd ? 1 : clamp01((mark - r.top - 10) / (total || 1));
    if (fill) fill.style.height = `${p * total}px`;
    for (const it of items) {
      it.toggleAttribute('data-lit', reduce || atEnd || it.getBoundingClientRect().top + 10 < mark);
    }
  };
  const schedule = () => { if (!frame) frame = requestAnimationFrame(run); };
  window.addEventListener('scroll', schedule, { passive: true });
  window.addEventListener('resize', schedule);
  run();
  setTimeout(run, 400);  // again once fonts and layout have settled
}
