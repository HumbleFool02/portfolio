/**
 * The black hole's sound: NASA's sonification of the black hole at the centre of the Perseus galaxy cluster.
 * The pressure waves it sends through the cluster's hot gas were raised 57 and 58 octaves into hearing range
 * (Chandra X-ray Center, 2022). A 20 second seamless loop of it plays while the gravity well in sky.js is held:
 *   hold      it fades in as the hole opens, from a random point in the loop, so no two holds sound alike
 *   charging  it grows louder and brighter and sinks lower in pitch, like light reddening near a black hole
 *   moving    it pans across the speakers to follow the hole
 *   release   its pitch falls away and it fades as the hole closes, with a low thump for the kick outward
 * A quick click on the page makes no sound: it starts once the hole has been held for a moment. The clip loads
 * once the page is idle, and never for a visitor who came in quietly from the Enter screen, which stays silent.
 * Credit: NASA/CXC/SAO/K. Arcand, SYSTEM Sounds (M. Russo, A. Santaguida).
 */
const CLIP = 'assets/audio/perseus-black-hole.m4a';
const LOOP = 20;          // seconds: the file loops end to start without a seam
const VOLUME = 0.5;
const DEEPEST = 0.8;      // playback rate at full charge, about four semitones down
const WAIT = 120;         // ms held before the sound starts, so an ordinary click stays quiet
const KICK = 400;         // ms held before the release thumps
const QUIET = 'pk-quiet'; // sessionStorage: set while the visitor wants the page silent

const quiet = () => { try { return sessionStorage.getItem(QUIET) === '1'; } catch { return false; } };

// stop a ramp where it is now, so a new one starts from the current value
const settle = (param, t) => {
  if (param.cancelAndHoldAtTime) { param.cancelAndHoldAtTime(t); return; }
  const v = param.value;
  param.cancelScheduledValues(t);
  param.setValueAtTime(v, t);
};

export function attachHoleSound(sky) {
  const Ctx = window.AudioContext || window.webkitAudioContext;
  const silent = { setSound() {} };
  if (!sky?.onWell || !Ctx) return silent;
  // the well only opens for a mouse or trackpad, and not with reduced motion
  if (matchMedia('(prefers-reduced-motion: reduce)').matches) return silent;
  const root = document.documentElement;

  let ctx = null, clip = null, loading = null, voice = null, held = false, raf = 0, heldAt = 0, timer = 0;

  // decoded off screen, so nothing asks for sound before the visitor has clicked anything
  const load = () => {
    loading ||= fetch(CLIP)
      .then((r) => { if (!r.ok) throw new Error(`${r.status} ${CLIP}`); return r.arrayBuffer(); })
      .then((bytes) => {
        const Off = window.OfflineAudioContext || window.webkitOfflineAudioContext;
        const decoder = Off ? new Off(2, 1, 48000) : (ctx ||= new Ctx());
        return new Promise((ok, fail) => decoder.decodeAudioData(bytes, ok, fail));
      })
      .then((buffer) => { clip = buffer; return buffer; })
      .catch((err) => { loading = null; console.warn('Black hole sound unavailable.', err); });
    return loading;
  };
  const warm = () => {
    if (quiet() || navigator.connection?.saveData) return;
    if (!matchMedia('(any-pointer: fine)').matches) return;
    const idle = window.requestIdleCallback ? (fn) => requestIdleCallback(fn, { timeout: 5000 }) : (fn) => setTimeout(fn, 2500);
    idle(() => { if (!quiet()) load(); });
  };

  const follow = () => {
    raf = 0;
    if (!voice || !held) return;
    const w = sky.well(), c = w.charge, t = ctx.currentTime;
    voice.level.gain.setTargetAtTime(VOLUME * (0.4 + 0.6 * c), t, 0.12);  // also the fade in as it opens
    voice.src.playbackRate.setTargetAtTime(1 - (1 - DEEPEST) * c, t, 0.25);
    voice.tone.frequency.setTargetAtTime(900 * 7 ** c, t, 0.15);          // 900 Hz up to about 6 kHz
    voice.pan?.pan.setTargetAtTime(Math.max(-1, Math.min(1, (w.x / innerWidth) * 2 - 1)) * 0.6, t, 0.08);
    raf = requestAnimationFrame(follow);
  };

  const begin = () => {
    if (!held || voice || !clip) return;
    const t = ctx.currentTime;
    const src = ctx.createBufferSource();
    src.buffer = clip; src.loop = true; src.loopStart = 0; src.loopEnd = Math.min(LOOP, clip.duration);
    const tone = ctx.createBiquadFilter(); tone.type = 'lowpass'; tone.Q.value = 0.5; tone.frequency.value = 900;
    const level = ctx.createGain(); level.gain.setValueAtTime(0, t);
    const pan = ctx.createStereoPanner ? ctx.createStereoPanner() : null;
    src.connect(tone).connect(level);
    (pan ? level.connect(pan) : level).connect(ctx.destination);
    src.start(t, Math.random() * (src.loopEnd - 6));
    voice = { src, tone, level, pan, t0: t };
    follow();
  };

  // the hole lets go: a brief swell, then the sound falls away into it
  const end = (c) => {
    held = false;
    clearTimeout(timer);
    if (raf) { cancelAnimationFrame(raf); raf = 0; }
    if (!voice) return;
    const { src, tone, level, pan, t0 } = voice, t = ctx.currentTime;
    voice = null;
    settle(level.gain, t); settle(src.playbackRate, t); settle(tone.frequency, t);
    const grown = Math.min(1, (t - t0) / 0.5);  // a short hold swells less
    level.gain.linearRampToValueAtTime(VOLUME * (0.4 + 0.6 * c) * 1.15 * grown, t + 0.05);
    level.gain.setTargetAtTime(0, t + 0.05, 0.3);
    src.playbackRate.exponentialRampToValueAtTime(0.4, t + 1.3);
    tone.frequency.exponentialRampToValueAtTime(260, t + 1.3);
    src.stop(t + 1.8);
    src.onended = () => { src.disconnect(); tone.disconnect(); level.disconnect(); pan?.disconnect(); };
    if (performance.now() - heldAt > KICK) thump(c, pan ? pan.pan.value : 0);
  };

  // the kick outward: a low thump, harder the longer the hole was held
  const thump = (c, side) => {
    const t = ctx.currentTime, o = ctx.createOscillator(), g = ctx.createGain();
    o.type = 'sine';
    o.frequency.setValueAtTime(120, t); o.frequency.exponentialRampToValueAtTime(38, t + 0.45);
    g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(0.42 * c, t + 0.012);
    g.gain.setTargetAtTime(0, t + 0.04, 0.16);
    let out = o.connect(g);
    if (ctx.createStereoPanner) { const p = ctx.createStereoPanner(); p.pan.value = side * 0.6; out = out.connect(p); }
    out.connect(ctx.destination);
    o.start(t); o.stop(t + 1);
    o.onended = () => o.disconnect();
  };

  sky.onWell((type, detail) => {
    if (type === 'release') { if (held) end(detail?.c ?? 0.15); return; }
    if (type !== 'hold' || quiet() || root.hasAttribute('data-pk-gate')) return;
    // the hold starts with a press of the mouse, so the browser lets sound start here
    ctx ||= new Ctx();
    if (ctx.state === 'suspended') ctx.resume();
    held = true; heldAt = performance.now();
    clearTimeout(timer);
    timer = setTimeout(() => { if (clip) begin(); else load().then(begin); }, WAIT);
  });

  // a visitor still on the Enter screen hasn't chosen yet: setSound() loads it once they do
  if (!root.hasAttribute('data-pk-gate')) warm();
  return {
    // the visitor's choice on the Enter screen, or the footer's "replay warp, with sound"
    setSound(on) {
      try { if (on) sessionStorage.removeItem(QUIET); else sessionStorage.setItem(QUIET, '1'); } catch { /* storage blocked */ }
      if (on) warm();
      else if (held) end(0);
    },
  };
}
