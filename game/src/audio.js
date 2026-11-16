// Synthesised sound effects: every sound is a few oscillators through the
// Web Audio API, so the game ships no audio files and plays offline.
// The context is created lazily on the first user gesture (browsers forbid
// audio before one); everything is a no-op until then, and M toggles mute.

const NOTES = {
  pickup: [880, 1174.66],
  golden: [1318.5, 1760],
  powerup: [523.25, 659.25, 783.99],
  shield: [1046.5, 783.99],
  starfall: [523.25, 659.25, 783.99, 1046.5, 1318.5],
  blessing: [783.99, 987.77, 1174.66],
  fever: [1046.5, 1318.5, 1567.98, 2093],
  hit: [160, 110],
  dash: [320, 640],
  level: [523.25, 659.25, 783.99, 1046.5],
  win: [523.25, 659.25, 783.99, 1046.5, 1318.5],
  over: [392, 311.13, 233.08],
  click: [660],
};

export function makeAudio() {
  let ctx = null;
  let master = null;
  let muted = false;

  function ensure() {
    if (ctx) {
      if (ctx.state === 'suspended') ctx.resume().catch(() => {});
      return ctx !== null;
    }
    try {
      const AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return false;
      ctx = new AC();
      master = ctx.createGain();
      master.gain.value = 0.22;
      master.connect(ctx.destination);
    } catch {
      ctx = null;
      return false;
    }
    return true;
  }

  /** Play one note: a sine blip with a quick decay. */
  function tone(freq, at, dur, type = 'sine', vol = 1) {
    if (!ctx || muted) return;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = type;
    osc.frequency.value = freq;
    const t0 = ctx.currentTime + at;
    gain.gain.setValueAtTime(0.0001, t0);
    gain.gain.exponentialRampToValueAtTime(0.5 * vol, t0 + 0.012);
    gain.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    osc.connect(gain);
    gain.connect(master);
    osc.start(t0);
    osc.stop(t0 + dur + 0.05);
  }

  /** A filtered noise burst (whoosh / thud). */
  function noise(at, dur, freq, vol = 1) {
    if (!ctx || muted) return;
    const len = Math.max(1, Math.floor(ctx.sampleRate * dur));
    const buffer = ctx.createBuffer(1, len, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < len; i++) data[i] = (Math.random() * 2 - 1) * (1 - i / len);
    const src = ctx.createBufferSource();
    src.buffer = buffer;
    const filter = ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.value = freq;
    const gain = ctx.createGain();
    const t0 = ctx.currentTime + at;
    gain.gain.setValueAtTime(0.6 * vol, t0);
    gain.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    src.connect(filter);
    filter.connect(gain);
    gain.connect(master);
    src.start(t0);
  }

  const players = {
    pickup(combo) {
      if (!ensure()) return;
      const base = NOTES.pickup;
      const lift = Math.min(combo, 12) * 18;
      tone(base[0] + lift, 0, 0.12);
      tone(base[1] + lift, 0.05, 0.14);
    },
    golden() {
      if (!ensure()) return;
      NOTES.golden.forEach((f, i) => tone(f, i * 0.06, 0.2, 'triangle', 0.9));
      noise(0, 0.15, 5200, 0.25);
    },
    powerup() {
      if (!ensure()) return;
      NOTES.powerup.forEach((f, i) => tone(f, i * 0.07, 0.18, 'triangle'));
    },
    shield() {
      if (!ensure()) return;
      NOTES.shield.forEach((f, i) => tone(f, i * 0.06, 0.16, 'triangle', 0.8));
      noise(0, 0.12, 3600, 0.3);
    },
    starfall() {
      if (!ensure()) return;
      NOTES.starfall.forEach((f, i) => tone(f, i * 0.05, 0.22, 'triangle', 0.9));
      noise(0, 0.5, 3200, 0.6);
    },
    blessing() {
      if (!ensure()) return;
      NOTES.blessing.forEach((f, i) => tone(f, i * 0.1, 0.26, 'triangle', 0.9));
    },
    fever() {
      if (!ensure()) return;
      NOTES.fever.forEach((f, i) => tone(f, i * 0.05, 0.24, 'triangle', 0.9));
      noise(0, 0.3, 5200, 0.35);
    },
    hit() {
      if (!ensure()) return;
      NOTES.hit.forEach((f, i) => tone(f, i * 0.09, 0.22, 'sawtooth', 0.7));
      noise(0, 0.25, 500, 0.9);
    },
    dash() {
      if (!ensure()) return;
      noise(0, 0.18, 2400, 0.5);
      tone(NOTES.dash[0], 0, 0.1, 'sine', 0.5);
      tone(NOTES.dash[1], 0.06, 0.12, 'sine', 0.5);
    },
    level() {
      if (!ensure()) return;
      NOTES.level.forEach((f, i) => tone(f, i * 0.09, 0.22, 'triangle'));
    },
    win() {
      if (!ensure()) return;
      NOTES.win.forEach((f, i) => tone(f, i * 0.11, 0.3, 'triangle'));
    },
    over() {
      if (!ensure()) return;
      NOTES.over.forEach((f, i) => tone(f, i * 0.16, 0.34, 'triangle', 0.8));
    },
    click() {
      if (!ensure()) return;
      tone(NOTES.click[0], 0, 0.07, 'sine', 0.6);
    },
  };

  return {
    /** Call on any user gesture so later sounds are allowed to play. */
    unlock() {
      ensure();
    },
    play(name, arg) {
      const fn = players[name];
      if (fn) fn(arg);
    },
    toggleMute() {
      muted = !muted;
      return muted;
    },
    get muted() {
      return muted;
    },
  };
}
