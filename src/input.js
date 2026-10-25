import { Keyboard } from '@dwtechs/ctrltab';
import { Vec2 } from '@1pizzateam/spock';

// Physical event.code -> [commandName, ctrlTabKeys, rawWhichOverride]
const KEY_BINDINGS = [
  ['KeyW', ['W']],
  ['KeyA', ['A']],
  ['KeyS', ['S']],
  ['KeyD', ['D']],
  ['ArrowUp', [38]],
  ['ArrowDown', [40]],
  ['ArrowLeft', [37]],
  ['ArrowRight', [39]],
  ['Space', [32]],
  ['Enter', [13]],
  ['ShiftLeft', [16]],
  ['ShiftRight', [16], 160],
  ['ControlLeft', [17]],
  ['ControlRight', [17], 162],
  ['AltLeft', [18]],
  ['AltRight', [18], 164],
  ['KeyC', ['C']],
  ['KeyX', ['X']],
  ['KeyE', ['E']],
  ['KeyF', ['F']],
  ['KeyN', ['N']],
  ['KeyM', ['M']],
  ['KeyV', ['V']],
  ['KeyG', ['G']],
  ['KeyB', ['B']],
  ['KeyP', ['P']],
  ['Digit1', [49]],
  ['Digit2', [50]],
  ['Digit3', [51]],
  ['Digit4', [52]],
  ['Numpad1', [97], 97, 'Digit1'],
  ['Numpad2', [98], 98, 'Digit2'],
  ['Numpad3', [99], 99, 'Digit3'],
  ['Numpad4', [100], 100, 'Digit4'],
  ['Tab', [9]],
  ['Escape', [27]],
  ['F3', [114]],
  ['NumpadAdd', [107]],
  ['NumpadSubtract', [109]],
  ['Equal', [61]],
  ['EqualChrome', [1], 187, 'Equal'],
  ['Minus', [45]],
  ['MinusChrome', [1], 189, 'Minus'],
  ['MinusFirefox', [1], 173, 'Minus'],
  ['BracketLeft', [1], 219],
  ['BracketRight', [1], 221],
];

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
  constructor(canvas) {
    this.canvas = canvas;
    this.keys = new Set();
    this.heldWhich = new Set();
    this.metaHeld = new Set();
    this.metaTainted = new Set();
    this.mouseDX = 0;
    this.mouseFire = false;
    this.mousePos = new Vec2(-1, -1);
    this.mouseMoved = false;
    this.pressed = new Set();
    this.onAction = () => {};

    this.keyboard = new Keyboard();
    const codeToWhich = new Map();
    const boundWhich = new Set();

    for (const [name, asciiKeys, rawWhich, targetCode] of KEY_BINDINGS) {
      const code = targetCode || name;
      const which = rawWhich || (typeof asciiKeys[0] === 'string' ? asciiKeys[0].charCodeAt(0) : asciiKeys[0]);
      codeToWhich.set(name, which);
      boundWhich.add(which);
      const cmd = this.keyboard.addCmd(
        name,
        null,
        asciiKeys,
        (isKeyDown) => {
          if (isKeyDown) {
            this.pressed.add(code);
            this.keys.delete(code);
            this.keys.add(code);
            this.heldWhich.add(which);
          } else {
            this.keys.delete(code);
            this.heldWhich.delete(which);
          }
        },
        {
          preventDefault: true,
          groupName: 'game',
        }
      );
      if (rawWhich) {
        cmd.inputs.keys = {};
        cmd.inputs.setKeys([rawWhich]);
      }
    }
    this.keyboard.listen('game');

    const resolveWhich = (event) => {
      if (event.code)
        return codeToWhich.get(event.code) ?? 0;
      return event.which || event.keyCode;
    };

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
      syncMeta(event);
      const which = resolveWhich(event);
      if ((event.metaKey || event.ctrlKey || event.altKey) && !boundWhich.has(which))
        return;
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
      const which = resolveWhich(event);
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
    const pos = this.down(...positive);
    const neg = this.down(...negative);
    if (pos && neg) {
      let last = 0;
      for (const code of this.keys)
        if (positive.includes(code))
          last = 1;
        else if (negative.includes(code))
          last = -1;
      return last;
    }
    return (pos ? 1 : 0) - (neg ? 1 : 0);
  }

  /** Controls for this frame; clears the one-shot state. */
  poll() {
    let weapon = 0;
    if (this.took('Digit1')) weapon = 1;
    else if (this.took('Digit2')) weapon = 2;
    else if (this.took('Digit3')) weapon = 3;
    else if (this.took('Digit4')) weapon = 4;
    const controls = {
      forward: this.axis(['KeyW', 'ArrowUp'], ['KeyS', 'ArrowDown']),
      strafe: this.axis(['KeyD'], ['KeyA']),
      turn: this.axis(['ArrowRight'], ['ArrowLeft']),
      run: this.down('ShiftLeft', 'ShiftRight'),
      jump: this.down('Space'),
      crouch: this.down('KeyC'),
      fire: this.down('KeyX', 'AltLeft', 'AltRight', 'ControlLeft', 'ControlRight', 'KeyF', 'Enter') || this.mouseFire,
      use: this.took('KeyE'),
      nightVision: this.took('KeyN'),
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
