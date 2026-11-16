// All drawing: the night sky, the wisp, the falling things, the HUD and the
// title / pause / game-over / victory screens. Nothing here changes the world;
// it only reads it. The sky itself (night, moon, dawn) lives in sky.js.

import { FIELD, PALETTE, FONT, EMBER, LEVEL } from './config.js';
import { makeSky } from './sky.js';

export function makeRenderer(canvas) {
  const ctx = canvas.getContext('2d');
  const sky = makeSky();

  function glowCircle(x, y, radius, core, halo, haloRadius) {
    const g = ctx.createRadialGradient(x, y, 0, x, y, haloRadius);
    g.addColorStop(0, halo);
    g.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.arc(x, y, haloRadius, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = core;
    ctx.beginPath();
    ctx.arc(x, y, radius, 0, Math.PI * 2);
    ctx.fill();
  }

  /** How much dawn shows: full on the victory screen, a little as levels rise. */
  function dawnAmount(world, mode) {
    if (mode === 'victory' || world.state.victory) return 1;
    return world.dawnProgress() * 0.3;
  }

  function drawWisp(wisp, time) {
    const blink = wisp.invulnerable > 0 && Math.floor(time * 14) % 2 === 0;
    if (blink) ctx.globalAlpha = 0.35;
    const pulse = 1 + 0.08 * Math.sin(time * 5);
    const r = wisp.radius * pulse;
    // Flame tail, opposite the direction of travel.
    const speed = Math.hypot(wisp.vx, wisp.vy);
    if (speed > 30) {
      const tx = -wisp.vx / speed;
      const ty = -wisp.vy / speed;
      ctx.strokeStyle = PALETTE.wispTrail;
      ctx.globalAlpha = 0.55 * (blink ? 0.35 : 1);
      ctx.lineWidth = 5;
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.moveTo(wisp.x, wisp.y);
      ctx.quadraticCurveTo(
        wisp.x + tx * 26 - wisp.vy * 0.02,
        wisp.y + ty * 26 + wisp.vx * 0.02,
        wisp.x + tx * 44,
        wisp.y + ty * 44,
      );
      ctx.stroke();
      ctx.globalAlpha = 1;
    }
    glowCircle(wisp.x, wisp.y, r * 0.62, PALETTE.wispCore, 'rgba(242, 201, 76, 0.55)', r * 2.6);
    // Two eyes, looking where the wisp moves.
    const ex = Math.cos(wisp.facing) * 3;
    const ey = Math.sin(wisp.facing) * 3;
    ctx.fillStyle = '#241a3d';
    ctx.beginPath();
    ctx.arc(wisp.x - 5 + ex, wisp.y - 2 + ey, 2.2, 0, Math.PI * 2);
    ctx.arc(wisp.x + 5 + ex, wisp.y - 2 + ey, 2.2, 0, Math.PI * 2);
    ctx.fill();
    if (wisp.shield) {
      ctx.strokeStyle = PALETTE.shield;
      ctx.globalAlpha = 0.75 + 0.2 * Math.sin(time * 4);
      ctx.lineWidth = 2.5;
      ctx.beginPath();
      ctx.arc(wisp.x, wisp.y, r + 10, 0, Math.PI * 2);
      ctx.stroke();
      ctx.globalAlpha = 1;
    }
    // No range ring for the magnet: round 2 drew one (radius 143) whenever
    // the magnet was on, and in the play screenshot it read as a big empty
    // circle across the middle of the field. The HUD's MAGNET timer already
    // says the effect is on, and the embers visibly streaming toward the
    // wisp show the pull — the ring added nothing but clutter.
    if (blink) ctx.globalAlpha = 1;
  }

  function drawEmber(e, time) {
    const bob = Math.sin(e.phase) * 2;
    if (e.golden) {
      // A golden ember: bigger, brighter, with four sparkle rays.
      const flicker = 0.9 + 0.1 * Math.sin(time * 8 + e.phase);
      ctx.globalAlpha = flicker;
      glowCircle(e.x, e.y + bob, e.radius * 0.6, PALETTE.goldenCore, 'rgba(255, 215, 106, 0.75)', e.radius * 2.6);
      const rot = time * 0.8 + e.phase;
      ctx.strokeStyle = 'rgba(255, 251, 224, 0.9)';
      ctx.lineWidth = 1.8;
      for (let i = 0; i < 4; i++) {
        const a = rot + (i * Math.PI) / 2;
        ctx.beginPath();
        ctx.moveTo(e.x + Math.cos(a) * (e.radius + 3), e.y + bob + Math.sin(a) * (e.radius + 3));
        ctx.lineTo(e.x + Math.cos(a) * (e.radius + 11), e.y + bob + Math.sin(a) * (e.radius + 11));
        ctx.stroke();
      }
      ctx.globalAlpha = 1;
      return;
    }
    const flicker = 0.85 + 0.15 * Math.sin(time * 6 + e.phase);
    ctx.globalAlpha = flicker;
    glowCircle(e.x, e.y + bob, e.radius * 0.55, PALETTE.emberCore, 'rgba(242, 201, 76, 0.5)', e.radius * 2.2);
    ctx.globalAlpha = 1;
  }

  function drawGloom(g, time) {
    const wobble = Math.sin(g.phase) * 2;
    const rim = g.dart ? PALETTE.dartRim : g.chase ? PALETTE.chaserRim : PALETTE.gloomRim;
    // A dart leaves a short streak behind it.
    if (g.dart) {
      ctx.strokeStyle = 'rgba(255, 122, 60, 0.4)';
      ctx.lineWidth = 3;
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.moveTo(g.x, g.y + wobble - 26);
      ctx.lineTo(g.x, g.y + wobble - 6);
      ctx.stroke();
    }
    ctx.fillStyle = PALETTE.gloom;
    ctx.beginPath();
    ctx.arc(g.x, g.y + wobble, g.radius, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = rim;
    ctx.lineWidth = 2.5;
    ctx.stroke();
    // Two angry eyes.
    const look = Math.sin(time * 2 + g.phase) * 2;
    ctx.fillStyle = PALETTE.gloomEye;
    ctx.beginPath();
    ctx.arc(g.x - 6 + look, g.y - 3 + wobble, 3, 0, Math.PI * 2);
    ctx.arc(g.x + 6 + look, g.y - 3 + wobble, 3, 0, Math.PI * 2);
    ctx.fill();
    // A jagged little mouth.
    ctx.strokeStyle = PALETTE.gloomEye;
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(g.x - 7, g.y + 7 + wobble);
    ctx.lineTo(g.x - 2, g.y + 10 + wobble);
    ctx.lineTo(g.x + 3, g.y + 7 + wobble);
    ctx.lineTo(g.x + 8, g.y + 10 + wobble);
    ctx.stroke();
  }

  function drawPowerup(p, time) {
    const color =
      p.kind === 'shield' ? PALETTE.shield
      : p.kind === 'magnet' ? PALETTE.magnet
      : p.kind === 'slow' ? PALETTE.slow
      : PALETTE.starfall;
    const bob = Math.sin(p.phase) * 3;
    const big = p.kind === 'starfall';
    glowCircle(p.x, p.y + bob, p.radius * (big ? 0.75 : 0.6), '#ffffff', color, p.radius * (big ? 3 : 2.4));
    ctx.fillStyle = '#0a0e24';
    ctx.font = `bold ${p.kind === 'slow' ? 13 : big ? 20 : 15}px ${FONT}`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    const letter =
      p.kind === 'shield' ? 'S'
      : p.kind === 'magnet' ? 'M'
      : p.kind === 'slow' ? 'T'
      : '★';
    ctx.fillText(letter, p.x, p.y + bob + 0.5);
  }

  function heart(x, y, size, filled) {
    ctx.save();
    ctx.translate(x, y);
    ctx.scale(size / 16, size / 16);
    ctx.beginPath();
    ctx.moveTo(0, 5);
    ctx.bezierCurveTo(-11, -4, -6, -12, 0, -6);
    ctx.bezierCurveTo(6, -12, 11, -4, 0, 5);
    ctx.closePath();
    ctx.fillStyle = filled ? '#ff5d73' : 'rgba(255,93,115,0.08)';
    ctx.fill();
    ctx.strokeStyle = filled ? '#ff5d73' : 'rgba(154,163,184,0.65)';
    ctx.lineWidth = 1.2;
    ctx.stroke();
    ctx.restore();
  }

  function drawHud(world) {
    const s = world.state;
    ctx.textBaseline = 'alphabetic';
    // Score, top left.
    ctx.textAlign = 'left';
    ctx.fillStyle = PALETTE.muted;
    ctx.font = `600 13px ${FONT}`;
    ctx.fillText('SCORE', 24, 30);
    ctx.fillStyle = PALETTE.text;
    ctx.font = `700 34px ${FONT}`;
    ctx.fillText(String(s.score), 24, 64);
    ctx.fillStyle = PALETTE.muted;
    ctx.font = `600 13px ${FONT}`;
    ctx.fillText(`BEST ${Math.max(s.best, s.score)}`, 24, 88);
    // Level progress, top centre — with the dawn the run is heading for.
    const barW = 260;
    const barX = FIELD.width / 2 - barW / 2;
    const dawnPct = Math.round(world.dawnProgress() * 100);
    ctx.textAlign = 'center';
    ctx.fillStyle = PALETTE.muted;
    ctx.font = `600 13px ${FONT}`;
    ctx.fillText(`LEVEL ${s.level}  ·  DAWN ${dawnPct}%`, FIELD.width / 2, 30);
    ctx.fillStyle = 'rgba(255,255,255,0.14)';
    ctx.fillRect(barX, 38, barW, 8);
    ctx.fillStyle = PALETTE.ember;
    ctx.fillRect(barX, 38, barW * (s.embersInLevel / LEVEL.embersPerLevel), 8);
    ctx.fillStyle = PALETTE.muted;
    ctx.font = `500 12px ${FONT}`;
    ctx.fillText(`${s.embersInLevel} / ${LEVEL.embersPerLevel} embers to level ${s.level + 1}`, FIELD.width / 2, 62);
    // Lives, top right.
    for (let i = 0; i < 3; i++) {
      heart(FIELD.width - 36 - i * 30, 40, 17, i < s.lives);
    }
    ctx.textAlign = 'right';
    ctx.fillStyle = PALETTE.muted;
    ctx.font = `600 13px ${FONT}`;
    ctx.fillText('LIVES', FIELD.width - 24, 74);
    // Combo meter, under the score.
    if (s.combo >= 2) {
      const mult = world.comboMultiplier();
      ctx.textAlign = 'left';
      ctx.fillStyle = '#ffe9a3';
      ctx.font = `700 20px ${FONT}`;
      ctx.fillText(`COMBO x${s.combo}  (${mult.toFixed(1)}x)`, 24, 118);
      ctx.fillStyle = 'rgba(255,255,255,0.14)';
      ctx.fillRect(24, 126, 150, 6);
      ctx.fillStyle = '#ffe9a3';
      ctx.fillRect(24, 126, 150 * (s.comboTimer / EMBER.comboWindow), 6);
    }
    // Golden embers caught, under the combo.
    if (s.goldenTotal > 0) {
      ctx.textAlign = 'left';
      ctx.fillStyle = PALETTE.golden;
      ctx.font = `700 15px ${FONT}`;
      ctx.fillText(`★ GOLDEN x${s.goldenTotal}`, 24, s.combo >= 2 ? 156 : 118);
    }
    // Active effects + dash cooldown, bottom left.
    let line = 692;
    ctx.textAlign = 'left';
    ctx.font = `600 14px ${FONT}`;
    const wisp = world.wisp;
    if (wisp.shield) {
      ctx.fillStyle = PALETTE.shield;
      ctx.fillText('SHIELD', 24, line);
      line -= 22;
    }
    if (wisp.magnet > 0) {
      ctx.fillStyle = PALETTE.magnet;
      ctx.fillText(`MAGNET ${wisp.magnet.toFixed(0)}s`, 24, line);
      line -= 22;
    }
    if (wisp.slow > 0) {
      ctx.fillStyle = PALETTE.slow;
      ctx.fillText(`SLOW ${wisp.slow.toFixed(0)}s`, 24, line);
      line -= 22;
    }
    // Dash cooldown, bottom right.
    ctx.textAlign = 'right';
    if (wisp.dashCooldown > 0) {
      ctx.fillStyle = PALETTE.muted;
      ctx.font = `600 14px ${FONT}`;
      ctx.fillText(`DASH ${wisp.dashCooldown.toFixed(1)}s`, FIELD.width - 24, 692);
    } else {
      ctx.fillStyle = PALETTE.wispGlow;
      ctx.font = `700 14px ${FONT}`;
      ctx.fillText('DASH READY  [SPACE]', FIELD.width - 24, 692);
    }
    // Level banner, centre.
    if (s.levelBanner > 0) {
      ctx.globalAlpha = Math.min(1, s.levelBanner);
      ctx.textAlign = 'center';
      ctx.fillStyle = '#fff6c9';
      ctx.font = `800 40px ${FONT}`;
      ctx.fillText(s.levelBannerText, FIELD.width / 2, 300);
      ctx.globalAlpha = 1;
    }
  }

  function panel(x, y, w, h) {
    ctx.fillStyle = PALETTE.panel;
    ctx.beginPath();
    ctx.roundRect(x, y, w, h, 18);
    ctx.fill();
    ctx.strokeStyle = 'rgba(242, 201, 76, 0.35)';
    ctx.lineWidth = 1.5;
    ctx.stroke();
  }

  function drawTitle(world, time) {
    const s = world.state;
    ctx.fillStyle = 'rgba(7, 10, 24, 0.45)';
    ctx.fillRect(0, 0, FIELD.width, FIELD.height);
    panel(FIELD.width / 2 - 330, 118, 660, 440);
    ctx.textAlign = 'center';
    ctx.fillStyle = '#fff6c9';
    ctx.font = `800 64px ${FONT}`;
    ctx.fillText('LUMEN DRIFT', FIELD.width / 2, 208);
    ctx.fillStyle = PALETTE.ember;
    ctx.font = `600 20px ${FONT}`;
    ctx.fillText('Keeper of the Last Light', FIELD.width / 2, 244);
    ctx.fillStyle = PALETTE.text;
    ctx.font = `400 17px ${FONT}`;
    ctx.fillText('The night is swallowing every light. You are the last wisp.', FIELD.width / 2, 292);
    ctx.fillText('Gather the falling embers. Dodge the gloom. Reach level 8', FIELD.width / 2, 318);
    ctx.fillText('and break the dawn.', FIELD.width / 2, 344);
    ctx.fillStyle = PALETTE.golden;
    ctx.font = `600 15px ${FONT}`;
    ctx.fillText('Golden embers are worth 5x  ·  Starfall clears the whole sky', FIELD.width / 2, 376);
    ctx.fillStyle = PALETTE.muted;
    ctx.font = `500 15px ${FONT}`;
    ctx.fillText('Move: WASD / arrows or hold the mouse  ·  Dash: SPACE / right-click', FIELD.width / 2, 408);
    ctx.fillText('Shield, Magnet, Slow-Time and Starfall drift down — catch them  ·  P pause  ·  M mute', FIELD.width / 2, 432);
    const pulse = 0.7 + 0.3 * Math.sin(time * 3);
    ctx.globalAlpha = pulse;
    ctx.fillStyle = '#fff6c9';
    ctx.font = `700 22px ${FONT}`;
    ctx.fillText('Press ENTER or click to begin', FIELD.width / 2, 486);
    ctx.globalAlpha = 1;
    if (s.best > 0) {
      ctx.fillStyle = PALETTE.muted;
      ctx.font = `600 15px ${FONT}`;
      ctx.fillText(`Best score: ${s.best}`, FIELD.width / 2, 524);
    }
    void world;
  }

  function drawPaused() {
    ctx.fillStyle = 'rgba(7, 10, 24, 0.6)';
    ctx.fillRect(0, 0, FIELD.width, FIELD.height);
    panel(FIELD.width / 2 - 200, 250, 400, 170);
    ctx.textAlign = 'center';
    ctx.fillStyle = PALETTE.text;
    ctx.font = `800 40px ${FONT}`;
    ctx.fillText('PAUSED', FIELD.width / 2, 318);
    ctx.fillStyle = PALETTE.muted;
    ctx.font = `500 16px ${FONT}`;
    ctx.fillText('Press P or click to keep drifting', FIELD.width / 2, 356);
  }

  function drawGameOver(world) {
    const s = world.state;
    ctx.fillStyle = 'rgba(7, 10, 24, 0.62)';
    ctx.fillRect(0, 0, FIELD.width, FIELD.height);
    panel(FIELD.width / 2 - 300, 150, 600, 400);
    ctx.textAlign = 'center';
    ctx.fillStyle = PALETTE.danger;
    ctx.font = `800 52px ${FONT}`;
    ctx.fillText('THE LIGHT FADES', FIELD.width / 2, 232);
    ctx.fillStyle = PALETTE.text;
    ctx.font = `400 18px ${FONT}`;
    ctx.fillText('The gloom takes the last wisp… this time.', FIELD.width / 2, 272);
    ctx.fillStyle = '#fff6c9';
    ctx.font = `700 44px ${FONT}`;
    ctx.fillText(String(s.score), FIELD.width / 2, 340);
    ctx.fillStyle = PALETTE.muted;
    ctx.font = `600 15px ${FONT}`;
    ctx.fillText('SCORE', FIELD.width / 2, 366);
    ctx.fillStyle = PALETTE.text;
    ctx.font = `500 17px ${FONT}`;
    ctx.fillText(`Best ${Math.max(s.best, s.score)}   ·   Level ${s.level}   ·   ${s.embersTotal} embers   ·   Best combo x${s.maxCombo}`, FIELD.width / 2, 410);
    ctx.fillStyle = '#fff6c9';
    ctx.font = `700 21px ${FONT}`;
    ctx.fillText('Press R or click to drift again', FIELD.width / 2, 478);
  }

  function drawVictory(world) {
    const s = world.state;
    panel(FIELD.width / 2 - 320, 140, 640, 420);
    ctx.textAlign = 'center';
    ctx.fillStyle = '#fff6c9';
    ctx.font = `800 56px ${FONT}`;
    ctx.fillText('DAWN BREAKS', FIELD.width / 2, 224);
    ctx.fillStyle = PALETTE.text;
    ctx.font = `400 18px ${FONT}`;
    ctx.fillText('Level 8 — the first light returns to the sky. You win!', FIELD.width / 2, 264);
    ctx.fillStyle = '#fff6c9';
    ctx.font = `700 44px ${FONT}`;
    ctx.fillText(String(s.score), FIELD.width / 2, 332);
    ctx.fillStyle = PALETTE.muted;
    ctx.font = `600 15px ${FONT}`;
    ctx.fillText('SCORE', FIELD.width / 2, 358);
    ctx.fillStyle = PALETTE.text;
    ctx.font = `500 17px ${FONT}`;
    ctx.fillText(`${s.embersTotal} embers   ·   ${s.goldenTotal} golden   ·   Best combo x${s.maxCombo}   ·   ${Math.floor(s.time)}s of drift`, FIELD.width / 2, 402);
    ctx.fillStyle = '#fff6c9';
    ctx.font = `700 20px ${FONT}`;
    ctx.fillText('Press C to keep drifting  ·  R to play again', FIELD.width / 2, 472);
  }

  function draw(world, mode, time) {
    ctx.save();
    const shake = world.state.shake;
    if (shake > 0) {
      const mag = shake * 14;
      ctx.translate((Math.random() - 0.5) * mag, (Math.random() - 0.5) * mag);
    }
    sky.draw(ctx, world.state.time, dawnAmount(world, mode));
    for (const e of world.embers) if (e.alive) drawEmber(e, time);
    for (const p of world.powerups) if (p.alive) drawPowerup(p, time);
    for (const g of world.gloom) if (g.alive) drawGloom(g, time);
    world.particles.forEach((p) => {
      ctx.globalAlpha = Math.max(0, p.life / p.maxLife);
      ctx.fillStyle = p.color;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.size * (p.life / p.maxLife), 0, Math.PI * 2);
      ctx.fill();
    });
    ctx.globalAlpha = 1;
    world.particles.forEachRing((r) => {
      const done = 1 - r.life / r.maxLife;
      ctx.globalAlpha = Math.max(0, r.life / r.maxLife) * 0.9;
      ctx.strokeStyle = r.color;
      ctx.lineWidth = 4 * (1 - done) + 1;
      ctx.beginPath();
      ctx.arc(r.x, r.y, r.maxRadius * done, 0, Math.PI * 2);
      ctx.stroke();
    });
    ctx.globalAlpha = 1;
    drawWisp(world.wisp, time);
    world.particles.forEachText((t) => {
      ctx.globalAlpha = Math.max(0, t.life / t.maxLife);
      ctx.fillStyle = t.color;
      ctx.font = `700 ${t.size}px ${FONT}`;
      ctx.textAlign = 'center';
      ctx.fillText(t.str, t.x, t.y);
    });
    ctx.globalAlpha = 1;
    if (world.state.flash > 0) {
      ctx.fillStyle = `rgba(255, 93, 115, ${world.state.flash * 0.5})`;
      ctx.fillRect(0, 0, FIELD.width, FIELD.height);
    }
    ctx.restore();

    if (mode === 'playing' || mode === 'paused') drawHud(world);
    if (mode === 'title') drawTitle(world, time);
    if (mode === 'paused') drawPaused();
    if (mode === 'gameover') drawGameOver(world);
    if (mode === 'victory') drawVictory(world);
  }

  return { draw };
}
