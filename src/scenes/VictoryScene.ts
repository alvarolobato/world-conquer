import Phaser from 'phaser';

export class VictoryScene extends Phaser.Scene {
  constructor() {
    super({ key: 'VictoryScene' });
  }

  create(data: { won: boolean }): void {
    const width = this.cameras.main.width;
    const height = this.cameras.main.height;
    const won = data?.won ?? true;

    this.cameras.main.setBackgroundColor(won ? '#1a2e1a' : '#2e1a1a');

    // Victory/Defeat title
    this.add.text(width / 2, height * 0.2, won ? 'VICTORY!' : 'DEFEAT', {
      fontFamily: 'Arial Black',
      fontSize: '56px',
      color: won ? '#ffd700' : '#cc3333',
      stroke: '#000000',
      strokeThickness: 4,
    }).setOrigin(0.5, 0.5);

    // Stats placeholder
    const stats = [
      'Territories Conquered: 12',
      'Buildings Built: 45',
      'Battles Won: 8',
      'Population: 1,250',
      'Total Gold Earned: 15,000',
    ];

    stats.forEach((stat, i) => {
      this.add.text(width / 2, height * 0.35 + i * 30, stat, {
        fontFamily: 'Arial',
        fontSize: '16px',
        color: '#cccccc',
      }).setOrigin(0.5, 0.5);
    });

    // Keep Playing button
    const keepBtn = this.add.text(width / 2, height * 0.7, 'Keep Playing', {
      fontFamily: 'Arial',
      fontSize: '24px',
      color: '#ffffff',
      backgroundColor: '#2ecc71',
      padding: { x: 30, y: 12 },
    }).setOrigin(0.5, 0.5);
    keepBtn.setInteractive({ useHandCursor: true });
    keepBtn.on('pointerdown', () => {
      this.scene.start('Phase2Scene');
    });

    // End Game button
    const endBtn = this.add.text(width / 2, height * 0.82, 'End Game', {
      fontFamily: 'Arial',
      fontSize: '24px',
      color: '#ffffff',
      backgroundColor: '#e74c3c',
      padding: { x: 30, y: 12 },
    }).setOrigin(0.5, 0.5);
    endBtn.setInteractive({ useHandCursor: true });
    endBtn.on('pointerdown', () => {
      this.scene.start('MainMenuScene');
    });
  }
}
