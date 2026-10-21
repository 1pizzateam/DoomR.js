# DoomR

## Libraries

| Library | Used for |
| :-- | :-- |
| [RoostR.js](../RoostR.js) | The whole picture: `Renderer` (context and context-loss events), `Scene`, `PerspectiveCamera`, `Mesh` with `LINES` and `TRIANGLES` geometry and custom shaders, `RenderTarget`s and `FullscreenQuad` for the neon passes, per-mesh blending. The HUD's line art is RoostR too |
| [BumpR.js](../BumpR.js) | `Scene`/`Physics` collisions (player vs walls, doors, enemies, sensor pickups, fireballs) with a Spock `Grid` broadphase, and `scene.raycast` for hitscan shotgun pellets and enemy line of sight |
| [LoopR.js](../LoopR.js) | `Player` game loop with delta-time and a delta cap |
| [Spock.js](../Spock.js) | `Vec2`/`Vec3` maths, `Rand` seeded generator, `Utils.clamp` (also re-exported by RoostR) |


## Controls

| Key | Action |
| :-- | :-- |
| W A S D | move |
| mouse / ← → | turn |
| click / Space | fire |
| E | open / close doors |
| Shift | run |
| M | toggle map |
| N | toggle sound |
| F3 | show fps and render scale |
| Esc | pause |

## Tests

The game rules in `src/game.js` have no DOM dependency, so they run headless in Node:

```bash
npm test
```
