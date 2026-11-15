// Small deterministic random number generator (mulberry32), so the screenshot
// modes (?shot=...) render the same field every time, and so the game can be
// replayed from a seed while it is being tested.

export function mulberry32(seed) {
  let a = seed >>> 0;
  return function next() {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** A random source with the helpers the game uses; seedable for screenshots. */
export function makeRandom(seed) {
  const next = mulberry32(seed);
  return {
    next,
    /** Uniform float in [min, max). */
    range(min, max) {
      return min + next() * (max - min);
    },
    /** Uniform integer in [min, max]. */
    int(min, max) {
      return min + Math.floor(next() * (max - min + 1));
    },
    /** One of the given values, uniformly. */
    pick(values) {
      return values[Math.floor(next() * values.length)];
    },
    /** True with probability p. */
    chance(p) {
      return next() < p;
    },
  };
}

/** The live game's random source: seeded from the clock, never twice the same. */
export function liveRandom() {
  return makeRandom((Date.now() ^ (Math.random() * 0xffffffff)) >>> 0);
}
