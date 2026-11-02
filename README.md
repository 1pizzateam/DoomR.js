# DoomR

## Libraries

| Library | Used for |
| :-- | :-- |
| [RoostR.js](../RoostR.js) | The whole picture: `Renderer` (context and context-loss events), `Scene`, `PerspectiveCamera`, `Mesh` with `LINES` and `TRIANGLES` geometry and custom shaders, `RenderTarget`s and `FullscreenQuad` for the neon passes, per-mesh blending. The HUD's line art is RoostR too |
| [BumpR.js](../BumpR.js) | `Scene`/`Physics` collisions (player vs walls, doors, enemies, sensor pickups, fireballs) with a Spock `Grid` broadphase, and `scene.raycast` for hitscan shotgun pellets and enemy line of sight |
| [LoopR.js](../LoopR.js) | `Player` game loop with delta-time and a delta cap |
| [Spock.js](../Spock.js) | `Vec2`/`Vec3` maths, `Rand` seeded generator, `Utils.clamp` (also re-exported by RoostR) |


## Controls

Controls adapt to your keyboard layout (QWERTY, AZERTY, QWERTZ, Dvorak). Positional keys stay in the same physical place on every layout, so WASD on QWERTY is ZQSD on AZERTY. Mnemonic keys follow the letter printed on the keycap. The on-screen labels adapt automatically (from the Keyboard Map API, or learned from your key presses), and `F2` cycles Auto → QWERTY → AZERTY → QWERTZ → Dvorak, stored as `doomr.keyboardLayout`.

| Key (QWERTY) | Action | Follows |
| :-- | :-- | :-- |
| W A S D | move (ZQSD on AZERTY) | position |
| mouse / ← → | turn | position |
| click / X / Ctrl / Alt / Enter | fire | position |
| F | grenade | position |
| Space | jump | position |
| C | crouch | position |
| Shift | run | position |
| 1-4 | weapons | position |
| E | open / close doors | printed letter |
| M | toggle music | printed letter |
| V | toggle map | printed letter |
| ; | toggle sound (B also works) | printed letter |
| N | toggle night vision | printed letter |
| Tab | automap (`G` grid, `+ / -` zoom) | position |
| [ / ] | switch level | printed letter |
| P / Esc | pause | printed letter / position |
| F2 | cycle keyboard layout labels | position |
| F3 | show fps and render scale | position |

## Tests

The game rules in `src/game.js` have no DOM dependency, so they run headless in Node:

```bash
npm test
```
