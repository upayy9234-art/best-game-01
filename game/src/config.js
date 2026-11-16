// Every tuning number and colour in one place. The playfield is a fixed 1280x720
// logical area; the renderer scales it to the window, so no rule below depends
// on the screen size.

export const FIELD = { width: 1280, height: 720 };

/** The simulation's fixed step, in seconds: 60 updates a second whatever the display's rate. */
export const STEP = 1 / 60;

export const PLAYER = {
  radius: 18,
  accel: 2600,
  maxSpeed: 420,
  friction: 0.86,
  dashSpeed: 980,
  dashTime: 0.22,
  dashCooldown: 2.5,
  invulnerable: 1.6,
};

export const LIVES = 3;

/** One ember is worth 10 points times the combo multiplier (1 + combo * 0.1, capped). */
export const EMBER = {
  radius: 12,
  fallSpeed: 55,
  fallJitter: 35,
  sway: 42,
  points: 10,
  comboWindow: 3.0,
  comboCap: 12,
  interval: 0.75,
  intervalScale: 0.94,
  minInterval: 0.34,
  /** Chance a spawned ember is golden: worth 5x, bigger, slower, sparkling. */
  goldenChance: 0.06,
  goldenPoints: 50,
  goldenRadius: 16,
  goldenFallSpeed: 42,
};

/** Gloom orbs: touching one costs a life. */
export const GLOOM = {
  radius: 19,
  fallSpeed: 95,
  fallJitter: 45,
  sway: 60,
  interval: 1.55,
  intervalScale: 0.93,
  minInterval: 0.55,
  /** Level at which chasers (they drift toward the wisp) start appearing. */
  chaserLevel: 3,
  chaserTurn: 130,
  /** Level at which fast darts start appearing. */
  dartLevel: 5,
  dartSpeed: 260,
};

/** A power-up drifts down slowly; catching it grants its effect. */
export const POWERUP = {
  radius: 15,
  fallSpeed: 48,
  interval: 17,
  magnetSeconds: 6,
  slowSeconds: 5,
  magnetRadius: 260,
  /** Chance a spawned power-up is a Starfall (clears every gloom on screen). */
  starfallChance: 0.12,
  /** Points per gloom cleared by a Starfall. */
  starfallPoints: 25,
};

/** Embers gathered to finish a level; level 8 breaks the dawn (the win). */
export const LEVEL = {
  embersPerLevel: 15,
  winLevel: 8,
  max: 12,
  /** Reaching this level with a life missing grants one back (once per run). */
  blessingLevel: 4,
};

/** How many of each thing can exist at once; pools are allocated once, at boot. */
export const POOL = { embers: 56, gloom: 44, powerups: 6, particles: 384, texts: 24, rings: 8 };

export const PALETTE = {
  backdropTop: '#0a0e24',
  backdropBottom: '#1a1033',
  nebulaA: '#2b1a5e',
  nebulaB: '#0e2a4a',
  star: '#dfe8ff',
  moon: '#f4ead0',
  wispCore: '#fff6c9',
  wispGlow: '#f2c94c',
  wispTrail: '#ffd76a',
  ember: '#f2c94c',
  emberCore: '#fff3b0',
  golden: '#ffd76a',
  goldenCore: '#fffbe0',
  gloom: '#241a3d',
  gloomRim: '#b04a8a',
  gloomEye: '#ff5d73',
  chaserRim: '#8a5cff',
  dartRim: '#ff7a3c',
  shield: '#4fd1c5',
  magnet: '#f2a0ff',
  slow: '#7db4ff',
  starfall: '#ffd76a',
  text: '#eef1f5',
  muted: '#9aa3b8',
  danger: '#ff5d73',
  panel: 'rgba(10, 14, 36, 0.72)',
  dawnTop: '#2c2350',
  dawnMid: '#c96a5e',
  dawnBottom: '#ffd98a',
  dawnSun: '#ffe9a3',
};

export const FONT = 'system-ui, -apple-system, "Segoe UI", sans-serif';

/** Where the best score is kept between visits (this browser only). */
export const BEST_KEY = 'lumen-drift.best';
