import Phaser from 'phaser';
import { eventBus, GameEvents } from '@/systems/event-bus';

export class Phase2Scene extends Phaser.Scene {
  constructor() {
    super({ key: 'Phase2Scene' });
  }

  create(): void {
    const width = this.cameras.main.width;
    const height = this.cameras.main.height;

    this.cameras.main.setBackgroundColor('#1e2a1e');

    // Phase title
    this.add.text(width / 2, 20, 'PHASE 2: CITY BUILDING', {
      fontFamily: 'Arial Black',
      fontSize: '20px',
      color: '#2ecc71',
      stroke: '#000000',
      strokeThickness: 2,
    }).setOrigin(0.5, 0);

    // Placeholder content
    this.add.text(width / 2, height / 2 - 40, 'City Building Phase', {
      fontFamily: 'Arial',
      fontSize: '28px',
      color: '#ffffff',
    }).setOrigin(0.5, 0.5);

    this.add.text(width / 2, height / 2 + 10, 'Build farms, houses, barracks, and more!', {
      fontFamily: 'Arial',
      fontSize: '16px',
      color: '#aaaacc',
    }).setOrigin(0.5, 0.5);

    // Placeholder resource bar
    const resources = ['Food: 100', 'Wood: 50', 'Stone: 30', 'Gold: 200'];
    resources.forEach((res, i) => {
      this.add.text(20 + i * 150, height - 30, res, {
        fontFamily: 'Arial',
        fontSize: '14px',
        color: '#f39c12',
        backgroundColor: '#222244',
        padding: { x: 8, y: 4 },
      }).setScrollFactor(0).setDepth(100);
    });

    // Placeholder "Attack" button to test phase transition
    const attackBtn = this.add.text(width - 100, height - 30, 'Attack!', {
      fontFamily: 'Arial',
      fontSize: '16px',
      color: '#ffffff',
      backgroundColor: '#e74c3c',
      padding: { x: 12, y: 6 },
    }).setOrigin(0.5, 0.5).setScrollFactor(0).setDepth(100);
    attackBtn.setInteractive({ useHandCursor: true });
    attackBtn.on('pointerdown', () => {
      eventBus.emit(GameEvents.BATTLE_STARTED);
      this.scene.start('Phase3Scene');
    });

    // Back to menu (debug)
    const backBtn = this.add.text(60, height - 30, '← Menu', {
      fontFamily: 'Arial',
      fontSize: '14px',
      color: '#aaaacc',
    }).setScrollFactor(0).setDepth(100);
    backBtn.setInteractive({ useHandCursor: true });
    backBtn.on('pointerdown', () => this.scene.start('MainMenuScene'));
  }
}
