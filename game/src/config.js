// Every tuning number and colour in one place. The playfield is a fixed 1280x720
// logical area; the renderer scales it to the window, so no rule below depends
// on the screen size.

export const FIELD = { width: 1280, height: 720 };

/** The simulation's fixed step, in seconds: 60 updates a second whatever the display's rate. */
export const STEP = 1 / 60;

export const PLAYER = {
  radius: 16,
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
  radius: 11,
  fallSpeed: 55,
  fallJitter: 35,
  sway: 42,
  points: 10,
  comboWindow: 3.0,
  comboCap: 12,
  interval: 0.85,
  intervalScale: 0.94,
  minInterval: 0.34,
};

/** Gloom orbs: touching one costs a life. */
export const GLOOM = {
  radius: 18,
  fallSpeed: 95,
  fallJitter: 45,
  sway: 60,
  interval: 1.7,
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
};

/** Embers gathered to finish a level; level 8 breaks the dawn (the win). */
export const LEVEL = { embersPerLevel: 15, winLevel: 8, max: 12 };

/** How many of each thing can exist at once; pools are allocated once, at boot. */
export const POOL = { embers: 48, gloom: 40, powerups: 6, particles: 320, texts: 24 };

export const PALETTE = {
  backdropTop: '#0a0e24',
  backdropBottom: '#1a1033',
  nebulaA: '#2b1a5e',
  nebulaB: '#0e2a4a',
  star: '#dfe8ff',
  wispCore: '#fff6c9',
  wispGlow: '#f2c94c',
  wispTrail: '#ffd76a',
  ember: '#f2c94c',
  emberCore: '#fff3b0',
  gloom: '#241a3d',
  gloomRim: '#b04a8a',
  gloomEye: '#ff5d73',
  chaserRim: '#8a5cff',
  dartRim: '#ff7a3c',
  shield: '#4fd1c5',
  magnet: '#f2a0ff',
  slow: '#7db4ff',
  text: '#eef1f5',
  muted: '#9aa3b8',
  danger: '#ff5d73',
  panel: 'rgba(10, 14, 36, 0.72)',
};

export const FONT = 'system-ui, -apple-system, "Segoe UI", sans-serif';

/** Where the best score is kept between visits (this browser only). */
export const BEST_KEY = 'lumen-drift.best';
