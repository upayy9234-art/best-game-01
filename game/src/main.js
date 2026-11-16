// Lumen Drift — entry point. Owns the canvas, the fixed-step loop, the state
// machine (title → playing ⇄ paused → game over / victory) and the ?shot=
// modes the screenshots are taken in. The world itself lives in world.js.
// It also drains the world's sound events each step (round 1 wired only a few
// of the sounds) and runs the title screen's ambient ember drift.

import { FIELD, STEP, BEST_KEY } from './config.js';
import { makeRandom, liveRandom } from './random.js';
import { makeAudio } from './audio.js';
import { makeMusic } from './music.js';
import { makeInput } from './input.js';
import { makeParticles } from './particles.js';
import { makeWorld } from './world.js';
import { makeRenderer } from './render.js';
import { POOL } from './config.js';

const canvas = document.getElementById('game');
canvas.width = FIELD.width;
canvas.height = FIELD.height;

const params = new URLSearchParams(window.location.search);
const shot = params.get('shot');
const seed = Number(params.get('seed') || '1') || 1;

const audio = makeAudio();
const music = makeMusic();
const particles = makeParticles(POOL.particles, POOL.texts, POOL.rings);
const world = makeWorld(shot ? makeRandom(seed) : liveRandom(), particles);
world.particles = particles;
const renderer = makeRenderer(canvas);
const statusEl = document.getElementById('status');

let mode = 'title';
let lastTime = performance.now();
let accumulator = 0;
let best = 0;
try {
  best = Number(window.localStorage.getItem(BEST_KEY) || '0') || 0;
} catch {
  best = 0;
}
world.state.best = best;

function saveBest() {
  const s = world.state;
  if (s.score > best) {
    best = s.score;
    s.best = best;
    try {
      window.localStorage.setItem(BEST_KEY, String(best));
    } catch {
      // A browser that refuses storage still plays fine.
    }
  }
}

function announce(text) {
  if (statusEl) statusEl.textContent = text;
}

function startGame() {
  world.reset(best);
  mode = 'playing';
  audio.unlock();
  music.unlock();
  audio.play('click');
  announce('Game started. Gather embers, dodge the gloom.');
}

function togglePause() {
  if (mode === 'playing') {
    mode = 'paused';
    announce('Paused.');
  } else if (mode === 'paused') {
    mode = 'playing';
    announce('Resumed.');
  }
}

function continueEndless() {
  if (mode !== 'victory') return;
  world.state.victory = false;
  mode = 'playing';
  announce('The drift goes on.');
}

const input = makeInput(canvas, {
  onKey(code) {
    audio.unlock();
    music.unlock();
    if (code === 'Enter') {
      if (mode === 'title') startGame();
      else if (mode === 'gameover') startGame();
      else if (mode === 'victory') continueEndless();
    } else if (code === 'KeyR') {
      if (mode === 'gameover' || mode === 'victory' || mode === 'paused') startGame();
    } else if (code === 'KeyC') {
      if (mode === 'victory') continueEndless();
    } else if (code === 'KeyP' || code === 'Escape') {
      togglePause();
    } else if (code === 'KeyM') {
      const muted = audio.toggleMute();
      music.toggleMute();
      announce(muted ? 'Sound off.' : 'Sound on.');
    }
  },
  onPointerDown(_p, button) {
    audio.unlock();
    music.unlock();
    if (button === 2) return; // Right-click dashes; it starts nothing.
    if (mode === 'title') startGame();
    else if (mode === 'gameover') startGame();
    else if (mode === 'victory') continueEndless();
    else if (mode === 'paused') togglePause();
  },
});

/** Play every sound the world queued since the last step. */
function drainSounds() {
  for (const ev of world.drainEvents()) audio.play(ev.name, ev.arg);
}

function step() {
  if (mode !== 'playing' && mode !== 'victory') return;
  const result = world.update(STEP, input);
  drainSounds();
  if (mode === 'victory') return; // The dawn drifts on; nothing else changes.
  const s = world.state;
  if (s.over) {
    mode = 'gameover';
    saveBest();
    audio.play('over');
    announce(`Game over. Score ${s.score}. Best ${Math.max(s.best, s.score)}.`);
    return;
  }
  if (result === 'win' && mode === 'playing') {
    mode = 'victory';
    saveBest();
    audio.play('win');
    announce(`Dawn breaks — you win! Score ${s.score}.`);
    return;
  }
  // The world's own events play their sounds here, read off its state.
  // (A blessing banner plays its own sound, so the level fanfare skips it.)
  if (s.levelBanner > 0 && s.levelBannerText.startsWith('LEVEL') && !s.levelBannerText.includes('BLESSING') && !step._levelPlayed) {
    step._levelPlayed = s.level;
    audio.play('level');
  }
  if (s.levelBanner === 0) step._levelPlayed = 0;
}

function frame(now) {
  const dt = Math.min(0.1, (now - lastTime) / 1000);
  lastTime = now;
  if (shot) {
    // A screenshot mode: the scene was settled below and stays frozen, so
    // the shot is exactly the staged scene on every run.
    renderer.draw(world, mode, now / 1000);
    requestAnimationFrame(frame);
    return;
  }
  if (mode === 'title') {
    // Embers drift behind the title panel; nothing else runs.
    world.ambient(dt);
  } else if (mode === 'playing' || mode === 'victory') {
    accumulator += dt;
    let guard = 0;
    while (accumulator >= STEP && guard < 5) {
      step();
      accumulator -= STEP;
      guard++;
      if (mode !== 'playing' && mode !== 'victory') {
        accumulator = 0;
        break;
      }
    }
    if (guard >= 5) accumulator = 0;
  }
  renderer.draw(world, mode, now / 1000);
  requestAnimationFrame(frame);
}

// --- Screenshot modes: deterministic states, no input needed. ---
if (shot === 'play') {
  world.stagePlay(seed);
  mode = 'playing';
} else if (shot === 'end') {
  world.stageEnd();
  mode = 'gameover';
} else if (shot === 'win') {
  world.stageWin();
  mode = 'victory';
} else {
  world.stageTitle();
  mode = 'title';
}

// Let the staged scene settle a few fixed steps (bursts spread, embers fall
// a little), then the frame loop above holds it frozen for the screenshot.
// The Magnet is paused for the settle: it would otherwise pull staged
// embers onto the wisp and change the shot's staged numbers.
if (shot === 'play' || shot === 'win') {
  const savedMagnet = world.wisp.magnet;
  world.wisp.magnet = 0;
  for (let i = 0; i < 20; i++) world.update(STEP, input);
  world.wisp.magnet = savedMagnet;
} else if (shot === 'start') {
  for (let i = 0; i < 20; i++) world.ambient(STEP);
}

// A hook for automated play-testing: score, lives and mode, and a way to end
// a run at once. It changes nothing about the game itself.
window.__lumen = {
  get state() {
    return world.state;
  },
  get mode() {
    return mode;
  },
  get wisp() {
    return world.wisp;
  },
  get embers() {
    return world.embers.filter((e) => e.alive).map((e) => ({ x: e.x, y: e.y, golden: e.golden }));
  },
  get gloom() {
    return world.gloom.filter((g) => g.alive).map((g) => ({ x: g.x, y: g.y, kind: g.dart ? 'dart' : g.chase ? 'chase' : 'gloom' }));
  },
  get powerups() {
    return world.powerups.filter((p) => p.alive).map((p) => ({ x: p.x, y: p.y, kind: p.kind }));
  },
  get dawnProgress() {
    return world.dawnProgress();
  },
  get musicPlaying() {
    return music.playing;
  },
  start: startGame,
  reset: () => world.reset(best),
  spawnEmberAt: (x, y, golden) => world.spawnEmberAt(x, y, golden),
  spawnGloomAt: (x, y) => world.spawnGloomAt(x, y),
  spawnPowerupAt: (x, y, kind) => world.spawnPowerupAt(x, y, kind),
  starfall: () => world.spawnPowerupAt(world.wisp.x, world.wisp.y, 'starfall'),
};

requestAnimationFrame(frame);
window.__shotReady = true;
