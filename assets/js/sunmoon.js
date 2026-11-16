/**
 * sunmoon.js: a sun by day and a moon by night for the portfolio hero.
 *
 * Everything is drawn in code on a canvas, pixel by pixel; there are no image files.
 * The moon shows the real current phase (Meeus, low precision), lit from the sun's
 * direction, with craters that cast shadows along the terminator and earthshine on the
 * dark side. The sun is drawn as a hydrogen alpha photograph shows it: a deep orange disk of fine,
 * curly fibrils and dark filaments, a bright fuzzy limb with prominences, inside an orange glow.
 *
 * Usage:
 *   import { createSunMoon } from './sunmoon.js';
 *   const sky = createSunMoon({ wrap, inner, canvas, caption });
 *   // later: sky.setMode('moon'); sky.setPhase('full'); sky.destroy();
 *
 * Options:
 *   wrap, inner, canvas, caption  DOM elements (see the markup in the brief)
 *   mode   'local' (default: sun 6 am to 6 pm on the visitor's clock) | 'location'
 *          (real sunrise and sunset at `location`) | 'sun' | 'moon' | 'off'
 *   phase  'real' (default) | 'full' | 'half' | 'crescent'
 *   location  { lat, lon } in degrees, east positive; default Melbourne, Florida
 *   canStart  () => boolean; heavy drawing waits until it returns true (e.g. after an intro)
 *   urlOverride  read ?sky=local|location|sun|moon|off and &phase=real|full|half|crescent (default true)
 */
// ---------- sun and moon: drawn pixel by pixel with real lighting ----------
const pkHash = (x, y) => {
  let h = Math.imul(x | 0, 374761393) + Math.imul(y | 0, 668265263);
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
};
const pkNoise = (x, y) => {
  const xi = Math.floor(x), yi = Math.floor(y), xf = x - xi, yf = y - yi;
  const u = xf * xf * (3 - 2 * xf), v = yf * yf * (3 - 2 * yf);
  const a = pkHash(xi, yi), b = pkHash(xi + 1, yi), c = pkHash(xi, yi + 1), d = pkHash(xi + 1, yi + 1);
  return a + (b - a) * u + (c - a) * v + (a - b - c + d) * u * v;
};
const pkFbm = (x, y, oct) => {
  let s = 0, amp = 0.5, f = 1, norm = 0;
  for (let o = 0; o < oct; o++) { s += amp * pkNoise(x * f + o * 17.31, y * f - o * 9.17); norm += amp; amp *= 0.5; f *= 2.03; }
  return s / norm;
};
const pkSmooth = (a, b, v) => { const t = Math.max(0, Math.min(1, (v - a) / (b - a))); return t * t * (3 - 2 * t); };
const pkRand = (seed) => () => {
  seed = (seed + 0x6D2B79F5) | 0;
  let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
  t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
};
const PK_RAD = Math.PI / 180;

// Lunar maria, near side, as overlapping patches: [lat, lon, half width (deg), half height (deg), rotation, strength, albedo]
const PK_MARIA = [
  // Procellarum
  [40, -55, 13, 13, 0, 1, 0.42], [25, -58, 15, 15, 0, 1, 0.42], [10, -55, 14, 14, 0, 1, 0.42], [0, -48, 12, 12, 0, 1, 0.42], [-8, -42, 9, 9, 0, 1, 0.42], [15, -42, 10, 10, 0, 1, 0.42], [30, -45, 10, 10, 0, 1, 0.42], [45, -45, 8, 8, 0, 1, 0.42], [5, -65, 9, 9, 0, 1, 0.42], [-5, -60, 8, 8, 0, 1, 0.42], [20, -68, 8, 8, 0, 1, 0.42], [35, -62, 9, 9, 0, 1, 0.42],
  // Imbrium
  [33, -16, 15, 15, 0, 1, 0.4], [38, -25, 10, 10, 0, 1, 0.4], [28, -10, 10, 10, 0, 1, 0.4], [40, -8, 8, 8, 0, 1, 0.4], [44, -31, 6, 6, 0, 1, 0.4], [25, -24, 8, 8, 0, 1, 0.4],
  // Serenitatis
  [28, 17.5, 10, 10, 0, 1, 0.47], [24, 13, 6, 6, 0, 1, 0.47],
  // Tranquillitatis
  [8, 30, 10, 10, 0, 1, 0.35], [14, 24, 7, 7, 0, 1, 0.35], [2, 38, 8, 8, 0, 1, 0.35], [-2, 26, 6, 6, 0, 1, 0.35], [12, 40, 6, 6, 0, 1, 0.35], [18, 30, 5, 5, 0, 1, 0.35],
  // Fecunditatis
  [-5, 51, 8, 8, 0, 1, 0.41], [-12, 53, 7, 7, 0, 1, 0.41], [2, 55, 5, 5, 0, 1, 0.41], [-16, 48, 5, 5, 0, 1, 0.41],
  // Nectaris
  [-15, 34, 5.5, 5.5, 0, 1, 0.42],
  // Crisium
  [17, 59, 8, 8, 0, 1, 0.37], [15, 63, 5, 5, 0, 1, 0.37],
  // Nubium
  [-20, -15, 9, 9, 0, 1, 0.44], [-15, -22, 7, 7, 0, 1, 0.44], [-25, -10, 6, 6, 0, 1, 0.44], [-27, -20, 5, 5, 0, 1, 0.44],
  // Cognitum
  [-10, -23, 6, 6, 0, 1, 0.44],
  // Insularum
  [8, -30, 8, 8, 0, 1, 0.43], [12, -20, 6, 6, 0, 1, 0.43], [4, -22, 5, 5, 0, 1, 0.43],
  // Humorum
  [-24, -39, 6, 6, 0, 1, 0.4],
  // Vaporum
  [13, 4, 4.5, 4.5, 0, 1, 0.44],
  // Sinus Aestuum
  [11, -8, 4, 4, 0, 1, 0.42],
  // Sinus Medii
  [2, 2, 3, 3, 0, 1, 0.46],
  // Frigoris
  [56, -30, 5, 5, 0, 1, 0.46], [57, -15, 5, 5, 0, 1, 0.46], [56, 0, 5, 5, 0, 1, 0.46], [57, 15, 5, 5, 0, 1, 0.46], [56, 30, 5, 5, 0, 1, 0.46], [55, 42, 4, 4, 0, 1, 0.46], [54, -42, 4, 4, 0, 1, 0.46]
];
// Named craters: [lat, lon, radius (deg), depth, type (0 plain, 1 bright with rays, 2 dark floor), ray reach, ray strength]
const PK_CRATERS = [
  [-43.3, -11.4, 1.45, 1.2, 1, 19, 0.27], [9.6, -20.1, 1.55, 1.1, 1, 10, 0.1], [8.1, -38, 0.55, 1, 1, 12, 0.09],
  [23.7, -47.4, 0.66, 1, 1, 7, 0.14], [16.1, 46.8, 0.45, 1, 1, 10, 0.11],
  [51.6, -9.4, 1.67, 0.6, 2], [-5.2, -68.6, 2.85, 0.5, 2], [29.7, -4, 1.38, 0.6, 2],
  [-58.4, -14.4, 3.7, 0.7, 0], [-9.3, -1.9, 2.55, 0.5, 0], [-13.4, -3.2, 1.78, 0.7, 0], [-18.2, -1.9, 1.58, 0.9, 0],
  [-11.4, 26.4, 1.82, 1.1, 0], [-13.2, 24, 1.6, 0.8, 0], [-18.1, 23.6, 1.65, 0.7, 0], [-8.9, 60.9, 2.17, 1, 0],
  [-25.1, 60.4, 3.1, 0.8, 0], [-50.5, -6.3, 2.7, 0.6, 0], [-49.6, -21.7, 2.4, 0.6, 0], [-44.3, -54.6, 3.7, 0.5, 0],
  [14.5, -11.3, 0.97, 1, 0], [31.8, 29.9, 1.57, 0.5, 0], [-11.2, 4, 1.88, 0.6, 0], [-33, 0.7, 2.2, 0.6, 0],
  [-25.5, -1.9, 1.9, 0.6, 0], [-17.6, -40.1, 1.8, 0.6, 0], [44.3, 16.3, 1.1, 1, 0], [50.2, 17.4, 1.45, 1, 0],
  [46.7, 44.4, 1.45, 1, 0], [46.7, 39.1, 1.15, 1, 0], [-36, 60.6, 2.2, 0.6, 0], [-41.1, 6, 2.1, 0.5, 0],
  [-45, 41, 3, 0.4, 0], [-5.1, 5.2, 2.3, 0.4, 0]
];

// The maria are a smooth union of the patches: distance to the nearest coast in degrees, with the joins
// between overlapping patches rounded off, so they read as one organic coastline instead of circles.
const pkMareField = (lat, lon) => {
  let S = 0, asum = 0;
  for (const mm of PK_MARIA) {
    const dl = (lon - mm[1]) * Math.cos(mm[0] * PK_RAD), dp = lat - mm[0];
    const d = Math.sqrt(dl * dl + dp * dp) - mm[2] * 0.84;
    if (d > 24) continue;
    const w = Math.exp(-0.5 * d);
    S += w; asum += w * mm[6];
  }
  return { d: S > 0 ? -Math.log(S) / 0.5 : 99, alb: S > 0 ? asum / S : 0.42 };
};
const pkMareMask = (lat, lon) => pkSmooth(2, -2, pkMareField(lat, lon).d);

const pkCraterList = () => {
  const list = PK_CRATERS.map(c => ({ lat: c[0], lon: c[1], r: c[2], dep: c[3], type: c[4], reach: c[5] || 0, amp: c[6] || 0, glow: 0.24 }));
  const rnd = pkRand(20261105);
  for (let n = 0; n < 900; n++) {
    const lat = Math.asin(rnd() * 2 - 1) / PK_RAD, lon = (rnd() * 2 - 1) * 88;
    if (Math.cos(lat * PK_RAD) * Math.cos(lon * PK_RAD) < 0.1) continue;
    const r = 0.32 + 1.5 * Math.pow(rnd(), 3.4);
    if (pkMareMask(lat, lon) > 0.5 && rnd() > 0.2) continue;
    const fresh = rnd() < 0.12;
    list.push({ lat, lon, r, dep: 0.75 + rnd() * 0.5, type: fresh ? 1 : 0, reach: 0, amp: 0, glow: fresh ? 0.1 + rnd() * 0.12 : 0 });
  }
  return list;
};

const pkRayProfile = (seed, n) => {
  const rnd = pkRand(seed), p = new Float32Array(512);
  for (let r = 0; r < n; r++) {
    const a = rnd() * 512, w = 2.5 + rnd() * 9, amp = 0.25 + rnd() * 0.6;
    for (let b = 0; b < 512; b++) { let d = Math.abs(b - a); d = Math.min(d, 512 - d); p[b] += amp * Math.exp(-(d * d) / (w * w)); }
  }
  for (let b = 0; b < 512; b++) p[b] = Math.min(1, p[b]);
  return p;
};

// Builds the moon's surface (brightness map + relief) a few rows at a time.
const pkMoonJob = (R) => {
  const S = 2 * R, A = new Float32Array(S * S), H = new Float32Array(S * S);
  const craters = pkCraterList();
  let stage = 0, row = 0, ci = 0;
  const job = { kind: 'moon', S, R, A, H, done: false };
  const baseRow = (j) => {
    const y = (j + 0.5 - R) / R;
    for (let i = 0; i < S; i++) {
      const x = (i + 0.5 - R) / R, r2 = x * x + y * y, k = j * S + i;
      if (r2 > 1.03) continue;
      const z = Math.sqrt(Math.max(0, 1 - r2));
      const la = Math.asin(Math.max(-1, Math.min(1, -y))), lo = Math.atan2(x, z);
      const lat = la / PK_RAD, lon = lo / PK_RAD;
      const hi = 0.78 + 0.2 * (pkFbm(lo * 3.1, la * 3.1, 4) - 0.5) + 0.12 * (pkFbm(lo * 13, la * 13, 3) - 0.5) + 0.08 * (pkFbm(lo * 42, la * 42, 2) - 0.5);
      const warp = 5 * (pkFbm(lo * 3.4 + 3.7, la * 3.4 - 1.3, 3) - 0.5) + 2.2 * (pkFbm(lo * 11 - 2.1, la * 11 + 4.4, 2) - 0.5);
      const mf = pkMareField(lat, lon);
      const m = pkSmooth(2.6, -2.2, mf.d + warp);
      const mare = mf.alb + 0.09 * (pkFbm(lo * 6, la * 6, 3) - 0.5) + 0.04 * (pkFbm(lo * 24, la * 24, 2) - 0.5);
      A[k] = hi * (1 - m) + mare * m;
      H[k] = 0.005 * (pkFbm(lo * 22, la * 22, 4) - 0.5) * (1 - 0.8 * m) + 0.0018 * (pkFbm(lo * 64, la * 64, 2) - 0.5) * (1 - 0.6 * m);
    }
  };
  const craterPass = (c, idx) => {
    const cl = c.lat * PK_RAD, cn = c.lon * PK_RAD;
    const Cx = Math.cos(cl) * Math.sin(cn), Cy = Math.sin(cl), Cz = Math.cos(cl) * Math.cos(cn);
    if (Cz < 0.03) return;
    const rho = c.r * PK_RAD, reach = Math.max(2.6, c.reach);
    const sx = R + Cx * R, sy = R - Cy * R, half = rho * reach * R * 1.05 + 2;
    const i0 = Math.max(0, Math.floor(sx - half)), i1 = Math.min(S - 1, Math.ceil(sx + half));
    const j0 = Math.max(0, Math.floor(sy - half)), j1 = Math.min(S - 1, Math.ceil(sy + half));
    const dep = 0.22 * rho * c.dep, rim = 0.075 * rho * c.dep, peak = c.r > 1.3 ? 0.08 * rho : 0, flat = c.r > 2;
    const prof = c.reach ? pkRayProfile(1000 + idx, 30) : null;
    for (let j = j0; j <= j1; j++) {
      const y = (j + 0.5 - R) / R;
      for (let i = i0; i <= i1; i++) {
        const x = (i + 0.5 - R) / R, r2 = x * x + y * y;
        if (r2 >= 1) continue;
        const z = Math.sqrt(1 - r2), dot = x * Cx - y * Cy + z * Cz;
        if (dot < 0.5) continue;
        const t = Math.sqrt(Math.max(0, 2 - 2 * dot)) / rho;
        if (t > reach) continue;
        const k = j * S + i, e = t - 1;
        if (t < 2.6) {
          let h = 0;
          if (t < 1) h -= dep * (flat ? Math.min(1, (1 - t * t) * 1.8) : 1 - t * t);
          h += rim * Math.exp(-e * e / 0.04);
          if (t > 1) h += rim * 0.3 * Math.exp(-e / 0.5);
          if (peak && t < 0.35) h += peak * Math.exp(-t * t / 0.012);
          H[k] += h;
          if (c.type === 2 && t < 1) { const w = 1 - pkSmooth(0.78, 0.98, t); A[k] = A[k] * (1 - 0.85 * w) + 0.27 * 0.85 * w; }
          A[k] += 0.012 * Math.exp(-e * e / 0.03);
          if (c.type === 1) { const o = Math.max(0, e); A[k] += c.glow * (t < 1 ? 0.75 : Math.exp(-o * o / 0.45)); }
        }
        if (prof && t > 1.1) {
          const ang = Math.atan2(j + 0.5 - sy, i + 0.5 - sx);
          const b = ((ang + Math.PI) / (2 * Math.PI) * 512) & 511;
          const f = Math.pow(Math.max(0, 1 - (t - 1.1) / (reach - 1.1)), 1.7);
          A[k] += c.amp * prof[b] * f * (0.55 + 0.45 * pkNoise(t * 2.5, b * 0.15));
        }
      }
    }
  };
  job.step = (budget) => {
    const t0 = performance.now();
    while (!job.done && performance.now() - t0 < budget) {
      if (stage === 0) { baseRow(row++); if (row >= S) stage = 1; }
      else { craterPass(craters[ci], ci); ci++; if (ci >= craters.length) job.done = true; }
    }
    return job.done;
  };
  job.progress = () => stage === 0 ? 0.6 * row / S : 0.6 + 0.4 * ci / craters.length;
  return job;
};

// Lights the moon for a phase angle i (0 = full, 180 = new) onto a canvas, a few rows per step,
// so lighting a large moon never holds up a frame.
const pkMoonLight = (job, iDeg, waxing, relief) => {
  const { S, R, A, H } = job;
  const cv = document.createElement('canvas'); cv.width = S; cv.height = S;
  const ctx = cv.getContext('2d'), img = ctx.createImageData(S, S), d = img.data;
  const ir = iDeg * PK_RAD, Lx = (waxing ? 1 : -1) * Math.sin(ir), Lz = Math.cos(ir);
  const es = 0.034 * (1 - Math.cos(ir)) / 2;
  const lightRow = (j) => {
    const y = (j + 0.5 - R) / R;
    for (let i = 0; i < S; i++) {
      const x = (i + 0.5 - R) / R, r2 = x * x + y * y, k = j * S + i, p = 4 * k;
      if (r2 > 1.03) continue;
      const rr = Math.sqrt(r2), z = Math.sqrt(Math.max(0, 1 - r2));
      const hx = i > 0 && i < S - 1 ? (H[k + 1] - H[k - 1]) * R * 0.5 : 0;
      const hy = j > 0 && j < S - 1 ? (H[k + S] - H[k - S]) * R * 0.5 : 0;
      const damp = relief * Math.min(1, z * 1.8);
      let nx = x - hx * damp, ny = y - hy * damp, nz = z;
      const nl = Math.hypot(nx, ny, nz) || 1; nx /= nl; ny /= nl; nz /= nl;
      const mu0 = nx * Lx + nz * Lz;
      let I = 0;
      if (mu0 > 0) { const mu = Math.max(0.05, nz); I = 0.42 * mu0 + 0.58 * Math.min(1.5, 2 * mu0 / (mu0 + mu)); }
      const a = Math.max(0, A[k]), lit = Math.pow(1 - Math.exp(-2.8 * a * I), 1.24), e = a * es * (0.5 + 0.5 * z);
      d[p] = Math.min(255, 12 + 268 * lit + 430 * e);
      d[p + 1] = Math.min(255, 12 + 264 * lit + 480 * e);
      d[p + 2] = Math.min(255, 14 + 252 * lit + 580 * e);
      d[p + 3] = 255 * Math.max(0, Math.min(1, (1 - rr) * R + 0.5));
    }
  };
  let row = 0;
  const light = { canvas: cv, done: false };
  light.step = (budget) => {
    const t0 = performance.now();
    while (!light.done && performance.now() - t0 < budget) {
      lightRow(row++);
      if (row >= S) { ctx.putImageData(img, 0, 0); light.done = true; }
    }
    return light.done;
  };
  return light;
};

// Sunspots: [lat, lon, umbra radius, penumbra radius] in degrees
const PK_SPOTS = [[16, -27, 1.9, 4.4], [14.2, -19.5, 0.9, 2.2], [18.2, -34.5, 0.55, 1.4], [15.5, -23.4, 0.28, 0.7], [-12, 22, 1.3, 3.1], [-13.4, 28.2, 0.6, 1.5], [21, 55, 0.8, 1.9], [-8, -46, 0.25, 0.6]];

// Builds the sun as it looks through a hydrogen alpha telescope: a deep orange disk covered in fine,
// curly fibrils, a faint network of brighter cell edges, a few bright active regions, dark filaments,
// a brighter band just inside the limb and a fuzzy edge of spicules, with prominences standing off it.
// Three frames are built with the fibrils shifted slightly; pkDrawSun blends between them so the
// surface shimmers slowly instead of sitting still.
const PK_SUN_FRAMES = 3;
// cellular noise: distances to the nearest and second nearest cell centre; ph wobbles the centres per frame
const pkCells = (x, y, ph) => {
  const xi = Math.floor(x), yi = Math.floor(y);
  let f1 = 9, f2 = 9;
  for (let j = -1; j <= 1; j++) for (let i = -1; i <= 1; i++) {
    const cx = xi + i, cy = yi + j, w = pkHash(cx - 113, cy + 59) * 6.2832 + ph;
    const px = cx + 0.15 + 0.7 * pkHash(cx, cy) + 0.12 * Math.cos(w), py = cy + 0.15 + 0.7 * pkHash(cx + 71, cy - 37) + 0.12 * Math.sin(w);
    const d = (x - px) * (x - px) + (y - py) * (y - py);
    if (d < f1) { f2 = f1; f1 = d; } else if (d < f2) f2 = d;
  }
  return [Math.sqrt(f1), Math.sqrt(f2)];
};
// hydrogen alpha colours, from dark fibrils to the bright limb band
const PK_HALPHA = [[0, 112, 28, 4], [0.28, 190, 72, 10], [0.5, 228, 112, 22], [0.68, 244, 140, 32], [0.84, 253, 176, 56], [1, 255, 222, 130]];
const pkSunColour = (h, out) => {
  let k = 1; while (k < PK_HALPHA.length - 1 && h > PK_HALPHA[k][0]) k++;
  const a = PK_HALPHA[k - 1], b = PK_HALPHA[k], t = Math.max(0, Math.min(1, (h - a[0]) / (b[0] - a[0])));
  out[0] = a[1] + (b[1] - a[1]) * t; out[1] = a[2] + (b[2] - a[2]) * t; out[2] = a[3] + (b[3] - a[3]) * t;
};
// ridges of noise: thin bright lines where the noise crosses its middle
const pkRidge = (x, y) => 1 - Math.abs(2 * pkNoise(x, y) - 1);

// dark filaments on the disk: [lat, lon, length (deg), heading (deg), width]
const PK_FILAMENTS = [[22, 8, 26, 160, 1.6], [-18, -30, 18, 40, 1.2], [8, 38, 14, 110, 1.1], [34, -40, 12, 70, 1], [-30, 20, 20, 15, 1.3]];
// prominences on the limb: [position angle (turns from north, clockwise), height (R), width (turns), strands, lean]
const PK_PROMS = [[0.105, 0.21, 0.014, 13, 0.6], [0.255, 0.05, 0.008, 6, -0.3], [0.71, 0.045, 0.01, 6, 0.2], [0.93, 0.035, 0.009, 5, -0.4], [0.47, 0.03, 0.007, 4, 0.3]];

const pkSunJob = (R) => {
  const S = 2 * R;
  const frames = [], imgs = [];
  for (let f = 0; f < PK_SUN_FRAMES; f++) {
    const cv = document.createElement('canvas'); cv.width = S; cv.height = S;
    frames.push(cv); imgs.push(cv.getContext('2d').createImageData(S, S));
  }
  const spots = PK_SPOTS.map(s => { const la = s[0] * PK_RAD, lo = s[1] * PK_RAD; return { x: Math.cos(la) * Math.sin(lo), y: Math.sin(la), z: Math.cos(la) * Math.cos(lo), u: s[2] * PK_RAD * 0.7, p: s[3] * PK_RAD * 0.7 }; });
  const col = [0, 0, 0], rnd = pkRand(6563);
  let row = 0, stage = 0;
  const limb = document.createElement('canvas');
  const job = { kind: 'sun', S, R, done: false, canvas: frames[0], corona: { frames, limb } };
  const doRow = (j) => {
    const y = (j + 0.5 - R) / R;
    for (let i = 0; i < S; i++) {
      const x = (i + 0.5 - R) / R, r2 = x * x + y * y, p = 4 * (j * S + i);
      if (r2 > 1.02) continue;
      const rr = Math.sqrt(r2), mu = Math.sqrt(Math.max(0, 1 - r2));
      const la = Math.asin(Math.max(-1, Math.min(1, -y))), lo = Math.atan2(x, mu);
      // surface coordinates (equal area, so features keep their size across the globe and foreshorten at the limb)
      const u = lo * Math.cos(la), v = la;
      // fibrils curl around the network: warp the coordinates before sampling the fine ridges
      const U = u * 50 + 3.4 * (pkFbm(u * 5 + 3, v * 5 - 2, 3) - 0.5), V = v * 50 + 3.4 * (pkFbm(u * 5 - 7, v * 5 + 5, 3) - 0.5);
      const clump = pkSmooth(0.52, 0.78, pkFbm(u * 7.5 - 3, v * 7.5 + 8, 3));
      const mottle = pkFbm(u * 2.4 + 9, v * 2.4 - 4, 3) - 0.5;
      const plage = pkSmooth(0.6, 0.78, pkFbm(u * 3.2 + 21, v * 3.2 - 13, 3)) * Math.exp(-Math.pow(Math.abs(la) - 0.32, 2) / 0.03);
      let umbra = 0, pen = 0;
      for (const s of spots) {
        const dot = x * s.x - y * s.y + mu * s.z;
        if (dot < 0.98) continue;
        const dd = Math.sqrt(Math.max(0, 2 - 2 * dot));
        pen = Math.max(pen, 1 - pkSmooth(s.p * 0.7, s.p, dd)); umbra = Math.max(umbra, 1 - pkSmooth(s.u * 0.6, s.u, dd));
      }
      // brighter band inside the limb, then a fuzzy edge of spicules
      const ang = Math.atan2(x, -y), band = pkSmooth(0.78, 0.975, rr);
      const edge = 1 + 0.006 * (pkNoise(ang * 70 + 4, 1.3) - 0.5) + 0.005 * (pkNoise(ang * 260, 7.7) - 0.5);
      const alpha = 255 * Math.max(0, Math.min(1, (edge - rr) * R + 0.5));
      if (!alpha) continue;
      for (let f = 0; f < PK_SUN_FRAMES; f++) {
        const ph = f * 2 * Math.PI / PK_SUN_FRAMES, ox = 0.45 * Math.cos(ph), oy = 0.45 * Math.sin(ph);
        const [a1, a2] = pkCells(u * 11, v * 11, ph);
        const net = 1 - pkSmooth(0, 0.16, a2 - a1), rosette = pkSmooth(0.15, 0.55, a1);
        const fib = Math.pow(pkRidge(U + ox, V + oy), 3), fine = Math.pow(pkRidge(U * 2.1 - oy + 11, V * 2.1 + ox - 5), 4);
        const cross = Math.pow(pkRidge(V * 0.9 + U * 0.45 + 7 + oy, U * 0.9 - V * 0.45 - 3 - ox), 3);
        let h = 0.66 + 0.26 * mottle + 0.08 * net - 0.06 * rosette - 0.22 * fib - 0.13 * cross - 0.1 * fine - 0.16 * clump + 0.05 * (1 - fib) * net;
        h += 0.2 * plage + 0.32 * band * band;
        h -= 0.32 * pen + 0.3 * umbra;
        pkSunColour(Math.max(0, Math.min(1, h)), col);
        const d = imgs[f].data;
        d[p] = col[0]; d[p + 1] = col[1]; d[p + 2] = col[2]; d[p + 3] = alpha;
      }
    }
  };
  // dark filaments, the same on every frame, kept inside the disk
  const drawFilaments = (ctx) => {
    ctx.save(); ctx.globalCompositeOperation = 'source-atop'; ctx.lineCap = 'round'; ctx.lineJoin = 'round';
    for (const [la0, lo0, len, head, wid] of PK_FILAMENTS) {
      let la = la0, lo = lo0, hd = head * PK_RAD;
      const pts = [];
      for (let k = 0; k <= 24; k++) {
        const L = la * PK_RAD, G = lo * PK_RAD, z = Math.cos(L) * Math.cos(G);
        pts.push([R + R * Math.cos(L) * Math.sin(G), R - R * Math.sin(L), z]);
        hd += (rnd() - 0.5) * 0.5; la += Math.sin(hd) * len / 24; lo += Math.cos(hd) * len / 24;
      }
      for (let k = 1; k < pts.length; k++) {
        if (pts[k][2] < 0.15) continue;
        const t = k / pts.length, sw = Math.sin(Math.PI * t), w = wid * (R / 165) * (0.6 + sw) * (0.7 + 0.6 * rnd());
        for (const [mul, a] of [[2.6, 0.12], [1.2, 0.2]]) {
          ctx.strokeStyle = `rgba(118,34,6,${a * (0.6 + 0.8 * sw)})`; ctx.lineWidth = w * mul;
          ctx.beginPath(); ctx.moveTo(pts[k - 1][0], pts[k - 1][1]); ctx.lineTo(pts[k][0], pts[k][1]); ctx.stroke();
        }
      }
    }
    ctx.restore();
  };
  // the limb, drawn once: a thin bright chromosphere, a fringe of spicules, and flame-like prominences
  const drawLimb = () => {
    const L = Math.ceil(R * 2.8); limb.width = limb.height = L;
    const ctx = limb.getContext('2d'), c = L / 2;
    ctx.lineCap = 'round';
    ctx.strokeStyle = 'rgba(255,170,80,0.55)'; ctx.lineWidth = Math.max(1, R / 110);
    ctx.beginPath(); ctx.arc(c, c, R * 1.003, 0, Math.PI * 2); ctx.stroke();
    for (let k = 0; k < 1400; k++) {
      const a = rnd() * Math.PI * 2, l = R * (0.006 + 0.02 * Math.pow(rnd(), 2)), tilt = (rnd() - 0.5) * 0.5;
      const x0 = c + Math.sin(a) * R * 0.998, y0 = c - Math.cos(a) * R * 0.998;
      ctx.strokeStyle = `rgba(255,${120 + 60 * rnd() | 0},50,${0.12 + 0.25 * rnd()})`; ctx.lineWidth = 0.6 + 0.8 * rnd();
      ctx.beginPath(); ctx.moveTo(x0, y0); ctx.lineTo(x0 + Math.sin(a + tilt) * l, y0 - Math.cos(a + tilt) * l); ctx.stroke();
    }
    ctx.globalCompositeOperation = 'lighter';
    ctx.shadowColor = 'rgba(255,110,40,0.9)'; ctx.shadowBlur = R / 40;
    for (const [pa, h, w, n, lean] of PK_PROMS) {
      for (let k = 0; k < n; k++) {
        const a = (pa + (rnd() - 0.5) * w) * Math.PI * 2, hh = R * h * (0.45 + 0.55 * rnd());
        const a1 = a + lean * 0.05 + (rnd() - 0.5) * 0.04, a2 = a + lean * 0.08 + (rnd() - 0.5) * 0.06;
        const pt = (ang, rad) => [c + Math.sin(ang) * rad, c - Math.cos(ang) * rad];
        const [x0, y0] = pt(a, R), [x1, y1] = pt(a1, R + hh * 0.5), [x2, y2] = pt(a2, R + hh * 0.9), [x3, y3] = pt(a2 + (rnd() - 0.5) * 0.03, R + hh);
        ctx.strokeStyle = `rgba(255,${100 + 70 * rnd() | 0},40,${0.35 + 0.3 * rnd()})`; ctx.lineWidth = (0.8 + 1.6 * rnd()) * R / 165;
        ctx.beginPath(); ctx.moveTo(x0, y0); ctx.bezierCurveTo(x1, y1, x2, y2, x3, y3); ctx.stroke();
      }
    }
  };
  job.step = (budget) => {
    const t0 = performance.now();
    while (!job.done && performance.now() - t0 < budget) {
      if (stage === 0) { doRow(row++); if (row >= S) stage = 1; }
      else if (stage === 1) { frames.forEach((cv, f) => { const ctx = cv.getContext('2d'); ctx.putImageData(imgs[f], 0, 0); drawFilaments(ctx); }); stage = 2; }
      else { drawLimb(); job.done = true; }
    }
    return job.done;
  };
  job.progress = () => row / S;
  return job;
};

const pkDrawSun = (ctx, W, disk, corona, R, tsec) => {
  const c = W / 2;
  ctx.clearRect(0, 0, W, W);
  // an orange glow, strongest at the limb
  const g = ctx.createRadialGradient(c, c, R * 0.95, c, c, c);
  g.addColorStop(0, 'rgba(255,140,50,0.75)'); g.addColorStop(0.12, 'rgba(255,120,40,0.36)');
  g.addColorStop(0.45, 'rgba(240,100,40,0.12)'); g.addColorStop(1, 'rgba(240,100,40,0)');
  ctx.fillStyle = g; ctx.fillRect(0, 0, W, W);
  // the surface shimmers: each frame blends into the next over about six seconds
  const frames = corona && corona.frames ? corona.frames : [disk];
  const T = tsec / 6, k = Math.floor(T) % frames.length, t = T - Math.floor(T), mix = t * t * (3 - 2 * t);
  ctx.drawImage(frames[k], c - R, c - R);
  if (frames.length > 1 && mix > 0.002) { ctx.globalAlpha = mix; ctx.drawImage(frames[(k + 1) % frames.length], c - R, c - R); ctx.globalAlpha = 1; }
  if (corona && corona.limb && corona.limb.width) { const L = corona.limb.width; ctx.drawImage(corona.limb, c - L / 2, c - L / 2); }
  // a little light spilling over the limb
  ctx.save(); ctx.globalCompositeOperation = 'lighter';
  const rim = ctx.createRadialGradient(c, c, R * 0.97, c, c, R * 1.12);
  rim.addColorStop(0, 'rgba(255,150,60,0)'); rim.addColorStop(0.25, 'rgba(255,160,70,0.22)'); rim.addColorStop(1, 'rgba(255,120,50,0)');
  ctx.fillStyle = rim; ctx.fillRect(c - R * 1.2, c - R * 1.2, R * 2.4, R * 2.4);
  ctx.restore();
};

const pkDrawMoon = (ctx, W, disk, R, lit, waxing) => {
  const c = W / 2, shift = R * 0.22 * (1 - lit) * (waxing ? 1 : -1);
  ctx.clearRect(0, 0, W, W);
  const h = 0.05 + 0.18 * Math.sqrt(lit);
  const g = ctx.createRadialGradient(c + shift, c, R * 0.92, c + shift, c, c * 0.99);
  g.addColorStop(0, `rgba(222,230,250,${h})`); g.addColorStop(0.12, `rgba(200,212,245,${h * 0.5})`);
  g.addColorStop(0.42, `rgba(180,196,240,${h * 0.14})`); g.addColorStop(1, 'rgba(180,196,240,0)');
  ctx.fillStyle = g; ctx.fillRect(0, 0, W, W);
  ctx.drawImage(disk, c - R, c - R);
};

// Astronomy: moon phase (Meeus, low precision) and the sun's altitude over Melbourne, Florida.
const pkJD = (ms) => ms / 86400000 + 2440587.5;
const pkMoonPhase = (ms) => {
  const T = (pkJD(ms) - 2451545) / 36525, r = PK_RAD;
  const D = ((297.8501921 + 445267.1114034 * T) % 360 + 360) % 360;
  const M = 357.5291092 + 35999.0502909 * T, Mp = 134.9633964 + 477198.8675055 * T;
  let i = 180 - D - 6.289 * Math.sin(Mp * r) + 2.1 * Math.sin(M * r) - 1.274 * Math.sin((2 * D - Mp) * r) - 0.658 * Math.sin(2 * D * r) - 0.214 * Math.sin(2 * Mp * r) - 0.11 * Math.sin(D * r);
  i = ((i % 360) + 360) % 360; if (i > 180) i = 360 - i;
  const f = D / 360, lit = (1 + Math.cos(i * r)) / 2, waxing = D < 180;
  const name = f < 0.0339 || f >= 0.966 ? 'New moon' : f < 0.216 ? 'Waxing crescent' : f < 0.284 ? 'First quarter' : f < 0.466 ? 'Waxing gibbous' : f < 0.534 ? 'Full moon' : f < 0.716 ? 'Waning gibbous' : f < 0.784 ? 'Last quarter' : 'Waning crescent';
  return { i, lit, waxing, name };
};
const pkSunAltitude = (ms, latDeg, lonDeg) => {
  const n = pkJD(ms) - 2451545, r = PK_RAD;
  const L = 280.46 + 0.9856474 * n, g = (357.528 + 0.9856003 * n) * r;
  const lam = (L + 1.915 * Math.sin(g) + 0.02 * Math.sin(2 * g)) * r, eps = (23.439 - 0.0000004 * n) * r;
  const ra = Math.atan2(Math.cos(eps) * Math.sin(lam), Math.cos(lam)), dec = Math.asin(Math.sin(eps) * Math.sin(lam));
  const gmst = 18.697374558 + 24.06570982441908 * n;
  const H = ((gmst * 15 + lonDeg) * r) - ra, phi = latDeg * r;
  return Math.asin(Math.sin(phi) * Math.sin(dec) + Math.cos(phi) * Math.cos(dec) * Math.cos(H)) / r;
};

const PHASES = {
  full: { i: 7, waxing: true, name: 'Full moon' },
  half: { i: 90, waxing: true, name: 'First quarter' },
  crescent: { i: 128, waxing: true, name: 'Waxing crescent' }
};

export const moonPhase = pkMoonPhase;
export const sunAltitude = pkSunAltitude;

export function createSunMoon(opts) {
  const { wrap, inner, canvas: cv, caption } = opts;
  const location = opts.location || { lat: 28.0836, lon: -80.6081 };
  const canStart = opts.canStart || (() => true);
  let mode = opts.mode || 'local', phaseMode = opts.phase || 'real';
  if (opts.urlOverride !== false) {
    const q = new URLSearchParams(window.location.search);
    if (q.get('sky')) mode = q.get('sky');
    if (q.get('phase')) phaseMode = q.get('phase');
  }
  const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const st = { key: '', want: null, job: null, built: null, disk: null, corona: null, W: 0, lit: '', drawn: '', checkAt: 0, last: 0, sy: -1, dirty: true };
  let raf = 0;
  // Building the surface also runs between frames, in 10 ms slices on a message channel, so it doesn't
  // depend on the frame rate: at 30 frames a second, 6 ms per frame alone took eight seconds or more.
  // Each slice is a separate short task, so scrolling and the sky stay smooth while it builds.
  const pumpChannel = new MessageChannel();
  let pumping = false;
  pumpChannel.port1.onmessage = () => {
    pumping = false;
    const job = st.job && !st.job.done ? st.job : st.light;  // the surface first, then its lighting
    if (!job || job.done || document.hidden || !canStart()) return;
    try { job.step(10); } catch (err) { return; }
    if (!job.done) { pumping = true; pumpChannel.port2.postMessage(0); }
  };
  const pump = () => { if (!pumping) { pumping = true; pumpChannel.port2.postMessage(0); } };

  const wanted = () => {
    if (mode === 'off') return null;
    const now = Date.now();
    let kind;
    if (mode === 'sun') kind = 'sun';
    else if (mode === 'moon') kind = 'moon';
    else if (mode === 'location') kind = pkSunAltitude(now, location.lat, location.lon) > -0.833 ? 'sun' : 'moon';
    else { const d = new Date(now), h = d.getHours() + d.getMinutes() / 60; kind = h >= 6 && h < 18 ? 'sun' : 'moon'; }
    let phase = null;
    if (kind === 'moon') {
      phase = Object.hasOwn(PHASES, phaseMode) ? { ...PHASES[phaseMode] } : pkMoonPhase(now);
      phase.lit = (1 + Math.cos(phase.i * PK_RAD)) / 2;
    }
    return { kind, phase, key: kind + (phase ? ':' + Math.round(phase.i) + (phase.waxing ? 'w' : 'n') : '') };
  };

  const tick = (now) => {
    // what should be in the sky: checked every 30 s, or at once after setMode / setPhase
    if (now > st.checkAt || st.dirty) {
      st.dirty = false; st.checkAt = now + 30000;
      const w = wanted(), key = w ? w.key : 'off';
      if (key !== st.key) {
        st.key = key; st.want = w; st.drawn = '';
        if (!w || !st.built || st.built.kind !== w.kind) { wrap.removeAttribute('data-ready'); st.job = null; st.built = null; st.disk = null; st.light = null; }
      }
    }
    if (!st.want || !canStart()) return;
    const W = Math.round(wrap.clientWidth * Math.min(window.devicePixelRatio || 1, 1.5));
    if (!W) return;
    if (W !== st.W) {
      st.W = W; cv.width = W; cv.height = W; st.drawn = ''; st.corona = null;
      if (st.built && Math.abs(Math.floor(W / 4) - st.built.R) > st.built.R * 0.15) { st.built = null; st.job = null; st.disk = null; st.light = null; }
    }
    // build the surface a few rows per frame so scrolling never stutters
    if (!st.built) {
      if (!st.job || st.job.kind !== st.want.kind) st.job = st.want.kind === 'sun' ? pkSunJob(Math.floor(W / 4)) : pkMoonJob(Math.floor(W / 4));
      if (!st.job.step(6)) { pump(); return; }
      st.built = st.job; st.job = null; st.lit = ''; st.drawn = '';
      if (st.built.kind === 'sun') st.disk = st.built.canvas;
    }
    const R = st.built.R;
    if (st.built.kind === 'moon' && st.lit !== st.key) {
      if (!st.light || st.light.key !== st.key) { st.light = pkMoonLight(st.built, st.want.phase.i, st.want.phase.waxing, 1); st.light.key = st.key; }
      if (!st.light.step(6)) { pump(); return; }
      st.disk = st.light.canvas; st.light = null;
      st.lit = st.key; st.drawn = '';
    }
    if (st.built.kind === 'sun' && !st.corona) st.corona = st.built.corona;
    // parallax: the body drifts up more slowly than the page
    const sy = window.scrollY || document.documentElement.scrollTop || 0;
    if (inner && !reduce && sy !== st.sy) { st.sy = sy; inner.style.transform = `translate3d(0, ${Math.round(sy * 0.3)}px, 0)`; }
    const visible = wrap.getBoundingClientRect().bottom > 0;
    const ctx = cv.getContext('2d');
    if (st.built.kind === 'sun') {
      if (st.drawn === st.key && (reduce || !visible || now - st.last < 33)) return;
      pkDrawSun(ctx, W, st.disk, st.corona, R, reduce ? 0 : now / 1000);
      st.last = now;
    } else if (st.drawn !== st.key) {
      pkDrawMoon(ctx, W, st.disk, R, st.want.phase.lit, st.want.phase.waxing);
    }
    if (st.drawn !== st.key) {
      st.drawn = st.key;
      if (caption) caption.textContent = st.built.kind === 'sun' ? 'The Sun · G2V · 5,772 K' : `${st.want.phase.name} · ${Math.round(st.want.phase.lit * 100)}% lit`;
      wrap.setAttribute('data-ready', '');
    }
  };
  const loop = (now) => { try { tick(now); } catch (err) { /* decorative: never break the page */ } raf = requestAnimationFrame(loop); };
  raf = requestAnimationFrame(loop);

  return {
    setMode(m) { mode = m; st.dirty = true; },
    setPhase(p) { phaseMode = p; st.dirty = true; },
    destroy() { cancelAnimationFrame(raf); st.job = null; pumpChannel.port1.close(); }
  };
}
