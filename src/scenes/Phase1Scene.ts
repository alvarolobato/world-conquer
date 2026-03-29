import Phaser from 'phaser';
import { GAME_CONFIG } from '@/config/game-config';
import { eventBus, GameEvents } from '@/systems/event-bus';
import { generateMap, getTerrainColor, getRegionAtPoint, getClaimableNeighbors, getUnclaimedLandCount } from '@/systems/map-generator';
import { TerrainType } from '@/types/game';
import type { Point, GameMap, Region } from '@/types/game';

interface PlayerInfo {
  id: string;
  name: string;
  isAI: boolean;
  color: number;
}

interface Phase1Data {
  players: Array<{ name: string; isAI: boolean; color: number }>;
  mapSize: 'small' | 'medium' | 'large';
}

export class Phase1Scene extends Phaser.Scene {
  // Map
  private gameMap!: GameMap;
  private mapGraphics!: Phaser.GameObjects.Graphics;
  private territoryGraphics!: Phaser.GameObjects.Graphics;
  private markerGraphics!: Phaser.GameObjects.Graphics;
  private minimapGraphics!: Phaser.GameObjects.Graphics;

  // Players
  private players: PlayerInfo[] = [];
  private spawnRegions: Map<string, string> = new Map(); // playerId -> regionId

  // State
  private phase: 'spawning' | 'expanding' | 'done' = 'spawning';
  private countdown: number = GAME_CONFIG.SPAWN_COUNTDOWN;
  private mapSize: Phase1Data['mapSize'] = 'medium';

  // UI
  private countdownText!: Phaser.GameObjects.Text;
  private instructionText!: Phaser.GameObjects.Text;
  private statsTexts: Phaser.GameObjects.Text[] = [];

  // AI expansion
  private aiExpandTimer!: Phaser.Time.TimerEvent;
  private expansionSpeed = 300; // ms between AI expansions

  // Camera drag
  private isDragging = false;
  private dragStart: Point = { x: 0, y: 0 };

  constructor() {
    super({ key: 'Phase1Scene' });
  }

  init(data: Phase1Data): void {
    this.mapSize = data?.mapSize || 'medium';
    this.countdown = GAME_CONFIG.SPAWN_COUNTDOWN;
    this.phase = 'spawning';
    this.spawnRegions = new Map();
    this.statsTexts = [];

    // Build player list with IDs
    const incoming = data?.players || [
      { name: 'Player 1', isAI: false, color: 0x4287f5 },
      { name: 'AI Aggressive', isAI: true, color: 0xe74c3c },
    ];
    this.players = incoming.map((p, i) => ({
      id: `p_${i}`,
      name: p.name,
      isAI: p.isAI,
      color: p.color,
    }));
  }

  create(): void {
    const screenW = this.cameras.main.width;
    const screenH = this.cameras.main.height;
    const cfg = GAME_CONFIG.MAP_SIZES[this.mapSize];

    this.cameras.main.setBackgroundColor('#111122');

    // Generate the map
    const seed = Date.now() % 1_000_000;
    this.gameMap = generateMap(seed, cfg.regions, cfg.width, cfg.height);

    // Graphics layers
    this.mapGraphics = this.add.graphics().setDepth(0);
    this.territoryGraphics = this.add.graphics().setDepth(1);
    this.markerGraphics = this.add.graphics().setDepth(2);

    // Draw the map
    this.drawMap();

    // --- HUD (fixed to camera) ---

    // Title
    this.add.text(screenW / 2, 12, 'PHASE 1: EXPANSION', {
      fontFamily: 'Arial Black', fontSize: '20px', color: '#ffffff',
      stroke: '#000000', strokeThickness: 3,
    }).setOrigin(0.5, 0).setScrollFactor(0).setDepth(200);

    // Instruction
    this.instructionText = this.add.text(screenW / 2, 40, 'Click on the map to place your spawn point', {
      fontFamily: 'Arial', fontSize: '15px', color: '#ccccee',
    }).setOrigin(0.5, 0).setScrollFactor(0).setDepth(200);

    // Countdown
    this.countdownText = this.add.text(screenW / 2, screenH - 50, `${this.countdown}s`, {
      fontFamily: 'Arial Black', fontSize: '40px', color: '#ff6b6b',
      stroke: '#000000', strokeThickness: 3,
    }).setOrigin(0.5, 0.5).setScrollFactor(0).setDepth(200);

    // Player stats panel (top-right)
    this.players.forEach((player, i) => {
      const txt = this.add.text(screenW - 10, 12 + i * 22, `■ ${player.name}: 0`, {
        fontFamily: 'Arial', fontSize: '13px',
        color: `#${player.color.toString(16).padStart(6, '0')}`,
      }).setOrigin(1, 0).setScrollFactor(0).setDepth(200);
      this.statsTexts.push(txt);
    });

    // Unclaimed counter
    const unclaimedText = this.add.text(screenW - 10, 12 + this.players.length * 22 + 8, '', {
      fontFamily: 'Arial', fontSize: '12px', color: '#888899',
    }).setOrigin(1, 0).setScrollFactor(0).setDepth(200);
    this.statsTexts.push(unclaimedText);

    // --- Minimap ---
    this.minimapGraphics = this.add.graphics().setScrollFactor(0).setDepth(210);
    this.drawMinimap();

    // --- Camera ---
    this.setupCamera(cfg.width, cfg.height);

    // --- Input ---
    this.input.on('pointerdown', (pointer: Phaser.Input.Pointer) => {
      if (pointer.button === 0) { // Left click
        if (this.phase === 'spawning') {
          this.placeSpawn(pointer.worldX, pointer.worldY);
        } else if (this.phase === 'expanding') {
          this.playerExpand(pointer.worldX, pointer.worldY);
        }
      }
      if (pointer.button === 1 || pointer.button === 2) {
        this.isDragging = true;
        this.dragStart = { x: pointer.x, y: pointer.y };
      }
    });

    this.input.on('pointermove', (pointer: Phaser.Input.Pointer) => {
      if (this.isDragging) {
        const cam = this.cameras.main;
        cam.scrollX -= (pointer.x - this.dragStart.x) / cam.zoom;
        cam.scrollY -= (pointer.y - this.dragStart.y) / cam.zoom;
        this.dragStart = { x: pointer.x, y: pointer.y };
      }
    });

    this.input.on('pointerup', (pointer: Phaser.Input.Pointer) => {
      if (pointer.button === 1 || pointer.button === 2) {
        this.isDragging = false;
      }
    });

    this.input.on('wheel', (_p: Phaser.Input.Pointer, _dx: number, _dy: number, dz: number) => {
      const cam = this.cameras.main;
      cam.zoom = Phaser.Math.Clamp(cam.zoom + (dz > 0 ? -0.1 : 0.1), 0.4, 4);
    });

    // Disable right-click context menu
    this.game.canvas.addEventListener('contextmenu', (e) => e.preventDefault());

    // --- Countdown Timer ---
    this.time.addEvent({
      delay: 1000,
      repeat: this.countdown - 1,
      callback: () => this.tickCountdown(),
    });

    // AI: auto-pick spawn points
    this.time.delayedCall(500 + Math.random() * 2000, () => {
      this.aiPickSpawns();
    });
  }

  // ─── MAP RENDERING ───

  private drawMap(): void {
    this.mapGraphics.clear();

    for (const region of this.gameMap.regions) {
      const color = getTerrainColor(region.terrain);
      this.drawRegionFill(this.mapGraphics, region, color, 1);

      // Draw borders
      this.mapGraphics.lineStyle(1, 0x000000, 0.15);
      this.drawRegionStroke(this.mapGraphics, region);
    }
  }

  private drawRegionFill(gfx: Phaser.GameObjects.Graphics, region: Region, color: number, alpha: number): void {
    if (region.polygon.length < 3) return;
    gfx.fillStyle(color, alpha);
    gfx.beginPath();
    gfx.moveTo(region.polygon[0].x, region.polygon[0].y);
    for (let i = 1; i < region.polygon.length; i++) {
      gfx.lineTo(region.polygon[i].x, region.polygon[i].y);
    }
    gfx.closePath();
    gfx.fillPath();
  }

  private drawRegionStroke(gfx: Phaser.GameObjects.Graphics, region: Region): void {
    if (region.polygon.length < 3) return;
    gfx.beginPath();
    gfx.moveTo(region.polygon[0].x, region.polygon[0].y);
    for (let i = 1; i < region.polygon.length; i++) {
      gfx.lineTo(region.polygon[i].x, region.polygon[i].y);
    }
    gfx.closePath();
    gfx.strokePath();
  }

  private redrawTerritories(): void {
    this.territoryGraphics.clear();

    for (const region of this.gameMap.regions) {
      if (region.owner) {
        const player = this.players.find((p) => p.id === region.owner);
        if (player) {
          // Colored overlay
          this.drawRegionFill(this.territoryGraphics, region, player.color, 0.35);
          // Thick colored border
          this.territoryGraphics.lineStyle(2, player.color, 0.8);
          this.drawRegionStroke(this.territoryGraphics, region);
        }
      }
    }

    // Highlight claimable regions for human player during expansion
    if (this.phase === 'expanding') {
      const human = this.players.find((p) => !p.isAI);
      if (human) {
        const claimable = getClaimableNeighbors(this.gameMap, human.id);
        for (const region of claimable) {
          this.territoryGraphics.lineStyle(2, 0xffffff, 0.4);
          this.drawRegionStroke(this.territoryGraphics, region);
          // Subtle pulsing dot at centroid
          this.territoryGraphics.fillStyle(0xffffff, 0.2);
          this.territoryGraphics.fillCircle(region.centroid.x, region.centroid.y, 4);
        }
      }
    }
  }

  // ─── MINIMAP ───

  private drawMinimap(): void {
    this.minimapGraphics.clear();
    const mw = 160;
    const mh = 120;
    const mx = this.cameras.main.width - mw - 10;
    const my = this.cameras.main.height - mh - 10;
    const scaleX = mw / this.gameMap.width;
    const scaleY = mh / this.gameMap.height;

    // Background
    this.minimapGraphics.fillStyle(0x111122, 0.85);
    this.minimapGraphics.fillRoundedRect(mx - 2, my - 2, mw + 4, mh + 4, 4);

    // Regions
    for (const region of this.gameMap.regions) {
      const rx = mx + region.centroid.x * scaleX;
      const ry = my + region.centroid.y * scaleY;
      const size = 2;

      if (region.owner) {
        const player = this.players.find((p) => p.id === region.owner);
        this.minimapGraphics.fillStyle(player?.color || 0xffffff, 1);
      } else {
        this.minimapGraphics.fillStyle(getTerrainColor(region.terrain), 0.7);
      }
      this.minimapGraphics.fillRect(rx - size / 2, ry - size / 2, size, size);
    }

    // Border
    this.minimapGraphics.lineStyle(1, 0x4444aa, 0.6);
    this.minimapGraphics.strokeRoundedRect(mx - 2, my - 2, mw + 4, mh + 4, 4);
  }

  // ─── CAMERA ───

  private setupCamera(mapWidth: number, mapHeight: number): void {
    const cam = this.cameras.main;
    cam.setBounds(-50, -50, mapWidth + 100, mapHeight + 100);
    cam.centerOn(mapWidth / 2, mapHeight / 2);

    // Fit map to screen initially
    const zoomX = cam.width / mapWidth;
    const zoomY = cam.height / mapHeight;
    cam.zoom = Math.min(zoomX, zoomY) * 0.9;
  }

  // ─── SPAWNING ───

  private placeSpawn(worldX: number, worldY: number): void {
    const region = getRegionAtPoint(this.gameMap, { x: worldX, y: worldY });
    if (!region) return;
    if (region.terrain === TerrainType.OCEAN || region.terrain === TerrainType.RIVER) return;
    if (region.owner) return;

    const humanPlayer = this.players.find((p) => !p.isAI);
    if (!humanPlayer) return;

    // Remove previous spawn
    const prevSpawn = this.spawnRegions.get(humanPlayer.id);
    if (prevSpawn) {
      const prev = this.gameMap.regions.find((r) => r.id === prevSpawn);
      if (prev) prev.owner = null;
    }

    // Set new spawn
    region.owner = humanPlayer.id;
    this.spawnRegions.set(humanPlayer.id, region.id);

    this.redrawTerritories();
    this.drawSpawnMarkers();
    this.updateStats();
  }

  private aiPickSpawns(): void {
    const aiPlayers = this.players.filter((p) => p.isAI);
    const landRegions = this.gameMap.regions.filter(
      (r) => !r.owner && r.terrain !== TerrainType.OCEAN && r.terrain !== TerrainType.RIVER
    );

    for (const ai of aiPlayers) {
      // Pick a region far from other spawns
      let best: Region | null = null;
      let bestScore = -1;

      for (const region of landRegions) {
        if (region.owner) continue;

        // Score: distance from all existing spawns
        let minDistToSpawn = Infinity;
        for (const [, regionId] of this.spawnRegions) {
          const spawnRegion = this.gameMap.regions.find((r) => r.id === regionId);
          if (spawnRegion) {
            const d = Math.hypot(
              region.centroid.x - spawnRegion.centroid.x,
              region.centroid.y - spawnRegion.centroid.y
            );
            minDistToSpawn = Math.min(minDistToSpawn, d);
          }
        }

        // Prefer land with resources, far from others
        const resourceBonus = region.resources.length * 20;
        const score = (minDistToSpawn === Infinity ? 500 : minDistToSpawn) + resourceBonus;

        if (score > bestScore) {
          bestScore = score;
          best = region;
        }
      }

      if (best) {
        best.owner = ai.id;
        this.spawnRegions.set(ai.id, best.id);
      }
    }

    this.redrawTerritories();
    this.drawSpawnMarkers();
    this.updateStats();
  }

  private drawSpawnMarkers(): void {
    this.markerGraphics.clear();

    for (const [playerId, regionId] of this.spawnRegions) {
      const region = this.gameMap.regions.find((r) => r.id === regionId);
      const player = this.players.find((p) => p.id === playerId);
      if (!region || !player) continue;

      const { x, y } = region.centroid;

      // Flag pole
      this.markerGraphics.lineStyle(2, 0x333333, 1);
      this.markerGraphics.lineBetween(x, y - 15, x, y + 5);

      // Flag
      this.markerGraphics.fillStyle(player.color, 0.9);
      this.markerGraphics.fillTriangle(x, y - 15, x + 12, y - 10, x, y - 5);

      // Name label
      // (Use a small circle for now since text in world coords is expensive)
      this.markerGraphics.fillStyle(player.color, 1);
      this.markerGraphics.fillCircle(x, y + 8, 3);
    }
  }

  // ─── COUNTDOWN ───

  private tickCountdown(): void {
    this.countdown--;
    this.countdownText.setText(`${this.countdown}s`);

    if (this.countdown <= 5) {
      this.countdownText.setColor('#ff0000');
      this.countdownText.setScale(1.3);
      this.time.delayedCall(120, () => this.countdownText.setScale(1.0));
    }

    if (this.countdown <= 0) {
      this.startExpansion();
    }
  }

  // ─── EXPANSION PHASE ───

  private startExpansion(): void {
    // Ensure human has a spawn (auto-pick if not)
    const human = this.players.find((p) => !p.isAI);
    if (human && !this.spawnRegions.has(human.id)) {
      const available = this.gameMap.regions.find(
        (r) => !r.owner && r.terrain !== TerrainType.OCEAN && r.terrain !== TerrainType.RIVER
      );
      if (available) {
        available.owner = human.id;
        this.spawnRegions.set(human.id, available.id);
      }
    }

    this.phase = 'expanding';
    this.countdownText.setVisible(false);
    this.instructionText.setText('Click highlighted regions to expand! AI is expanding too...');

    this.redrawTerritories();
    this.updateStats();

    // Start AI expansion loop
    this.aiExpandTimer = this.time.addEvent({
      delay: this.expansionSpeed,
      loop: true,
      callback: () => this.aiExpandStep(),
    });
  }

  private playerExpand(worldX: number, worldY: number): void {
    const human = this.players.find((p) => !p.isAI);
    if (!human) return;

    const clickedRegion = getRegionAtPoint(this.gameMap, { x: worldX, y: worldY });
    if (!clickedRegion) return;

    // Check if it's a claimable neighbor
    const claimable = getClaimableNeighbors(this.gameMap, human.id);
    const isClaimable = claimable.some((r) => r.id === clickedRegion.id);

    if (isClaimable) {
      clickedRegion.owner = human.id;
      eventBus.emit(GameEvents.TERRITORY_CLAIMED, { regionId: clickedRegion.id, playerId: human.id });
      this.redrawTerritories();
      this.drawMinimap();
      this.updateStats();
      this.checkExpansionComplete();
    }
  }

  private aiExpandStep(): void {
    if (this.phase !== 'expanding') return;

    const aiPlayers = this.players.filter((p) => p.isAI);
    let anyExpanded = false;

    for (const ai of aiPlayers) {
      const claimable = getClaimableNeighbors(this.gameMap, ai.id);
      if (claimable.length === 0) continue;

      // AI strategy: prefer resource-rich regions, avoid empty terrain
      let best: Region | null = null;
      let bestScore = -1;

      for (const region of claimable) {
        let score = 1;
        // Resource bonus
        score += region.resources.length * 3;
        // Prefer plains/forest over desert/snow
        if (region.terrain === TerrainType.PLAINS) score += 2;
        if (region.terrain === TerrainType.FOREST) score += 2;
        if (region.terrain === TerrainType.MOUNTAIN) score += 1;
        if (region.terrain === TerrainType.DESERT) score += 0.5;
        if (region.terrain === TerrainType.SNOW) score += 0.3;
        // Add small random factor for variety
        score += Math.random() * 1.5;

        if (score > bestScore) {
          bestScore = score;
          best = region;
        }
      }

      if (best) {
        best.owner = ai.id;
        anyExpanded = true;
      }
    }

    if (anyExpanded) {
      this.redrawTerritories();
      this.drawMinimap();
      this.updateStats();
      this.checkExpansionComplete();
    }
  }

  private checkExpansionComplete(): void {
    const unclaimed = getUnclaimedLandCount(this.gameMap);
    if (unclaimed === 0) {
      this.phase = 'done';
      if (this.aiExpandTimer) this.aiExpandTimer.destroy();

      this.instructionText.setText('All territory claimed! Transitioning to City Building...');

      // Show final stats for a moment then transition
      this.time.delayedCall(2500, () => {
        eventBus.emit(GameEvents.EXPANSION_COMPLETE, {
          map: this.gameMap,
          players: this.players,
        });
        this.scene.start('Phase2Scene', {
          map: this.gameMap,
          players: this.players,
        });
      });
    }
  }

  // ─── STATS ───

  private updateStats(): void {
    this.players.forEach((player, i) => {
      const count = this.gameMap.regions.filter((r) => r.owner === player.id).length;
      if (this.statsTexts[i]) {
        this.statsTexts[i].setText(`■ ${player.name}: ${count} regions`);
      }
    });

    // Unclaimed counter
    const unclaimed = getUnclaimedLandCount(this.gameMap);
    const total = this.gameMap.regions.filter(
      (r) => r.terrain !== TerrainType.OCEAN && r.terrain !== TerrainType.RIVER
    ).length;
    const idx = this.players.length;
    if (this.statsTexts[idx]) {
      this.statsTexts[idx].setText(`Unclaimed: ${unclaimed}/${total}`);
    }
  }

  update(_time: number, _delta: number): void {
    // Could add hover effects here
  }
}
