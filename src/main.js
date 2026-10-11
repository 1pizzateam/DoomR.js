import { Player } from '@1pizzateam/loopr';
import { Game } from './game.js';
import { Hud } from './hud.js';
import { Sound } from './audio.js';
import { Input } from './input.js';
import { Quality } from './quality.js';
import { TitleDirector } from './title.js';
import { World } from './world.js';

const worldCanvas = document.getElementById('world');
const hudCanvas = document.getElementById('hud');
const hud = new Hud(hudCanvas, null);
// the glow pass is per-pixel work, so the 3D view is capped at 1.5x even on denser screens
const WORLD_RATIO_CAP = 1.5;

// the HUD canvas is on top, so it receives the mouse and keyboard
const input = new Input(hudCanvas);
const game = new Game();
const sound = new Sound();
const quality = new Quality();
const title = new TitleDirector(game);
let showDiagnostics = false;
let frameTime = 1 / 60;

// if the browser drops the GPU context, the world rebuilds itself when it comes back (see World.restoreGpu)
const world = new World(worldCanvas);
hud.overlay = world.overlay;

// browsers only start audio after a gesture, so every key press or click tries to unlock it
for (const type of ['keydown', 'pointerdown'])
  window.addEventListener(type, () => sound.unlock());

function resize() {
  const ratio = window.devicePixelRatio || 1;
  if (!world.lost)
    world.resize(window.innerWidth, window.innerHeight, Math.min(ratio, WORLD_RATIO_CAP) * quality.scale);
  hud.resize(window.innerWidth, window.innerHeight, Math.min(ratio, 2));
}
window.addEventListener('resize', resize);
resize();

function start() {
  game.state = 'play';
  input.lock();
}

function confirmed() {
  return input.took('Enter') || input.took('Click') || (game.state === 'play' ? false : input.took('Space'));
}

document.addEventListener('pointerlockchange', () => {
  if (!input.locked && game.state === 'play')
    game.state = 'paused';
});

function control(dt) {
  if (input.took('KeyM'))
    hud.showMap = !hud.showMap;
  if (input.took('KeyN'))
    game.say(sound.toggleMute() ? 'Sound off' : 'Sound on', 1.5);
  if (input.took('F3')) {
    showDiagnostics = !showDiagnostics;
    hud.diagnostics = '';
  }

  switch (game.state) {
    case 'title':
      game.time += dt;
      title.update(dt);
      if (confirmed()) {
        title.end();
        start();
      }
      break;
    case 'paused':
      if (confirmed())
        start();
      break;
    case 'play':
      if (input.took('Escape') || input.took('KeyP')) {
        game.state = 'paused';
        input.unlock();
      } else if (input.took('Click') && !input.locked)
        input.lock();
      break;
    case 'dead':
      if (game.player.deadTime > 1 && confirmed()) {
        game.restart();
        input.lock();
      }
      break;
    case 'cleared':
      if (confirmed()) {
        game.nextLevel();
        if (game.state === 'play')
          input.lock();
      }
      break;
  }
}

/** Hand this frame's sound events to the audio layer, from where the player is standing. */
function hearGame() {
  const { player, cam } = game;
  // on the title screen the film's camera is the ears
  if (cam)
    sound.setListener(cam.x, cam.y, Math.atan2(cam.lookY - cam.y, cam.lookX - cam.x));
  else
    sound.setListener(player.pos.x, player.pos.y, player.angle);
  sound.setScene(game.state);
  for (const event of game.events) {
    if (cam)
      event.visible = true;
    sound.handle(event);
  }
  game.events.length = 0;
}

const loop = new Player((dt) => {
  if (!document.hidden && quality.update(dt) !== null)
    resize();
  if (showDiagnostics) {
    frameTime += (dt - frameTime) * 0.05;
    hud.diagnostics = `${Math.round(1 / frameTime)} fps  ${(frameTime * 1000).toFixed(1)} ms  ${world.width}x${world.height} (${Math.round(quality.scale * 100)}%)  glow 1/${world.glowDivisor}`;
  }
  control(dt);
  game.update(dt, input.poll());
  input.endFrame();
  hearGame();
  hud.render(game);
  if (!world.lost)
    world.render(game);
});
loop.capDelta(0.1);
loop.start();

window.doomr = { game, world, hud, loop, sound, quality };
