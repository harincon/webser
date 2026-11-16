/* Efectos de sonido estilo 8 bits generados con Web Audio (sin archivos). */
const SFX = (() => {
  let ctx = null;
  let muted = false;
  try {
    muted = localStorage.getItem("gc-muted") === "1";
  } catch (e) {}

  function ac() {
    if (!ctx) {
      const C = window.AudioContext || window.webkitAudioContext;
      if (!C) return null;
      ctx = new C();
    }
    if (ctx.state === "suspended") ctx.resume();
    return ctx;
  }

  function tone(freq, dur, type = "square", vol = 0.05, when = 0, slideTo) {
    if (muted) return;
    const c = ac();
    if (!c) return;
    const t = c.currentTime + when;
    const o = c.createOscillator();
    const g = c.createGain();
    o.type = type;
    o.frequency.setValueAtTime(freq, t);
    if (slideTo) o.frequency.exponentialRampToValueAtTime(slideTo, t + dur);
    g.gain.setValueAtTime(vol, t);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(g);
    g.connect(c.destination);
    o.start(t);
    o.stop(t + dur + 0.02);
  }

  function noise(dur, vol = 0.2) {
    if (muted) return;
    const c = ac();
    if (!c) return;
    const len = Math.floor(c.sampleRate * dur);
    const buf = c.createBuffer(1, len, c.sampleRate);
    const d = buf.getChannelData(0);
    for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / len);
    const s = c.createBufferSource();
    const g = c.createGain();
    const f = c.createBiquadFilter();
    f.type = "lowpass";
    f.frequency.value = 900;
    g.gain.value = vol;
    s.buffer = buf;
    s.connect(f);
    f.connect(g);
    g.connect(c.destination);
    s.start();
  }

  return {
    click: () => tone(660, 0.05),
    coin: () => {
      tone(988, 0.08);
      tone(1319, 0.35, "square", 0.05, 0.08);
    },
    pick: () => {
      tone(440, 0.06);
      tone(660, 0.08, "square", 0.05, 0.06);
    },
    drop: () => tone(200, 0.12, "square", 0.05, 0, 90),
    error: () => tone(180, 0.28, "sawtooth", 0.06, 0, 80),
    fuse: () => tone(1200, 0.08, "square", 0.04),
    explode: () => {
      noise(0.8, 0.3);
      tone(90, 0.6, "sawtooth", 0.08, 0, 30);
    },
    start: () => [392, 523, 659, 784].forEach((f, i) => tone(f, 0.12, "square", 0.05, i * 0.09)),
    achievement: () => [659, 784, 988].forEach((f, i) => tone(f, 0.14, "triangle", 0.07, i * 0.1)),
    victory: () => {
      [523, 659, 784, 1047, 784, 1047, 1319].forEach((f, i) => tone(f, 0.16, "square", 0.05, i * 0.11));
      tone(1568, 0.7, "square", 0.05, 0.85);
    },
    wasted: () => {
      tone(220, 0.6, "sawtooth", 0.06, 0, 70);
      tone(110, 1.0, "sawtooth", 0.07, 0.5, 40);
    },
    door: () => {
      tone(140, 0.25, "square", 0.05, 0, 70);
      noise(0.2, 0.08);
    },
    step: () => tone(120, 0.04, "square", 0.03),
    toggle() {
      muted = !muted;
      try {
        localStorage.setItem("gc-muted", muted ? "1" : "0");
      } catch (e) {}
      if (!muted) this.coin();
      return muted;
    },
    isMuted: () => muted,
  };
})();
