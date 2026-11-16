// Gentle procedural music: a slow pentatonic pluck that wanders up and down,
// over a soft low drone. No audio files, no network — a few triangle-wave
// oscillators through the Web Audio API, started lazily on the first user
// gesture like the sound effects, and silenced together with them by M.

const SCALE = [220, 261.63, 293.66, 329.63, 392, 440, 523.25, 587.33];
const STEP_SECONDS = 0.46;

export function makeMusic() {
  let ctx = null;
  let master = null;
  let muted = false;
  let timer = null;
  let nextNoteAt = 0;
  let degree = 3;
  let stepCount = 0;

  function pluck(freq, at, dur, vol) {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'triangle';
    osc.frequency.value = freq;
    gain.gain.setValueAtTime(0.0001, at);
    gain.gain.exponentialRampToValueAtTime(vol, at + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.0001, at + dur);
    osc.connect(gain);
    gain.connect(master);
    osc.start(at);
    osc.stop(at + dur + 0.05);
  }

  function tick() {
    if (!ctx || muted) return;
    while (nextNoteAt < ctx.currentTime + 0.5) {
      // A lazy random walk on the scale, so the line never repeats exactly.
      degree += Math.floor(Math.random() * 5) - 2;
      if (degree < 0) degree = 0;
      if (degree > SCALE.length - 1) degree = SCALE.length - 1;
      pluck(SCALE[degree], nextNoteAt, 0.9, 0.16);
      // Every eighth step, a low root drone underneath.
      if (stepCount % 8 === 0) pluck(110, nextNoteAt, 2.2, 0.1);
      if (stepCount % 8 === 4) pluck(164.81, nextNoteAt, 2.0, 0.07);
      stepCount++;
      nextNoteAt += STEP_SECONDS;
    }
  }

  function ensure() {
    if (ctx) {
      if (ctx.state === 'suspended') ctx.resume().catch(() => {});
      return;
    }
    try {
      const AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return;
      ctx = new AC();
      master = ctx.createGain();
      master.gain.value = 0.05;
      master.connect(ctx.destination);
      nextNoteAt = ctx.currentTime + 0.1;
      timer = setInterval(tick, 200);
    } catch {
      ctx = null;
    }
  }

  return {
    /** Call on any user gesture; the music starts after the first one. */
    unlock() {
      ensure();
    },
    toggleMute() {
      muted = !muted;
      if (master) master.gain.value = muted ? 0 : 0.05;
      return muted;
    },
    get muted() {
      return muted;
    },
    /** For tests: true once the scheduler is running. */
    get playing() {
      return timer !== null && !muted;
    },
  };
}
