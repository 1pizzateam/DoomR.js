import { Player } from '@1pizzateam/groovr';
import ambient from './songs/e1m1-ambient.groovr.json' with { type: 'json' };
import metal from './songs/e1m2-industrial-metal.groovr.json' with { type: 'json' };
import horror from './songs/e1m3-horror-metal.groovr.json' with { type: 'json' };
import boss from './songs/e1m4-boss-finale.groovr.json' with { type: 'json' };
import title from './songs/intro-theme.groovr.json' with { type: 'json' };

/**
 * The soundtrack. Every score is a GroovR song made in the Cadenza editor, played by the GroovR engine:
 * no audio files, everything is synthesised live like the rest of the sound.
 */
export const SONGS = { play: ambient, metal, horror, boss, title };

export const FADE_OUT = 0.25;
export const FADE_IN = 0.25;

export class Music {
  constructor(ctx, destination) {
    this.ctx = ctx;
    this.destination = destination;
    this.player = null;
    this.mode = null;
  }

  /**
   * Fade the score in or out. Changing scores cleanly separates old and new tracks without overlap:
   * the old one fades out completely, its reverb tail included, before the new one starts.
   */
  setLevel(level, mode = 'play') {
    const changing = Boolean(this.mode && this.mode !== mode && level > 0);
    if (changing || level === 0) {
      this.player?.stop(FADE_OUT);
      this.player = null;
      this.mode = null;
    }
    if (level === 0)
      return;
    if (this.mode === mode) {
      this.player.setLevel(level);
      return;
    }
    const delay = changing ? FADE_OUT : 0.05;
    this.player = new Player(this.ctx, SONGS[mode], { destination: this.destination, level: 0 });
    this.player.play(delay);
    this.player.fadeIn(level, FADE_IN, changing ? FADE_OUT : 0);
    this.mode = mode;
  }
}
