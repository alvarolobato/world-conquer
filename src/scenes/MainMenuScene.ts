import Phaser from 'phaser';
import { audioManager } from '@/systems/audio';

export class MainMenuScene extends Phaser.Scene {
  constructor() {
    super({ key: 'MainMenuScene' });
  }

  create(): void {
    const width = this.cameras.main.width;
    const height = this.cameras.main.height;

    this.cameras.main.setBackgroundColor('#1a1a2e');
    audioManager.playMusic('menu');

    // Title with entrance animation
    const title = this.add.text(width / 2, height * 0.2, 'WORLD CONQUER', {
      fontFamily: 'Arial Black',
      fontSize: '48px',
      color: '#4287f5',
      stroke: '#000000',
      strokeThickness: 4,
    }).setOrigin(0.5, 0.5).setAlpha(0);

    this.tweens.add({
      targets: title,
      alpha: 1,
      y: { from: height * 0.15, to: height * 0.2 },
      duration: 800,
      ease: 'Power2',
    });

    // Subtitle
    this.add.text(width / 2, height * 0.28, 'Expand. Build. Conquer.', {
      fontFamily: 'Arial', fontSize: '18px', color: '#aaaacc',
    }).setOrigin(0.5, 0.5);

    // Menu buttons helper
    const createButton = (y: number, label: string, onClick: () => void, delay: number) => {
      const btn = this.add.text(width / 2, y, label, {
        fontFamily: 'Arial', fontSize: '24px', color: '#ffffff',
        backgroundColor: '#4287f5', padding: { x: 40, y: 12 },
      }).setOrigin(0.5, 0.5).setAlpha(0).setInteractive({ useHandCursor: true });

      btn.on('pointerover', () => btn.setStyle({ backgroundColor: '#5a9cf5' }));
      btn.on('pointerout', () => btn.setStyle({ backgroundColor: '#4287f5' }));
      btn.on('pointerdown', () => {
        audioManager.playSFX('click');
        onClick();
      });

      this.tweens.add({
        targets: btn,
        alpha: 1,
        x: { from: width / 2 - 30, to: width / 2 },
        delay,
        duration: 400,
      });

      return btn;
    };

    createButton(height * 0.45, 'New Game', () => this.scene.start('LobbyScene'), 200);
    createButton(height * 0.55, 'Load Game', () => this.scene.start('LoadGameScene'), 350);
    createButton(height * 0.65, 'Settings', () => this.scene.start('SettingsScene'), 500);

    // Version
    this.add.text(10, height - 25, 'v0.1.0 - Pre-Alpha', {
      fontFamily: 'Arial', fontSize: '12px', color: '#555577',
    });
  }
}
