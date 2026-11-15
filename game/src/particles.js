// Particles and floating score texts. One fixed pool, allocated at boot and
// reused: nothing here allocates while the game runs.

export function makeParticles(capacity, textCapacity) {
  const parts = [];
  for (let i = 0; i < capacity; i++) {
    parts.push({ alive: false, x: 0, y: 0, vx: 0, vy: 0, life: 0, maxLife: 1, size: 2, color: '#fff', drag: 0.9, gravity: 0 });
  }
  const texts = [];
  for (let i = 0; i < textCapacity; i++) {
    texts.push({ alive: false, x: 0, y: 0, life: 0, maxLife: 1, str: '', color: '#fff', size: 18 });
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
    },
    forEach(fn) {
      for (const p of parts) if (p.alive) fn(p);
    },
    forEachText(fn) {
      for (const t of texts) if (t.alive) fn(t);
    },
    get count() {
      let n = 0;
      for (const p of parts) if (p.alive) n++;
      return n;
    },
  };
}
