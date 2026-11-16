// The night sky — and the dawn that replaces it. Owns the stars, the moon,
// the nebula, the hills with their lantern lights and the shooting stars, all
// painted once to offscreen canvases. draw() blends the night sky into the
// dawn sky as the wisp climbs toward level 8, so the world visibly brightens
// on the way to the win.

import { FIELD, PALETTE } from './config.js';
import { makeRandom, mulberry32 } from './random.js';

const STAR_LAYERS = [
  { count: 90, size: 1.2, speed: 6, alpha: 0.5 },
  { count: 50, size: 1.8, speed: 12, alpha: 0.75 },
  { count: 24, size: 2.6, speed: 20, alpha: 1 },
];

// Warm lantern lights dotted along the hill ridge.
const LANTERNS = [
  [150, 638], [320, 610], [520, 630], [700, 640], [900, 658], [1080, 646], [1220, 628],
];

function paintHills(s, fill) {
  s.fillStyle = fill;
  s.beginPath();
  s.moveTo(0, FIELD.height);
  s.lineTo(0, 648);
  s.quadraticCurveTo(320, 596, 640, 640);
  s.quadraticCurveTo(960, 684, 1280, 622);
  s.lineTo(1280, FIELD.height);
  s.closePath();
  s.fill();
}

export function makeSky() {
  const stars = [];
  {
    const rng = makeRandom(20261115);
    for (const layer of STAR_LAYERS) {
      for (let i = 0; i < layer.count; i++) {
        stars.push({
          x: rng.range(0, FIELD.width),
          y: rng.range(0, FIELD.height),
          size: layer.size * rng.range(0.7, 1.3),
          speed: layer.speed,
          alpha: layer.alpha * rng.range(0.6, 1),
          twinkle: rng.range(0, Math.PI * 2),
        });
      }
    }
  }

  // The night sky, painted once.
  const night = document.createElement('canvas');
  night.width = FIELD.width;
  night.height = FIELD.height;
  {
    const s = night.getContext('2d');
    const grad = s.createLinearGradient(0, 0, 0, FIELD.height);
    grad.addColorStop(0, PALETTE.backdropTop);
    grad.addColorStop(1, PALETTE.backdropBottom);
    s.fillStyle = grad;
    s.fillRect(0, 0, FIELD.width, FIELD.height);
    const blobs = [
      [220, 150, 320, PALETTE.nebulaA, 0.5],
      [1050, 220, 360, PALETTE.nebulaB, 0.45],
      [640, 620, 420, PALETTE.nebulaA, 0.35],
    ];
    for (const [x, y, r, color, alpha] of blobs) {
      const g = s.createRadialGradient(x, y, 0, x, y, r);
      g.addColorStop(0, color);
      g.addColorStop(1, 'rgba(0,0,0,0)');
      s.globalAlpha = alpha;
      s.fillStyle = g;
      s.fillRect(x - r, y - r, r * 2, r * 2);
    }
    s.globalAlpha = 1;
    paintHills(s, '#0d1126');
    // Lantern lights on the ridge.
    for (const [x, y] of LANTERNS) {
      const g = s.createRadialGradient(x, y, 0, x, y, 14);
      g.addColorStop(0, 'rgba(255, 214, 120, 0.85)');
      g.addColorStop(1, 'rgba(255, 214, 120, 0)');
      s.fillStyle = g;
      s.beginPath();
      s.arc(x, y, 14, 0, Math.PI * 2);
      s.fill();
      s.fillStyle = '#ffe9a3';
      s.beginPath();
      s.arc(x, y, 2.4, 0, Math.PI * 2);
      s.fill();
    }
  }

  // The dawn sky, painted once: warm bands, a low sun, pale hills.
  const dawn = document.createElement('canvas');
  dawn.width = FIELD.width;
  dawn.height = FIELD.height;
  {
    const s = dawn.getContext('2d');
    const grad = s.createLinearGradient(0, 0, 0, FIELD.height);
    grad.addColorStop(0, PALETTE.dawnTop);
    grad.addColorStop(0.55, PALETTE.dawnMid);
    grad.addColorStop(1, PALETTE.dawnBottom);
    s.fillStyle = grad;
    s.fillRect(0, 0, FIELD.width, FIELD.height);
    // The rising sun, just above the hills.
    const sun = s.createRadialGradient(640, 560, 0, 640, 560, 260);
    sun.addColorStop(0, 'rgba(255, 233, 163, 0.95)');
    sun.addColorStop(0.35, 'rgba(255, 214, 120, 0.55)');
    sun.addColorStop(1, 'rgba(255, 214, 120, 0)');
    s.fillStyle = sun;
    s.fillRect(380, 300, 520, 520);
    s.fillStyle = PALETTE.dawnSun;
    s.beginPath();
    s.arc(640, 560, 64, 0, Math.PI * 2);
    s.fill();
    paintHills(s, '#5a3d4d');
    for (const [x, y] of LANTERNS) {
      s.fillStyle = 'rgba(255, 233, 163, 0.5)';
      s.beginPath();
      s.arc(x, y, 2, 0, Math.PI * 2);
      s.fill();
    }
  }

  function drawShootingStar(ctx, time) {
    // One streak every 7 seconds, placed by a hash of the cycle number so the
    // shot modes see the same sky every run.
    const cycle = Math.floor(time / 7);
    const p = (time % 7) / 1.4;
    if (p > 1) return;
    const rnd = mulberry32(cycle * 2654435761 + 97);
    const x0 = 200 + rnd() * 700;
    const y0 = 60 + rnd() * 180;
    const len = 150;
    const alpha = Math.sin(p * Math.PI) * 0.8;
    ctx.strokeStyle = `rgba(223, 232, 255, ${alpha})`;
    ctx.lineWidth = 2;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(x0 + p * 320, y0 + p * 150);
    ctx.lineTo(x0 + p * 320 - len, y0 + p * 150 - len * 0.45);
    ctx.stroke();
  }

  return {
    /**
     * Paint the sky. dawnAmount is 0 for full night and 1 for the broken dawn;
     * mid-game it rises a little with the level, so the sky itself shows
     * the run heading for morning.
     */
    draw(ctx, time, dawnAmount) {
      ctx.drawImage(night, 0, 0);
      if (dawnAmount > 0) {
        ctx.globalAlpha = dawnAmount;
        ctx.drawImage(dawn, 0, 0);
        ctx.globalAlpha = 1;
      }
      // Stars fade as the dawn comes in.
      const starAlpha = 1 - dawnAmount * 0.9;
      for (const st of stars) {
        const y = (st.y + time * st.speed) % FIELD.height;
        const tw = 0.75 + 0.25 * Math.sin(time * 1.7 + st.twinkle);
        ctx.globalAlpha = st.alpha * tw * starAlpha;
        ctx.fillStyle = PALETTE.star;
        ctx.fillRect(st.x, y, st.size, st.size);
      }
      ctx.globalAlpha = 1;
      if (dawnAmount < 0.5) drawShootingStar(ctx, time);
      // The moon, high on the right, gone by full dawn.
      if (dawnAmount < 0.6) {
        ctx.globalAlpha = (1 - dawnAmount / 0.6) * 0.9;
        const g = ctx.createRadialGradient(1080, 110, 0, 1080, 110, 70);
        g.addColorStop(0, 'rgba(244, 234, 208, 0.5)');
        g.addColorStop(1, 'rgba(244, 234, 208, 0)');
        ctx.fillStyle = g;
        ctx.beginPath();
        ctx.arc(1080, 110, 70, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = PALETTE.moon;
        ctx.beginPath();
        ctx.arc(1080, 110, 30, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = 'rgba(180, 168, 140, 0.7)';
        ctx.beginPath();
        ctx.arc(1070, 102, 6, 0, Math.PI * 2);
        ctx.arc(1090, 120, 4.5, 0, Math.PI * 2);
        ctx.fill();
        ctx.globalAlpha = 1;
      }
    },
  };
}
