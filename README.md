# DoomR

A Doom-style shooter drawn with nothing but lines in three colours, in the spirit of the Spock.js website demos, plus red for blood:

- **blue** is the world (walls, floor grid, map)
- **green** is what helps you (doors, exit, pickups, crosshair, health)
- **orange** is what hurts (enemies, fireballs, damage)
- **red** is blood

No textures, no filled shapes. The only solid geometry is drawn in the background colour, just behind the lines, to hide what is behind a wall or a body.

## Libraries

| Library | Used for |
| :-- | :-- |
| [RoostR.js](../RoostR.js) | The whole picture: `Renderer` (context and context-loss events), `Scene`, `PerspectiveCamera`, `Mesh` with `LINES` and `TRIANGLES` geometry and custom shaders, `RenderTarget`s and `FullscreenQuad` for the neon passes, per-mesh blending. The HUD's line art is RoostR too |
| [BumpR.js](../BumpR.js) | `Scene`/`Physics` collisions (player vs walls, doors, enemies, sensor pickups, fireballs) with a Spock `Grid` broadphase, and `scene.raycast` for hitscan shotgun pellets and enemy line of sight |
| [LoopR.js](../LoopR.js) | `Player` game loop with delta-time and a delta cap |
| [Spock.js](../Spock.js) | `Vec2`/`Vec3` maths, `Rand` seeded generator, `Utils.clamp` (also re-exported by RoostR) |

## How the 3D view works

Everything in the world is a line mesh in a RoostR scene ([src/world.js](src/world.js)):

- **Walls and doors:** one outline quad per flat wall face, merged from the tile map, plus dim seams and a floor grid. Doors are green boxes whose height shrinks as they open.
- **Roof:** every room is closed overhead by an invisible ceiling and walls that run up to it, drawn in the background colour like the hiding faces. Tall monsters, the warden's horns, flying skulls and fireballs in another room are never seen over a wall, and doorways get a lintel above them. Low pillars are left open, since you can see over them. The one exception is the warden's room (every floor tile reachable from where he stands without passing a door): it has no roof, so you can see his full height from inside it, but its walls still hide it from every other room. He is too big for the doors and never leaves that room; he slides along its walls when chasing you.
- **Waking and doors:** a monster stays idle until it has the player in sight (no wall or closed door between them), and only being shot wakes it otherwise; gunfire alone no longer wakes everything nearby, and a pack only wakes the members that can see their packmate. Monsters cannot open doors: their path-finding treats a closed door as a wall, so one chasing you out of sight waits behind it until you open it. A door that is closing is held open only for a monster standing right in the doorway.
- **Explosive barrels:** orange oil drums (`x` in the level maps, five per level) with ribbed sides, a hazard band and a lid. A shotgun volley, or a fireball, sets one off: it flickers and shudders for a beat, then blows up in an expanding fireball with a big boom and a screen shake. The blast hurts the player and every monster it can reach in the open (walls stop it, more damage the closer they are), kills it in pieces, and sets off any barrel within range after a short, distance-based delay, so they go up in a chain. A barrel is solid until it blows.
- **Title screen:** instead of a spinning camera it plays a short film ([src/title.js](src/title.js), headless and tested): five slow shots through the real first level, cutting through black. Two imps stand twitching until a barrel next to them blows up and tears them apart, then the camera drifts past the brute from below, two barrels, a skull and a crawler. Each shot eases along its path with a slight sway, roll and zoom, the camera shakes with the blast, and you hear the explosion from where the camera is. The level is reloaded at every loop seam (under the black) and when you press start, so the game always begins clean.
- **Pickups, fireballs and effects:** small hand-built wireframes ([src/lines.js](src/lines.js)).
- **Monsters** ([src/monsters.js](src/monsters.js)): six kinds, each a jointed RoostR mesh with its own movement.
  - **Imp:** a hunched demon with a lofted ribcage and spine ridge, curved horns, a jaw full of teeth, long clawed arms and a lashing tail. It stands twitching and breathing, and roars with its arms up when it spots you.
  - **Brute:** a hulking, blocky body with spiked shoulders, tusks and a heavy gait that shakes the screen with every stomp.
  - **Skull:** a flying skull with a chattering jaw that keeps its distance, circles you, and gathers fire in its mouth before it spits a fireball.
  - **Crawler:** six legs, walking in the two alternating groups a spider uses. It weaves in fast, crouches, then leaps and cannot be stopped in mid-air.
  - **Swarmer:** small, toothy and always in a pack of four that wakes together and spreads around you.
  - **The Warden:** a giant boss in the last level, 90 health, with five horns, a pulsing core in its chest, a slam for anything close and a fan of fireballs for anything else. It goes berserk below 40% health.
  Eyes flare as a monster gets angrier, limbs jerk and recoil when hit, and every one of them dies by coming apart: the head, ribs and limbs fly off as separate bodies under gravity and land where they land. A shotgun blast at point blank range, or one volley far beyond what it took to kill, blows the whole body apart.
- **Hidden lines:** each wall face and body has a solid copy in the background colour a hair behind it. A small line shader also pulls lines slightly towards the camera so they win depth ties, and fades them into the background with distance (RoostR's fog uniforms).
- **Glow:** the neon look takes three cheap passes. The scene and the HUD's line art go into a `RenderTarget`; a small quad averages it into a target a quarter (or less) of the size, where blurring is nearly free; the final pass thickens the 1px GL lines at full resolution and adds that small texture back with additive blending. The glow therefore costs about half of a single wide-blur pass and grows much more slowly with the screen size.
- **Culling:** the world scene uses RoostR's frustum culling. The two dynamic line buffers (blood, holes) measure what they hold each time they are uploaded and report it with `Mesh.setLocalBounds`, so they are culled by their real size. Frames are pixel-identical with culling on and off; the saving is small on these levels but grows with them. Physics uses BumpR's grid broadphase (cells of two tiles), which cut `scene.step` from 0.086 to 0.022 ms in a 98-body stress scene.
- **Adaptive resolution:** if the frame rate stays under about 45 fps the 3D view steps down through 85%, 70% and 55% of its size, and it climbs back only after a long run of fast frames. A level that failed right after a climb is never retried, so the picture does not flap ([src/quality.js](src/quality.js), headless and tested). Press `F3` to see fps, frame time, size and scale.
- **Context loss:** if the browser drops the GPU context, the game pauses its drawing. When the context returns, RoostR rebuilds the meshes, programs and render targets (`Scene.restore`, `RenderTarget.restore`), and the game re-sends the blood and bullet-hole buffers it fills by hand ([World.restoreGpu](src/world.js)). The run continues exactly where it was. This needs a RoostR newer than 0.7.0; until it is published, test with the local build: `ROOSTR_LOCAL=../RoostR.js npm run dev` (build RoostR first with `npm run build:lib`).
- **Blood:** red, a fourth colour reserved for it so it never reads as an enemy or a fireball. Pellet hits spray droplets, kills burst into a fountain plus tumbling gibs, corpses spread a pool, and wounded enemies leave a trail. Droplets fly under gravity ([src/blood.js](src/blood.js), headless and tested) and leave permanent starburst splats on the floor and on wall faces ([src/splatter.js](src/splatter.js)). Both are drawn from two dynamic line buffers, and the caps keep the frame rate steady. Damage and point-blank kills also spray the player's view with splats that drip and fade.
- **Bullet holes:** each pellet that hits a wall leaves a permanent crater on that face, blue like the world: a ragged ring, a centre mark, cracks and chipped fragments. Pellets spread vertically as well as sideways, so holes cluster tightly up close and scatter at range. Low pillars stop a shot like any wall, so a pellet aimed over one still marks its face, spread over its height. A pellet that goes into the floor marks nothing. Marks are cut off where their wall face ends, at a corner, a doorway or a change of wall height, so a hole near an edge is clipped instead of hanging in the air; a door is clipped to its own width. Doors slide down into the floor as a whole, and what is below the floor is clipped away in the line shader. Doors take holes and blood too: the marks belong to the door and are rebuilt at the height it has now whenever it moves, so they slide down into the floor and back up with it at the same speed, at their normal size and spacing (they never stretch or run into each other), a mark that sinks below the floor is cut off there, and one that no longer fits under a half-open door is cut at its top (at most 48 holes and 24 blood splats per door). Holes are capped at 320 overall and cleared with the level.
- **Footprints:** the player, and only the player (monsters walk through blood cleanly), soaks their feet by stepping into a pool and then leaves alternating left and right shoe prints each stride. The blood wears off with every step, so the trail thins out (smaller, then plain outlines instead of hatched) and stops after a dozen or so prints. They share the splat buffer, so they cost no extra draw call.
- **HUD:** all of its line art is RoostR geometry ([src/overlay.js](src/overlay.js), [src/hud.js](src/hud.js)): the weapon, crosshair, health ticks, blood on your view and the hurt frame are drawn into the scene before the neon pass so they glow like the world, and the minimap is drawn on the finished picture so the thickening pass does not blur its 1px tiles. A transparent 2D canvas on top only carries text and the dimming menu screens.
- **Minimap fog of war:** the map starts blank and fills in as you see things ([src/fog.js](src/fog.js), headless and tested). You reveal tiles by line of sight, in a cone matching your view plus a small ring around you. Tall walls and closed doors block sight, low pillars do not, as in the 3D view. Tiles in view are bright, ones you have seen before stay dim, and enemies show only while you can currently see them.
- **Sound:** all of it is synthesised live with the Web Audio API ([src/audio.js](src/audio.js)), so there are no audio files, in the same spirit as the line-only graphics: the shotgun crack, boom and pump, wall, door and flesh impacts, a different voice for every monster (the imp rasps, the brute and the warden are huge and wet, the skull wails, the crawler hisses, swarmers squeal), stomps that scale with their weight, a slam, wet gibs, fireballs, doors grinding, pickups, footsteps (with a squelch in blood), a heartbeat when you are nearly dead, and a low drone underneath. The game rules only emit plain events, which `main.js` hands to the audio layer, so they stay headless and tested. Sounds are placed in stereo by where they are relative to where you face, fade with distance, and are muffled when their source is out of sight. A rate limiter keeps a shotgun volley from stacking six impacts at once.

## Run locally

DoomR requires Node.js 22.12 or newer.

```sh
npm ci
npm run dev
```

Open <http://localhost:5173>. The libraries are the published `@1pizzateam/*` packages, bundled by [Vite](https://vite.dev).

Build and preview the production output with:

```sh
npm run build
npm run preview
```

## Run with Docker

```sh
docker compose up
```

Open <http://localhost:5177>. The container mounts the sources and runs the Vite
dev server, so the page reloads by itself whenever you change a file, the same
way the other projects' websites do. Dependencies are installed on the first
start (and again whenever `package.json` or the lockfile change). Stop it with:

```sh
docker compose down
```

To run the production image (the Vite build served by nginx) instead:

```sh
docker compose --profile prod up --build
```

Open <http://localhost:8081>. The build is baked into that image, so source
changes only appear after a rebuild, which is why it keeps the `--build` flag.
The production service belongs to a Compose profile, so stop it with
`docker compose --profile prod down`.

See [INSTALL.md](INSTALL.md) for the complete development workflow.

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

## Layout

- `src/level.js`, `src/levels.js`: ASCII tile maps (`#` wall, `T` tall wall, `o` pillar, `D` door, `X` exit, `i` imp, `b` brute, `s` skull, `c` crawler, `w` swarmer pack, `B` the warden, `x` explosive barrel, `h` health, `a` ammo, `P` start)
- `src/audio.js`: synthesised sound, spatial placement, mute
- `src/fog.js`: minimap fog of war (what has been seen, what is in view)
- `src/game.js`: simulation (BumpR scene, enemy AI with a BFS flow field, doors, pickups, projectiles)
- `src/blood.js`, `src/splatter.js`, `src/rng.js`: blood, footprints and bullet holes (simulation), their line shapes, seeded generator
- `src/world.js`, `src/lines.js`: the RoostR 3D view, neon passes and its line geometry
- `src/monsters.js`: the monster models and their animation
- `src/overlay.js`: RoostR 2D line and fill layers for the HUD
- `src/quality.js`: adaptive resolution (headless)
- `src/hud.js`: weapon, HUD, minimap geometry, text and menu screens
- `src/input.js`, `src/main.js`: input and the LoopR loop
- `dist/` is generated by `npm run build` and is not committed.
- `Dockerfile` is a multi-stage production image (Node build, nginx runtime).

## License

[MIT](LICENCE.md)
