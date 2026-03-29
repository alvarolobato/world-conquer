import Phaser from 'phaser';
import { GAME_CONFIG } from '@/config/game-config';
import { Era, ResourceType, CardCategory } from '@/types/game';
import type { GameMap, Point, Building } from '@/types/game';
import { eventBus, GameEvents } from '@/systems/event-bus';
import { createBattle, deployCard, updateBattle, aiDeployCard } from '@/systems/combat';
import type { BattleState, BattleUnit } from '@/systems/combat';
import { CARD_DEFINITIONS, getCardDef, getCardsForEra } from '@/systems/cards';
import { processConquest } from '@/systems/conquest';
import type { ResourceStore } from '@/systems/economy';

interface PlayerInfo {
  id: string;
  name: string;
  isAI: boolean;
  color: number;
}

interface Phase3Data {
  map: GameMap;
  players: PlayerInfo[];
  attacker: PlayerInfo;
  defender: PlayerInfo;
  attackerResources?: ResourceStore;
  attackerBuildings?: Building[];
  era?: number;
}

export class Phase3Scene extends Phaser.Scene {
  private battle!: BattleState;
  private gameMap!: GameMap;
  private players: PlayerInfo[] = [];
  private attacker!: PlayerInfo;
  private defender!: PlayerInfo;
  private era: Era = Era.ANCIENT;
  private attackerResources?: ResourceStore;
  private attackerBuildings?: Building[];

  // UI
  private timerText!: Phaser.GameObjects.Text;
  private attackerElixirText!: Phaser.GameObjects.Text;
  private defenderElixirText!: Phaser.GameObjects.Text;
  private attackerDmgText!: Phaser.GameObjects.Text;
  private defenderDmgText!: Phaser.GameObjects.Text;
  private infoText!: Phaser.GameObjects.Text;
  private unitGfx!: Phaser.GameObjects.Graphics;
  private battlefieldGfx!: Phaser.GameObjects.Graphics;
  private cardButtons: Phaser.GameObjects.Text[] = [];

  // Card hand
  private playerDeck: string[] = [];
  private hand: string[] = [];
  private nextCard: string = '';

  // AI
  private aiTimer!: Phaser.Time.TimerEvent;

  constructor() {
    super({ key: 'Phase3Scene' });
  }

  init(data: Phase3Data): void {
    this.gameMap = data?.map;
    this.players = data?.players || [];
    this.attacker = data?.attacker || this.players[0];
    this.defender = data?.defender || this.players[1];
    this.era = (data?.era as Era) || Era.ANCIENT;
    this.attackerResources = data?.attackerResources;
    this.attackerBuildings = data?.attackerBuildings;
    this.cardButtons = [];
  }

  create(): void {
    const w = this.cameras.main.width;
    const h = this.cameras.main.height;

    this.cameras.main.setBackgroundColor('#1a1a1a');

    // Create battle state
    this.battle = createBattle(this.attacker.id, this.defender.id);

    // Set up deck and hand
    this.setupDeck();

    // --- Battlefield ---
    this.battlefieldGfx = this.add.graphics().setDepth(0);
    this.drawBattlefield(w, h);

    // Unit graphics
    this.unitGfx = this.add.graphics().setDepth(5);

    // --- HUD ---

    // Title
    this.add.text(w / 2, 8, `⚔️ ${this.attacker.name} vs ${this.defender.name}`, {
      fontFamily: 'Arial Black', fontSize: '16px', color: '#ffffff',
      stroke: '#000000', strokeThickness: 2,
    }).setOrigin(0.5, 0).setDepth(200);

    // Timer
    this.timerText = this.add.text(w / 2, 30, this.formatTime(this.battle.timer), {
      fontFamily: 'Arial Black', fontSize: '28px', color: '#ffffff',
      stroke: '#000000', strokeThickness: 2,
    }).setOrigin(0.5, 0).setDepth(200);

    // Attacker info (left)
    const atkColor = `#${this.attacker.color.toString(16).padStart(6, '0')}`;
    this.add.text(10, 65, this.attacker.name, {
      fontFamily: 'Arial', fontSize: '14px', color: atkColor,
    }).setDepth(200);

    this.attackerElixirText = this.add.text(10, 82, `Elixir: ${Math.floor(this.battle.attackerElixir)}`, {
      fontFamily: 'Arial', fontSize: '12px', color: '#e066ff',
    }).setDepth(200);

    this.attackerDmgText = this.add.text(10, 97, 'Damage: 0', {
      fontFamily: 'Arial', fontSize: '11px', color: '#ff8888',
    }).setDepth(200);

    // Defender info (right)
    const defColor = `#${this.defender.color.toString(16).padStart(6, '0')}`;
    this.add.text(w - 10, 65, this.defender.name, {
      fontFamily: 'Arial', fontSize: '14px', color: defColor,
    }).setOrigin(1, 0).setDepth(200);

    this.defenderElixirText = this.add.text(w - 10, 82, `Elixir: ${Math.floor(this.battle.defenderElixir)}`, {
      fontFamily: 'Arial', fontSize: '12px', color: '#e066ff',
    }).setOrigin(1, 0).setDepth(200);

    this.defenderDmgText = this.add.text(w - 10, 97, 'Damage: 0', {
      fontFamily: 'Arial', fontSize: '11px', color: '#ff8888',
    }).setOrigin(1, 0).setDepth(200);

    // Info text
    this.infoText = this.add.text(w / 2, h - 75, 'Deploy cards on the left side of the battlefield!', {
      fontFamily: 'Arial', fontSize: '12px', color: '#aaaaaa',
    }).setOrigin(0.5, 0.5).setDepth(200);

    // Elixir bar (visual)
    const elixirBarBg = this.add.graphics().setDepth(199);
    elixirBarBg.fillStyle(0x222233, 0.9);
    elixirBarBg.fillRect(0, h - 60, w, 60);

    // Card hand buttons
    this.createCardHand(w, h);

    // --- Click to deploy ---
    this.input.on('pointerdown', (ptr: Phaser.Input.Pointer) => {
      if (ptr.button === 0 && ptr.y < h - 65) {
        this.tryDeploy(ptr.x, ptr.y);
      }
    });

    // --- AI deploy timer ---
    if (this.defender.isAI) {
      this.aiTimer = this.time.addEvent({
        delay: 2000 + Math.random() * 2000,
        loop: true,
        callback: () => {
          const aiDeck = this.getAIDeck();
          aiDeployCard(this.battle, this.defender.id, aiDeck, this.era);
        },
      });
    }
  }

  // ─── DECK / HAND ───

  private setupDeck(): void {
    const available = getCardsForEra(this.era);
    // Pick 8 cards for deck
    this.playerDeck = available.slice(0, 8).map((c) => c.id);
    // Shuffle
    for (let i = this.playerDeck.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [this.playerDeck[i], this.playerDeck[j]] = [this.playerDeck[j], this.playerDeck[i]];
    }
    // Draw initial hand
    this.hand = this.playerDeck.splice(0, GAME_CONFIG.HAND_SIZE);
    this.nextCard = this.playerDeck.length > 0 ? this.playerDeck[0] : this.hand[0];
  }

  private drawNextCard(usedIndex: number): void {
    if (this.playerDeck.length > 0) {
      this.hand[usedIndex] = this.playerDeck.shift()!;
    } else {
      // Reshuffle all cards back
      this.playerDeck = [...this.hand.filter((_, i) => i !== usedIndex)];
      this.hand[usedIndex] = this.playerDeck.splice(0, 1)[0] || 'militia';
    }
    this.nextCard = this.playerDeck.length > 0 ? this.playerDeck[0] : 'militia';
    this.refreshCardHand();
  }

  private getAIDeck(): string[] {
    const available = getCardsForEra(this.era);
    return available.slice(0, 8).map((c) => c.id);
  }

  // ─── CARD HAND UI ───

  private createCardHand(w: number, h: number): void {
    this.cardButtons = [];
    const cardW = 110;
    const totalW = this.hand.length * cardW + 60;
    const startX = (w - totalW) / 2;

    // Next card indicator
    const nextDef = getCardDef(this.nextCard);
    this.add.text(startX - 5, h - 52, `Next: ${nextDef?.name || '?'}`, {
      fontFamily: 'Arial', fontSize: '10px', color: '#666688',
    }).setDepth(201);

    for (let i = 0; i < this.hand.length; i++) {
      const cardId = this.hand[i];
      const def = getCardDef(cardId);
      if (!def) continue;

      const x = startX + 60 + i * cardW;
      const y = h - 35;

      const rarityColor = {
        common: '#aaaaaa', rare: '#4488ff', epic: '#aa44ff', legendary: '#ffaa00',
      }[def.rarity];

      const catIcon = {
        infantry: '🗡️', vehicle: '🚗', air: '✈️', spell: '✨', siege: '🏰',
      }[def.category];

      const btn = this.add.text(x, y, `${catIcon} ${def.name} [${def.elixirCost}]`, {
        fontFamily: 'Arial', fontSize: '11px', color: rarityColor,
        backgroundColor: '#222244', padding: { x: 6, y: 6 },
      }).setOrigin(0.5, 0.5).setDepth(201);

      btn.setInteractive({ useHandCursor: true });
      btn.on('pointerover', () => {
        btn.setStyle({ backgroundColor: '#333366' });
        this.infoText.setText(`${def.name}: ${def.description} | HP:${def.stats.hp} DPS:${def.stats.dps} | Cost: ${def.elixirCost} elixir`);
      });
      btn.on('pointerout', () => btn.setStyle({ backgroundColor: '#222244' }));

      const idx = i;
      btn.on('pointerdown', () => {
        this.selectedCardIndex = idx;
        this.infoText.setText(`Click on the battlefield to deploy ${def.name}!`).setColor('#44ff44');
      });

      this.cardButtons.push(btn);
    }
  }

  private selectedCardIndex: number = -1;

  private refreshCardHand(): void {
    for (let i = 0; i < this.cardButtons.length; i++) {
      const def = getCardDef(this.hand[i]);
      if (def) {
        const catIcon = { infantry: '🗡️', vehicle: '🚗', air: '✈️', spell: '✨', siege: '🏰' }[def.category];
        const rarityColor = { common: '#aaaaaa', rare: '#4488ff', epic: '#aa44ff', legendary: '#ffaa00' }[def.rarity];
        this.cardButtons[i].setText(`${catIcon} ${def.name} [${def.elixirCost}]`);
        this.cardButtons[i].setColor(rarityColor);
      }
    }
  }

  private tryDeploy(x: number, y: number): void {
    if (this.selectedCardIndex < 0 || this.selectedCardIndex >= this.hand.length) return;

    // Must deploy on attacker side (left half)
    const w = this.cameras.main.width;
    if (x > w * 0.45) {
      this.infoText.setText('Deploy on YOUR side (left)!').setColor('#ff4444');
      return;
    }

    const cardId = this.hand[this.selectedCardIndex];
    const success = deployCard(this.battle, cardId, this.attacker.id, { x, y });

    if (success) {
      this.infoText.setText(`Deployed ${getCardDef(cardId)?.name}!`).setColor('#44ff44');
      this.drawNextCard(this.selectedCardIndex);
      this.selectedCardIndex = -1;
    } else {
      this.infoText.setText('Not enough elixir!').setColor('#ff4444');
    }
  }

  // ─── BATTLEFIELD DRAWING ───

  private drawBattlefield(w: number, h: number): void {
    // Gradient-like terrain
    this.battlefieldGfx.fillStyle(0x2a3a1e, 1);
    this.battlefieldGfx.fillRect(0, 60, w, h - 125);

    // Attacker side (left, blue tint)
    this.battlefieldGfx.fillStyle(this.attacker.color, 0.08);
    this.battlefieldGfx.fillRect(0, 60, w / 2, h - 125);

    // Defender side (right, red tint)
    this.battlefieldGfx.fillStyle(this.defender.color, 0.08);
    this.battlefieldGfx.fillRect(w / 2, 60, w / 2, h - 125);

    // Center divider
    this.battlefieldGfx.lineStyle(2, 0xffffff, 0.2);
    this.battlefieldGfx.lineBetween(w / 2, 60, w / 2, h - 65);

    // Grid lines for depth
    this.battlefieldGfx.lineStyle(1, 0x000000, 0.1);
    for (let x = 0; x < w; x += 50) {
      this.battlefieldGfx.lineBetween(x, 60, x, h - 65);
    }
    for (let y = 60; y < h - 65; y += 50) {
      this.battlefieldGfx.lineBetween(0, y, w, y);
    }

    // Labels
    this.add.text(w * 0.25, h - 73, 'YOUR SIDE', {
      fontFamily: 'Arial', fontSize: '10px', color: '#4488ff',
    }).setOrigin(0.5, 0.5).setDepth(100).setAlpha(0.5);

    this.add.text(w * 0.75, h - 73, 'ENEMY SIDE', {
      fontFamily: 'Arial', fontSize: '10px', color: '#ff4444',
    }).setOrigin(0.5, 0.5).setDepth(100).setAlpha(0.5);
  }

  private drawUnits(): void {
    this.unitGfx.clear();

    for (const unit of this.battle.units) {
      if (!unit.alive) continue;

      const isAttacker = unit.owner === this.attacker.id;
      const color = isAttacker ? this.attacker.color : this.defender.color;
      const def = getCardDef(unit.cardId);

      // Unit body
      let size = 6;
      if (def?.category === CardCategory.VEHICLE || def?.category === CardCategory.SIEGE) size = 10;
      if (def?.category === CardCategory.AIR) size = 8;

      this.unitGfx.fillStyle(color, 0.9);
      if (def?.category === CardCategory.AIR) {
        // Diamond for air
        this.unitGfx.fillTriangle(
          unit.position.x, unit.position.y - size,
          unit.position.x + size, unit.position.y,
          unit.position.x - size, unit.position.y
        );
        this.unitGfx.fillTriangle(
          unit.position.x, unit.position.y + size,
          unit.position.x + size, unit.position.y,
          unit.position.x - size, unit.position.y
        );
      } else if (def?.category === CardCategory.VEHICLE || def?.category === CardCategory.SIEGE) {
        // Rectangle for vehicles
        this.unitGfx.fillRect(unit.position.x - size / 2, unit.position.y - size / 3, size, size * 0.66);
      } else {
        // Circle for infantry/spells
        this.unitGfx.fillCircle(unit.position.x, unit.position.y, size);
      }

      // Direction indicator
      this.unitGfx.lineStyle(1, 0xffffff, 0.5);
      const dir = isAttacker ? 1 : -1;
      this.unitGfx.lineBetween(
        unit.position.x, unit.position.y,
        unit.position.x + dir * size * 1.5, unit.position.y
      );

      // Health bar
      const hpPct = unit.hp / unit.maxHp;
      const barW = size * 2;
      this.unitGfx.fillStyle(0x000000, 0.5);
      this.unitGfx.fillRect(unit.position.x - barW / 2, unit.position.y - size - 5, barW, 3);
      this.unitGfx.fillStyle(hpPct > 0.5 ? 0x44ff44 : hpPct > 0.25 ? 0xffaa00 : 0xff4444, 1);
      this.unitGfx.fillRect(unit.position.x - barW / 2, unit.position.y - size - 5, barW * hpPct, 3);
    }
  }

  // ─── UPDATE LOOP ───

  update(_time: number, delta: number): void {
    if (!this.battle || this.battle.phase === 'ended') return;

    // Update battle simulation
    updateBattle(this.battle, delta);

    // Update visuals
    this.drawUnits();

    // Update HUD
    this.timerText.setText(this.formatTime(this.battle.timer));
    if (this.battle.timer <= 30) {
      this.timerText.setColor('#ff4444');
    }

    this.attackerElixirText.setText(`Elixir: ${Math.floor(this.battle.attackerElixir)}/${GAME_CONFIG.MAX_ELIXIR}`);
    this.defenderElixirText.setText(`Elixir: ${Math.floor(this.battle.defenderElixir)}/${GAME_CONFIG.MAX_ELIXIR}`);
    this.attackerDmgText.setText(`Damage: ${Math.floor(this.battle.attackerDamage)}`);
    this.defenderDmgText.setText(`Damage: ${Math.floor(this.battle.defenderDamage)}`);

    // Gray out unaffordable cards
    for (let i = 0; i < this.cardButtons.length; i++) {
      const def = getCardDef(this.hand[i]);
      if (def) {
        const canAfford = this.battle.attackerElixir >= def.elixirCost;
        this.cardButtons[i].setAlpha(canAfford ? 1 : 0.4);
      }
    }

    // Check battle end (phase may have changed during updateBattle)
    if ((this.battle.phase as string) === 'ended') {
      this.onBattleEnd();
    }
  }

  private onBattleEnd(): void {
    if (this.aiTimer) this.aiTimer.destroy();

    const won = this.battle.winner === this.attacker.id;
    const resultText = won ? 'VICTORY!' : 'DEFEAT!';
    const resultColor = won ? '#ffd700' : '#ff4444';

    this.infoText.setText(`${resultText} Dmg dealt: ${Math.floor(this.battle.attackerDamage)} vs ${Math.floor(this.battle.defenderDamage)}`);
    this.infoText.setColor(resultColor);

    // Process conquest if won
    if (won) {
      const defenderRegions = this.gameMap.regions.filter((r) => r.owner === this.defender.id);
      // Transfer 25% of enemy regions
      const transferCount = Math.max(1, Math.ceil(defenderRegions.length * 0.25));
      for (let i = 0; i < transferCount && i < defenderRegions.length; i++) {
        defenderRegions[i].owner = this.attacker.id;
      }
    }

    // Transition after delay
    this.time.delayedCall(3000, () => {
      // Check if defender eliminated
      const defenderRegions = this.gameMap.regions.filter((r) => r.owner === this.defender.id).length;
      if (defenderRegions === 0) {
        this.scene.start('VictoryScene', { won: true });
      } else {
        this.scene.start('Phase2Scene', {
          map: this.gameMap,
          players: this.players,
        });
      }
    });
  }

  private formatTime(seconds: number): string {
    const s = Math.max(0, Math.floor(seconds));
    const m = Math.floor(s / 60);
    return `${m}:${(s % 60).toString().padStart(2, '0')}`;
  }
}
