import Phaser from 'phaser';
import { GAME_CONFIG } from '@/config/game-config';
import { eventBus, GameEvents } from '@/systems/event-bus';

export class Phase3Scene extends Phaser.Scene {
  private elixir: number = GAME_CONFIG.START_ELIXIR;
  private elixirText!: Phaser.GameObjects.Text;
  private battleTimer: number = GAME_CONFIG.BATTLE_DURATION;
  private timerText!: Phaser.GameObjects.Text;

  constructor() {
    super({ key: 'Phase3Scene' });
  }

  create(): void {
    const width = this.cameras.main.width;
    const height = this.cameras.main.height;

    this.elixir = GAME_CONFIG.START_ELIXIR;
    this.battleTimer = GAME_CONFIG.BATTLE_DURATION;

    this.cameras.main.setBackgroundColor('#2a1e1e');

    // Phase title
    this.add.text(width / 2, 20, 'PHASE 3: COMBAT', {
      fontFamily: 'Arial Black',
      fontSize: '20px',
      color: '#e74c3c',
      stroke: '#000000',
      strokeThickness: 2,
    }).setOrigin(0.5, 0);

    // Battle timer
    this.timerText = this.add.text(width / 2, 55, this.formatTime(this.battleTimer), {
      fontFamily: 'Arial Black',
      fontSize: '24px',
      color: '#ffffff',
    }).setOrigin(0.5, 0);

    // Placeholder battlefield
    this.add.text(width / 2, height / 2, 'Battlefield', {
      fontFamily: 'Arial',
      fontSize: '28px',
      color: '#ffffff',
    }).setOrigin(0.5, 0.5);

    // Dividing line (border between territories)
    const divider = this.add.graphics();
    divider.lineStyle(3, 0xff4444, 0.8);
    divider.lineBetween(width / 2, 80, width / 2, height - 80);

    this.add.text(width * 0.25, height / 2 - 40, 'Your Territory', {
      fontFamily: 'Arial', fontSize: '14px', color: '#4287f5',
    }).setOrigin(0.5, 0.5);

    this.add.text(width * 0.75, height / 2 - 40, 'Enemy Territory', {
      fontFamily: 'Arial', fontSize: '14px', color: '#e74c3c',
    }).setOrigin(0.5, 0.5);

    // Elixir bar
    this.elixirText = this.add.text(width / 2, height - 80, `Elixir: ${this.elixir}/${GAME_CONFIG.MAX_ELIXIR}`, {
      fontFamily: 'Arial',
      fontSize: '18px',
      color: '#e066ff',
    }).setOrigin(0.5, 0.5);

    // Placeholder card hand
    const cardNames = ['Militia (2)', 'Archers (3)', 'Knights (4)', 'Heal (3)'];
    cardNames.forEach((card, i) => {
      const cardX = width / 2 - 180 + i * 120;
      const cardBtn = this.add.text(cardX, height - 35, card, {
        fontFamily: 'Arial',
        fontSize: '13px',
        color: '#ffffff',
        backgroundColor: '#444466',
        padding: { x: 10, y: 8 },
      }).setOrigin(0.5, 0.5);
      cardBtn.setInteractive({ useHandCursor: true });
      cardBtn.on('pointerdown', () => {
        const cost = parseInt(card.match(/\d+/)?.[0] || '0');
        if (this.elixir >= cost) {
          this.elixir -= cost;
          this.updateElixirDisplay();
          eventBus.emit(GameEvents.CARD_PLAYED, card);
          console.log(`Played: ${card}`);
        }
      });
    });

    // Battle countdown
    this.time.addEvent({
      delay: 1000,
      repeat: this.battleTimer - 1,
      callback: () => {
        this.battleTimer--;
        this.timerText.setText(this.formatTime(this.battleTimer));

        if (this.battleTimer <= 0) {
          this.endBattle(true);
        }
      },
    });

    // Elixir regeneration
    this.time.addEvent({
      delay: 1000 / GAME_CONFIG.ELIXIR_REGEN_RATE,
      loop: true,
      callback: () => {
        if (this.elixir < GAME_CONFIG.MAX_ELIXIR) {
          this.elixir = Math.min(this.elixir + 1, GAME_CONFIG.MAX_ELIXIR);
          this.updateElixirDisplay();
        }
      },
    });

    // End battle button (debug)
    const endBtn = this.add.text(width - 80, 20, 'End Battle', {
      fontFamily: 'Arial',
      fontSize: '14px',
      color: '#ffffff',
      backgroundColor: '#666688',
      padding: { x: 8, y: 4 },
    }).setOrigin(0.5, 0);
    endBtn.setInteractive({ useHandCursor: true });
    endBtn.on('pointerdown', () => this.endBattle(true));
  }

  private updateElixirDisplay(): void {
    this.elixirText.setText(`Elixir: ${this.elixir}/${GAME_CONFIG.MAX_ELIXIR}`);
  }

  private formatTime(seconds: number): string {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}:${s.toString().padStart(2, '0')}`;
  }

  private endBattle(victory: boolean): void {
    eventBus.emit(GameEvents.BATTLE_ENDED, { victory });
    if (victory) {
      this.scene.start('VictoryScene', { won: true });
    } else {
      this.scene.start('Phase2Scene');
    }
  }
}
