import { Vec2 } from '@1pizzateam/spock';

const GAME_KEYS = new Set([
  'KeyW', 'KeyA', 'KeyS', 'KeyD',
  'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight',
  'Space', 'ShiftLeft', 'ShiftRight', 'ControlLeft', 'ControlRight',
  'AltLeft', 'AltRight', 'MetaLeft', 'MetaRight',
  'KeyE', 'KeyF',
  'Digit1', 'Digit2', 'Digit3', 'Digit4',
]);

/** Keyboard and mouse state, polled once per frame by the game loop. */
export class Input {
  constructor(canvas) {
    this.canvas = canvas;
    this.keys = new Set();
    this.metaHeld = new Set();
    this.mouseDX = 0;
    this.mouseFire = false;
    this.mousePos = new Vec2(-1, -1);
    this.mouseMoved = false;
    this.pressed = new Set();
    this.onAction = () => {};

    const updateMousePos = (event) => {
      const rect = canvas.getBoundingClientRect?.();
      if (rect)
        this.mousePos.setScalar(event.clientX - rect.left, event.clientY - rect.top);
      else
        this.mousePos.setScalar(event.clientX, event.clientY);
    };

    window.addEventListener('keydown', (event) => {
      if ((event.metaKey || event.ctrlKey || event.altKey) && !GAME_KEYS.has(event.code))
        return;
      if (['Space', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Tab', 'F3', 'AltLeft', 'AltRight'].includes(event.code))
        event.preventDefault();
      if (!event.repeat)
        this.pressed.add(event.code);
      this.keys.add(event.code);
      if (event.metaKey && event.code !== 'MetaLeft' && event.code !== 'MetaRight')
        this.metaHeld.add(event.code);
    });
    window.addEventListener('keyup', (event) => {
      this.keys.delete(event.code);
      if (event.code === 'MetaLeft' || event.code === 'MetaRight') {
        for (const code of this.metaHeld)
          this.keys.delete(code);
        this.metaHeld.clear();
      }
    });
    window.addEventListener('blur', () => {
      this.keys.clear();
      this.metaHeld.clear();
      this.mouseFire = false;
    });
    canvas.addEventListener('mousedown', (event) => {
      updateMousePos(event);
      if (event.button === 0)
        this.mouseFire = true;
      this.pressed.add('Click');
    });
    window.addEventListener('mouseup', () => (this.mouseFire = false));
    document.addEventListener('mousemove', (event) => {
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
    return (this.down(...positive) ? 1 : 0) - (this.down(...negative) ? 1 : 0);
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
      crouch: this.down('AltLeft', 'AltRight', 'MetaLeft', 'MetaRight'),
      fire: this.down('Space', 'ControlLeft') || this.mouseFire,
      use: this.took('KeyE') || this.took('KeyF'),
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
