import Phaser from 'phaser';
import { audioManager } from '@/systems/audio';

export class SettingsScene extends Phaser.Scene {
  constructor() {
    super({ key: 'SettingsScene' });
  }

  create(): void {
    const w = this.cameras.main.width;
    const h = this.cameras.main.height;
    const config = audioManager.getConfig();

    this.cameras.main.setBackgroundColor('#1a1a2e');

    // Title
    this.add.text(w / 2, 40, 'SETTINGS', {
      fontFamily: 'Arial Black', fontSize: '32px', color: '#4287f5',
    }).setOrigin(0.5, 0.5);

    // --- Audio Section ---
    this.add.text(w / 2, 100, 'Audio', {
      fontFamily: 'Arial Black', fontSize: '18px', color: '#ffffff',
    }).setOrigin(0.5, 0.5);

    const sliders: Array<{ label: string; value: number; setter: (v: number) => void }> = [
      { label: 'Master Volume', value: config.masterVolume, setter: (v) => audioManager.setMasterVolume(v) },
      { label: 'Music Volume', value: config.musicVolume, setter: (v) => audioManager.setMusicVolume(v) },
      { label: 'SFX Volume', value: config.sfxVolume, setter: (v) => audioManager.setSFXVolume(v) },
    ];

    sliders.forEach((s, i) => {
      const y = 140 + i * 55;
      this.add.text(w / 2 - 150, y, s.label, {
        fontFamily: 'Arial', fontSize: '14px', color: '#aaaacc',
      }).setOrigin(0, 0.5);

      // Slider track
      const trackX = w / 2 + 20;
      const trackW = 180;
      const track = this.add.graphics();
      track.fillStyle(0x333355, 1);
      track.fillRoundedRect(trackX, y - 5, trackW, 10, 5);

      // Slider handle
      const handleX = trackX + trackW * s.value;
      const handle = this.add.graphics();
      handle.fillStyle(0x4287f5, 1);
      handle.fillCircle(handleX, y, 10);

      // Value text
      const valText = this.add.text(trackX + trackW + 25, y, `${Math.round(s.value * 100)}%`, {
        fontFamily: 'Arial', fontSize: '12px', color: '#ffffff',
      }).setOrigin(0, 0.5);

      // Interactive zone
      const hitZone = this.add.zone(trackX + trackW / 2, y, trackW + 20, 30).setInteractive();
      hitZone.on('pointerdown', (ptr: Phaser.Input.Pointer) => {
        const pct = Phaser.Math.Clamp((ptr.x - trackX) / trackW, 0, 1);
        s.setter(pct);
        handle.clear();
        handle.fillStyle(0x4287f5, 1);
        handle.fillCircle(trackX + trackW * pct, y, 10);
        valText.setText(`${Math.round(pct * 100)}%`);
      });
    });

    // Mute toggle
    const muteY = 140 + sliders.length * 55 + 10;
    const muteBtn = this.add.text(w / 2, muteY, config.muted ? '🔇 Unmute' : '🔊 Mute', {
      fontFamily: 'Arial', fontSize: '16px', color: '#ffffff',
      backgroundColor: config.muted ? '#cc4444' : '#333355',
      padding: { x: 20, y: 8 },
    }).setOrigin(0.5, 0.5).setInteractive({ useHandCursor: true });
    muteBtn.on('pointerdown', () => {
      audioManager.toggleMute();
      const nowMuted = audioManager.getConfig().muted;
      muteBtn.setText(nowMuted ? '🔇 Unmute' : '🔊 Mute');
      muteBtn.setStyle({ backgroundColor: nowMuted ? '#cc4444' : '#333355' });
    });

    // --- Controls Section ---
    this.add.text(w / 2, muteY + 70, 'Controls', {
      fontFamily: 'Arial Black', fontSize: '18px', color: '#ffffff',
    }).setOrigin(0.5, 0.5);

    const controls = [
      'Left Click: Select / Place building / Deploy card',
      'Right Click + Drag: Pan camera',
      'Scroll Wheel: Zoom in/out',
      'ESC: Back to menu',
    ];
    controls.forEach((ctrl, i) => {
      this.add.text(w / 2, muteY + 105 + i * 25, ctrl, {
        fontFamily: 'Arial', fontSize: '13px', color: '#888899',
      }).setOrigin(0.5, 0.5);
    });

    // --- Back button ---
    const backBtn = this.add.text(w / 2, h - 60, '← Back to Menu', {
      fontFamily: 'Arial', fontSize: '20px', color: '#ffffff',
      backgroundColor: '#333355', padding: { x: 30, y: 10 },
    }).setOrigin(0.5, 0.5).setInteractive({ useHandCursor: true });
    backBtn.on('pointerover', () => backBtn.setStyle({ backgroundColor: '#444466' }));
    backBtn.on('pointerout', () => backBtn.setStyle({ backgroundColor: '#333355' }));
    backBtn.on('pointerdown', () => this.scene.start('MainMenuScene'));

    // ESC key
    this.input.keyboard?.on('keydown-ESC', () => this.scene.start('MainMenuScene'));
  }
}
