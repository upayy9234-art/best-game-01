// Fever: the combo streak's payoff. Chain FEVER.comboTrigger embers without
// dropping the combo and the wisp burns twice as bright for FEVER.seconds:
// every ember pays double (golden embers too) until the timer runs out or
// the combo breaks. A new Fever can only start on the next multiple of the
// trigger (x20, x30, ...) while one is already running, so a long chain
// earns repeated Fevers instead of one endless one.
//
// Round 4: the game's first real risk/reward choice — play safe and bank
// the combo, or chase the next ember to keep Fever alive. The world owns
// the score; this module owns only the timer and the multiplier, so the
// unit test can drive it through the world alone.

import { FEVER } from './config.js';

export function makeFever(particles) {
  let secondsLeft = 0;
  let triggers = 0;

  /** Light the Fever: fanfare at the wisp, then double points while it burns. */
  function start(x, y) {
    secondsLeft = FEVER.seconds;
    triggers += 1;
    particles.burst(x, y, '#ffd76a', 26, 300, 0.9, 4);
    particles.ring(x, y, '#ffd76a', 420, 0.8);
    particles.floatText(x, y - 34, 'FEVER x2!', '#fffbe0', 26);
  }

  return {
    /** Seconds of Fever left; 0 when it is not running. */
    get secondsLeft() {
      return secondsLeft;
    },
    /** How many Fevers this run has lit. */
    get triggers() {
      return triggers;
    },
    /** True while Fever is burning. */
    get active() {
      return secondsLeft > 0;
    },
    /** The points multiplier Fever applies: 2 while burning, else 1. */
    multiplier() {
      return secondsLeft > 0 ? FEVER.multiplier : 1;
    },
    /** A combo just grew: light a Fever on every multiple of the trigger,
     * unless one is already burning. Returns true when one starts. */
    onCombo(combo, x, y) {
      if (combo > 0 && combo % FEVER.comboTrigger === 0 && secondsLeft <= 0) {
        start(x, y);
        return true;
      }
      return false;
    },
    /** Burn the timer down; call once per fixed step. */
    tick(dt) {
      if (secondsLeft > 0) secondsLeft = Math.max(0, secondsLeft - dt);
    },
    /** Put the Fever out at once (the combo broke). */
    cancel() {
      secondsLeft = 0;
    },
    /** Light a Fever with no fanfare (the staged play screenshot). */
    arm() {
      secondsLeft = FEVER.seconds;
      triggers += 1;
    },
    /** A fresh run: no Fever burning, none lit yet. */
    reset() {
      secondsLeft = 0;
      triggers = 0;
    },
  };
}
