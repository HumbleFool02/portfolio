// The 404 page's night sky: the home page's drifting constellations, without the warp intro or the gravity well
// (the ship cursor and the black hole aren't on this page). The page is served at any depth, so the data path
// starts at the site root.
import { createSky, loadConstellations } from './sky.js';

const canvas = document.querySelector('[data-sky]');
if (canvas) {
  const sky = createSky(canvas, { intro: false, gravityWell: false });
  loadConstellations('/data/sky.json')
    .then((data) => sky.setConstellations(data))
    .catch((err) => console.warn('Night sky: constellations unavailable, showing dust only.', err));
}
