import { Player, Quality } from '@1pizzateam/loopr';
import { Time, Vec2 } from '@1pizzateam/spock';
import { Game } from './game.js';
import { Hud } from './hud.js';
import { Sound } from './audio.js';
import { Input, NAV_DOWN, NAV_LEFT, NAV_RIGHT, NAV_UP } from './input.js';
import { ControlsMenu } from './controls.js';
import { CONTROLS_STORAGE_KEY } from './keymap.js';
import { MainMenu, MENU_OPTIONS, MENU_PLAY } from './menu.js';
import { TitleDirector } from './title.js';
import { World } from './world.js';
import { loadHeadAssets } from './head.js';

const worldCanvas = document.getElementById('world');
const hudCanvas = document.getElementById('hud');
const hud = new Hud(hudCanvas, null);
// the glow pass is per-pixel work, so the 3D view is capped at 1.5x even on denser screens
const WORLD_RATIO_CAP = 1.5;

// the HUD canvas is on top, so it receives the mouse and keyboard
const input = new Input(hudCanvas);
const keymap = input.keymap;
let hintVersion = -1;
const game = new Game();
game.hitStopEnabled = true;
const urlLevel = new URLSearchParams(window.location.search).get('level');
if (urlLevel) {
  const m = urlLevel.match(/(\d+)/);
  if (m)
    game.setLevel(Number(m[1]) - 1);
}
const controlsMenu = new ControlsMenu(keymap, input, { hitAt: (pos) => hud.controlsHitAt(pos) });
hud.controlsView = controlsMenu.view;
const mainMenu = new MainMenu(input, { hitAt: (pos) => hud.menuHitAt(pos) });
hud.mainMenuView = mainMenu.view;
game.keyLabel = (id) => keymap.actionLabel(id);
window.addEventListener('storage', (event) => {
  if (event.key === CONTROLS_STORAGE_KEY || event.key === null)
    keymap.reload();
});
const sound = new Sound();
const quality = new Quality();
const title = new TitleDirector(game);
let showDiagnostics = false;

// the HUD portrait's head is a static asset (FaceR bundles none; it lives in src/heads), so fetch it before the world builds the overlay
await loadHeadAssets();

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
  return input.took('confirm') || input.took('Click') || (game.state === 'play' ? false : input.took('jump'));
}

document.addEventListener('pointerlockchange', () => {
  if (!input.locked && game.state === 'play')
    game.state = 'paused';
});

function control(dt) {
  input.syncBindings();
  if (keymap.version !== hintVersion) {
    hud.controlHints = keymap.hintLines;
    hud.selectHint = keymap.selectHint;
    hud.setControlsStatus(keymap.actionLabel('controls'), keymap.unboundActions().length);
    hud.useKeyLabel = keymap.actionLabel('use');
    hud.setPauseKeyLabel(keymap.actionLabel('pause'));
    hintVersion = keymap.version;
  }
  if (controlsMenu.isOpen) {
    if (controlsMenu.returnState === 'title') {
      hud.automap = false;
      game.time += dt;
      title.update(dt);
    }
    controlsMenu.update(dt, game);
    return;
  }
  if (input.took('music'))
    game.say(sound.toggleMusic(game.levelIndex), 1.5);
  if (input.took('map'))
    hud.showMap = !hud.showMap;
  if (input.took('automap') && game.state === 'play')
    hud.toggleAutomap(game);
  if (hud.automap && game.state === 'play') {
    if (input.took('zoomIn'))
      hud.zoomAutomap(0.25);
    if (input.took('zoomOut'))
      hud.zoomAutomap(-0.25);
    if (input.took('automapGrid'))
      hud.toggleAutomapGrid();
  }
  if (input.took('sound'))
    game.say(sound.toggleMute() ? 'Sound off' : 'Sound on', 1.5);
  if (input.took('diagnostics')) {
    showDiagnostics = !showDiagnostics;
    hud.diagnostics = '';
  }
  if (game.state === 'play' || game.state === 'paused') {
    if (input.took('levelPrev'))
      game.cycleLevel(-1);
    if (input.took('levelNext'))
      game.cycleLevel(1);
  }

  if ((game.state === 'title' || game.state === 'paused' || game.state === 'play')
    && (input.took('controls') || (game.state === 'paused' && input.took('Click') && !unlockedThisFrame && hud.controlsButtonAt(input.mousePos, game)))) {
    if (game.state === 'play') {
      game.state = 'paused';
      input.unlock();
    }
    controlsMenu.open(game.state === 'title' ? 'title' : 'paused');
    return;
  }

  switch (game.state) {
    case 'title':
      hud.automap = false;
      game.time += dt;
      title.update(dt);
      if (!game.selectingDifficulty) {
        mainMenu.update(unlockedThisFrame);
        if (mainMenu.activated === MENU_PLAY) {
          game.selectingDifficulty = true;
          mainMenu.focus(MENU_PLAY);
        } else if (mainMenu.activated === MENU_OPTIONS)
          controlsMenu.open('title');
        break;
      }
      if (input.took('menu')) {
        game.selectingDifficulty = false;
        mainMenu.focus(MENU_PLAY);
        break;
      }
      const nav = input.navigate();
      if (nav === NAV_UP)
        game.cycleDifficulty(-1);
      if (nav === NAV_DOWN)
        game.cycleDifficulty(1);
      if (nav === NAV_LEFT || input.took('levelPrev'))
        game.cycleLevel(-1);
      if (nav === NAV_RIGHT || input.took('levelNext'))
        game.cycleLevel(1);
      if (input.took('weapon1'))
        game.setDifficulty(0);
      if (input.took('weapon2'))
        game.setDifficulty(1);
      if (input.took('weapon3'))
        game.setDifficulty(2);
      if (input.took('weapon4'))
        game.setDifficulty(3);
      if (input.mouseMoved) {
        const hovered = hud.difficultyAt(input.mousePos);
        if (hovered)
          game.setDifficulty(hovered);
      }
      if (input.took('Click') && !unlockedThisFrame) {
        const levelStep = hud.levelStepAt(input.mousePos);
        if (levelStep !== 0) {
          game.cycleLevel(levelStep);
          break;
        }
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
      if (confirmed() || input.took('pause'))
        start();
      break;
    case 'play':
      if (input.took('menu') || input.took('pause')) {
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
      if (confirmed() && !game.skipIntermission()) {
        game.nextLevel();
        if (game.state === 'play')
          input.lock();
      }
      break;
  }
}

const cameraEars = new Vec2();

/** Hand this frame's sound events to the audio layer, from where the player is standing. */
function hearGame() {
  const { player, cam } = game;
  // on the title screen the film's camera is the ears
  if (cam)
    sound.setListener(cameraEars.setScalar(cam.x, cam.y), Math.atan2(cam.lookY - cam.y, cam.lookX - cam.x));
  else
    sound.setListener(player.pos, player.angle);
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
  const fps = loop.getFPS();
  hud.fps = fps;
  if (showDiagnostics) {
    const ms = fps > 0 ? Time.fpsToMillisec(fps) : 0;
    hud.diagnostics = `${Math.round(fps)} fps  ${ms.toFixed(1)} ms  ${world.width}x${world.height} (${Math.round(quality.scale * 100)}%)  glow 1/${world.glowDivisor}`;
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
