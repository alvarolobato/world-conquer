import Phaser from 'phaser';
import { GAME_CONFIG, PLAYER_COLORS } from '@/config/game-config';
import { AIPersonality } from '@/types/game';

interface PlayerSlot {
  name: string;
  isAI: boolean;
  aiPersonality: AIPersonality;
  color: number;
  ready: boolean;
}

export class LobbyScene extends Phaser.Scene {
  private playerSlots: PlayerSlot[] = [];
  private mapSize: 'small' | 'medium' | 'large' = 'medium';

  constructor() {
    super({ key: 'LobbyScene' });
  }

  create(): void {
    const width = this.cameras.main.width;
    const height = this.cameras.main.height;

    this.cameras.main.setBackgroundColor('#1a1a2e');

    // Title
    const title = this.add.text(width / 2, 40, 'Game Lobby', {
      fontFamily: 'Arial Black',
      fontSize: '32px',
      color: '#4287f5',
    });
    title.setOrigin(0.5, 0.5);

    // Initialize player slots
    this.playerSlots = [
      { name: 'Player 1 (You)', isAI: false, aiPersonality: AIPersonality.BALANCED, color: PLAYER_COLORS[0], ready: false },
      { name: 'AI - Aggressive', isAI: true, aiPersonality: AIPersonality.AGGRESSIVE, color: PLAYER_COLORS[1], ready: true },
      { name: 'Empty', isAI: true, aiPersonality: AIPersonality.DEFENSIVE, color: PLAYER_COLORS[2], ready: false },
      { name: 'Empty', isAI: true, aiPersonality: AIPersonality.ECONOMIC, color: PLAYER_COLORS[3], ready: false },
    ];

    // Draw player slots
    const slotStartY = 100;
    this.playerSlots.forEach((slot, index) => {
      const y = slotStartY + index * 70;
      const colorHex = `#${slot.color.toString(16).padStart(6, '0')}`;

      // Color indicator
      const colorBox = this.add.graphics();
      colorBox.fillStyle(slot.color, 1);
      colorBox.fillRoundedRect(width / 2 - 200, y - 15, 30, 30, 4);

      // Player name
      this.add.text(width / 2 - 155, y, slot.name, {
        fontFamily: 'Arial',
        fontSize: '18px',
        color: slot.name === 'Empty' ? '#555577' : colorHex,
      }).setOrigin(0, 0.5);

      // AI/Human indicator
      if (index > 0) {
        const aiText = this.add.text(width / 2 + 100, y, slot.isAI ? 'AI' : 'Human', {
          fontFamily: 'Arial',
          fontSize: '14px',
          color: '#aaaacc',
          backgroundColor: '#333355',
          padding: { x: 8, y: 4 },
        }).setOrigin(0.5, 0.5);
        aiText.setInteractive({ useHandCursor: true });
      }
    });

    // Map size selector
    const mapSizeY = slotStartY + 4 * 70 + 30;
    this.add.text(width / 2, mapSizeY, 'Map Size', {
      fontFamily: 'Arial',
      fontSize: '18px',
      color: '#aaaacc',
    }).setOrigin(0.5, 0.5);

    const sizes: Array<'small' | 'medium' | 'large'> = ['small', 'medium', 'large'];
    sizes.forEach((size, i) => {
      const btn = this.add.text(
        width / 2 - 100 + i * 100,
        mapSizeY + 35,
        size.charAt(0).toUpperCase() + size.slice(1),
        {
          fontFamily: 'Arial',
          fontSize: '16px',
          color: this.mapSize === size ? '#4287f5' : '#aaaacc',
          backgroundColor: this.mapSize === size ? '#333366' : '#222244',
          padding: { x: 12, y: 6 },
        }
      );
      btn.setOrigin(0.5, 0.5);
      btn.setInteractive({ useHandCursor: true });
      btn.on('pointerdown', () => {
        this.mapSize = size;
        this.scene.restart();
      });
    });

    // Start Game button
    const startBtn = this.add.text(width / 2, height - 80, 'Start Game', {
      fontFamily: 'Arial',
      fontSize: '28px',
      color: '#ffffff',
      backgroundColor: '#2ecc71',
      padding: { x: 50, y: 15 },
    });
    startBtn.setOrigin(0.5, 0.5);
    startBtn.setInteractive({ useHandCursor: true });
    startBtn.on('pointerover', () => startBtn.setStyle({ backgroundColor: '#3ddb80' }));
    startBtn.on('pointerout', () => startBtn.setStyle({ backgroundColor: '#2ecc71' }));
    startBtn.on('pointerdown', () => {
      const activePlayers = this.playerSlots.filter((s) => s.name !== 'Empty');
      if (activePlayers.length >= GAME_CONFIG.MIN_PLAYERS) {
        this.scene.start('Phase1Scene', {
          players: activePlayers,
          mapSize: this.mapSize,
        });
      }
    });

    // Back button
    const backBtn = this.add.text(60, height - 30, '← Back', {
      fontFamily: 'Arial',
      fontSize: '16px',
      color: '#aaaacc',
    });
    backBtn.setOrigin(0.5, 0.5);
    backBtn.setInteractive({ useHandCursor: true });
    backBtn.on('pointerdown', () => this.scene.start('MainMenuScene'));
  }
}
