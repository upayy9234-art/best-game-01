// Lumen Drift — entry point. Owns the canvas, the fixed-step loop, the state
// machine (title → playing ⇄ paused → game over / victory) and the ?shot=
// modes the screenshots are taken in. The world itself lives in world.js.

import { FIELD, STEP, BEST_KEY } from './config.js';
import { makeRandom, liveRandom } from './random.js';
import { makeAudio } from './audio.js';
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
const particles = makeParticles(POOL.particles, POOL.texts);
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
      announce(muted ? 'Sound off.' : 'Sound on.');
    }
  },
  onPointerDown(_p, button) {
    audio.unlock();
    if (button === 2) return; // Right-click dashes; it starts nothing.
    if (mode === 'title') startGame();
    else if (mode === 'gameover') startGame();
    else if (mode === 'victory') continueEndless();
    else if (mode === 'paused') togglePause();
  },
});

function step() {
  if (mode !== 'playing' && mode !== 'victory') return;
  const result = world.update(STEP, input);
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
  if (s.levelBanner > 0 && s.levelBannerText.startsWith('LEVEL') && !step._levelPlayed) {
    step._levelPlayed = s.level;
    audio.play('level');
  }
  if (s.levelBanner === 0) step._levelPlayed = 0;
}

function frame(now) {
  const dt = Math.min(0.1, (now - lastTime) / 1000);
  lastTime = now;
  if (mode === 'playing' || mode === 'victory') {
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
  mode = 'title';
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
    return world.embers.filter((e) => e.alive).map((e) => ({ x: e.x, y: e.y }));
  },
  get gloom() {
    return world.gloom.filter((g) => g.alive).map((g) => ({ x: g.x, y: g.y }));
  },
  start: startGame,
  reset: () => world.reset(best),
  spawnEmberAt: (x, y) => world.spawnEmberAt(x, y),
  spawnGloomAt: (x, y) => world.spawnGloomAt(x, y),
};

requestAnimationFrame(frame);
window.__shotReady = true;
