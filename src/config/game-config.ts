import { Era, ResourceType, TerrainType } from '@/types/game';
import type { TerrainProperties } from '@/types/game';

// --- Game Settings ---

export const GAME_CONFIG = {
  TICK_RATE: 10, // ticks per second
  AUTO_SAVE_INTERVAL: 30_000, // 30 seconds
  MAX_PLAYERS: 4,
  MIN_PLAYERS: 2,

  // Phase 1 - Expansion
  SPAWN_MARKER_SIZE: 5, // 5x5 pixels
  SPAWN_COUNTDOWN: 30, // seconds
  CLAIM_SPEED: 1.0, // seconds per region

  // Phase 2 - Building
  TAX_COLLECTION_INTERVAL: 60, // seconds (game time)
  BUILDING_TIERS: 3,
  REPAIR_COST_MULTIPLIER: 0.5, // 50% of original cost

  // Phase 3 - Combat
  MAX_ELIXIR: 10,
  START_ELIXIR: 5,
  ELIXIR_REGEN_RATE: 0.5, // per second
  BATTLE_DURATION: 180, // 3 minutes
  OVERTIME_DURATION: 60, // 1 minute
  DECK_SIZE: 8,
  HAND_SIZE: 4,
  BUILDING_SURVIVAL_RATE: 0.35, // 35% buildings survive conquest

  // Conquest
  CONQUERED_HAPPINESS_PENALTY: -30,
  CONQUERED_HAPPINESS_RECOVERY_TIME: 300, // 5 minutes

  // Population
  REBELLION_THRESHOLD: 20, // happiness below 20% triggers rebellion risk

  // Map
  MAP_SIZES: {
    small: { regions: 50, width: 800, height: 600 },
    medium: { regions: 100, width: 1200, height: 900 },
    large: { regions: 200, width: 1600, height: 1200 },
  },
} as const;

// --- Era Progression ---

export const ERA_CONFIG: Record<Era, {
  name: string;
  populationRequired: number;
  researchRequired: string[];
  unlockedResources: ResourceType[];
}> = {
  [Era.ANCIENT]: {
    name: 'Ancient',
    populationRequired: 0,
    researchRequired: [],
    unlockedResources: [ResourceType.FOOD, ResourceType.WOOD, ResourceType.STONE],
  },
  [Era.MEDIEVAL]: {
    name: 'Medieval',
    populationRequired: 200,
    researchRequired: ['metallurgy', 'currency'],
    unlockedResources: [ResourceType.IRON, ResourceType.GOLD],
  },
  [Era.INDUSTRIAL]: {
    name: 'Industrial',
    populationRequired: 500,
    researchRequired: ['steam_power', 'chemistry'],
    unlockedResources: [ResourceType.COAL, ResourceType.OIL, ResourceType.TEXTILES],
  },
  [Era.MODERN]: {
    name: 'Modern',
    populationRequired: 1000,
    researchRequired: ['electronics_research', 'nuclear'],
    unlockedResources: [ResourceType.ELECTRONICS, ResourceType.STEEL, ResourceType.CHEMICALS],
  },
};

// --- Terrain Properties ---

export const TERRAIN_CONFIG: Record<TerrainType, TerrainProperties> = {
  [TerrainType.PLAINS]: {
    buildable: true,
    movementCost: 1.0,
    combatDefenseBonus: 0,
    resourceTypes: [ResourceType.FOOD],
    happinessModifier: 0,
  },
  [TerrainType.FOREST]: {
    buildable: false,
    movementCost: 1.5,
    combatDefenseBonus: 0.2,
    resourceTypes: [ResourceType.WOOD, ResourceType.FOOD],
    happinessModifier: 0.05,
  },
  [TerrainType.MOUNTAIN]: {
    buildable: false,
    movementCost: 3.0,
    combatDefenseBonus: 0.3,
    resourceTypes: [ResourceType.STONE, ResourceType.IRON, ResourceType.GOLD],
    happinessModifier: 0,
  },
  [TerrainType.DESERT]: {
    buildable: true,
    movementCost: 1.0,
    combatDefenseBonus: 0,
    resourceTypes: [ResourceType.OIL],
    happinessModifier: -0.1,
  },
  [TerrainType.RIVER]: {
    buildable: false,
    movementCost: Infinity,
    combatDefenseBonus: 0,
    resourceTypes: [ResourceType.FOOD],
    happinessModifier: 0.05,
  },
  [TerrainType.OCEAN]: {
    buildable: false,
    movementCost: Infinity,
    combatDefenseBonus: 0,
    resourceTypes: [ResourceType.FOOD],
    happinessModifier: 0,
  },
  [TerrainType.SNOW]: {
    buildable: true,
    movementCost: 1.5,
    combatDefenseBonus: 0,
    resourceTypes: [],
    happinessModifier: -0.1,
  },
};

// --- Player Colors ---

export const PLAYER_COLORS = [
  0x4287f5, // Blue
  0xe74c3c, // Red
  0x2ecc71, // Green
  0xf39c12, // Orange
] as const;
