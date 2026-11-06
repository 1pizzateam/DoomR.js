import { NAV_DOWN, NAV_UP } from './input.js';

export const MENU_PLAY = 'play';
export const MENU_OPTIONS = 'options';
export const MENU_NONE = '';

const ITEMS = Object.freeze([
  Object.freeze({ id: MENU_PLAY, label: 'PLAY' }),
  Object.freeze({ id: MENU_OPTIONS, label: 'OPTIONS' }),
]);

export const MAIN_MENU_ITEMS = ITEMS;

/** Headless home page menu: PLAY and OPTIONS. Drawing lives in the Hud, orchestration in main.js. */
export class MainMenu {
  constructor(input, { hitAt = () => -1 } = {}) {
    this.input = input;
    this.hitAt = hitAt;
    this.items = ITEMS;
    this.cursor = 0;
    this.activated = MENU_NONE;
    this.view = { cursor: 0, items: ITEMS };
  }

  focus(id) {
    for (let i = 0; i < this.items.length; i++)
      if (this.items[i].id === id) {
        this.cursor = i;
        this.view.cursor = i;
        return;
      }
  }

  update(blocked) {
    const input = this.input;
    const count = this.items.length;
    this.activated = MENU_NONE;
    const nav = input.navigate();
    if (nav === NAV_UP)
      this.cursor = (this.cursor + count - 1) % count;
    else if (nav === NAV_DOWN)
      this.cursor = (this.cursor + 1) % count;
    if (input.mouseMoved) {
      const hovered = this.hitAt(input.mousePos);
      if (hovered >= 0)
        this.cursor = hovered;
    }
    this.view.cursor = this.cursor;
    if (blocked)
      return;
    if (input.took('Click')) {
      const hit = this.hitAt(input.mousePos);
      if (hit >= 0) {
        this.cursor = hit;
        this.view.cursor = hit;
        this.activated = this.items[hit].id;
      }
    } else if (input.took('confirm') || input.took('jump'))
      this.activated = this.items[this.cursor].id;
  }
}
