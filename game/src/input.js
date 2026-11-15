// Keyboard and pointer input. The wisp is steered two ways at once: WASD or the
// arrow keys push it, and holding the pointer (mouse or touch) pulls it toward
// the cursor. Space / Shift / right-click dashes. Every key the game uses is
// listed here, so the main loop never reads the DOM directly.

const MOVE_KEYS = {
  ArrowLeft: [-1, 0],
  KeyA: [-1, 0],
  ArrowRight: [1, 0],
  KeyD: [1, 0],
  ArrowUp: [0, -1],
  KeyW: [0, -1],
  ArrowDown: [0, 1],
  KeyS: [0, 1],
};

export function makeInput(canvas, hooks) {
  const keys = new Set();
  const pointer = { x: 0, y: 0, down: false, seen: false };
  let dashQueued = false;

  function toLogical(event) {
    const rect = canvas.getBoundingClientRect();
    return {
      x: ((event.clientX - rect.left) / rect.width) * 1280,
      y: ((event.clientY - rect.top) / rect.height) * 720,
    };
  }

  function onKeyDown(event) {
    if (event.code in MOVE_KEYS || event.code === 'Space') event.preventDefault();
    if (event.repeat) return;
    keys.add(event.code);
    if (event.code === 'Space' || event.code === 'ShiftLeft' || event.code === 'ShiftRight') {
      dashQueued = true;
    }
    hooks.onKey?.(event.code);
  }

  function onKeyUp(event) {
    keys.delete(event.code);
  }

  function onPointerDown(event) {
    const p = toLogical(event);
    pointer.x = p.x;
    pointer.y = p.y;
    pointer.down = true;
    pointer.seen = true;
    if (event.button === 2) dashQueued = true;
    hooks.onPointerDown?.(p, event.button);
  }

  function onPointerMove(event) {
    const p = toLogical(event);
    pointer.x = p.x;
    pointer.y = p.y;
    pointer.seen = true;
  }

  function onPointerUp(event) {
    if (event.button === 0) pointer.down = false;
  }

  function onBlur() {
    keys.clear();
    pointer.down = false;
  }

  function onContextMenu(event) {
    event.preventDefault();
  }

  window.addEventListener('keydown', onKeyDown);
  window.addEventListener('keyup', onKeyUp);
  window.addEventListener('blur', onBlur);
  canvas.addEventListener('pointerdown', onPointerDown);
  canvas.addEventListener('pointermove', onPointerMove);
  canvas.addEventListener('pointerup', onPointerUp);
  canvas.addEventListener('pointercancel', onPointerUp);
  canvas.addEventListener('contextmenu', onContextMenu);

  return {
    /** Normalised move vector from the held keys, or null when none are held. */
    moveVector() {
      let x = 0;
      let y = 0;
      for (const code of keys) {
        const v = MOVE_KEYS[code];
        if (v) {
          x += v[0];
          y += v[1];
        }
      }
      if (x === 0 && y === 0) return null;
      const len = Math.hypot(x, y);
      return { x: x / len, y: y / len };
    },
    /** True while the pointer is held down (the wisp is pulled to it). */
    get pointerDown() {
      return pointer.down;
    },
    get pointer() {
      return pointer;
    },
    /** True once since the last call, when the player asked to dash. */
    takeDash() {
      const d = dashQueued;
      dashQueued = false;
      return d;
    },
    /** True while this key is held. */
    isDown(code) {
      return keys.has(code);
    },
  };
}
