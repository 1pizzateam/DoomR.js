# DoomR

## Libraries

| Library | Used for |
| :-- | :-- |
| [RoostR.js](../RoostR.js) | The whole picture: `Renderer` (context and context-loss events), `Scene`, `PerspectiveCamera`, `Mesh` with `LINES` and `TRIANGLES` geometry and custom shaders, `RenderTarget`s and `FullscreenQuad` for the neon passes, per-mesh blending. The HUD's line art is RoostR too |
| [BumpR.js](../BumpR.js) | `Scene`/`Physics` collisions (player vs walls, doors, enemies, sensor pickups, fireballs) with a Spock `Grid` broadphase, and `scene.raycast` for hitscan shotgun pellets and enemy line of sight |
| [LoopR.js](../LoopR.js) | `Player` game loop with delta-time and a delta cap |
| [Spock.js](../Spock.js) | `Vec2`/`Vec3` maths, `Rand` seeded generator, `Utils.clamp` (also re-exported by RoostR) |


## Controls

Controls adapt to your keyboard layout (QWERTY, AZERTY, QWERTZ, Dvorak). Positional keys stay in the same physical place on every layout, so WASD on QWERTY is ZQSD on AZERTY. Mnemonic keys follow the letter printed on the keycap. The home (title) and pause screens display a clean, aligned quick-reference panel of line-art keycaps organized into functional groups (`MOVE`, `COMBAT`, `WORLD`, `SYSTEM`). The on-screen labels adapt automatically (from the Keyboard Map API, or learned from your key presses), and `F2` cycles Auto → QWERTY → AZERTY → QWERTZ → Dvorak, stored as `doomr.keyboardLayout`.

Every action can be rebound. The home screen shows PLAY and OPTIONS buttons, operated by mouse (hover and click) or keyboard (up/down with the arrow keys or the remapped movement keys, Enter to select). OPTIONS opens the CONTROLS page and `Esc` returns to the menu. `F1` still opens it from anywhere, and the pause screen keeps its CONTROLS link. Each action has two slots (KEY 1 / KEY 2) and accepts keyboard keys or mouse buttons (MOUSE L/M/R/4/5). A key taken from another action is announced, and actions left without a key are flagged UNBOUND in red. `Del` clears a slot, `R` resets a row, and RESET ALL needs a second press. `Esc` and `Enter` are reserved. Customised keys are physical keys labelled with your own keycap glyph. Fire defaults to MOUSE L (KEY 1) and X (KEY 2); CTRL and Alt are free keys that can be assigned to Fire (or any action) on the CONTROLS page. Bindings are saved in the browser as `doomr.controls`.

| Key (QWERTY) | Action | Follows |
| :-- | :-- | :-- |
| W A S D | move (ZQSD on AZERTY) | position |
| mouse / ← → | turn | position |
| click / X / Enter | fire | position |
| F | grenade | position |
| Space | jump | position |
| C | crouch | position |
| Shift | run | position |
| 1-4 | weapons | position |
| E | use (open / close doors, loot chests; a discreet key prompt appears when in reach) | printed letter |
| M | toggle music | printed letter |
| V | toggle map | printed letter |
| ; | toggle sound (B also works) | printed letter |
| N | toggle night vision | printed letter |
| Tab | automap (`G` grid, `+ / -` zoom) | position |
| [ / ] | switch level | printed letter |
| P / Esc | P toggles pause and resume (ENTER or click also resume); Esc pauses | printed letter / position |
| F2 | cycle keyboard layout labels | position |
| F3 | show fps and render scale | position |
| F1 | open the controls page (rebind any action) | position |

## Tests

The game rules in `src/game.js` have no DOM dependency, so they run headless in Node:

```bash
npm test
```
