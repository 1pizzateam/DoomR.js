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
- **Explosive barrels:** orange oil drums (`x` in the level maps, five per level) with ribbed sides, a hazard band and a lid. A shotgun volley, or a fireball, sets one off: it flickers and shudders for a beat, then blows up in an expanding fireball with a big boom and a screen shake. The blast hurts the player and every monster it can reach in the open (walls stop it, more damage the closer they are), kills it in pieces, and sets off any barrel within range after a short, distance-based delay, so they go up in a chain. A barrel is solid until it blows. A barrel wears a skin: an orange oil drum with rolling hoops, a hazard band, two flame warning labels, weld seams and rust ([src/barrel.js](src/barrel.js), generated in code), on a RoostR `Cylinder`, with no line art over it. Its blast is a 2D sprite animation ([src/explosion.js](src/explosion.js), 16 frames): a white flash and shockwave, a boiling fireball that cools from white through yellow and orange to red, sparks, then smoke that thins away, with smaller fireballs flaring round it. It is drawn with a depth bias so the walls and floor do not cut it off flat.
- **Title screen:** instead of a spinning camera it plays a short film ([src/title.js](src/title.js), headless and tested): five slow shots through the real first level, cutting through black. Two imps stand twitching until a barrel next to them blows up and tears them apart, then the camera drifts past the brute from below, two barrels, a skull and a crawler. Each shot eases along its path with a slight sway, roll and zoom, the camera shakes with the blast, and you hear the explosion from where the camera is. The level is reloaded at every loop seam (under the black) and when you press start, so the game always begins clean.
- **Pickups, fireballs and effects:** small hand-built wireframes ([src/lines.js](src/lines.js)).
- **Monsters** ([src/monsters.js](src/monsters.js)): seven kinds, six of them a jointed RoostR mesh with its own movement and one a flat 2D sprite.
  - **Imp:** a hunched demon with a lofted ribcage and spine ridge, curved horns, a jaw full of teeth, long clawed arms and a lashing tail. It stands twitching and breathing, and roars with its arms up when it spots you.
  - **Brute:** a hulking, blocky body with spiked shoulders, tusks and a heavy gait that shakes the screen with every stomp.
  - **Skull:** a flying skull with a chattering jaw that keeps its distance, circles you, and gathers fire in its mouth before it spits a fireball.
  - **Crawler:** six legs, walking in the two alternating groups a spider uses. It weaves in fast, crouches, then leaps and cannot be stopped in mid-air.
  - **Swarmer:** small, toothy and always in a pack of four that wakes together and spreads around you.
  - **Wraith:** the one 2D sprite: a hooded, floating thing drawn as pixel art ([src/sprites.js](src/sprites.js), generated in code, no image files) as a RoostR `Sprite` (an upright quad that always turns to face you; with RoostR 0.7.0, which has none, `world.js` builds the same quad itself). Fifteen frames (two idle, claws raised, hurt, five for its death, six for bursting), where flesh is drawn in red in the same orange as the other monsters, with eyes that flare as it gets angrier. It wails when it spots you, drifts in on a weaving course and rakes with its claws. Having no parts, it does not come apart when killed: five more frames play, flung back with its arms up, folded in on itself, slumped, and dissolved into embers that fade. Killed at point blank range (or with one volley far beyond what it took) it bursts instead: it swells and cracks open red, then is cut into chunks of cloth and red meat that fly out of a blooming red core, throwing droplets, and thins out; the usual blood bath comes with it.
  - **The Warden:** a giant boss in the last level, 90 health, with five horns, a pulsing core in its chest, a slam for anything close and a fan of fireballs for anything else. It goes berserk below 40% health.
  Eyes flare as a monster gets angrier, limbs jerk and recoil when hit, and every one of them dies by coming apart: the head, ribs and limbs fly off as separate bodies under gravity and land where they land. A shotgun blast at point blank range, or one volley far beyond what it took to kill, blows the whole body apart.
- **Hidden lines:** each wall face and body has a solid copy in the background colour a hair behind it. A small line shader also pulls lines slightly towards the camera so they win depth ties, and fades them into the background with distance (RoostR's fog uniforms).
- **Glow:** the neon look takes three cheap passes. The scene and the HUD's line art go into a `RenderTarget`; a small quad averages it into a target a quarter (or less) of the size, where blurring is nearly free; the final pass thickens the 1px GL lines at full resolution and adds that small texture back with additive blending. The glow therefore costs about half of a single wide-blur pass and grows much more slowly with the screen size.
- **Culling:** the world scene uses RoostR's frustum culling. The dynamic sprite batches (blood, holes) measure what they hold each time they are filled and report it with `Mesh.setLocalBounds`, so they are culled by their real size. Frames are pixel-identical with culling on and off; the saving is small on these levels but grows with them. Physics uses BumpR's grid broadphase (cells of two tiles), which cut `scene.step` from 0.086 to 0.022 ms in a 98-body stress scene.
- **Adaptive resolution:** if the frame rate stays under about 45 fps the 3D view steps down through 85%, 70% and 55% of its size, and it climbs back only after a long run of fast frames. A level that failed right after a climb is never retried, so the picture does not flap ([src/quality.js](src/quality.js), headless and tested). Press `F3` to see fps, frame time, size and scale.
- **Context loss:** if the browser drops the GPU context, the game pauses its drawing. When the context returns, RoostR rebuilds the meshes, programs and render targets (`Scene.restore`, `RenderTarget.restore`), and the sprite batches (blood, bullet holes, floor, walls) keep their data in the mesh, so RoostR rebuilds them with the rest ([World.restoreGpu](src/world.js)). The run continues exactly where it was. This needs a RoostR newer than 0.7.0; until it is published, test with the local build: `ROOSTR_LOCAL=../RoostR.js npm run dev` (build RoostR first with `npm run build:lib`).
- **Floor:** the floor of an old space base ([src/floor.js](src/floor.js), a pixel-art atlas generated in code): worn steel deck plates with rivets and scuffs, grating, round hatches, cable runs, inlaid strips of blue light, and bolted-on patches and cracked panels, with hazard striping on every doorstep. The rust is not in the tiles: the floor shader works it out per pixel from where that pixel is in the world, so it is many small patches, a third of a tile to a tile across, that gather along the seams of the plates, and carries on over the edge of a tile instead of stopping at it. Close up it is blocky, a pixel of rust per texel. One RoostR mesh draws a quad per tile ([src/quads.js](src/quads.js)), with mipmaps so the far floor does not shimmer. The steel is kept dark and the rust a dull brown, so the lines, the glow and the monsters' orange still read on top. The line grid that used to cover the floor is gone: the plate seams in the texture do its job.
- **Doors:** heavy blast doors for a space station ([src/door.js](src/door.js), a pixel-art atlas generated in code): two leaves with recessed ribbed panels, blue viewing slits, rivets, hazard-striped frame, green status lights. A door is a textured box (a RoostR `Mesh`) with no line art over it, and it still slides down into the floor as it opens, the part below the floor not drawn. It rusts like the floor, in many small patches, thicker low down; the rust is worked out on the door itself, so it stays on the door as it sinks.
- **Walls:** riveted steel bulkhead panels ([src/wall.js](src/wall.js), a pixel-art atlas generated in code): plain plates, vents, pipe runs, inlaid light strips and consoles, with a green-lit hatch on the exit. One quad per tile and per 64 units of height goes into a single RoostR mesh, plus the tops of low walls and pillars. The ceiling is one wall texture high (64 units), and the walls run right up to it, so there is no gap between them: tall walls are drawn no higher than it, the stretch above a low wall is textured too, and so is the lintel over a doorway. Only low pillars and the warden's open-sky room stop short. The panels are scattered by where the tile is, so a wall is neither a grid of copies nor noise. They rust like the doors, in small patches that are thicker low down, worked out in the shader. The blue wall outlines are gone: the panel joints do their job.
- **Ceiling:** dark steel panels overhead ([src/ceiling.js](src/ceiling.js), a pixel-art atlas generated in code): ribs, round ducts, grilles, and long light fixtures that come round in a regular rhythm, so a room reads as lit. One quad per tile in one RoostR mesh, just under the invisible roof, with the floor's rust shader. The warden's room has no ceiling, as before.
- **Solid surfaces and the neon pass:** the glow is for lines and light, so it must not touch a picture painted on a surface. The floor, walls, doors and barrels write a special alpha, and the neon pass (line thickening and glow) passes anything marked that way through as it is. Textures are therefore crisp and show their own colours, and no surface needs dimming to hide the glow.
- **Blood:** red, a fourth colour reserved for it so it never reads as an enemy or a fireball. Pellet hits spray droplets, kills burst into a fountain plus tumbling gibs, corpses spread a pool, and wounded enemies leave a trail. Droplets fly under gravity ([src/blood.js](src/blood.js), headless and tested) and leave permanent starburst splats on the floor and on wall faces ([src/splatter.js](src/splatter.js)). Both are drawn from two dynamic line buffers, and the caps keep the frame rate steady. Damage and point-blank kills also spray the player's view with splats that drip and fade. Blood is drawn as small 2D sprites, not lines ([src/bloodsprites.js](src/bloodsprites.js): one pixel-art atlas generated in code, with floor splats, wall splats with drips, shoe prints, droplets and gibs). Blood thrown up as far as the ceiling sticks there as a splat (the same sprites, just under the ceiling, over open floor and doorways but not over the warden's room; up to 140) and after a few seconds lets go of a drop or two that fall back down. A splat on a wall is just its burst: its drips are separate sprites, a stem and a small tip, that run down the wall for about two to six seconds and then stay where they stopped. They differ a lot, all worked out from the splat's seed: one to five drips, each with one of six stems (a thread, a wide ribbon, a wavy one, a beaded one, a broken dry-brush one, a double) and one of four small pointed tips (a sliver, a slant, a needle, a frayed one, never a round blob), stubs and long runs, thin and thick, and four ways of running (slowing steadily, stopping and starting again, easing in and out, or creeping at the end). They stop at the floor and at the edge of the face. Splats and prints are flat quads on the floor or the wall, cut at the edge of their face like the line versions were, and droplets and gibs are squares that face the camera. All of it goes into one RoostR mesh per kind ([src/quads.js](src/quads.js), a batch of textured quads), so it costs a few draw calls. Blood on your own view (the screen splats when something hurts you) is the same sprites, drawn flat on the screen with RoostR: a starburst that grows and a drip that runs down, fading out.
- **Bullet holes:** each pellet that hits a wall leaves a permanent hole on that face, a pixel-art sprite from [src/impacts.js](src/impacts.js) (twelve variants, drawn in code, in eight kinds of hit: a clean puncture, torn metal peeled back in bright petals, a ricochet gouge with a scrape, split plate with branching cracks and a chipped-out piece, a double hit, a dent that did not pierce, a hot hit with a wide dithered scorch and soot streaks, and a star of sharp cracks). Each crater has a dark middle, a bevelled rim lit on its upper left and in shadow on its lower right, and a thin line of bare torn steel on the lit lip; most also have a few flecks of steel round them. The pellet's sparks are a small, quick sprite animation from the same atlas, four kinds of five frames and about 15 units wide, picked at random for each hit: a tiny flash with a few sparks flying out, a short shower that falls, a glint with a couple of embers, and a ricochet thrown to one side. Pellets spread vertically as well as sideways, so holes cluster tightly up close and scatter at range. Low pillars stop a shot like any wall, so a pellet aimed over one still marks its face, spread over its height. A pellet that goes into the floor marks nothing. Marks are cut off where their wall face ends, at a corner, a doorway or a change of wall height, so a hole near an edge is clipped (and its picture with it) instead of hanging in the air; a door is clipped to its own width. Doors slide down into the floor as a whole, and what is below the floor is clipped away in the door shader. Doors take holes and blood too: the marks belong to the door and are rebuilt at the height it has now whenever it moves, so they slide down into the floor and back up with it at the same speed, at their normal size and spacing (they never stretch or run into each other), a mark that sinks below the floor is cut off there, and one that no longer fits under a half-open door is cut at its top (at most 48 holes and 24 blood splats per door). Holes are capped at 320 overall and cleared with the level.
- **Footprints:** the player, and only the player (monsters walk through blood cleanly), soaks their feet by stepping into a pool and then leaves alternating left and right shoe prints each stride. The blood wears off with every step, so the trail thins out (smaller, then plain outlines instead of hatched) and stops after a dozen or so prints. They share the splat buffer, so they cost no extra draw call.
- **The shotgun:** a pixel-art sprite ([src/weapon.js](src/weapon.js), drawn in code, no image files): a pump-action seen from behind, a blued steel barrel with a bead, a wooden pump with grooves, a receiver with its ejection port, gloved hands and sleeves. Six frames: at rest, two of muzzle flash (a hot white core inside yellow and orange tongues, with sparks, and it lights the barrel), a wisp of smoke, and two stages of working the pump, which slides back toward you and ejects a red shell. The frame comes from the time since the shot, so the animation (flash, smoke, rest, pump out, pump in) fits inside the 0.65 s between shots; an empty gun is not pumped. Each art pixel is a whole number of screen pixels, so it stays sharp; it sways as you walk and kicks up as it fires, always standing below the edge of the screen so the kick never shows a gap. It is drawn with RoostR on the finished picture, under the blood on your view, so it is never blurred by the neon pass.
- **HUD:** all of its line art is RoostR geometry ([src/overlay.js](src/overlay.js), [src/hud.js](src/hud.js)): the crosshair, health ticks, blood on your view and the hurt frame are drawn into the scene before the neon pass so they glow like the world, and the minimap is drawn on the finished picture so the thickening pass does not blur its 1px tiles. A transparent 2D canvas on top only carries text and the dimming menu screens.
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

- `src/level.js`, `src/levels.js`: ASCII tile maps (`#` wall, `T` tall wall, `o` pillar, `D` door, `X` exit, `i` imp, `b` brute, `s` skull, `c` crawler, `w` swarmer pack, `r` wraith, `B` the warden, `x` explosive barrel, `h` health, `a` ammo, `P` start)
- `src/audio.js`: synthesised sound, spatial placement, mute
- `src/fog.js`: minimap fog of war (what has been seen, what is in view)
- `src/game.js`: simulation (BumpR scene, enemy AI with a BFS flow field, doors, pickups, projectiles)
- `src/blood.js`, `src/rng.js`: blood, footprints and bullet holes (simulation), seeded generator
- `src/impacts.js`: the bullet-hole and spark sprites, and where a hole goes on a wall (headless, tested)
- `src/ceiling.js`: the ceiling texture and which panel hangs where (headless, tested)
- `src/wall.js`: the wall texture and which panel goes where (headless, tested)
- `src/door.js`: the door texture and its rust shader (headless, tested)
- `src/floor.js`: the floor texture and which pattern goes on which tile (headless, tested)
- `src/barrel.js`, `src/explosion.js`: the barrel's skin and the explosion animation, drawn in code (headless, tested)
- `src/bloodsprites.js`, `src/quads.js`: the blood sprites (atlas and where each one goes in the world, headless and tested) and the RoostR mesh that batches them
- `src/world.js`, `src/lines.js`: the RoostR 3D view, neon passes and its line geometry
- `src/monsters.js`: the monster models and their animation
- `src/sprites.js`: the wraith's pixel-art frames, drawn in code (headless, tested)
- `src/overlay.js`: RoostR 2D line and fill layers for the HUD
- `src/quality.js`: adaptive resolution (headless)
- `src/weapon.js`: the shotgun sprite, its animation and where it is drawn (headless, tested)
- `src/hud.js`: HUD, minimap geometry, text and menu screens
- `src/input.js`, `src/main.js`: input and the LoopR loop
- `dist/` is generated by `npm run build` and is not committed.
- `Dockerfile` is a multi-stage production image (Node build, nginx runtime).

## License

[MIT](LICENCE.md)
