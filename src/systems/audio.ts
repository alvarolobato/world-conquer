// Audio manager - manages music and SFX using Phaser's audio system
// Actual audio files will be added later; this provides the interface

export interface AudioConfig {
  masterVolume: number;
  musicVolume: number;
  sfxVolume: number;
  ambientVolume: number;
  muted: boolean;
}

const DEFAULT_CONFIG: AudioConfig = {
  masterVolume: 0.8,
  musicVolume: 0.6,
  sfxVolume: 0.8,
  ambientVolume: 0.4,
  muted: false,
};

export type MusicTrack =
  | 'menu' | 'expansion' | 'building' | 'building_thriving'
  | 'battle' | 'battle_climax' | 'victory' | 'defeat' | 'diplomacy' | 'era_advance';

export type SFXType =
  | 'click' | 'hover' | 'build' | 'build_complete' | 'demolish'
  | 'card_draw' | 'card_play' | 'card_pack_open'
  | 'coin' | 'error' | 'notification' | 'countdown_beep'
  | 'sword' | 'arrow' | 'gunshot' | 'explosion' | 'heal'
  | 'shield' | 'emp' | 'unit_death'
  | 'victory_horn' | 'defeat_horn' | 'war_horn';

class AudioManager {
  private config: AudioConfig;
  private currentMusic: MusicTrack | null = null;
  private initialized = false;

  constructor() {
    this.config = this.loadConfig();
  }

  init(_scene: Phaser.Scene): void {
    this.initialized = true;
    // When actual audio assets are loaded, initialize Phaser audio here
  }

  // Music
  playMusic(track: MusicTrack): void {
    if (this.config.muted) return;
    this.currentMusic = track;
    // TODO: Load and play actual music file when assets available
    console.log(`[Audio] Playing music: ${track}`);
  }

  stopMusic(): void {
    this.currentMusic = null;
  }

  crossfadeTo(track: MusicTrack, _durationMs: number = 2000): void {
    this.playMusic(track);
  }

  // SFX
  playSFX(type: SFXType): void {
    if (this.config.muted) return;
    // TODO: Play actual sound when assets available
  }

  // Dynamic music - adjust intensity based on game state
  setMusicIntensity(_intensity: number): void {
    // 0 = calm, 1 = intense
    // Would add/remove layered audio tracks
  }

  // Config
  setMasterVolume(vol: number): void {
    this.config.masterVolume = Math.max(0, Math.min(1, vol));
    this.saveConfig();
  }

  setMusicVolume(vol: number): void {
    this.config.musicVolume = Math.max(0, Math.min(1, vol));
    this.saveConfig();
  }

  setSFXVolume(vol: number): void {
    this.config.sfxVolume = Math.max(0, Math.min(1, vol));
    this.saveConfig();
  }

  toggleMute(): void {
    this.config.muted = !this.config.muted;
    this.saveConfig();
  }

  getConfig(): AudioConfig {
    return { ...this.config };
  }

  private loadConfig(): AudioConfig {
    try {
      const saved = localStorage.getItem('wc_audio_config');
      if (saved) return { ...DEFAULT_CONFIG, ...JSON.parse(saved) };
    } catch {}
    return { ...DEFAULT_CONFIG };
  }

  private saveConfig(): void {
    try {
      localStorage.setItem('wc_audio_config', JSON.stringify(this.config));
    } catch {}
  }
}

export const audioManager = new AudioManager();
