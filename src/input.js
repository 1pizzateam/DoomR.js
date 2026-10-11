/** Keyboard and mouse state, polled once per frame by the game loop. */
export class Input {
  constructor(canvas) {
    this.canvas = canvas;
    this.keys = new Set();
    this.mouseDX = 0;
    this.mouseFire = false;
    this.pressed = new Set();
    this.onAction = () => {};

    window.addEventListener('keydown', (event) => {
      if (event.metaKey || event.ctrlKey || event.altKey)
        return;
      if (['Space', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Tab', 'F3'].includes(event.code))
        event.preventDefault();
      if (!event.repeat)
        this.pressed.add(event.code);
      this.keys.add(event.code);
    });
    window.addEventListener('keyup', (event) => this.keys.delete(event.code));
    window.addEventListener('blur', () => {
      this.keys.clear();
      this.mouseFire = false;
    });
    canvas.addEventListener('mousedown', (event) => {
      if (event.button === 0)
        this.mouseFire = true;
      this.pressed.add('Click');
    });
    window.addEventListener('mouseup', () => (this.mouseFire = false));
    document.addEventListener('mousemove', (event) => {
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
    const controls = {
      forward: this.axis(['KeyW', 'ArrowUp'], ['KeyS', 'ArrowDown']),
      strafe: this.axis(['KeyD'], ['KeyA']),
      turn: this.axis(['ArrowRight'], ['ArrowLeft']),
      run: this.down('ShiftLeft', 'ShiftRight'),
      fire: this.down('Space', 'ControlLeft') || this.mouseFire,
      use: this.took('KeyE') || this.took('KeyF'),
      mouseX: this.mouseDX,
    };
    this.mouseDX = 0;
    return controls;
  }

  endFrame() {
    this.pressed.clear();
  }
}
