import Phaser from 'phaser';
import { Era, ResourceType, TerrainType } from '@/types/game';
import type { GameMap, Region, Building, Point } from '@/types/game';
import { GAME_CONFIG } from '@/config/game-config';
import { eventBus, GameEvents } from '@/systems/event-bus';
import { getTerrainColor, getRegionAtPoint } from '@/systems/map-generator';
import { economyManager, createEmptyResources, createDefaultTaxConfig, calculateTaxIncome } from '@/systems/economy';
import type { ResourceStore, TaxConfig } from '@/systems/economy';
import { createStartingPopulation, getTotalPopulation, calculateHappiness, processPopulationGrowth } from '@/systems/population';
import type { PopulationStore } from '@/systems/population';
import { BUILDING_DEFS, getBuildingDef, getBuildingsForEra, canAffordBuilding, payForBuilding, createBuilding, getHousingCapacity } from '@/systems/buildings';
import type { BuildingDefinition } from '@/systems/buildings';
import { getAvailableResearch, canAffordResearch, payForResearch, checkEraAdvancement } from '@/systems/research';
import type { ResearchNode } from '@/systems/research';
import { createDiplomacyState } from '@/systems/diplomacy';
import type { DiplomacyState } from '@/systems/diplomacy';
import { createAIState, aiBuildDecision, aiResearchDecision, aiUpdateDeck } from '@/systems/ai';
import type { AIState } from '@/systems/ai';

interface PlayerInfo {
  id: string;
  name: string;
  isAI: boolean;
  color: number;
}

interface Phase2Data {
  map: GameMap;
  players: PlayerInfo[];
}

export class Phase2Scene extends Phaser.Scene {
  // Core state
  private gameMap!: GameMap;
  private players: PlayerInfo[] = [];
  private humanPlayer!: PlayerInfo;

  // Economy
  private resources!: ResourceStore;
  private taxConfig!: TaxConfig;
  private population!: PopulationStore;
  private era: Era = Era.ANCIENT;
  private happiness: number = 60;
  private completedResearch: string[] = [];
  private currentResearch: string | null = null;
  private researchProgress: number = 0;
  private researchTarget: number = 0;

  // Buildings
  private placedBuildings: Building[] = [];
  private selectedBuildingDef: BuildingDefinition | null = null;

  // Diplomacy
  private diplomacy!: DiplomacyState;

  // AI
  private aiStates: Map<string, AIState> = new Map();

  // Graphics
  private mapGfx!: Phaser.GameObjects.Graphics;
  private buildingGfx!: Phaser.GameObjects.Graphics;
  private uiContainer!: Phaser.GameObjects.Container;

  // UI elements
  private resourceTexts: Map<string, Phaser.GameObjects.Text> = new Map();
  private popText!: Phaser.GameObjects.Text;
  private happinessText!: Phaser.GameObjects.Text;
  private eraText!: Phaser.GameObjects.Text;
  private goldText!: Phaser.GameObjects.Text;
  private infoText!: Phaser.GameObjects.Text;
  private buildMenuTexts: Phaser.GameObjects.Text[] = [];
  private researchText!: Phaser.GameObjects.Text;

  // Camera
  private isDragging = false;
  private dragStart: Point = { x: 0, y: 0 };

  // Timers
  private gameTick = 0;

  constructor() {
    super({ key: 'Phase2Scene' });
  }

  init(data: Phase2Data): void {
    this.gameMap = data?.map;
    this.players = data?.players || [];
    this.humanPlayer = this.players.find((p) => !p.isAI) || this.players[0];
    this.era = Era.ANCIENT;
    this.resources = createEmptyResources();
    this.taxConfig = createDefaultTaxConfig();
    this.population = createStartingPopulation();
    this.completedResearch = [];
    this.currentResearch = null;
    this.researchProgress = 0;
    this.placedBuildings = [];
    this.selectedBuildingDef = null;
    this.happiness = 60;
    this.gameTick = 0;
    this.resourceTexts = new Map();
    this.buildMenuTexts = [];

    // Init diplomacy
    this.diplomacy = createDiplomacyState(this.players.map((p) => p.id));

    // Init AI states
    this.aiStates = new Map();
    for (const p of this.players.filter((p) => p.isAI)) {
      this.aiStates.set(p.id, createAIState(p.id, 'balanced' as any));
    }
  }

  create(): void {
    const w = this.cameras.main.width;
    const h = this.cameras.main.height;

    this.cameras.main.setBackgroundColor('#1a1e2a');

    // If no map data (direct navigation), create a simple fallback
    if (!this.gameMap) {
      this.scene.start('MainMenuScene');
      return;
    }

    // Map graphics
    this.mapGfx = this.add.graphics().setDepth(0);
    this.buildingGfx = this.add.graphics().setDepth(1);
    this.drawMap();

    // Camera setup
    const cam = this.cameras.main;
    cam.setBounds(-50, -50, this.gameMap.width + 100, this.gameMap.height + 100);
    const zx = cam.width / this.gameMap.width;
    const zy = cam.height / this.gameMap.height;
    cam.zoom = Math.min(zx, zy) * 0.85;
    cam.centerOn(this.gameMap.width / 2, this.gameMap.height / 2);

    // --- HUD ---
    this.createHUD(w, h);

    // --- Camera controls ---
    this.input.on('pointerdown', (ptr: Phaser.Input.Pointer) => {
      if (ptr.button === 2 || ptr.button === 1) {
        this.isDragging = true;
        this.dragStart = { x: ptr.x, y: ptr.y };
      } else if (ptr.button === 0) {
        this.handleLeftClick(ptr);
      }
    });
    this.input.on('pointermove', (ptr: Phaser.Input.Pointer) => {
      if (this.isDragging) {
        cam.scrollX -= (ptr.x - this.dragStart.x) / cam.zoom;
        cam.scrollY -= (ptr.y - this.dragStart.y) / cam.zoom;
        this.dragStart = { x: ptr.x, y: ptr.y };
      }
    });
    this.input.on('pointerup', (ptr: Phaser.Input.Pointer) => {
      if (ptr.button === 2 || ptr.button === 1) this.isDragging = false;
    });
    this.input.on('wheel', (_p: Phaser.Input.Pointer, _dx: number, _dy: number, dz: number) => {
      cam.zoom = Phaser.Math.Clamp(cam.zoom + (dz > 0 ? -0.1 : 0.1), 0.3, 5);
    });
    this.game.canvas.addEventListener('contextmenu', (e) => e.preventDefault());

    // --- Game tick ---
    this.time.addEvent({
      delay: 2000, // Every 2 seconds
      loop: true,
      callback: () => this.gameTickUpdate(),
    });

    // Tax collection every 30s
    this.time.addEvent({
      delay: 30_000,
      loop: true,
      callback: () => {
        this.resources = economyManager.collectTaxes(this.population, this.taxConfig, this.resources);
        this.updateHUD();
      },
    });
  }

  // ─── MAP DRAWING ───

  private drawMap(): void {
    this.mapGfx.clear();
    for (const region of this.gameMap.regions) {
      const color = getTerrainColor(region.terrain);
      if (region.polygon.length >= 3) {
        // Territory overlay
        if (region.owner) {
          const player = this.players.find((p) => p.id === region.owner);
          const ownerColor = player?.color || 0x888888;
          this.mapGfx.fillStyle(ownerColor, 0.15);
          this.fillPoly(this.mapGfx, region.polygon);
        }
        // Terrain
        this.mapGfx.fillStyle(color, region.owner ? 0.6 : 1);
        this.fillPoly(this.mapGfx, region.polygon);
        // Border
        this.mapGfx.lineStyle(1, 0x000000, 0.15);
        this.strokePoly(this.mapGfx, region.polygon);
        // Owner border
        if (region.owner) {
          const player = this.players.find((p) => p.id === region.owner);
          this.mapGfx.lineStyle(1.5, player?.color || 0x888888, 0.5);
          this.strokePoly(this.mapGfx, region.polygon);
        }
      }
    }
  }

  private fillPoly(gfx: Phaser.GameObjects.Graphics, pts: Point[]): void {
    gfx.beginPath();
    gfx.moveTo(pts[0].x, pts[0].y);
    for (let i = 1; i < pts.length; i++) gfx.lineTo(pts[i].x, pts[i].y);
    gfx.closePath();
    gfx.fillPath();
  }

  private strokePoly(gfx: Phaser.GameObjects.Graphics, pts: Point[]): void {
    gfx.beginPath();
    gfx.moveTo(pts[0].x, pts[0].y);
    for (let i = 1; i < pts.length; i++) gfx.lineTo(pts[i].x, pts[i].y);
    gfx.closePath();
    gfx.strokePath();
  }

  private drawBuildings(): void {
    this.buildingGfx.clear();
    for (const b of this.placedBuildings) {
      const def = getBuildingDef(b.type);
      if (!def) continue;

      const size = b.type === 'road' ? 6 : 10;
      const color = b.damaged ? 0x884444 : this.getCategoryColor(def.category);

      this.buildingGfx.fillStyle(color, 0.9);
      this.buildingGfx.fillRect(b.position.x - size / 2, b.position.y - size / 2, size, size);
      this.buildingGfx.lineStyle(1, 0xffffff, 0.5);
      this.buildingGfx.strokeRect(b.position.x - size / 2, b.position.y - size / 2, size, size);

      // Tier indicator
      if (b.tier > 1) {
        this.buildingGfx.fillStyle(0xffd700, 1);
        for (let t = 0; t < b.tier - 1; t++) {
          this.buildingGfx.fillCircle(b.position.x - 4 + t * 4, b.position.y - size / 2 - 3, 1.5);
        }
      }
    }
  }

  private getCategoryColor(cat: string): number {
    switch (cat) {
      case 'housing': return 0x4488cc;
      case 'production': return 0x88aa44;
      case 'military': return 0xcc4444;
      case 'services': return 0x44ccaa;
      case 'government': return 0xccaa44;
      case 'infrastructure': return 0x888888;
      case 'special': return 0xcc44cc;
      default: return 0x666666;
    }
  }

  // ─── HUD ───

  private createHUD(w: number, h: number): void {
    // Top bar - Resources
    const barBg = this.add.graphics().setScrollFactor(0).setDepth(300);
    barBg.fillStyle(0x111133, 0.9);
    barBg.fillRect(0, 0, w, 55);

    // Era
    this.eraText = this.add.text(10, 5, `Era: Ancient`, {
      fontFamily: 'Arial Black', fontSize: '13px', color: '#ffd700',
    }).setScrollFactor(0).setDepth(301);

    // Gold
    this.goldText = this.add.text(10, 23, `Gold: ${this.resources[ResourceType.GOLD]}`, {
      fontFamily: 'Arial', fontSize: '12px', color: '#ffd700',
    }).setScrollFactor(0).setDepth(301);

    // Resources row
    const resTypes = [ResourceType.FOOD, ResourceType.WOOD, ResourceType.STONE, ResourceType.IRON];
    resTypes.forEach((res, i) => {
      const txt = this.add.text(140 + i * 90, 5, `${res}: ${this.resources[res]}`, {
        fontFamily: 'Arial', fontSize: '11px', color: '#aaccaa',
      }).setScrollFactor(0).setDepth(301);
      this.resourceTexts.set(res, txt);
    });

    // Population
    this.popText = this.add.text(140, 23, `Pop: ${getTotalPopulation(this.population)}`, {
      fontFamily: 'Arial', fontSize: '12px', color: '#aaaaee',
    }).setScrollFactor(0).setDepth(301);

    // Happiness
    this.happinessText = this.add.text(250, 23, `Happy: ${this.happiness}%`, {
      fontFamily: 'Arial', fontSize: '12px', color: this.happiness > 50 ? '#44cc44' : '#cc4444',
    }).setScrollFactor(0).setDepth(301);

    // Research
    this.researchText = this.add.text(380, 23, 'Research: None', {
      fontFamily: 'Arial', fontSize: '12px', color: '#ccaaff',
    }).setScrollFactor(0).setDepth(301);

    // Info text (bottom)
    this.infoText = this.add.text(w / 2, h - 15, 'Select a building to place, or right-click to pan', {
      fontFamily: 'Arial', fontSize: '12px', color: '#888899',
    }).setOrigin(0.5, 0.5).setScrollFactor(0).setDepth(301);

    // --- Build Menu (right panel) ---
    const panelX = w - 170;
    const panelBg = this.add.graphics().setScrollFactor(0).setDepth(300);
    panelBg.fillStyle(0x111133, 0.9);
    panelBg.fillRoundedRect(panelX - 5, 55, 175, h - 110, 4);

    this.add.text(panelX + 80, 62, 'BUILD', {
      fontFamily: 'Arial Black', fontSize: '13px', color: '#ffffff',
    }).setOrigin(0.5, 0).setScrollFactor(0).setDepth(301);

    const categories = ['production', 'housing', 'military', 'services', 'government', 'infrastructure', 'special'];
    let yOff = 82;

    for (const cat of categories) {
      const buildings = BUILDING_DEFS.filter((b) => b.category === cat && b.era <= this.era);
      if (buildings.length === 0) continue;

      // Category label
      this.add.text(panelX, yOff, cat.toUpperCase(), {
        fontFamily: 'Arial', fontSize: '9px', color: '#666688',
      }).setScrollFactor(0).setDepth(301);
      yOff += 14;

      for (const def of buildings) {
        const affordable = canAffordBuilding(def, this.resources);
        const costStr = Object.entries(def.cost).map(([r, a]) => `${a}${r.slice(0, 2)}`).join(' ');
        const btn = this.add.text(panelX, yOff, `${def.icon} ${def.name} (${costStr})`, {
          fontFamily: 'Arial', fontSize: '10px',
          color: affordable ? '#cccccc' : '#555566',
        }).setScrollFactor(0).setDepth(301);
        btn.setInteractive({ useHandCursor: true });
        btn.on('pointerdown', () => this.selectBuilding(def));
        this.buildMenuTexts.push(btn);
        yOff += 15;
      }
      yOff += 4;
    }

    // --- Bottom buttons ---
    // Research button
    const resBtn = this.add.text(10, h - 70, '🔬 Research', {
      fontFamily: 'Arial', fontSize: '14px', color: '#ccaaff',
      backgroundColor: '#222244', padding: { x: 8, y: 4 },
    }).setScrollFactor(0).setDepth(301).setInteractive({ useHandCursor: true });
    resBtn.on('pointerdown', () => this.openResearchMenu());

    // Attack button
    const atkBtn = this.add.text(130, h - 70, '⚔️ Attack', {
      fontFamily: 'Arial', fontSize: '14px', color: '#ff6666',
      backgroundColor: '#332222', padding: { x: 8, y: 4 },
    }).setScrollFactor(0).setDepth(301).setInteractive({ useHandCursor: true });
    atkBtn.on('pointerdown', () => this.startCombat());

    // Diplomacy button
    const dipBtn = this.add.text(240, h - 70, '🤝 Diplomacy', {
      fontFamily: 'Arial', fontSize: '14px', color: '#66ccff',
      backgroundColor: '#222233', padding: { x: 8, y: 4 },
    }).setScrollFactor(0).setDepth(301).setInteractive({ useHandCursor: true });
    dipBtn.on('pointerdown', () => this.showDiplomacy());

    // Menu button
    const menuBtn = this.add.text(10, h - 35, '← Menu', {
      fontFamily: 'Arial', fontSize: '12px', color: '#888899',
    }).setScrollFactor(0).setDepth(301).setInteractive({ useHandCursor: true });
    menuBtn.on('pointerdown', () => this.scene.start('MainMenuScene'));
  }

  private updateHUD(): void {
    this.eraText.setText(`Era: ${['', 'Ancient', 'Medieval', 'Industrial', 'Modern'][this.era]}`);
    this.goldText.setText(`Gold: ${this.resources[ResourceType.GOLD]}`);

    for (const [res, txt] of this.resourceTexts) {
      txt.setText(`${res}: ${this.resources[res as ResourceType]}`);
    }

    this.popText.setText(`Pop: ${getTotalPopulation(this.population)}`);
    this.happinessText.setText(`Happy: ${this.happiness}%`);
    this.happinessText.setColor(this.happiness > 50 ? '#44cc44' : '#cc4444');

    if (this.currentResearch) {
      const pct = Math.floor((this.researchProgress / this.researchTarget) * 100);
      this.researchText.setText(`Research: ${this.currentResearch} ${pct}%`);
    } else {
      this.researchText.setText('Research: None');
    }

    // Update build menu affordability
    let idx = 0;
    for (const def of BUILDING_DEFS) {
      if (def.era > this.era) continue;
      if (idx < this.buildMenuTexts.length) {
        this.buildMenuTexts[idx].setColor(canAffordBuilding(def, this.resources) ? '#cccccc' : '#555566');
        idx++;
      }
    }
  }

  // ─── BUILDING PLACEMENT ───

  private selectBuilding(def: BuildingDefinition): void {
    if (!canAffordBuilding(def, this.resources)) {
      this.infoText.setText(`Cannot afford ${def.name}!`).setColor('#ff4444');
      return;
    }
    this.selectedBuildingDef = def;
    this.infoText.setText(`Click on your territory to place ${def.icon} ${def.name}`).setColor('#44ff44');
  }

  private handleLeftClick(ptr: Phaser.Input.Pointer): void {
    if (!this.selectedBuildingDef) return;

    const region = getRegionAtPoint(this.gameMap, { x: ptr.worldX, y: ptr.worldY });
    if (!region) return;

    // Must be own territory
    if (region.owner !== this.humanPlayer.id) {
      this.infoText.setText('Must place on your territory!').setColor('#ff4444');
      return;
    }

    // Check terrain
    if (!this.selectedBuildingDef.validTerrain.includes(region.terrain)) {
      this.infoText.setText(`Cannot build ${this.selectedBuildingDef.name} on ${region.terrain}!`).setColor('#ff4444');
      return;
    }

    // Check affordability again
    if (!canAffordBuilding(this.selectedBuildingDef, this.resources)) {
      this.infoText.setText('Not enough resources!').setColor('#ff4444');
      return;
    }

    // Place building
    this.resources = payForBuilding(this.selectedBuildingDef, this.resources);
    const building = createBuilding(this.selectedBuildingDef, { x: ptr.worldX, y: ptr.worldY });
    this.placedBuildings.push(building);

    eventBus.emit(GameEvents.BUILDING_PLACED, { type: this.selectedBuildingDef.type });
    this.infoText.setText(`Built ${this.selectedBuildingDef.icon} ${this.selectedBuildingDef.name}!`).setColor('#44ff44');
    this.selectedBuildingDef = null;

    this.drawBuildings();
    this.updateHUD();
  }

  // ─── RESEARCH ───

  private openResearchMenu(): void {
    const available = getAvailableResearch(this.completedResearch, this.era);
    if (available.length === 0) {
      this.infoText.setText('No research available. Build a Research Lab!').setColor('#ccaaff');
      return;
    }

    if (!this.placedBuildings.some((b) => b.type === 'research_lab')) {
      this.infoText.setText('Build a Research Lab first!').setColor('#ccaaff');
      return;
    }

    // Pick first affordable research (simple for now, could show menu)
    const node = available.find((r) => canAffordResearch(r, this.resources));
    if (node) {
      this.resources = payForResearch(node, this.resources);
      this.currentResearch = node.name;
      this.researchProgress = 0;
      this.researchTarget = node.researchTime;
      this.infoText.setText(`Researching: ${node.name} (${node.researchTime}s)`).setColor('#ccaaff');
      this.updateHUD();
    } else {
      this.infoText.setText('Cannot afford any research!').setColor('#ff4444');
    }
  }

  // ─── DIPLOMACY ───

  private showDiplomacy(): void {
    const allies = this.players.filter((p) => p.isAI).map((p) => p.name).join(', ');
    this.infoText.setText(`Players: ${allies} | Diplomacy panel coming soon...`).setColor('#66ccff');
  }

  // ─── COMBAT TRANSITION ───

  private startCombat(): void {
    // Find an enemy neighbor to attack
    const enemies = this.players.filter((p) => p.isAI);
    if (enemies.length === 0) return;

    const target = enemies[0];
    this.infoText.setText(`Attacking ${target.name}!`).setColor('#ff6666');

    this.time.delayedCall(1000, () => {
      this.scene.start('Phase3Scene', {
        map: this.gameMap,
        players: this.players,
        attacker: this.humanPlayer,
        defender: target,
        attackerResources: this.resources,
        attackerBuildings: this.placedBuildings,
        era: this.era,
      });
    });
  }

  // ─── GAME TICK ───

  private gameTickUpdate(): void {
    this.gameTick++;

    // Production
    const buildingList = this.placedBuildings.map((b) => ({
      type: b.type,
      producing: b.producing && !b.damaged,
      tier: b.tier,
    }));
    this.resources = economyManager.processProduction(this.resources, buildingList, this.era);

    // Population
    const housing = getHousingCapacity(this.placedBuildings);
    const hasFood = this.resources[ResourceType.FOOD] > 0;
    const buildingTypes = this.placedBuildings.filter((b) => !b.damaged).map((b) => b.type);
    this.happiness = calculateHappiness(this.population, buildingTypes, this.taxConfig, false, 0);
    this.population = processPopulationGrowth(this.population, this.happiness, housing, hasFood, this.era);

    // Consume food
    const foodCost = Math.floor(getTotalPopulation(this.population) * 0.1);
    this.resources[ResourceType.FOOD] = Math.max(0, this.resources[ResourceType.FOOD] - foodCost);

    // Research progress
    if (this.currentResearch && this.researchTarget > 0) {
      this.researchProgress += 2;
      if (this.researchProgress >= this.researchTarget) {
        const node = getAvailableResearch(this.completedResearch, this.era)
          .find((r) => r.name === this.currentResearch);
        if (node) {
          this.completedResearch.push(node.id);
          eventBus.emit(GameEvents.RESEARCH_COMPLETED, node.id);
        }
        this.infoText.setText(`Research complete: ${this.currentResearch}!`).setColor('#44ff44');
        this.currentResearch = null;
        this.researchProgress = 0;

        // Check era advancement
        const newEra = checkEraAdvancement(this.era, this.completedResearch, getTotalPopulation(this.population));
        if (newEra) {
          this.era = newEra;
          eventBus.emit(GameEvents.ERA_ADVANCED, newEra);
          this.infoText.setText(`Era advanced to ${['', 'Ancient', 'Medieval', 'Industrial', 'Modern'][newEra]}!`).setColor('#ffd700');
        }
      }
    }

    // AI actions
    for (const [, aiState] of this.aiStates) {
      const decision = aiBuildDecision(aiState);
      if (decision) {
        aiState.buildings.push(decision);
        const def = getBuildingDef(decision);
        if (def) {
          for (const [res, amount] of Object.entries(def.cost)) {
            aiState.resources[res as ResourceType] = Math.max(0, (aiState.resources[res as ResourceType] || 0) - (amount as number));
          }
        }
      }
      // AI also gets resources
      aiState.resources[ResourceType.FOOD] += 3;
      aiState.resources[ResourceType.WOOD] += 2;
      aiState.resources[ResourceType.GOLD] += 5;
    }

    this.updateHUD();
  }

  update(_time: number, _delta: number): void {
    // Hover effects could go here
  }
}
