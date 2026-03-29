// ============================================================
// World Conquer - Core Game Types
// ============================================================

// --- Enums ---

export enum GamePhase {
  BOOT = 'boot',
  MAIN_MENU = 'main_menu',
  LOBBY = 'lobby',
  PHASE_1_EXPANSION = 'phase_1_expansion',
  PHASE_2_BUILDING = 'phase_2_building',
  PHASE_3_COMBAT = 'phase_3_combat',
  VICTORY = 'victory',
}

export enum TerrainType {
  PLAINS = 'plains',
  FOREST = 'forest',
  MOUNTAIN = 'mountain',
  DESERT = 'desert',
  RIVER = 'river',
  OCEAN = 'ocean',
  SNOW = 'snow',
}

export enum Era {
  ANCIENT = 1,
  MEDIEVAL = 2,
  INDUSTRIAL = 3,
  MODERN = 4,
}

export enum ResourceType {
  // Era 1
  FOOD = 'food',
  WOOD = 'wood',
  STONE = 'stone',
  // Era 2
  IRON = 'iron',
  GOLD = 'gold',
  // Era 3
  COAL = 'coal',
  OIL = 'oil',
  TEXTILES = 'textiles',
  // Era 4
  ELECTRONICS = 'electronics',
  STEEL = 'steel',
  CHEMICALS = 'chemicals',
}

export enum BuildingCategory {
  HOUSING = 'housing',
  PRODUCTION = 'production',
  MILITARY = 'military',
  SERVICES = 'services',
  GOVERNMENT = 'government',
  INFRASTRUCTURE = 'infrastructure',
  SPECIAL = 'special',
}

export enum PopulationClass {
  FARMERS = 'farmers',
  WORKERS = 'workers',
  MERCHANTS = 'merchants',
  ENGINEERS = 'engineers',
  ELITES = 'elites',
}

export enum CardCategory {
  INFANTRY = 'infantry',
  VEHICLE = 'vehicle',
  AIR = 'air',
  SPELL = 'spell',
  SIEGE = 'siege',
}

export enum CardRarity {
  COMMON = 'common',
  RARE = 'rare',
  EPIC = 'epic',
  LEGENDARY = 'legendary',
}

export enum DiplomacyAction {
  ALLIANCE = 'alliance',
  NON_AGGRESSION = 'non_aggression',
  TRADE_AGREEMENT = 'trade_agreement',
  TRIBUTE = 'tribute',
  VASSALAGE = 'vassalage',
  PEACE_TREATY = 'peace_treaty',
  EMBARGO = 'embargo',
  DECLARE_WAR = 'declare_war',
}

export enum AIPersonality {
  AGGRESSIVE = 'aggressive',
  DEFENSIVE = 'defensive',
  ECONOMIC = 'economic',
  DIPLOMATIC = 'diplomatic',
  BALANCED = 'balanced',
}

// --- Interfaces ---

export interface Point {
  x: number;
  y: number;
}

export interface Region {
  id: string;
  polygon: Point[];
  centroid: Point;
  terrain: TerrainType;
  resources: ResourceNode[];
  owner: string | null;
  buildings: Building[];
}

export interface ResourceNode {
  type: ResourceType;
  amount: number;
  position: Point;
}

export interface GameMap {
  seed: number;
  width: number;
  height: number;
  regions: Region[];
  adjacency: Record<string, string[]>;
}

export interface TerrainProperties {
  buildable: boolean;
  movementCost: number;
  combatDefenseBonus: number;
  resourceTypes: ResourceType[];
  happinessModifier: number;
}

export interface Building {
  id: string;
  type: string;
  position: Point;
  tier: number;
  health: number;
  maxHealth: number;
  damaged: boolean;
  producing: boolean;
}

export interface CardDefinition {
  id: string;
  name: string;
  category: CardCategory;
  rarity: CardRarity;
  era: Era;
  elixirCost: number;
  stats: CardStats;
  description: string;
}

export interface CardStats {
  hp: number;
  dps: number;
  speed: number;
  range: number;
  splashRadius?: number;
}

export interface PlayerCard {
  definitionId: string;
  level: number;
  duplicates: number;
  modification: string | null;
}

export interface PlayerState {
  id: string;
  name: string;
  color: string;
  era: Era;
  resources: Record<ResourceType, number>;
  population: Record<PopulationClass, number>;
  happiness: number;
  buildings: Building[];
  cards: PlayerCard[];
  deck: string[];
  research: string[];
  territories: string[];
  gold: number;
  isAI: boolean;
  aiPersonality?: AIPersonality;
}

export interface DiplomacyRelation {
  playerId: string;
  targetId: string;
  score: number;
  treaties: DiplomacyAction[];
}

export interface GameState {
  id: string;
  phase: GamePhase;
  tick: number;
  map: GameMap;
  players: PlayerState[];
  diplomacy: DiplomacyRelation[];
  currentEra: Era;
  timestamp: number;
}

export interface SaveData {
  version: string;
  gameId: string;
  timestamp: string;
  state: GameState;
}
