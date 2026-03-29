import { Era, TerrainType, ResourceType } from '@/types/game';
import type { Point, Building } from '@/types/game';
import type { ResourceStore } from '@/systems/economy';

export interface BuildingDefinition {
  type: string;
  name: string;
  category: 'housing' | 'production' | 'military' | 'services' | 'government' | 'infrastructure' | 'special';
  era: Era;
  cost: Partial<Record<ResourceType, number>>;
  housingCapacity: number;
  maxHealth: number;
  validTerrain: TerrainType[];
  description: string;
  icon: string; // emoji for now
  productionType?: string; // links to supply chain
}

export const BUILDING_DEFS: BuildingDefinition[] = [
  // --- Housing ---
  { type: 'hut', name: 'Hut', category: 'housing', era: Era.ANCIENT, cost: { [ResourceType.WOOD]: 20 }, housingCapacity: 10, maxHealth: 50, validTerrain: [TerrainType.PLAINS, TerrainType.FOREST, TerrainType.DESERT, TerrainType.SNOW], description: 'Basic shelter for farmers', icon: '🛖' },
  { type: 'house', name: 'House', category: 'housing', era: Era.ANCIENT, cost: { [ResourceType.WOOD]: 50, [ResourceType.STONE]: 30 }, housingCapacity: 20, maxHealth: 100, validTerrain: [TerrainType.PLAINS, TerrainType.DESERT, TerrainType.SNOW], description: 'Comfortable home for workers', icon: '🏠' },
  { type: 'apartment', name: 'Apartment', category: 'housing', era: Era.INDUSTRIAL, cost: { [ResourceType.STONE]: 100, [ResourceType.STEEL]: 50 }, housingCapacity: 50, maxHealth: 200, validTerrain: [TerrainType.PLAINS, TerrainType.DESERT], description: 'Modern housing for many', icon: '🏢' },
  { type: 'mansion', name: 'Mansion', category: 'housing', era: Era.MODERN, cost: { [ResourceType.STONE]: 200, [ResourceType.GOLD]: 100 }, housingCapacity: 10, maxHealth: 150, validTerrain: [TerrainType.PLAINS], description: 'Luxury housing for elites', icon: '🏰' },

  // --- Production ---
  { type: 'farm', name: 'Farm', category: 'production', era: Era.ANCIENT, cost: { [ResourceType.WOOD]: 15 }, housingCapacity: 0, maxHealth: 60, validTerrain: [TerrainType.PLAINS], description: 'Produces food', icon: '🌾', productionType: 'farm' },
  { type: 'lumber_mill', name: 'Lumber Mill', category: 'production', era: Era.ANCIENT, cost: { [ResourceType.WOOD]: 10, [ResourceType.STONE]: 10 }, housingCapacity: 0, maxHealth: 80, validTerrain: [TerrainType.FOREST, TerrainType.PLAINS], description: 'Produces wood', icon: '🪵', productionType: 'lumber_mill' },
  { type: 'quarry', name: 'Quarry', category: 'production', era: Era.ANCIENT, cost: { [ResourceType.WOOD]: 20 }, housingCapacity: 0, maxHealth: 100, validTerrain: [TerrainType.MOUNTAIN, TerrainType.PLAINS], description: 'Produces stone', icon: '⛏️', productionType: 'quarry' },
  { type: 'mine', name: 'Mine', category: 'production', era: Era.MEDIEVAL, cost: { [ResourceType.WOOD]: 40, [ResourceType.STONE]: 30 }, housingCapacity: 0, maxHealth: 120, validTerrain: [TerrainType.MOUNTAIN], description: 'Produces iron, gold, or coal', icon: '⚒️', productionType: 'mine' },
  { type: 'factory', name: 'Factory', category: 'production', era: Era.INDUSTRIAL, cost: { [ResourceType.STONE]: 60, [ResourceType.IRON]: 40 }, housingCapacity: 0, maxHealth: 150, validTerrain: [TerrainType.PLAINS, TerrainType.DESERT], description: 'Processes raw materials', icon: '🏭', productionType: 'factory' },
  { type: 'oil_rig', name: 'Oil Rig', category: 'production', era: Era.INDUSTRIAL, cost: { [ResourceType.STEEL]: 80, [ResourceType.GOLD]: 50 }, housingCapacity: 0, maxHealth: 120, validTerrain: [TerrainType.DESERT, TerrainType.OCEAN], description: 'Extracts oil', icon: '🛢️', productionType: 'oil_rig' },
  { type: 'electronics_plant', name: 'Electronics Plant', category: 'production', era: Era.MODERN, cost: { [ResourceType.STEEL]: 100, [ResourceType.GOLD]: 80 }, housingCapacity: 0, maxHealth: 150, validTerrain: [TerrainType.PLAINS], description: 'Produces electronics', icon: '💻', productionType: 'electronics_plant' },
  { type: 'bakery', name: 'Bakery', category: 'production', era: Era.ANCIENT, cost: { [ResourceType.WOOD]: 25, [ResourceType.STONE]: 15 }, housingCapacity: 0, maxHealth: 60, validTerrain: [TerrainType.PLAINS], description: 'Produces food variety', icon: '🍞', productionType: 'bakery' },
  { type: 'smelter', name: 'Smelter', category: 'production', era: Era.MEDIEVAL, cost: { [ResourceType.STONE]: 50, [ResourceType.IRON]: 20 }, housingCapacity: 0, maxHealth: 100, validTerrain: [TerrainType.PLAINS, TerrainType.MOUNTAIN], description: 'Processes ore into metal', icon: '🔥', productionType: 'factory' },
  { type: 'weaving_mill', name: 'Weaving Mill', category: 'production', era: Era.INDUSTRIAL, cost: { [ResourceType.WOOD]: 40, [ResourceType.IRON]: 20 }, housingCapacity: 0, maxHealth: 80, validTerrain: [TerrainType.PLAINS], description: 'Produces textiles', icon: '🧵', productionType: 'factory' },
  { type: 'refinery', name: 'Refinery', category: 'production', era: Era.INDUSTRIAL, cost: { [ResourceType.STEEL]: 60, [ResourceType.STONE]: 40 }, housingCapacity: 0, maxHealth: 120, validTerrain: [TerrainType.PLAINS, TerrainType.DESERT], description: 'Refines oil into fuel', icon: '⚗️', productionType: 'factory' },

  // --- Military ---
  { type: 'barracks', name: 'Barracks', category: 'military', era: Era.ANCIENT, cost: { [ResourceType.WOOD]: 40, [ResourceType.STONE]: 20 }, housingCapacity: 0, maxHealth: 150, validTerrain: [TerrainType.PLAINS, TerrainType.FOREST, TerrainType.DESERT], description: 'Trains soldiers', icon: '⚔️' },
  { type: 'bunker', name: 'Bunker', category: 'military', era: Era.MEDIEVAL, cost: { [ResourceType.STONE]: 80, [ResourceType.IRON]: 30 }, housingCapacity: 0, maxHealth: 300, validTerrain: [TerrainType.PLAINS, TerrainType.MOUNTAIN], description: 'Defensive fortification', icon: '🏰' },
  { type: 'watchtower', name: 'Watchtower', category: 'military', era: Era.ANCIENT, cost: { [ResourceType.WOOD]: 30, [ResourceType.STONE]: 20 }, housingCapacity: 0, maxHealth: 80, validTerrain: [TerrainType.PLAINS, TerrainType.FOREST, TerrainType.MOUNTAIN], description: 'Scouts nearby areas', icon: '🗼' },
  { type: 'arsenal', name: 'Arsenal', category: 'military', era: Era.INDUSTRIAL, cost: { [ResourceType.IRON]: 60, [ResourceType.GOLD]: 40 }, housingCapacity: 0, maxHealth: 200, validTerrain: [TerrainType.PLAINS], description: 'Stores and produces weapons', icon: '🔫' },
  { type: 'airfield', name: 'Airfield', category: 'military', era: Era.MODERN, cost: { [ResourceType.STEEL]: 100, [ResourceType.GOLD]: 80 }, housingCapacity: 0, maxHealth: 200, validTerrain: [TerrainType.PLAINS, TerrainType.DESERT], description: 'Enables air units', icon: '✈️' },

  // --- Services ---
  { type: 'police_station', name: 'Police Station', category: 'services', era: Era.ANCIENT, cost: { [ResourceType.WOOD]: 30, [ResourceType.STONE]: 20 }, housingCapacity: 0, maxHealth: 100, validTerrain: [TerrainType.PLAINS, TerrainType.DESERT, TerrainType.SNOW], description: 'Provides safety, reduces crime', icon: '🚔' },
  { type: 'hospital', name: 'Hospital', category: 'services', era: Era.MEDIEVAL, cost: { [ResourceType.STONE]: 50, [ResourceType.GOLD]: 20 }, housingCapacity: 0, maxHealth: 120, validTerrain: [TerrainType.PLAINS], description: 'Heals population, prevents disease', icon: '🏥' },
  { type: 'fire_station', name: 'Fire Station', category: 'services', era: Era.MEDIEVAL, cost: { [ResourceType.STONE]: 30, [ResourceType.WOOD]: 20 }, housingCapacity: 0, maxHealth: 80, validTerrain: [TerrainType.PLAINS, TerrainType.FOREST], description: 'Prevents fire damage', icon: '🚒' },
  { type: 'school', name: 'School', category: 'services', era: Era.MEDIEVAL, cost: { [ResourceType.STONE]: 40, [ResourceType.GOLD]: 30 }, housingCapacity: 0, maxHealth: 80, validTerrain: [TerrainType.PLAINS], description: 'Provides education', icon: '🏫' },
  { type: 'church', name: 'Church', category: 'services', era: Era.ANCIENT, cost: { [ResourceType.STONE]: 50, [ResourceType.GOLD]: 20 }, housingCapacity: 0, maxHealth: 80, validTerrain: [TerrainType.PLAINS], description: 'Provides culture and happiness', icon: '⛪' },
  { type: 'market', name: 'Market', category: 'services', era: Era.ANCIENT, cost: { [ResourceType.WOOD]: 25, [ResourceType.GOLD]: 10 }, housingCapacity: 0, maxHealth: 60, validTerrain: [TerrainType.PLAINS], description: 'Enables trade, provides entertainment', icon: '🏪' },

  // --- Government ---
  { type: 'town_hall', name: 'Town Hall', category: 'government', era: Era.ANCIENT, cost: { [ResourceType.WOOD]: 50, [ResourceType.STONE]: 30 }, housingCapacity: 0, maxHealth: 200, validTerrain: [TerrainType.PLAINS], description: 'City center, required first', icon: '🏛️' },
  { type: 'embassy', name: 'Embassy', category: 'government', era: Era.MEDIEVAL, cost: { [ResourceType.STONE]: 60, [ResourceType.GOLD]: 40 }, housingCapacity: 0, maxHealth: 100, validTerrain: [TerrainType.PLAINS], description: 'Enables diplomacy', icon: '🏦' },
  { type: 'research_lab', name: 'Research Lab', category: 'government', era: Era.MEDIEVAL, cost: { [ResourceType.STONE]: 50, [ResourceType.GOLD]: 50 }, housingCapacity: 0, maxHealth: 80, validTerrain: [TerrainType.PLAINS], description: 'Enables research', icon: '🔬' },
  { type: 'bank', name: 'Bank', category: 'government', era: Era.MEDIEVAL, cost: { [ResourceType.STONE]: 60, [ResourceType.GOLD]: 30 }, housingCapacity: 0, maxHealth: 100, validTerrain: [TerrainType.PLAINS], description: 'Increases gold income', icon: '🏦' },
  { type: 'tax_office', name: 'Tax Office', category: 'government', era: Era.ANCIENT, cost: { [ResourceType.WOOD]: 30, [ResourceType.STONE]: 20 }, housingCapacity: 0, maxHealth: 60, validTerrain: [TerrainType.PLAINS], description: 'Increases tax efficiency', icon: '📋' },

  // --- Infrastructure ---
  { type: 'road', name: 'Road', category: 'infrastructure', era: Era.ANCIENT, cost: { [ResourceType.STONE]: 5 }, housingCapacity: 0, maxHealth: 50, validTerrain: [TerrainType.PLAINS, TerrainType.FOREST, TerrainType.DESERT, TerrainType.SNOW], description: 'Connects buildings', icon: '🛤️' },
  { type: 'bridge', name: 'Bridge', category: 'infrastructure', era: Era.MEDIEVAL, cost: { [ResourceType.WOOD]: 40, [ResourceType.STONE]: 30 }, housingCapacity: 0, maxHealth: 80, validTerrain: [TerrainType.RIVER], description: 'Crosses rivers', icon: '🌉' },
  { type: 'port', name: 'Port', category: 'infrastructure', era: Era.MEDIEVAL, cost: { [ResourceType.WOOD]: 60, [ResourceType.STONE]: 30 }, housingCapacity: 0, maxHealth: 100, validTerrain: [TerrainType.OCEAN, TerrainType.RIVER], description: 'Enables sea trade', icon: '⚓' },
  { type: 'power_plant', name: 'Power Plant', category: 'infrastructure', era: Era.INDUSTRIAL, cost: { [ResourceType.STONE]: 80, [ResourceType.IRON]: 50 }, housingCapacity: 0, maxHealth: 150, validTerrain: [TerrainType.PLAINS], description: 'Provides electricity', icon: '⚡' },
  { type: 'water_supply', name: 'Water Supply', category: 'infrastructure', era: Era.ANCIENT, cost: { [ResourceType.STONE]: 20, [ResourceType.WOOD]: 10 }, housingCapacity: 0, maxHealth: 60, validTerrain: [TerrainType.PLAINS, TerrainType.RIVER], description: 'Provides clean water', icon: '💧' },
  { type: 'warehouse', name: 'Warehouse', category: 'infrastructure', era: Era.ANCIENT, cost: { [ResourceType.WOOD]: 30 }, housingCapacity: 0, maxHealth: 80, validTerrain: [TerrainType.PLAINS, TerrainType.DESERT], description: 'Stores extra resources', icon: '📦' },

  // --- Special ---
  { type: 'monument', name: 'Monument', category: 'special', era: Era.MEDIEVAL, cost: { [ResourceType.STONE]: 100, [ResourceType.GOLD]: 80 }, housingCapacity: 0, maxHealth: 200, validTerrain: [TerrainType.PLAINS], description: 'Boosts culture and happiness', icon: '🗽' },
  { type: 'wonder', name: 'Wonder', category: 'special', era: Era.MODERN, cost: { [ResourceType.STONE]: 300, [ResourceType.GOLD]: 200, [ResourceType.STEEL]: 100 }, housingCapacity: 0, maxHealth: 500, validTerrain: [TerrainType.PLAINS], description: 'Unique world wonder, massive bonuses', icon: '🌟' },
  { type: 'trade_post', name: 'Trade Post', category: 'special', era: Era.ANCIENT, cost: { [ResourceType.WOOD]: 25, [ResourceType.GOLD]: 15 }, housingCapacity: 0, maxHealth: 60, validTerrain: [TerrainType.PLAINS, TerrainType.FOREST, TerrainType.DESERT], description: 'Enables trade routes', icon: '🏕️' },
];

export function getBuildingDef(type: string): BuildingDefinition | undefined {
  return BUILDING_DEFS.find((b) => b.type === type);
}

export function getBuildingsForEra(era: Era): BuildingDefinition[] {
  return BUILDING_DEFS.filter((b) => b.era <= era);
}

export function getBuildingsByCategory(category: string, era: Era): BuildingDefinition[] {
  return BUILDING_DEFS.filter((b) => b.category === category && b.era <= era);
}

export function canAffordBuilding(def: BuildingDefinition, resources: ResourceStore): boolean {
  for (const [res, amount] of Object.entries(def.cost)) {
    if ((resources[res as ResourceType] || 0) < (amount as number)) return false;
  }
  return true;
}

export function payForBuilding(def: BuildingDefinition, resources: ResourceStore): ResourceStore {
  const updated = { ...resources };
  for (const [res, amount] of Object.entries(def.cost)) {
    updated[res as ResourceType] -= amount as number;
  }
  return updated;
}

export function createBuilding(def: BuildingDefinition, position: Point): Building {
  return {
    id: `b_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
    type: def.type,
    position,
    tier: 1,
    health: def.maxHealth,
    maxHealth: def.maxHealth,
    damaged: false,
    producing: true,
  };
}

export function getRepairCost(def: BuildingDefinition): Partial<Record<ResourceType, number>> {
  const cost: Partial<Record<ResourceType, number>> = {};
  for (const [res, amount] of Object.entries(def.cost)) {
    cost[res as ResourceType] = Math.ceil((amount as number) * 0.5);
  }
  return cost;
}

export function getUpgradeCost(def: BuildingDefinition, currentTier: number): Partial<Record<ResourceType, number>> {
  const cost: Partial<Record<ResourceType, number>> = {};
  const multiplier = currentTier + 0.5;
  for (const [res, amount] of Object.entries(def.cost)) {
    cost[res as ResourceType] = Math.ceil((amount as number) * multiplier);
  }
  return cost;
}

export function getHousingCapacity(buildings: Building[]): number {
  let capacity = 0;
  for (const b of buildings) {
    if (b.damaged) continue;
    const def = getBuildingDef(b.type);
    if (def) capacity += def.housingCapacity * (1 + (b.tier - 1) * 0.3);
  }
  return Math.floor(capacity);
}
