import Phaser from 'phaser';
import { GAME_CONFIG } from '@/config/game-config';
import { eventBus, GameEvents } from '@/systems/event-bus';
import type { Point } from '@/types/game';

interface Phase1Data {
  players: Array<{ name: string; isAI: boolean; color: number }>;
  mapSize: 'small' | 'medium' | 'large';
}

export class Phase1Scene extends Phaser.Scene {
  private countdown: number = GAME_CONFIG.SPAWN_COUNTDOWN;
  private countdownText!: Phaser.GameObjects.Text;
  private spawnMarker: Point | null = null;
  private markerGraphics!: Phaser.GameObjects.Graphics;
  private mapGraphics!: Phaser.GameObjects.Graphics;
  private phase: 'spawning' | 'expanding' = 'spawning';
  private data_players: Phase1Data['players'] = [];
  private mapSize!: Phase1Data['mapSize'];

  constructor() {
    super({ key: 'Phase1Scene' });
  }

  init(data: Phase1Data): void {
    this.data_players = data.players || [];
    this.mapSize = data.mapSize || 'medium';
    this.countdown = GAME_CONFIG.SPAWN_COUNTDOWN;
    this.spawnMarker = null;
    this.phase = 'spawning';
  }

  create(): void {
    const width = this.cameras.main.width;
    const height = this.cameras.main.height;
    const mapConfig = GAME_CONFIG.MAP_SIZES[this.mapSize];

    this.cameras.main.setBackgroundColor('#2a3a1e');

    // Draw placeholder map
    this.mapGraphics = this.add.graphics();
    this.drawPlaceholderMap(mapConfig.width, mapConfig.height);

    // Spawn marker graphics
    this.markerGraphics = this.add.graphics();

    // Phase title
    this.add.text(width / 2, 20, 'PHASE 1: EXPANSION', {
      fontFamily: 'Arial Black',
      fontSize: '20px',
      color: '#ffffff',
      stroke: '#000000',
      strokeThickness: 2,
    }).setOrigin(0.5, 0).setScrollFactor(0).setDepth(100);

    // Instruction text
    const instructionText = this.add.text(width / 2, 50, 'Click to place your spawn point', {
      fontFamily: 'Arial',
      fontSize: '16px',
      color: '#cccccc',
    }).setOrigin(0.5, 0).setScrollFactor(0).setDepth(100);

    // Countdown timer
    this.countdownText = this.add.text(width / 2, height - 40, `${this.countdown}s`, {
      fontFamily: 'Arial Black',
      fontSize: '36px',
      color: '#ff6b6b',
      stroke: '#000000',
      strokeThickness: 3,
    }).setOrigin(0.5, 0.5).setScrollFactor(0).setDepth(100);

    // Countdown timer event
    this.time.addEvent({
      delay: 1000,
      repeat: this.countdown - 1,
      callback: () => {
        this.countdown--;
        this.countdownText.setText(`${this.countdown}s`);

        if (this.countdown <= 5) {
          this.countdownText.setColor('#ff0000');
          this.countdownText.setScale(1.2);
          this.time.delayedCall(100, () => this.countdownText.setScale(1.0));
        }

        if (this.countdown <= 0) {
          this.phase = 'expanding';
          instructionText.setText('Click adjacent regions to expand your territory!');
          this.countdownText.setVisible(false);
          eventBus.emit(GameEvents.SPAWN_PLACED, this.spawnMarker);
        }
      },
    });

    // Camera controls
    this.setupCamera(mapConfig.width, mapConfig.height);

    // Click handler
    this.input.on('pointerdown', (pointer: Phaser.Input.Pointer) => {
      if (this.phase === 'spawning') {
        this.placeSpawnMarker(pointer.worldX, pointer.worldY);
      } else if (this.phase === 'expanding') {
        this.claimTerritory(pointer.worldX, pointer.worldY);
      }
    });
  }

  private drawPlaceholderMap(mapWidth: number, mapHeight: number): void {
    // Draw a simple placeholder map with colored regions
    // This will be replaced by Voronoi generation in Step 2.1
    this.mapGraphics.fillStyle(0x4a7a3a, 1);
    this.mapGraphics.fillRect(0, 0, mapWidth, mapHeight);

    // Draw grid lines as placeholder for regions
    this.mapGraphics.lineStyle(1, 0x3a6a2a, 0.5);
    const gridSize = 60;
    for (let x = 0; x < mapWidth; x += gridSize) {
      this.mapGraphics.lineBetween(x, 0, x, mapHeight);
    }
    for (let y = 0; y < mapHeight; y += gridSize) {
      this.mapGraphics.lineBetween(0, y, mapWidth, y);
    }

    // Draw some placeholder terrain features
    // Ocean borders
    this.mapGraphics.fillStyle(0x2266aa, 0.8);
    this.mapGraphics.fillRect(0, 0, 30, mapHeight);
    this.mapGraphics.fillRect(mapWidth - 30, 0, 30, mapHeight);
    this.mapGraphics.fillRect(0, 0, mapWidth, 30);
    this.mapGraphics.fillRect(0, mapHeight - 30, mapWidth, 30);

    // Mountain cluster
    this.mapGraphics.fillStyle(0x888888, 0.6);
    this.mapGraphics.fillCircle(mapWidth * 0.3, mapHeight * 0.4, 40);
    this.mapGraphics.fillCircle(mapWidth * 0.7, mapHeight * 0.6, 50);

    // Forest patches
    this.mapGraphics.fillStyle(0x2a5a1a, 0.6);
    this.mapGraphics.fillCircle(mapWidth * 0.5, mapHeight * 0.3, 60);
    this.mapGraphics.fillCircle(mapWidth * 0.2, mapHeight * 0.7, 45);

    // Desert
    this.mapGraphics.fillStyle(0xc4a44a, 0.5);
    this.mapGraphics.fillCircle(mapWidth * 0.8, mapHeight * 0.3, 50);
  }

  private setupCamera(mapWidth: number, mapHeight: number): void {
    const cam = this.cameras.main;
    cam.setBounds(0, 0, mapWidth, mapHeight);
    cam.centerOn(mapWidth / 2, mapHeight / 2);

    // Drag to pan
    this.input.on('pointermove', (pointer: Phaser.Input.Pointer) => {
      if (pointer.isDown && pointer.button === 1) {
        cam.scrollX -= (pointer.x - pointer.prevPosition.x) / cam.zoom;
        cam.scrollY -= (pointer.y - pointer.prevPosition.y) / cam.zoom;
      }
    });

    // Scroll to zoom
    this.input.on('wheel', (_pointer: Phaser.Input.Pointer, _dx: number, _dy: number, dz: number) => {
      const zoomDelta = dz > 0 ? -0.1 : 0.1;
      cam.zoom = Phaser.Math.Clamp(cam.zoom + zoomDelta, 0.5, 3);
    });
  }

  private placeSpawnMarker(x: number, y: number): void {
    this.spawnMarker = { x, y };
    this.markerGraphics.clear();

    const size = GAME_CONFIG.SPAWN_MARKER_SIZE;
    const playerColor = this.data_players[0]?.color || 0x4287f5;

    // Draw spawn marker
    this.markerGraphics.fillStyle(playerColor, 0.8);
    this.markerGraphics.fillRect(x - size / 2, y - size / 2, size, size);
    this.markerGraphics.lineStyle(2, 0xffffff, 1);
    this.markerGraphics.strokeRect(x - size / 2, y - size / 2, size, size);

    // Pulsing ring
    this.markerGraphics.lineStyle(1, playerColor, 0.5);
    this.markerGraphics.strokeCircle(x, y, 15);
  }

  private claimTerritory(x: number, y: number): void {
    // Placeholder: draw a colored circle at clicked position
    const playerColor = this.data_players[0]?.color || 0x4287f5;
    this.markerGraphics.fillStyle(playerColor, 0.3);
    this.markerGraphics.fillCircle(x, y, 30);
    this.markerGraphics.lineStyle(2, playerColor, 0.6);
    this.markerGraphics.strokeCircle(x, y, 30);

    eventBus.emit(GameEvents.TERRITORY_CLAIMED, { x, y });
  }

  update(_time: number, _delta: number): void {
    // Game tick logic will go here
  }
}
