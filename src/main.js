import { Player } from '@1pizzateam/loopr';
import { Time, Utils } from '@1pizzateam/spock';
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

// Try to start the intro music immediately on page load (works whenever the browser allows autoplay,
// such as after a reload, same-origin navigation, high media engagement, or site audio permission).
// If the browser suspends Web Audio until a gesture, the first interaction unlocks it without skipping the title.
sound.unlock();
let unlockedThisFrame = false;
for (const type of ['keydown', 'pointerdown', 'mousedown', 'touchstart'])
  window.addEventListener(type, () => {
    const locked = sound.ctx?.state !== 'running';
    sound.unlock();
    unlockedThisFrame ||= locked;
  });
for (const type of ['pointermove', 'wheel'])
  window.addEventListener(type, () => {
    if (sound.ctx?.state !== 'running')
      sound.unlock();
  }, { passive: true });

function resize() {
  const ratio = window.devicePixelRatio || 1;
  if (!world.lost)
    world.resize(window.innerWidth, window.innerHeight, Math.min(ratio, WORLD_RATIO_CAP) * quality.scale);
  hud.resize(window.innerWidth, window.innerHeight, Math.min(ratio, 2));
}
window.addEventListener('resize', resize);
resize();

function start() {
  game.selectingDifficulty = false;
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
    game.say(sound.toggleMusic(game.levelIndex), 1.5);
  if (input.took('KeyV'))
    hud.showMap = !hud.showMap;
  if (input.took('Tab') && game.state === 'play')
    hud.toggleAutomap(game);
  if (hud.automap && game.state === 'play') {
    if (input.took('Equal') || input.took('NumpadAdd'))
      hud.zoomAutomap(0.25);
    if (input.took('Minus') || input.took('NumpadSubtract'))
      hud.zoomAutomap(-0.25);
    if (input.took('KeyG'))
      hud.toggleAutomapGrid();
  }
  if (input.took('KeyN'))
    game.say(sound.toggleMute() ? 'Sound off' : 'Sound on', 1.5);
  if (input.took('F3')) {
    showDiagnostics = !showDiagnostics;
    hud.diagnostics = '';
  }

  switch (game.state) {
    case 'title':
      hud.automap = false;
      game.time += dt;
      title.update(dt);
      if (!game.selectingDifficulty) {
        if (confirmed() && !unlockedThisFrame)
          game.selectingDifficulty = true;
        break;
      }
      if (input.took('Escape')) {
        game.selectingDifficulty = false;
        break;
      }
      if (input.took('ArrowUp') || input.took('KeyW'))
        game.cycleDifficulty(-1);
      if (input.took('ArrowDown') || input.took('KeyS'))
        game.cycleDifficulty(1);
      if (input.took('Digit1'))
        game.setDifficulty(0);
      if (input.took('Digit2'))
        game.setDifficulty(1);
      if (input.took('Digit3'))
        game.setDifficulty(2);
      if (input.took('Digit4'))
        game.setDifficulty(3);
      if (input.mouseMoved) {
        const hovered = hud.difficultyAt(input.mousePos);
        if (hovered)
          game.setDifficulty(hovered);
      }
      if (confirmed() && !unlockedThisFrame) {
        const clickedDiff = hud.difficultyAt(input.mousePos);
        if (clickedDiff)
          game.setDifficulty(clickedDiff);
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
      hud.automap = false;
      if (confirmed()) {
        if (!game.skipIntermission()) {
          game.nextLevel();
          if (game.state === 'play')
            input.lock();
        }
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
  sound.setScene(game.state, game.levelIndex);
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
    frameTime = Utils.lerp(frameTime, dt, 0.05);
    const ms = Time.secToMillisec(frameTime);
    hud.diagnostics = `${Math.round(Time.millisecToFps(ms))} fps  ${ms.toFixed(1)} ms  ${world.width}x${world.height} (${Math.round(quality.scale * 100)}%)  glow 1/${world.glowDivisor}`;
  }
  control(dt);
  unlockedThisFrame = false;
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
