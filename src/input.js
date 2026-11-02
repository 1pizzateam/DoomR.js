import { Keyboard } from '@dwtechs/ctrltab';
import { Vec2 } from '@1pizzateam/spock';
import { Keymap } from './keymap.js';

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
    this.mouseFire = false;
    this.mousePos = new Vec2(-1, -1);
    this.mouseMoved = false;
    this.pressed = new Set();
    this.onAction = () => {};

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

    const releaseMetaHeld = () => {
      this.keyboard.up({ which: 91 });
      this.keyboard.up({ which: 93 });
      for (const which of this.metaHeld)
        this.keyboard.up({ which });
      this.metaHeld.clear();
    };
    const syncMeta = (event) => {
      if (event.metaKey === false && (this.heldWhich.has(91) || this.heldWhich.has(93) || this.metaHeld.size > 0))
        releaseMetaHeld();
    };

    document.onkeydown = (event) => {
      keymap.learn(event);
      syncMeta(event);
      const code = event.code;
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
    };

    document.onkeyup = (event) => {
      const code = event.code;
      const which = code ? (this.downByCode.get(code) ?? keymap.resolve(event)) : keymap.resolve(event);
      if (code)
        this.downByCode.delete(code);
      this.keyboard.up({ which });
      this.metaHeld.delete(which);
      this.metaTainted.delete(which);
      if (which === 91 || which === 93)
        releaseMetaHeld();
      else
        syncMeta(event);
    };

    const updateMousePos = (event) => {
      const rect = canvas.getBoundingClientRect?.();
      if (rect)
        this.mousePos.setScalar(event.clientX - rect.left, event.clientY - rect.top);
      else
        this.mousePos.setScalar(event.clientX, event.clientY);
    };

    window.addEventListener('blur', () => {
      for (const which of [...this.heldWhich])
        this.keyboard.up({ which });
      this.keys.clear();
      this.heldWhich.clear();
      this.downByCode.clear();
      this.metaHeld.clear();
      this.metaTainted.clear();
      this.mouseFire = false;
    });
    canvas.addEventListener('mousedown', (event) => {
      syncMeta(event);
      updateMousePos(event);
      if (event.button === 0)
        this.mouseFire = true;
      this.pressed.add('Click');
    });
    window.addEventListener('mouseup', (event) => {
      syncMeta(event);
      this.mouseFire = false;
    });
    document.addEventListener('mousemove', (event) => {
      syncMeta(event);
      updateMousePos(event);
      this.mouseMoved = true;
      if (this.locked)
        this.mouseDX += event.movementX;
    });
    canvas.addEventListener('contextmenu', (event) => event.preventDefault());
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
      fire: keys.has('fire') || keys.has('confirm') || this.mouseFire,
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
    this.mouseMoved = false;
  }
}
