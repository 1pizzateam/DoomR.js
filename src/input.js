import { Keyboard } from '@dwtechs/ctrltab';
import { Vec2 } from '@1pizzateam/spock';
import { Keymap, MOUSE_CODES } from './keymap.js';

export const RAW_RING_SIZE = 16;
export const NAV_NONE = 0;
export const NAV_UP = 1;
export const NAV_DOWN = 2;
export const NAV_LEFT = 3;
export const NAV_RIGHT = 4;

const NAV_BIT_UP = 1;
const NAV_BIT_DOWN = 2;
const NAV_BIT_LEFT = 4;
const NAV_BIT_RIGHT = 8;
const NAV_BIT_BY_CODE = { ArrowUp: NAV_BIT_UP, ArrowDown: NAV_BIT_DOWN, ArrowLeft: NAV_BIT_LEFT, ArrowRight: NAV_BIT_RIGHT };

const OPPOSITE_WHICH = {
  87: 83,
  83: 87,
  65: 68,
  68: 65,
  38: 40,
  40: 38,
  37: 39,
  39: 37,
};

const noop = () => {};

/** Keyboard and mouse state, polled once per frame by the game loop. */
export class Input {
  constructor(canvas, keymap = new Keymap()) {
    this.canvas = canvas;
    this.keymap = keymap;
    this.keys = new Set();
    this.heldWhich = new Set();
    this.downByCode = new Map();
    this.metaHeld = new Set();
    this.metaTainted = new Set();
    this.mouseDX = 0;
    this.mousePos = new Vec2(-1, -1);
    this.mouseMoved = false;
    this.pressed = new Set();
    this.navBits = 0;
    this.releaseScratch = [];
    this.mouseDispatch = { which: 0, ctrlKey: false, altKey: false, shiftKey: false, preventDefault: noop };
    this.rawMode = false;
    this.rawHead = 0;
    this.rawCount = 0;
    this.rawRing = [];
    for (let i = 0; i < RAW_RING_SIZE; i++)
      this.rawRing.push({ kind: '', code: '', key: '', repeat: false, delta: 0 });

    this.handleKeyDown = (event) => this.onKeyDown(event);
    this.handleKeyUp = (event) => this.onKeyUp(event);
    this.rebuildKeyboard();

    const updateMousePos = (event) => {
      const rect = canvas.getBoundingClientRect?.();
      if (rect)
        this.mousePos.setScalar(event.clientX - rect.left, event.clientY - rect.top);
      else
        this.mousePos.setScalar(event.clientX, event.clientY);
    };

    window.addEventListener('blur', () => this.releaseAll());
    canvas.addEventListener('mousedown', (event) => {
      this.syncMeta(event);
      updateMousePos(event);
      const code = MOUSE_CODES[event.button];
      if (event.button === 1)
        event.preventDefault?.();
      if (this.rawMode) {
        if (code)
          this.pushRaw('buttondown', code, '', false, 0);
        return;
      }
      this.pressed.add('Click');
      const which = code ? keymap.whichOfCode(code) : 0;
      if (which !== 0) {
        if (this.heldWhich.has(which))
          this.keyboard.up({ which });
        this.mouseDispatch.which = which;
        this.keyboard.down(this.mouseDispatch);
      }
    });
    window.addEventListener('mouseup', (event) => {
      this.syncMeta(event);
      const code = MOUSE_CODES[event.button];
      if (this.rawMode) {
        if (code)
          this.pushRaw('buttonup', code, '', false, 0);
        return;
      }
      const which = code ? keymap.whichOfCode(code) : 0;
      if (which !== 0)
        this.keyboard.up({ which });
    });
    canvas.addEventListener('wheel', (event) => {
      if (!this.rawMode)
        return;
      event.preventDefault?.();
      this.pushRaw('wheel', '', '', false, Math.sign(event.deltaY));
    }, { passive: false });
    document.addEventListener('mousemove', (event) => {
      this.syncMeta(event);
      updateMousePos(event);
      this.mouseMoved = true;
      if (this.locked)
        this.mouseDX += event.movementX;
    });
    canvas.addEventListener('contextmenu', (event) => event.preventDefault());
  }

  installHandlers() {
    document.onkeydown = this.handleKeyDown;
    document.onkeyup = this.handleKeyUp;
  }

  rebuildKeyboard() {
    const keymap = this.keymap;
    this.keyboard = new Keyboard();
    for (const { action, which } of keymap.bindings) {
      const whiches = keymap.whichesOf(action);
      // ctrltab only validates ASCII key codes, so higher codes are injected after registration
      const cmd = this.keyboard.addCmd(
        `${action}:${which}`,
        null,
        which <= 127 ? [which] : [1],
        (isKeyDown) => {
          if (isKeyDown) {
            this.pressed.add(action);
            this.keys.delete(action);
            this.keys.add(action);
            this.heldWhich.add(which);
          } else {
            this.heldWhich.delete(which);
            for (let i = 0; i < whiches.length; i++)
              if (this.heldWhich.has(whiches[i]))
                return;
            this.keys.delete(action);
          }
        },
        {
          preventDefault: true,
          groupName: 'game',
        }
      );
      if (which > 127) {
        cmd.inputs.keys = {};
        cmd.inputs.setKeys([which]);
      }
    }
    this.keyboard.listen('game');
    this.installHandlers();
    this.bindingsVersion = keymap.bindingsVersion;
  }

  releaseAll() {
    const scratch = this.releaseScratch;
    scratch.length = 0;
    for (const which of this.heldWhich)
      scratch.push(which);
    for (let i = 0; i < scratch.length; i++)
      this.keyboard.up({ which: scratch[i] });
    this.keys.clear();
    this.heldWhich.clear();
    this.downByCode.clear();
    this.metaHeld.clear();
    this.metaTainted.clear();
    this.navBits = 0;
  }

  syncBindings() {
    if (this.keymap.bindingsVersion === this.bindingsVersion)
      return false;
    this.releaseAll();
    this.rebuildKeyboard();
    return true;
  }

  pushRaw(kind, code, key, repeat, delta) {
    if (this.rawCount === RAW_RING_SIZE)
      return;
    const record = this.rawRing[(this.rawHead + this.rawCount) % RAW_RING_SIZE];
    record.kind = kind;
    record.code = code;
    record.key = key;
    record.repeat = repeat;
    record.delta = delta;
    this.rawCount++;
  }

  nextRaw() {
    if (this.rawCount === 0)
      return null;
    const record = this.rawRing[this.rawHead];
    this.rawHead = (this.rawHead + 1) % RAW_RING_SIZE;
    this.rawCount--;
    return record;
  }

  setRawMode(on) {
    if (this.rawMode === on)
      return;
    this.releaseAll();
    this.pressed.clear();
    this.rawCount = 0;
    this.rawHead = 0;
    this.rawMode = on;
  }

  releaseMetaHeld() {
    this.keyboard.up({ which: 91 });
    this.keyboard.up({ which: 93 });
    for (const which of this.metaHeld)
      this.keyboard.up({ which });
    this.metaHeld.clear();
  }

  syncMeta(event) {
    if (event.metaKey === false && (this.heldWhich.has(91) || this.heldWhich.has(93) || this.metaHeld.size > 0))
      this.releaseMetaHeld();
  }

  onKeyDown(event) {
    const keymap = this.keymap;
    keymap.learn(event);
    if (this.rawMode) {
      event.preventDefault?.();
      this.pushRaw('keydown', event.code ?? '', event.key ?? '', Boolean(event.repeat), 0);
      return;
    }
    this.syncMeta(event);
    const code = event.code;
    if (code && !event.repeat)
      this.navBits |= NAV_BIT_BY_CODE[code] ?? 0;
    const pinned = code ? this.downByCode.get(code) : undefined;
    let which;
    if (pinned !== undefined && event.repeat)
      which = pinned;
    else {
      which = keymap.resolve(event);
      if (pinned !== undefined && pinned !== which)
        this.keyboard.up({ which: pinned });
    }
    if ((event.metaKey || event.ctrlKey || event.altKey) && !keymap.isBound(which))
      return;
    if (event.repeat && !this.heldWhich.has(which)) {
      if (keymap.isBound(which))
        event.preventDefault?.();
      return;
    }
    if (code && which !== 0)
      this.downByCode.set(code, which);
    if (!event.repeat) {
      this.metaTainted.delete(which);
      const opp = OPPOSITE_WHICH[which];
      if (opp && this.metaTainted.has(opp)) {
        this.keyboard.up({ which: opp });
        this.metaTainted.delete(opp);
      }
      if (this.heldWhich.has(which))
        this.keyboard.up({ which });
    }
    this.keyboard.down({
      which,
      ctrlKey: false,
      altKey: false,
      shiftKey: false,
      preventDefault: () => event.preventDefault(),
    });
    if (which === 91 || which === 93) {
      for (const held of this.heldWhich)
        if (held !== 91 && held !== 93)
          this.metaTainted.add(held);
    } else if (event.metaKey)
      this.metaHeld.add(which);
  }

  onKeyUp(event) {
    if (this.rawMode) {
      this.pushRaw('keyup', event.code ?? '', event.key ?? '', false, 0);
      return;
    }
    const code = event.code;
    const which = code ? (this.downByCode.get(code) ?? this.keymap.resolve(event)) : this.keymap.resolve(event);
    if (code)
      this.downByCode.delete(code);
    this.keyboard.up({ which });
    this.metaHeld.delete(which);
    this.metaTainted.delete(which);
    if (which === 91 || which === 93)
      this.releaseMetaHeld();
    else
      this.syncMeta(event);
  }

  get locked() {
    return document.pointerLockElement === this.canvas;
  }

  lock() {
    try {
      const result = this.canvas.requestPointerLock();
      if (result?.catch)
        result.catch(() => {});
    } catch {
      // keyboard-only play is fine
    }
  }

  unlock() {
    if (this.locked)
      document.exitPointerLock();
  }

  down(...codes) {
    return codes.some((code) => this.keys.has(code));
  }

  /** True once per key press, whatever the frame rate. */
  took(code) {
    return this.pressed.has(code);
  }

  /** One-shot menu direction: arrows by physical key, or the movement bindings. */
  navigate() {
    const bits = this.navBits;
    if ((bits & NAV_BIT_UP) || this.took('moveForward'))
      return NAV_UP;
    if ((bits & NAV_BIT_DOWN) || this.took('moveBack'))
      return NAV_DOWN;
    if ((bits & NAV_BIT_LEFT) || this.took('turnLeft') || this.took('strafeLeft'))
      return NAV_LEFT;
    if ((bits & NAV_BIT_RIGHT) || this.took('turnRight') || this.took('strafeRight'))
      return NAV_RIGHT;
    return NAV_NONE;
  }

  axis(positive, negative) {
    const pos = this.keys.has(positive);
    const neg = this.keys.has(negative);
    if (pos && neg) {
      let last = 0;
      for (const id of this.keys)
        if (id === positive)
          last = 1;
        else if (id === negative)
          last = -1;
      return last;
    }
    return (pos ? 1 : 0) - (neg ? 1 : 0);
  }

  /** Controls for this frame; clears the one-shot state. */
  poll() {
    let weapon = 0;
    if (this.took('weapon1')) weapon = 1;
    else if (this.took('weapon2')) weapon = 2;
    else if (this.took('weapon3')) weapon = 3;
    else if (this.took('weapon4')) weapon = 4;
    const keys = this.keys;
    const controls = {
      forward: this.axis('moveForward', 'moveBack'),
      strafe: this.axis('strafeRight', 'strafeLeft'),
      turn: this.axis('turnRight', 'turnLeft'),
      run: keys.has('run'),
      jump: keys.has('jump'),
      crouch: keys.has('crouch'),
      fire: keys.has('fire'),
      grenade: this.took('grenade'),
      use: this.took('use'),
      nightVision: this.took('nightVision'),
      weapon,
      mouseX: this.mouseDX,
    };
    this.mouseDX = 0;
    return controls;
  }

  endFrame() {
    this.pressed.clear();
    this.navBits = 0;
    this.mouseMoved = false;
  }
}
