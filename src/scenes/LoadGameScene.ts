import Phaser from 'phaser';
import { saveManager } from '@/systems/save-manager';
import type { SaveData } from '@/types/game';

export class LoadGameScene extends Phaser.Scene {
  private savesList: SaveData[] = [];
  private listContainer!: Phaser.GameObjects.Container;
  private statusText!: Phaser.GameObjects.Text;

  constructor() {
    super({ key: 'LoadGameScene' });
  }

  async create(): Promise<void> {
    const w = this.cameras.main.width;
    const h = this.cameras.main.height;

    this.cameras.main.setBackgroundColor('#1a1a2e');

    // Title
    this.add.text(w / 2, 40, 'LOAD GAME', {
      fontFamily: 'Arial Black', fontSize: '32px', color: '#4287f5',
    }).setOrigin(0.5, 0.5);

    // Status
    this.statusText = this.add.text(w / 2, 80, 'Loading saves...', {
      fontFamily: 'Arial', fontSize: '14px', color: '#888899',
    }).setOrigin(0.5, 0.5);

    // List container
    this.listContainer = this.add.container(0, 0);

    // Back button
    const backBtn = this.add.text(w / 2, h - 50, '← Back to Menu', {
      fontFamily: 'Arial', fontSize: '20px', color: '#ffffff',
      backgroundColor: '#333355', padding: { x: 30, y: 10 },
    }).setOrigin(0.5, 0.5).setInteractive({ useHandCursor: true });
    backBtn.on('pointerover', () => backBtn.setStyle({ backgroundColor: '#444466' }));
    backBtn.on('pointerout', () => backBtn.setStyle({ backgroundColor: '#333355' }));
    backBtn.on('pointerdown', () => this.scene.start('MainMenuScene'));

    // ESC key
    this.input.keyboard?.on('keydown-ESC', () => this.scene.start('MainMenuScene'));

    // Load saves
    await this.loadSavesList();
  }

  private async loadSavesList(): Promise<void> {
    try {
      await saveManager.init();
      this.savesList = await saveManager.listSaves();
    } catch {
      this.savesList = [];
    }

    this.listContainer.removeAll(true);

    const w = this.cameras.main.width;

    if (this.savesList.length === 0) {
      this.statusText.setText('No saved games found.');
      this.add.text(w / 2, 180, 'Start a New Game from the main menu!', {
        fontFamily: 'Arial', fontSize: '16px', color: '#666688',
      }).setOrigin(0.5, 0.5);
      return;
    }

    this.statusText.setText(`${this.savesList.length} save(s) found`);

    this.savesList.forEach((save, i) => {
      const y = 120 + i * 70;
      const date = new Date(save.timestamp);
      const dateStr = date.toLocaleDateString() + ' ' + date.toLocaleTimeString();
      const phase = save.state?.phase || 'unknown';

      // Save card background
      const bg = this.add.graphics();
      bg.fillStyle(0x222244, 0.9);
      bg.fillRoundedRect(w / 2 - 200, y, 400, 55, 6);
      this.listContainer.add(bg);

      // Game info
      const title = this.add.text(w / 2 - 180, y + 10, `Game: ${save.gameId.slice(0, 8)}...`, {
        fontFamily: 'Arial', fontSize: '14px', color: '#ffffff',
      });
      this.listContainer.add(title);

      const info = this.add.text(w / 2 - 180, y + 30, `${dateStr} | Phase: ${phase}`, {
        fontFamily: 'Arial', fontSize: '11px', color: '#888899',
      });
      this.listContainer.add(info);

      // Load button
      const loadBtn = this.add.text(w / 2 + 100, y + 18, 'Load', {
        fontFamily: 'Arial', fontSize: '14px', color: '#44ff44',
        backgroundColor: '#224422', padding: { x: 12, y: 6 },
      }).setOrigin(0.5, 0.5).setInteractive({ useHandCursor: true });
      loadBtn.on('pointerdown', () => this.loadGame(save));
      this.listContainer.add(loadBtn);

      // Delete button
      const delBtn = this.add.text(w / 2 + 170, y + 18, 'Delete', {
        fontFamily: 'Arial', fontSize: '14px', color: '#ff4444',
        backgroundColor: '#442222', padding: { x: 12, y: 6 },
      }).setOrigin(0.5, 0.5).setInteractive({ useHandCursor: true });
      delBtn.on('pointerdown', () => this.deleteSave(save.gameId));
      this.listContainer.add(delBtn);
    });
  }

  private loadGame(save: SaveData): void {
    this.statusText.setText(`Loading game ${save.gameId.slice(0, 8)}...`).setColor('#44ff44');

    // Determine which scene to start based on saved phase
    const phase = save.state?.phase;
    if (phase === 'phase_2_building') {
      this.scene.start('Phase2Scene', { map: save.state.map, players: save.state.players });
    } else if (phase === 'phase_3_combat') {
      this.scene.start('Phase3Scene', save.state);
    } else {
      // Default to lobby for new/unknown
      this.scene.start('LobbyScene');
    }
  }

  private async deleteSave(gameId: string): Promise<void> {
    try {
      await saveManager.deleteSave(gameId);
      this.statusText.setText('Save deleted.').setColor('#ff8844');
      await this.loadSavesList();
    } catch {
      this.statusText.setText('Failed to delete save.').setColor('#ff4444');
    }
  }
}
