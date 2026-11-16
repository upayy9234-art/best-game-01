// Particles, expanding rings and floating score texts. Fixed pools, allocated
// at boot and reused: nothing here allocates while the game runs.

export function makeParticles(capacity, textCapacity, ringCapacity = 8) {
  const parts = [];
  for (let i = 0; i < capacity; i++) {
    parts.push({ alive: false, x: 0, y: 0, vx: 0, vy: 0, life: 0, maxLife: 1, size: 2, color: '#fff', drag: 0.9, gravity: 0 });
  }
  const texts = [];
  for (let i = 0; i < textCapacity; i++) {
    texts.push({ alive: false, x: 0, y: 0, life: 0, maxLife: 1, str: '', color: '#fff', size: 18 });
  }
  const rings = [];
  for (let i = 0; i < ringCapacity; i++) {
    rings.push({ alive: false, x: 0, y: 0, life: 0, maxLife: 1, maxRadius: 200, color: '#fff' });
  }

  function spawn(x, y, vx, vy, life, size, color, drag = 0.92, gravity = 0) {
    for (const p of parts) {
      if (p.alive) continue;
      p.alive = true;
      p.x = x;
      p.y = y;
      p.vx = vx;
      p.vy = vy;
      p.life = life;
      p.maxLife = life;
      p.size = size;
      p.color = color;
      p.drag = drag;
      p.gravity = gravity;
      return;
    }
  }

  return {
    /** A radial burst of sparks. */
    burst(x, y, color, count, speed, life = 0.6, size = 3) {
      for (let i = 0; i < count; i++) {
        const a = Math.random() * Math.PI * 2;
        const s = speed * (0.35 + Math.random() * 0.65);
        spawn(x, y, Math.cos(a) * s, Math.sin(a) * s, life * (0.6 + Math.random() * 0.7), size * (0.7 + Math.random() * 0.6), color);
      }
    },
    /** A short trail mote, as the wisp dashes. */
    trail(x, y, color) {
      spawn(x, y, (Math.random() - 0.5) * 30, (Math.random() - 0.5) * 30, 0.45, 4 + Math.random() * 3, color, 0.94, 0);
    },
    /** A small golden sparkle, as a golden ember drifts. */
    sparkle(x, y, color) {
      spawn(x, y, (Math.random() - 0.5) * 24, -20 - Math.random() * 30, 0.5, 2 + Math.random() * 2, color, 0.96, 0);
    },
    /** An expanding shockwave ring, for the Starfall. */
    ring(x, y, color, maxRadius, life = 0.7) {
      for (const r of rings) {
        if (r.alive) continue;
        r.alive = true;
        r.x = x;
        r.y = y;
        r.life = life;
        r.maxLife = life;
        r.maxRadius = maxRadius;
        r.color = color;
        return;
      }
    },
    /** A floating "+10" style text that rises and fades. */
    floatText(x, y, str, color, size = 18) {
      for (const t of texts) {
        if (t.alive) continue;
        t.alive = true;
        t.x = x;
        t.y = y;
        t.life = 1.0;
        t.maxLife = 1.0;
        t.str = str;
        t.color = color;
        t.size = size;
        return;
      }
    },
    update(dt) {
      for (const p of parts) {
        if (!p.alive) continue;
        p.life -= dt;
        if (p.life <= 0) {
          p.alive = false;
          continue;
        }
        p.vy += p.gravity * dt;
        p.vx *= p.drag;
        p.vy *= p.drag;
        p.x += p.vx * dt;
        p.y += p.vy * dt;
      }
      for (const t of texts) {
        if (!t.alive) continue;
        t.life -= dt;
        if (t.life <= 0) {
          t.alive = false;
          continue;
        }
        t.y -= 42 * dt;
      }
      for (const r of rings) {
        if (!r.alive) continue;
        r.life -= dt;
        if (r.life <= 0) r.alive = false;
      }
    },
    forEach(fn) {
      for (const p of parts) if (p.alive) fn(p);
    },
    forEachText(fn) {
      for (const t of texts) if (t.alive) fn(t);
    },
    forEachRing(fn) {
      for (const r of rings) if (r.alive) fn(r);
    },
    get count() {
      let n = 0;
      for (const p of parts) if (p.alive) n++;
      return n;
    },
  };
}
