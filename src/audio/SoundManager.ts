/**
 * SoundManager — singleton audio manager using Web Audio API.
 *
 * Supports:
 *   1. File-based SFX — preloaded from URL (MP3 etc.)
 *   2. Synthesized SFX — generated programmatically
 *   3. Background music — looping with crossfade transitions
 *
 * Usage:
 *   import { soundManager } from './SoundManager';
 *   soundManager.play('buttonClick');
 *   soundManager.switchMusic('menuMusic');
 */

const MUTE_KEY = 'smilefit_muted';

type SynthFn = (ctx: AudioContext, destination: AudioNode) => void;

interface SoundEntry {
  type: 'buffer' | 'synth';
  buffer?: AudioBuffer;
  synth?: SynthFn;
}

class SoundManager {
  private ctx: AudioContext | null = null;
  private sounds = new Map<string, SoundEntry>();
  private muted: boolean;
  private volume = 1;

  // ── Music state ────────────────────────────────────────────
  private musicSource: AudioBufferSourceNode | null = null;
  private musicGain: GainNode | null = null;
  private currentMusic: string | null = null;
  private musicVolume = 0.3;
  /** Track name the music manager wants playing (survives mute/unmute). */
  private desiredMusic: string | null = null;

  constructor() {
    // Restore mute state from localStorage
    this.muted = localStorage.getItem(MUTE_KEY) === 'true';
  }

  /** Lazily create AudioContext (must happen after user gesture). */
  private getContext(): AudioContext {
    if (!this.ctx) {
      this.ctx = new AudioContext();
    }
    // Resume if suspended (browsers require user gesture)
    if (this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
    return this.ctx;
  }

  // ── File-based sounds ──────────────────────────────────────

  /** Preload a sound file by URL. */
  async preload(name: string, url: string): Promise<void> {
    const ctx = this.getContext();
    try {
      const res = await fetch(url);
      const arrayBuf = await res.arrayBuffer();
      const audioBuf = await ctx.decodeAudioData(arrayBuf);
      this.sounds.set(name, { type: 'buffer', buffer: audioBuf });
    } catch (e) {
      console.warn(`[SoundManager] Failed to preload "${name}":`, e);
    }
  }

  /** Preload multiple sounds at once. */
  async preloadAll(entries: Record<string, string>): Promise<void> {
    await Promise.all(
      Object.entries(entries).map(([name, url]) => this.preload(name, url)),
    );
  }

  // ── Synthesized sounds ─────────────────────────────────────

  /** Register a synthesized sound (no file needed). */
  registerSynth(name: string, fn: SynthFn): void {
    this.sounds.set(name, { type: 'synth', synth: fn });
  }

  // ── SFX Playback ─────────────────────────────────────────

  /** Play a registered sound by name. */
  play(name: string, volumeOverride?: number): void {
    if (this.muted) return;

    const entry = this.sounds.get(name);
    if (!entry) {
      console.warn(`[SoundManager] Sound "${name}" not registered`);
      return;
    }

    const ctx = this.getContext();
    const vol = volumeOverride ?? this.volume;

    // Master gain
    const gain = ctx.createGain();
    gain.gain.value = vol;
    gain.connect(ctx.destination);

    if (entry.type === 'buffer' && entry.buffer) {
      const source = ctx.createBufferSource();
      source.buffer = entry.buffer;
      source.connect(gain);
      source.onended = () => { gain.disconnect(); };
      source.start();
    } else if (entry.type === 'synth' && entry.synth) {
      entry.synth(ctx, gain);
    }
  }

  // ── Music Playback ───────────────────────────────────────

  /** Start looping a music track with fade-in. */
  playMusic(name: string, fadeInMs = 1000): void {
    if (this.currentMusic === name) return;

    const entry = this.sounds.get(name);
    if (!entry || entry.type !== 'buffer' || !entry.buffer) {
      console.warn(`[SoundManager] Music "${name}" not loaded`);
      return;
    }

    const ctx = this.getContext();

    // Stop previous music immediately (no crossfade — switchMusic handles that)
    this.stopMusicInternal(0);

    const gain = ctx.createGain();
    gain.gain.setValueAtTime(0, ctx.currentTime);
    gain.gain.linearRampToValueAtTime(this.musicVolume, ctx.currentTime + fadeInMs / 1000);
    gain.connect(ctx.destination);

    const source = ctx.createBufferSource();
    source.buffer = entry.buffer;
    source.loop = true;
    source.connect(gain);
    source.start();

    // Clean up on end (e.g., if stopped externally)
    source.onended = () => {
      if (this.musicSource === source) {
        this.musicSource = null;
        this.musicGain = null;
        this.currentMusic = null;
      }
    };

    this.musicSource = source;
    this.musicGain = gain;
    this.currentMusic = name;
  }

  /** Stop current music with fade-out. */
  stopMusic(fadeOutMs = 500): void {
    this.desiredMusic = null;
    this.stopMusicInternal(fadeOutMs);
  }

  private stopMusicInternal(fadeOutMs: number): void {
    if (!this.musicSource || !this.musicGain || !this.ctx) {
      this.currentMusic = null;
      return;
    }

    const ctx = this.ctx;
    const gain = this.musicGain;
    const source = this.musicSource;

    if (fadeOutMs <= 0) {
      try { source.stop(); } catch { /* already stopped */ }
      this.musicSource = null;
      this.musicGain = null;
      this.currentMusic = null;
      return;
    }

    // Fade out then stop
    gain.gain.setValueAtTime(gain.gain.value, ctx.currentTime);
    gain.gain.linearRampToValueAtTime(0, ctx.currentTime + fadeOutMs / 1000);

    // Clear refs immediately so new music can start
    this.musicSource = null;
    this.musicGain = null;
    this.currentMusic = null;

    setTimeout(() => {
      try { source.stop(); } catch { /* already stopped */ }
    }, fadeOutMs + 50);
  }

  /**
   * Switch to a different music track with crossfade.
   * No-op if already playing the requested track.
   */
  switchMusic(name: string, crossfadeMs = 1000): void {
    this.desiredMusic = name;
    if (this.muted) return;
    if (this.currentMusic === name) return;

    // Fade out old
    if (this.currentMusic) {
      this.stopMusicInternal(crossfadeMs);
    }

    // Fade in new (slight delay to overlap)
    setTimeout(() => {
      // Only start if still desired and not muted
      if (this.desiredMusic === name && !this.muted) {
        this.playMusic(name, crossfadeMs);
      }
    }, Math.max(crossfadeMs - 200, 0));
  }

  setMusicVolume(v: number): void {
    this.musicVolume = Math.max(0, Math.min(1, v));
    // Update live music gain if playing
    if (this.musicGain && this.ctx) {
      this.musicGain.gain.setValueAtTime(this.musicVolume, this.ctx.currentTime);
    }
  }

  // ── Controls ───────────────────────────────────────────────

  setMuted(muted: boolean): void {
    this.muted = muted;
    localStorage.setItem(MUTE_KEY, String(muted));

    if (muted) {
      // Fade out music immediately
      this.stopMusicInternal(300);
    } else {
      // Resume desired music if set
      if (this.desiredMusic) {
        this.playMusic(this.desiredMusic, 500);
      }
    }
  }

  isMuted(): boolean {
    return this.muted;
  }

  setVolume(v: number): void {
    this.volume = Math.max(0, Math.min(1, v));
  }

  /** Start desired music after preload completes (first gesture). */
  resumeAfterPreload(): void {
    if (!this.muted && this.desiredMusic && !this.currentMusic) {
      this.playMusic(this.desiredMusic);
    }
  }
}

// ── Singleton export ───────────────────────────────────────────
export const soundManager = new SoundManager();

// ── Synthesized SFX (registered eagerly — no preload needed) ──
// Soft tactile pop — short sine burst with quick decay
function synthButtonClick(ctx: AudioContext, destination: AudioNode): void {
  const now = ctx.currentTime;
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();

  osc.type = 'sine';
  osc.frequency.setValueAtTime(1800, now);
  osc.frequency.exponentialRampToValueAtTime(600, now + 0.06);

  gain.gain.setValueAtTime(0.15, now);
  gain.gain.exponentialRampToValueAtTime(0.001, now + 0.08);

  osc.connect(gain);
  gain.connect(destination);
  osc.start(now);
  osc.stop(now + 0.08);
  osc.onended = () => { gain.disconnect(); };
}
soundManager.registerSynth('buttonClick', synthButtonClick);

// Bright ascending chirp — quick upward sweep for forward navigation
function synthNavForward(ctx: AudioContext, destination: AudioNode): void {
  const now = ctx.currentTime;
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();

  osc.type = 'sine';
  osc.frequency.setValueAtTime(800, now);
  osc.frequency.exponentialRampToValueAtTime(1600, now + 0.07);

  gain.gain.setValueAtTime(0.12, now);
  gain.gain.exponentialRampToValueAtTime(0.001, now + 0.1);

  osc.connect(gain);
  gain.connect(destination);
  osc.start(now);
  osc.stop(now + 0.1);
  osc.onended = () => { gain.disconnect(); };
}
soundManager.registerSynth('navForward', synthNavForward);

// ── Sound manifest — all file-based sounds ─────────────────────
const SOUND_MANIFEST: Record<string, string> = {
  // Existing
  calibrationDone: '/sounds/calibrationDone.mp3',

  // Navigation — navForward is synthesized (registered above)
  navBack: '/sounds/sfx/navBack.mp3',

  // Calibration
  calibrationTick: '/sounds/sfx/calibrationTick.mp3',

  // Countdown
  countdownBeep: '/sounds/sfx/countdownBeep.mp3',
  countdownGo: '/sounds/sfx/countdownGo.mp3',

  // Balloon game
  balloonPop: '/sounds/sfx/balloonPop.mp3',
  obstaclePass: '/sounds/sfx/obstaclePass.mp3',
  scoreMilestone: '/sounds/sfx/scoreMilestone.mp3',

  // Tetris game
  pieceMove: '/sounds/sfx/pieceMove.mp3',
  pieceRotate: '/sounds/sfx/pieceRotate.mp3',
  pieceLock: '/sounds/sfx/pieceLock.mp3',
  lineClear: '/sounds/sfx/lineClear.mp3',
  tetrisClear: '/sounds/sfx/tetrisClear.mp3',
  levelUp: '/sounds/sfx/levelUp.mp3',

  // Results
  gameEnd: '/sounds/sfx/gameEnd.mp3',
  newRecord: '/sounds/sfx/newRecord.mp3',

  // Tutorial
  tutorialSuccess: '/sounds/sfx/tutorialSuccess.mp3',
  tutorialPhaseComplete: '/sounds/sfx/tutorialPhaseComplete.mp3',

  // Music tracks
  menuMusic: '/sounds/music/menu.mp3',
  balloonMusic: '/sounds/music/balloon.mp3',
  tetrisMusic: '/sounds/music/tetris.mp3',
  resultsMusic: '/sounds/music/results.mp3',
  leaderboardMusic: '/sounds/music/leaderboard.mp3',
};

/**
 * Preload all sounds. Call once after first user gesture
 * (AudioContext requires a user interaction to start).
 */
let preloaded = false;

export function preloadAllSounds(): void {
  if (preloaded) return;
  preloaded = true;

  soundManager.preloadAll(SOUND_MANIFEST).then(() => {
    soundManager.resumeAfterPreload();
  });
}
