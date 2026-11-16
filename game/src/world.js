// The world: the wisp, the falling embers and gloom, the power-ups, the levels
// and the score. Pure simulation — it knows nothing about the canvas, so the
// same step runs in the live game and in the deterministic screenshot modes.
//
// Round 2: golden embers (rare, worth 5x), a fourth power-up — Starfall,
// which clears every gloom on screen — and Dawn's Blessing, one life back on
// reaching level 4. The world also reports what happened (drainEvents) so the
// main loop can play the matching sound, and it freezes the score once the
// dawn has broken, so a won run's numbers never drift.

import { FIELD, PLAYER, EMBER, GLOOM, POWERUP, LEVEL, LIVES, POOL } from './config.js';

const POWERUP_KINDS = ['shield', 'magnet', 'slow'];

export function makeWorld(random, particles) {
  const wisp = {
    x: FIELD.width / 2,
    y: FIELD.height - 130,
    vx: 0,
    vy: 0,
    radius: PLAYER.radius,
    facing: 0,
    invulnerable: 0,
    dashTime: 0,
    dashCooldown: 0,
    dashDirX: 1,
    dashDirY: 0,
    shield: false,
    magnet: 0,
    slow: 0,
    trailTimer: 0,
  };

  const embers = [];
  for (let i = 0; i < POOL.embers; i++) {
    embers.push({ alive: false, x: 0, y: 0, vy: 0, sway: 0, phase: 0, radius: EMBER.radius, kind: 'ember', golden: false });
  }
  const gloom = [];
  for (let i = 0; i < POOL.gloom; i++) {
    gloom.push({ alive: false, x: 0, y: 0, vx: 0, vy: 0, sway: 0, phase: 0, radius: GLOOM.radius, kind: 'gloom', chase: false, dart: false });
  }
  const powerups = [];
  for (let i = 0; i < POOL.powerups; i++) {
    powerups.push({ alive: false, x: 0, y: 0, vy: 0, phase: 0, radius: POWERUP.radius, kind: 'shield' });
  }

  // Sound / feedback events since the last drain, as { name, arg }.
  const events = [];
  function emit(name, arg) {
    events.push({ name, arg });
  }

  const state = {
    score: 0,
    best: 0,
    lives: LIVES,
    level: 1,
    embersInLevel: 0,
    embersTotal: 0,
    goldenTotal: 0,
    combo: 0,
    comboTimer: 0,
    maxCombo: 0,
    hits: 0,
    powerupsTaken: 0,
    starfalls: 0,
    blessingGiven: false,
    time: 0,
    shake: 0,
    flash: 0,
    levelBanner: 0,
    levelBannerText: '',
    emberTimer: 0.4,
    gloomTimer: 1.2,
    powerupTimer: POWERUP.interval,
    won: false,
    over: false,
    // True while the dawn victory overlay is showing (the world keeps drifting).
    victory: false,
  };

  function spawnEmber(x, y, golden = false) {
    for (const e of embers) {
      if (e.alive) continue;
      e.alive = true;
      e.x = x ?? random.range(30, FIELD.width - 30);
      e.y = y ?? -20;
      e.golden = golden || random.chance(EMBER.goldenChance);
      e.radius = e.golden ? EMBER.goldenRadius : EMBER.radius;
      e.vy = e.golden
        ? EMBER.goldenFallSpeed
        : (EMBER.fallSpeed + random.range(-EMBER.fallJitter, EMBER.fallJitter)) * (1 + (state.level - 1) * 0.05);
      e.sway = random.range(10, EMBER.sway);
      e.phase = random.range(0, Math.PI * 2);
      return e;
    }
    return null;
  }

  function spawnGloom(kind) {
    for (const g of gloom) {
      if (g.alive) continue;
      g.alive = true;
      g.x = random.range(40, FIELD.width - 40);
      g.y = -30;
      const speed = (GLOOM.fallSpeed + random.range(-GLOOM.fallJitter, GLOOM.fallJitter)) * (1 + (state.level - 1) * 0.06);
      g.vy = speed;
      g.vx = 0;
      g.sway = random.range(20, GLOOM.sway);
      g.phase = random.range(0, Math.PI * 2);
      g.chase = kind === 'chase';
      g.dart = kind === 'dart';
      if (g.dart) {
        g.vy = GLOOM.dartSpeed;
        g.radius = 13;
      } else {
        g.radius = GLOOM.radius;
      }
      return g;
    }
    return null;
  }

  function spawnPowerup(x, y, kind) {
    for (const p of powerups) {
      if (p.alive) continue;
      p.alive = true;
      p.x = x ?? random.range(50, FIELD.width - 50);
      p.y = y ?? -20;
      p.vy = POWERUP.fallSpeed;
      p.phase = random.range(0, Math.PI * 2);
      p.kind = kind ?? (random.chance(POWERUP.starfallChance) ? 'starfall' : random.pick(POWERUP_KINDS));
      return p;
    }
    return null;
  }

  function comboMultiplier() {
    return 1 + Math.min(state.combo, EMBER.comboCap) * 0.1;
  }

  /** How far the run is toward the dawn: 0 at level 1, 1 when it breaks. */
  function dawnProgress() {
    return Math.min(1, (state.level - 1) / (LEVEL.winLevel - 1));
  }

  function collectEmber(e) {
    e.alive = false;
    state.combo += 1;
    state.comboTimer = EMBER.comboWindow;
    if (state.combo > state.maxCombo) state.maxCombo = state.combo;
    const base = e.golden ? EMBER.goldenPoints : EMBER.points;
    const gained = Math.round(base * comboMultiplier());
    state.score += gained;
    state.embersTotal += 1;
    state.embersInLevel += 1;
    if (e.golden) {
      state.goldenTotal += 1;
      particles.burst(e.x, e.y, '#ffd76a', 18, 260, 0.8, 4);
      particles.floatText(e.x, e.y - 14, `+${gained}`, '#fffbe0', 24 + Math.min(state.combo, 10));
      emit('golden');
    } else {
      particles.burst(e.x, e.y, '#f2c94c', 10, 170, 0.55, 3);
      particles.floatText(e.x, e.y - 14, `+${gained}`, '#ffe9a3', 17 + Math.min(state.combo, 10));
      emit('pickup', state.combo);
    }
    if (state.embersInLevel >= LEVEL.embersPerLevel) levelUp();
    return gained;
  }

  function levelUp() {
    state.embersInLevel = 0;
    state.level += 1;
    state.levelBanner = 2.2;
    if (state.level >= LEVEL.winLevel && !state.won) {
      state.won = true;
      state.victory = true;
      state.levelBannerText = 'DAWN BREAKS — YOU WIN!';
      particles.burst(wisp.x, wisp.y, '#fff6c9', 60, 320, 1.2, 4);
      return 'win';
    }
    if (state.level === LEVEL.blessingLevel && !state.blessingGiven && state.lives < LIVES) {
      state.blessingGiven = true;
      state.lives += 1;
      state.levelBannerText = `LEVEL ${state.level} — DAWN'S BLESSING · +1 LIFE`;
      particles.burst(wisp.x, wisp.y, '#4fd1c5', 30, 260, 0.9, 3);
      emit('blessing');
    } else {
      state.levelBannerText = `LEVEL ${state.level}`;
    }
    emit('level');
    return 'level';
  }

  function hurt() {
    if (wisp.invulnerable > 0 || wisp.dashTime > 0) return null;
    if (wisp.shield) {
      wisp.shield = false;
      wisp.invulnerable = PLAYER.invulnerable;
      particles.burst(wisp.x, wisp.y, '#4fd1c5', 22, 260, 0.7, 3);
      emit('shield');
      return 'shield';
    }
    state.lives -= 1;
    state.hits += 1;
    state.combo = 0;
    state.comboTimer = 0;
    state.shake = 0.45;
    state.flash = 0.35;
    wisp.invulnerable = PLAYER.invulnerable;
    particles.burst(wisp.x, wisp.y, '#ff5d73', 26, 300, 0.8, 4);
    emit('hit');
    if (state.lives <= 0) {
      state.over = true;
      if (state.score > state.best) state.best = state.score;
      return 'over';
    }
    return 'hit';
  }

  /** Starfall: every gloom on screen bursts, worth points each. */
  function starfall() {
    let cleared = 0;
    for (const g of gloom) {
      if (!g.alive) continue;
      g.alive = false;
      cleared++;
      particles.burst(g.x, g.y, '#ffd76a', 12, 240, 0.7, 3);
    }
    if (cleared > 0) {
      state.score += cleared * POWERUP.starfallPoints;
      state.starfalls += 1;
      state.flash = 0.5;
      state.shake = 0.3;
      particles.ring(wisp.x, wisp.y, '#ffd76a', 620, 0.8);
      particles.floatText(wisp.x, wisp.y - 30, `STARFALL! +${cleared * POWERUP.starfallPoints}`, '#fffbe0', 26);
    }
    return cleared;
  }

  function applyPowerup(p) {
    p.alive = false;
    state.powerupsTaken += 1;
    particles.burst(p.x, p.y, '#ffffff', 16, 220, 0.7, 3);
    if (p.kind === 'shield') {
      wisp.shield = true;
      particles.floatText(p.x, p.y - 14, 'SHIELD!', '#4fd1c5', 20);
      emit('powerup');
    } else if (p.kind === 'magnet') {
      wisp.magnet = POWERUP.magnetSeconds;
      particles.floatText(p.x, p.y - 14, 'MAGNET!', '#f2a0ff', 20);
      emit('powerup');
    } else if (p.kind === 'slow') {
      wisp.slow = POWERUP.slowSeconds;
      particles.floatText(p.x, p.y - 14, 'SLOW TIME!', '#7db4ff', 20);
      emit('powerup');
    } else {
      starfall();
      emit('starfall');
    }
  }

  function dist2(ax, ay, bx, by) {
    const dx = ax - bx;
    const dy = ay - by;
    return dx * dx + dy * dy;
  }

  function update(dt, input) {
    state.time += dt;
    if (state.shake > 0) state.shake = Math.max(0, state.shake - dt);
    if (state.flash > 0) state.flash = Math.max(0, state.flash - dt);
    if (state.levelBanner > 0) state.levelBanner = Math.max(0, state.levelBanner - dt);
    if (wisp.invulnerable > 0) wisp.invulnerable -= dt;
    if (wisp.dashCooldown > 0) wisp.dashCooldown -= dt;
    if (wisp.magnet > 0) wisp.magnet -= dt;
    if (wisp.slow > 0) wisp.slow -= dt;

    // Combo decays once its window lapses.
    if (state.combo > 0) {
      state.comboTimer -= dt;
      if (state.comboTimer <= 0) {
        state.combo = 0;
        state.comboTimer = 0;
      }
    }

    const slowFactor = wisp.slow > 0 ? 0.45 : 1;

    // --- Steering: keys push, a held pointer pulls, dash bursts. ---
    const move = input.moveVector();
    if (input.takeDash() && wisp.dashCooldown <= 0 && wisp.dashTime <= 0) {
      let dx = 0;
      let dy = 0;
      if (move) {
        dx = move.x;
        dy = move.y;
      } else if (input.pointerDown && input.pointer.seen) {
        const px = input.pointer.x - wisp.x;
        const py = input.pointer.y - wisp.y;
        const len = Math.hypot(px, py) || 1;
        dx = px / len;
        dy = py / len;
      } else {
        dx = Math.cos(wisp.facing);
        dy = Math.sin(wisp.facing);
      }
      wisp.dashDirX = dx;
      wisp.dashDirY = dy;
      wisp.dashTime = PLAYER.dashTime;
      wisp.dashCooldown = PLAYER.dashCooldown;
      wisp.invulnerable = Math.max(wisp.invulnerable, PLAYER.dashTime + 0.05);
      emit('dash');
    }

    if (wisp.dashTime > 0) {
      wisp.dashTime -= dt;
      wisp.vx = wisp.dashDirX * PLAYER.dashSpeed;
      wisp.vy = wisp.dashDirY * PLAYER.dashSpeed;
      wisp.trailTimer -= dt;
      if (wisp.trailTimer <= 0) {
        wisp.trailTimer = 0.016;
        particles.trail(wisp.x, wisp.y, '#ffd76a');
      }
    } else if (move) {
      wisp.vx += move.x * PLAYER.accel * dt;
      wisp.vy += move.y * PLAYER.accel * dt;
      const speed = Math.hypot(wisp.vx, wisp.vy);
      if (speed > PLAYER.maxSpeed) {
        wisp.vx = (wisp.vx / speed) * PLAYER.maxSpeed;
        wisp.vy = (wisp.vy / speed) * PLAYER.maxSpeed;
      }
    } else if (input.pointerDown && input.pointer.seen) {
      const dx = input.pointer.x - wisp.x;
      const dy = input.pointer.y - wisp.y;
      const d = Math.hypot(dx, dy);
      if (d > 6) {
        const pull = Math.min(1, d / 120);
        wisp.vx += (dx / d) * PLAYER.accel * pull * dt;
        wisp.vy += (dy / d) * PLAYER.accel * pull * dt;
        const speed = Math.hypot(wisp.vx, wisp.vy);
        if (speed > PLAYER.maxSpeed) {
          wisp.vx = (wisp.vx / speed) * PLAYER.maxSpeed;
          wisp.vy = (wisp.vy / speed) * PLAYER.maxSpeed;
        }
      } else {
        wisp.vx *= PLAYER.friction;
        wisp.vy *= PLAYER.friction;
      }
    } else {
      wisp.vx *= PLAYER.friction;
      wisp.vy *= PLAYER.friction;
      if (Math.abs(wisp.vx) < 4) wisp.vx = 0;
      if (Math.abs(wisp.vy) < 4) wisp.vy = 0;
    }

    wisp.x += wisp.vx * dt;
    wisp.y += wisp.vy * dt;
    const r = wisp.radius;
    if (wisp.x < r) { wisp.x = r; wisp.vx = Math.max(0, wisp.vx); }
    if (wisp.x > FIELD.width - r) { wisp.x = FIELD.width - r; wisp.vx = Math.min(0, wisp.vx); }
    if (wisp.y < r) { wisp.y = r; wisp.vy = Math.max(0, wisp.vy); }
    if (wisp.y > FIELD.height - r) { wisp.y = FIELD.height - r; wisp.vy = Math.min(0, wisp.vy); }
    if (Math.hypot(wisp.vx, wisp.vy) > 20) wisp.facing = Math.atan2(wisp.vy, wisp.vx);

    // --- Spawning (paused while the victory overlay shows). ---
    if (!state.victory) {
      state.emberTimer -= dt;
      if (state.emberTimer <= 0) {
        spawnEmber();
        const interval = Math.max(EMBER.minInterval, EMBER.interval * Math.pow(EMBER.intervalScale, state.level - 1));
        state.emberTimer = interval * random.range(0.7, 1.3);
      }
      state.gloomTimer -= dt;
      if (state.gloomTimer <= 0) {
        let kind = 'gloom';
        if (state.level >= GLOOM.dartLevel && random.chance(0.22)) kind = 'dart';
        else if (state.level >= GLOOM.chaserLevel && random.chance(0.3)) kind = 'chase';
        spawnGloom(kind);
        const interval = Math.max(GLOOM.minInterval, GLOOM.interval * Math.pow(GLOOM.intervalScale, state.level - 1));
        state.gloomTimer = interval * random.range(0.75, 1.25);
      }
      state.powerupTimer -= dt;
      if (state.powerupTimer <= 0) {
        spawnPowerup();
        state.powerupTimer = POWERUP.interval * random.range(0.85, 1.2);
      }
    }

    // --- Falling things. ---
    for (const e of embers) {
      if (!e.alive) continue;
      e.phase += dt * 2.2;
      e.y += e.vy * slowFactor * dt;
      e.x += Math.sin(e.phase) * e.sway * dt;
      if (e.golden && random.chance(dt * 6)) particles.sparkle(e.x, e.y, '#ffd76a');
      if (wisp.magnet > 0) {
        const d = Math.hypot(wisp.x - e.x, wisp.y - e.y);
        if (d < POWERUP.magnetRadius && d > 1) {
          e.x += ((wisp.x - e.x) / d) * 340 * dt;
          e.y += ((wisp.y - e.y) / d) * 340 * dt;
        }
      }
      if (e.y > FIELD.height + 30) e.alive = false;
    }
    for (const g of gloom) {
      if (!g.alive) continue;
      g.phase += dt * 1.8;
      if (g.chase) {
        const dx = wisp.x - g.x;
        const dy = wisp.y - g.y;
        const d = Math.hypot(dx, dy) || 1;
        g.vx += (dx / d) * GLOOM.chaserTurn * dt;
        g.vy += (dy / d) * GLOOM.chaserTurn * dt * 0.4;
        const sp = Math.hypot(g.vx, g.vy);
        const max = g.vy * 0.6 + 60;
        if (sp > max) {
          g.vx = (g.vx / sp) * max;
          g.vy = (g.vy / sp) * max;
        }
      }
      g.y += g.vy * slowFactor * dt;
      g.x += (g.vx + Math.sin(g.phase) * g.sway) * dt;
      if (g.y > FIELD.height + 40 || g.x < -60 || g.x > FIELD.width + 60) g.alive = false;
    }
    for (const p of powerups) {
      if (!p.alive) continue;
      p.phase += dt * 2;
      p.y += p.vy * slowFactor * dt;
      p.x += Math.sin(p.phase) * 26 * dt;
      if (p.y > FIELD.height + 30) p.alive = false;
    }

    // --- Collisions. Frozen once the dawn has broken: a won run's score stays put. ---
    if (!state.victory) {
      for (const e of embers) {
        if (!e.alive) continue;
        const rr = e.radius + wisp.radius;
        if (dist2(e.x, e.y, wisp.x, wisp.y) < rr * rr) collectEmber(e);
      }
      for (const p of powerups) {
        if (!p.alive) continue;
        const rr = p.radius + wisp.radius;
        if (dist2(p.x, p.y, wisp.x, wisp.y) < rr * rr) applyPowerup(p);
      }
      if (!state.over) {
        for (const g of gloom) {
          if (!g.alive) continue;
          const rr = g.radius + wisp.radius - 4;
          if (dist2(g.x, g.y, wisp.x, wisp.y) < rr * rr) {
            g.alive = false;
            const result = hurt();
            if (result === 'over') return 'over';
            break;
          }
        }
      }
    }

    particles.update(dt);
    return state.victory && state.won ? 'win' : null;
  }

  /**
   * The title screen's ambient drift: embers fall gently behind the panel,
   * nothing else spawns, nothing can be collected or hurt. Pure scenery.
   */
  function ambient(dt) {
    state.time += dt;
    state.emberTimer -= dt;
    if (state.emberTimer <= 0) {
      spawnEmber();
      state.emberTimer = 0.55 * random.range(0.7, 1.3);
    }
    for (const e of embers) {
      if (!e.alive) continue;
      e.phase += dt * 2.2;
      e.y += e.vy * dt;
      e.x += Math.sin(e.phase) * e.sway * dt;
      if (e.y > FIELD.height + 30) e.alive = false;
    }
    particles.update(dt);
  }

  function reset(best) {
    state.score = 0;
    state.best = best;
    state.lives = LIVES;
    state.level = 1;
    state.embersInLevel = 0;
    state.embersTotal = 0;
    state.goldenTotal = 0;
    state.combo = 0;
    state.comboTimer = 0;
    state.maxCombo = 0;
    state.hits = 0;
    state.powerupsTaken = 0;
    state.starfalls = 0;
    state.blessingGiven = false;
    state.time = 0;
    state.shake = 0;
    state.flash = 0;
    state.levelBanner = 0;
    state.levelBannerText = '';
    state.emberTimer = 0.4;
    state.gloomTimer = 1.4;
    state.powerupTimer = POWERUP.interval;
    state.won = false;
    state.over = false;
    state.victory = false;
    wisp.x = FIELD.width / 2;
    wisp.y = FIELD.height - 130;
    wisp.vx = 0;
    wisp.vy = 0;
    wisp.invulnerable = 0;
    wisp.dashTime = 0;
    wisp.dashCooldown = 0;
    wisp.shield = false;
    wisp.magnet = 0;
    wisp.slow = 0;
    for (const e of embers) { e.alive = false; e.golden = false; }
    for (const g of gloom) g.alive = false;
    for (const p of powerups) p.alive = false;
  }

  /** Fill the field with a quiet title scene (the start screenshot, seeded). */
  function stageTitle() {
    reset(1240);
    state.best = 1240;
    for (let i = 0; i < 10; i++) {
      const e = spawnEmber();
      if (e) {
        e.y = random.range(40, 620);
        e.x = random.range(60, FIELD.width - 60);
      }
    }
    const gold = spawnEmber(880, 120, true);
    if (gold) gold.vy = EMBER.goldenFallSpeed;
    particles.burst(640, 590, '#ffd76a', 12, 130, 0.8, 3);
  }

  /** Fill the field with a busy mid-game scene (the play screenshot, seeded). */
  function stagePlay(seed) {
    reset(1240);
    const rng = random;
    void seed;
    state.score = 1240;
    state.combo = 11;
    state.comboTimer = 2.6;
    state.maxCombo = 12;
    state.level = 3;
    state.embersInLevel = 8;
    state.embersTotal = 38;
    state.lives = 2;
    state.time = 47.5;
    wisp.x = 640;
    wisp.y = 430;
    wisp.shield = true;
    wisp.magnet = 4;
    for (let i = 0; i < 14; i++) {
      const e = spawnEmber();
      if (e) {
        e.y = rng.range(60, 560);
        e.x = rng.range(60, FIELD.width - 60);
        // Keep the staged embers off the wisp, so the settle steps below
        // collect nothing and the shot keeps its staged numbers.
        for (let tries = 0; tries < 5 && Math.hypot(e.x - wisp.x, e.y - wisp.y) < 110; tries++) {
          e.y = rng.range(60, 560);
          e.x = rng.range(60, FIELD.width - 60);
        }
      }
    }
    const gold = spawnEmber(700, 300, true);
    if (gold) gold.vy = EMBER.goldenFallSpeed;
    for (let i = 0; i < 8; i++) {
      const g = spawnGloom(i === 1 ? 'chase' : i === 2 ? 'dart' : 'gloom');
      if (g) {
        g.y = rng.range(40, 420);
        g.x = rng.range(60, FIELD.width - 60);
        for (let tries = 0; tries < 5 && Math.hypot(g.x - wisp.x, g.y - wisp.y) < 90; tries++) {
          g.y = rng.range(40, 420);
          g.x = rng.range(60, FIELD.width - 60);
        }
      }
    }
    const p1 = spawnPowerup(980, 180, 'magnet');
    if (p1) p1.vy = POWERUP.fallSpeed;
    const p2 = spawnPowerup(300, 240, 'starfall');
    if (p2) p2.vy = POWERUP.fallSpeed;
    particles.burst(640, 430, '#ffd76a', 14, 140, 0.7, 3);
    particles.floatText(640, 396, '+17', '#ffe9a3', 22);
  }

  /** Fill the field with a finished run (the game-over screenshot, seeded). */
  function stageEnd() {
    reset(2870);
    state.score = 2140;
    state.best = 2870;
    state.level = 5;
    state.embersTotal = 74;
    state.goldenTotal = 3;
    state.maxCombo = 11;
    state.hits = 3;
    state.lives = 0;
    state.time = 132.4;
    state.over = true;
    wisp.x = 640;
    wisp.y = 470;
    for (let i = 0; i < 4; i++) {
      const e = spawnEmber();
      if (e) {
        e.y = random.range(80, 480);
        e.x = random.range(80, FIELD.width - 80);
      }
    }
    for (let i = 0; i < 3; i++) {
      const g = spawnGloom('gloom');
      if (g) {
        g.y = random.range(60, 380);
        g.x = random.range(80, FIELD.width - 80);
      }
    }
    particles.burst(640, 470, '#ff5d73', 30, 280, 1.0, 4);
  }

  /** Fill the field with the dawn victory (the win screenshot, seeded). */
  function stageWin() {
    reset(3420);
    state.score = 3420;
    state.best = 3420;
    state.level = 8;
    state.embersTotal = 105;
    state.goldenTotal = 6;
    state.maxCombo = 14;
    state.time = 198.2;
    state.won = true;
    state.victory = true;
    state.levelBanner = 0;
    state.levelBannerText = '';
    wisp.x = 640;
    wisp.y = 360;
    for (let i = 0; i < 10; i++) {
      const e = spawnEmber();
      if (e) {
        e.y = random.range(60, 560);
        e.x = random.range(60, FIELD.width - 60);
      }
    }
    particles.burst(640, 360, '#fff6c9', 40, 260, 1.2, 4);
  }

  return {
    wisp,
    embers,
    gloom,
    powerups,
    state,
    update,
    ambient,
    reset,
    stageTitle,
    stagePlay,
    stageEnd,
    stageWin,
    comboMultiplier,
    dawnProgress,
    /** The events since the last call, oldest first; the call empties the queue. */
    drainEvents() {
      return events.splice(0, events.length);
    },
    /** Test/debug helpers: put one falling thing at an exact spot. */
    spawnEmberAt(x, y, golden = false) {
      return spawnEmber(x, y, golden);
    },
    spawnGloomAt(x, y) {
      const g = spawnGloom('gloom');
      if (g) {
        g.x = x;
        g.y = y;
        g.vy = 60;
      }
      return g;
    },
    spawnPowerupAt(x, y, kind) {
      return spawnPowerup(x, y, kind);
    },
    spawnPowerup() {
      return spawnPowerup();
    },
  };
}
