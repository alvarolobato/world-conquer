import Phaser from 'phaser';
import { confettiEffect } from '@/ui/effects';
import { audioManager } from '@/systems/audio';

export class VictoryScene extends Phaser.Scene {
  constructor() {
    super({ key: 'VictoryScene' });
  }

  create(data: { won: boolean }): void {
    const width = this.cameras.main.width;
    const height = this.cameras.main.height;
    const won = data?.won ?? true;

    this.cameras.main.setBackgroundColor(won ? '#1a2e1a' : '#2e1a1a');

    // Audio
    audioManager.playMusic(won ? 'victory' : 'defeat');

    // Confetti for victory
    if (won) {
      confettiEffect(this);
    }

    // Victory/Defeat title
    const title = this.add.text(width / 2, height * 0.18, won ? 'VICTORY!' : 'DEFEAT', {
      fontFamily: 'Arial Black',
      fontSize: '56px',
      color: won ? '#ffd700' : '#cc3333',
      stroke: '#000000',
      strokeThickness: 4,
    }).setOrigin(0.5, 0.5);

    // Animate title
    this.tweens.add({
      targets: title,
      scale: { from: 0.5, to: 1 },
      duration: 600,
      ease: 'Back.easeOut',
    });

    // Subtitle
    this.add.text(width / 2, height * 0.27, won
      ? 'You have conquered your enemies!'
      : 'Your civilization has fallen...', {
      fontFamily: 'Arial',
      fontSize: '16px',
      color: '#aaaaaa',
    }).setOrigin(0.5, 0.5);

    // Stats
    const stats = [
      '📍 Territories Conquered: 12',
      '🏗️ Buildings Built: 45',
      '⚔️ Battles Won: 8',
      '👥 Population: 1,250',
      '💰 Total Gold Earned: 15,000',
      '🔬 Research Completed: 6',
    ];

    stats.forEach((stat, i) => {
      const txt = this.add.text(width / 2, height * 0.35 + i * 28, stat, {
        fontFamily: 'Arial',
        fontSize: '15px',
        color: '#cccccc',
      }).setOrigin(0.5, 0.5).setAlpha(0);

      this.tweens.add({
        targets: txt,
        alpha: 1,
        x: { from: width / 2 - 30, to: width / 2 },
        delay: 300 + i * 150,
        duration: 400,
      });
    });

    // Open-ended: Keep Playing or End
    if (won) {
      this.add.text(width / 2, height * 0.68, 'You conquered the world. What now?', {
        fontFamily: 'Arial',
        fontSize: '14px',
        color: '#88aa88',
      }).setOrigin(0.5, 0.5);
    }

    // Keep Playing button
    const keepBtn = this.add.text(width / 2, height * 0.75, '🔄 Keep Playing', {
      fontFamily: 'Arial',
      fontSize: '22px',
      color: '#ffffff',
      backgroundColor: '#2ecc71',
      padding: { x: 30, y: 12 },
    }).setOrigin(0.5, 0.5);
    keepBtn.setInteractive({ useHandCursor: true });
    keepBtn.on('pointerover', () => keepBtn.setStyle({ backgroundColor: '#3ddb80' }));
    keepBtn.on('pointerout', () => keepBtn.setStyle({ backgroundColor: '#2ecc71' }));
    keepBtn.on('pointerdown', () => {
      audioManager.playSFX('click');
      this.scene.start('Phase2Scene');
    });

    // End Game button
    const endBtn = this.add.text(width / 2, height * 0.86, '🏁 End Game', {
      fontFamily: 'Arial',
      fontSize: '22px',
      color: '#ffffff',
      backgroundColor: '#e74c3c',
      padding: { x: 30, y: 12 },
    }).setOrigin(0.5, 0.5);
    endBtn.setInteractive({ useHandCursor: true });
    endBtn.on('pointerover', () => endBtn.setStyle({ backgroundColor: '#f55c4c' }));
    endBtn.on('pointerout', () => endBtn.setStyle({ backgroundColor: '#e74c3c' }));
    endBtn.on('pointerdown', () => {
      audioManager.playSFX('click');
      this.scene.start('MainMenuScene');
    });
  }
}
