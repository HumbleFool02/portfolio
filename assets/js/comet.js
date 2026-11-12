/**
 * Comet trail: a small comet of light circling a pill button's edge at a constant speed.
 *
 * Adds an SVG pill traced along the button's border and runs a few stacked dashes around it,
 * a white-hot head over a fading tail. CSS animates the dashes (see .comet in site.css);
 * this only keeps the geometry in step with the button's size.
 */
const SVG_NS = 'http://www.w3.org/2000/svg';
const DASHES = [56, 30, 14, 4];  // px, tail to head; all end at the same point

export function attachComet(el) {
  const svg = document.createElementNS(SVG_NS, 'svg');
  svg.setAttribute('class', 'comet');
  svg.setAttribute('aria-hidden', 'true');
  const rects = DASHES.map((len) => {
    const rect = document.createElementNS(SVG_NS, 'rect');
    rect.setAttribute('class', 'comet__dash');
    rect.style.setProperty('--len', `${len}px`);
    svg.append(rect);
    return rect;
  });
  el.prepend(svg);

  const fit = () => {
    const w = el.offsetWidth, h = el.offsetHeight;
    if (!w || !h) return;
    // trace the middle of the 1px border
    const pw = w - 1, ph = h - 1;
    for (const rect of rects) {
      rect.setAttribute('x', '0.5');
      rect.setAttribute('y', '0.5');
      rect.setAttribute('width', String(pw));
      rect.setAttribute('height', String(ph));
      rect.setAttribute('rx', String(ph / 2));
    }
    // use the browser's own measure so the lap closes without a seam; a pill is two straights plus one circle
    const perimeter = rects[0].getTotalLength?.() || 2 * (pw - ph) + Math.PI * ph;
    svg.style.setProperty('--perimeter', `${perimeter}px`);
    // one dash per lap: the gap fills the rest of the perimeter
    rects.forEach((rect, i) => rect.setAttribute('stroke-dasharray', `${DASHES[i]} ${perimeter - DASHES[i]}`));
  };
  new ResizeObserver(fit).observe(el);
  fit();
}
