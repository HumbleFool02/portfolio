/**
 * The warp's sound: a hyperspace jump, made with the Web Audio API (no audio files) and timed to the
 * intro in sky.js.
 *   0 to 1.2 s  the charge: a whine climbing in pitch with a flutter that speeds up, rising air and a
 *               sub-bass swell, all building while the stars streak and accelerate
 *   1.2 s       the jump, on the white flash: a sudden cut, then a deep pitch-dropping boom, a whoosh
 *               that sweeps across the stereo field and a falling "zoom"
 *   after       a reverb tail and a faint shimmer as the sky drops into the constellations
 * Browsers only allow sound after the visitor has clicked the page, so this plays from the Enter screen
 * and the footer's replay button.
 */
const JUMP = 1.2;     // seconds from the start to the jump (the flash in sky.js)
const VOLUME = 0.42;

let ctx = null;

const noise = (seconds) => {
  const buf = ctx.createBuffer(2, Math.ceil(ctx.sampleRate * seconds), ctx.sampleRate);
  for (let c = 0; c < 2; c++) { const d = buf.getChannelData(c); for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1; }
  return buf;
};
// a room for the tail: stereo noise that dies away over a couple of seconds
const reverb = (seconds, decay) => {
  const n = Math.ceil(ctx.sampleRate * seconds), buf = ctx.createBuffer(2, n, ctx.sampleRate);
  for (let c = 0; c < 2; c++) { const d = buf.getChannelData(c); for (let i = 0; i < n; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / n) ** decay; }
  const conv = ctx.createConvolver(); conv.buffer = buf;
  return conv;
};
// a gain node following [seconds, level] points from t0
const envelope = (t0, points) => {
  const g = ctx.createGain();
  g.gain.setValueAtTime(points[0][1], t0 + points[0][0]);
  for (const [t, v] of points.slice(1)) g.gain.linearRampToValueAtTime(v, t0 + t);
  return g;
};
const osc = (type, t0, from, to, start, end, curve = 'exp') => {
  const o = ctx.createOscillator(); o.type = type;
  o.frequency.setValueAtTime(from, t0 + start);
  if (curve === 'exp') o.frequency.exponentialRampToValueAtTime(to, t0 + end); else o.frequency.linearRampToValueAtTime(to, t0 + end);
  return o;
};
const filter = (type, t0, from, to, start, end, q = 0.7) => {
  const f = ctx.createBiquadFilter(); f.type = type; f.Q.value = q;
  f.frequency.setValueAtTime(from, t0 + start); f.frequency.exponentialRampToValueAtTime(to, t0 + end);
  return f;
};

export function playWarpSound() {
  const Ctx = window.AudioContext || window.webkitAudioContext;
  if (!Ctx) return;
  ctx = ctx || new Ctx();
  if (ctx.state === 'suspended') ctx.resume();
  const t0 = ctx.currentTime + 0.03, J = JUMP;

  // mix: a dry bus and a reverb send, into a gentle limiter
  const limiter = ctx.createDynamicsCompressor();
  limiter.threshold.value = -10; limiter.knee.value = 6; limiter.ratio.value = 8; limiter.attack.value = 0.003; limiter.release.value = 0.25;
  const master = ctx.createGain(); master.gain.value = VOLUME;
  limiter.connect(master).connect(ctx.destination);
  const dry = ctx.createGain(); dry.connect(limiter);
  const room = reverb(2.6, 3.2), wet = ctx.createGain(); wet.gain.value = 0.32;
  room.connect(wet).connect(limiter);
  const send = (node, amount) => { const g = ctx.createGain(); g.gain.value = amount; node.connect(g).connect(room); node.connect(dry); };

  // ── the charge ──
  // a whine climbing about three and a half octaves, with a flutter that speeds up as it builds
  const flutter = osc('sine', t0, 5, 26, 0, J), depth = ctx.createGain(); depth.gain.value = 0.4;
  const tremolo = ctx.createGain(); tremolo.gain.value = 0.6;  // swings between 0.2 and 1.0
  flutter.connect(depth).connect(tremolo.gain);
  const whine = envelope(t0, [[0, 0], [0.35, 0.04], [J - 0.09, 0.13], [J - 0.06, 0.13], [J - 0.035, 0]]);
  const tone = filter('lowpass', t0, 400, 6000, 0, J, 2.5);
  for (const [type, detune] of [['sawtooth', -9], ['sawtooth', 9], ['triangle', 0]]) {
    const o = osc(type, t0, 75, 960, 0, J); o.detune.value = detune;
    o.connect(tone); o.start(t0); o.stop(t0 + J + 0.05);
  }
  tone.connect(tremolo).connect(whine); send(whine, 0.25);
  flutter.start(t0); flutter.stop(t0 + J + 0.05);
  // rising air
  const air = ctx.createBufferSource(); air.buffer = noise(J + 0.1);
  const hiss = filter('bandpass', t0, 500, 7000, 0, J, 0.8);
  air.connect(hiss).connect(envelope(t0, [[0, 0], [0.5, 0.03], [J - 0.07, 0.14], [J - 0.035, 0]])).connect(dry);
  air.start(t0); air.stop(t0 + J + 0.1);
  // sub-bass swell
  const swell = osc('sine', t0, 36, 58, 0.2, J);
  swell.connect(envelope(t0, [[0.2, 0], [J - 0.07, 0.2], [J - 0.035, 0]])).connect(dry);
  swell.start(t0 + 0.2); swell.stop(t0 + J + 0.05);

  // ── the jump ──
  // a deep boom, dropping in pitch
  const boom = osc('sine', t0, 150, 30, J, J + 0.7);
  const boomGain = ctx.createGain(); boomGain.gain.setValueAtTime(0, t0 + J); boomGain.gain.linearRampToValueAtTime(1, t0 + J + 0.012);
  boomGain.gain.setTargetAtTime(0, t0 + J + 0.05, 0.32);
  boom.connect(boomGain); send(boomGain, 0.35);
  boom.start(t0 + J); boom.stop(t0 + J + 2);
  // a punch of low noise at the moment of the jump
  const punch = ctx.createBufferSource(); punch.buffer = noise(0.4);
  const thud = filter('lowpass', t0, 900, 120, J, J + 0.25, 1);
  punch.connect(thud).connect(envelope(t0, [[J, 0], [J + 0.008, 0.85], [J + 0.3, 0]])).connect(dry);
  punch.start(t0 + J); punch.stop(t0 + J + 0.4);
  // the whoosh: bright noise closing down, swept across the stereo field
  const rush = ctx.createBufferSource(); rush.buffer = noise(2.2);
  const close = filter('lowpass', t0, 11000, 220, J, J + 1.4, 1.2);
  const pan = ctx.createStereoPanner(); pan.pan.setValueAtTime(-0.75, t0 + J); pan.pan.linearRampToValueAtTime(0.75, t0 + J + 0.9);
  const rushGain = envelope(t0, [[J, 0], [J + 0.025, 0.9], [J + 0.5, 0.34], [J + 2, 0]]);
  rush.connect(close).connect(pan).connect(rushGain); send(rushGain, 0.5);
  rush.start(t0 + J); rush.stop(t0 + J + 2.2);
  // the zoom: a bright streak falling away
  const zoom = osc('sawtooth', t0, 2200, 60, J - 0.02, J + 0.6);
  const zoomTone = filter('lowpass', t0, 5000, 300, J - 0.02, J + 0.6, 3);
  zoom.connect(zoomTone).connect(envelope(t0, [[J - 0.02, 0], [J + 0.01, 0.16], [J + 0.6, 0]])).connect(dry);
  zoom.start(t0 + J - 0.02); zoom.stop(t0 + J + 0.65);

  // ── arrival ── a faint shimmer settling with the constellations
  [[660, 0.03], [990, 0.022], [1320, 0.015], [1980, 0.01]].forEach(([f, level]) => {
    const o = osc('sine', t0, f * 1.01, f, J + 0.15, J + 1.8, 'lin');
    const g = envelope(t0, [[J + 0.15, 0], [J + 0.5, level], [J + 2.4, 0]]);
    o.connect(g); send(g, 0.8);
    o.start(t0 + J + 0.15); o.stop(t0 + J + 2.5);
  });
}
