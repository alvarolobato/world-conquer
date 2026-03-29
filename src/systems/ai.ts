import { AIPersonality, Era, ResourceType } from '@/types/game';
import type { GameMap, Region } from '@/types/game';
import type { ResourceStore } from '@/systems/economy';
import type { PopulationStore } from '@/systems/population';
import { getTotalPopulation } from '@/systems/population';
import { BUILDING_DEFS, getBuildingDef, canAffordBuilding, type BuildingDefinition } from '@/systems/buildings';
import { getAvailableResearch, canAffordResearch, type ResearchNode } from '@/systems/research';
import { getCardsForEra } from '@/systems/cards';
import type { DiplomacyState } from '@/systems/diplomacy';
import { getRelation, isAtWar, getAllies } from '@/systems/diplomacy';

export interface AIState {
  playerId: string;
  personality: AIPersonality;
  era: Era;
  resources: ResourceStore;
  population: PopulationStore;
  buildings: string[]; // building types owned
  completedResearch: string[];
  cardDeck: string[];
  territories: number;
  lastAction: number;
  observedPatterns: PlayerPattern;
}

export interface PlayerPattern {
  attackFrequency: number; // avg attacks per minute
  preferredUnits: string[];
  expansionDirection: string;
  buildPriority: string;
}

// Build priorities by personality
const BUILD_PRIORITIES: Record<AIPersonality, string[]> = {
  [AIPersonality.AGGRESSIVE]: ['barracks', 'farm', 'mine', 'arsenal', 'watchtower', 'house'],
  [AIPersonality.DEFENSIVE]: ['farm', 'bunker', 'watchtower', 'house', 'police_station', 'hospital'],
  [AIPersonality.ECONOMIC]: ['farm', 'market', 'factory', 'trade_post', 'house', 'bank'],
  [AIPersonality.DIPLOMATIC]: ['farm', 'embassy', 'market', 'house', 'church', 'school'],
  [AIPersonality.BALANCED]: ['farm', 'house', 'barracks', 'market', 'police_station', 'research_lab'],
};

// Research priorities
const RESEARCH_PRIORITIES: Record<AIPersonality, string[]> = {
  [AIPersonality.AGGRESSIVE]: ['archery', 'fortification', 'metallurgy', 'gunpowder', 'artillery_tech'],
  [AIPersonality.DEFENSIVE]: ['masonry', 'fortification', 'engineering', 'metallurgy', 'steam_power'],
  [AIPersonality.ECONOMIC]: ['agriculture', 'currency', 'banking', 'industrialization', 'global_trade'],
  [AIPersonality.DIPLOMATIC]: ['agriculture', 'currency', 'masonry', 'engineering', 'banking'],
  [AIPersonality.BALANCED]: ['agriculture', 'masonry', 'archery', 'currency', 'metallurgy'],
};

export function createAIState(playerId: string, personality: AIPersonality): AIState {
  return {
    playerId,
    personality,
    era: Era.ANCIENT,
    resources: {
      [ResourceType.FOOD]: 100,
      [ResourceType.WOOD]: 50,
      [ResourceType.STONE]: 30,
      [ResourceType.IRON]: 0,
      [ResourceType.GOLD]: 200,
      [ResourceType.COAL]: 0,
      [ResourceType.OIL]: 0,
      [ResourceType.TEXTILES]: 0,
      [ResourceType.ELECTRONICS]: 0,
      [ResourceType.STEEL]: 0,
      [ResourceType.CHEMICALS]: 0,
    },
    population: {
      farmers: 30,
      workers: 10,
      merchants: 0,
      engineers: 0,
      elites: 0,
    } as unknown as PopulationStore,
    buildings: [],
    completedResearch: [],
    cardDeck: ['militia', 'archers', 'heal', 'shield', 'battering_ram', 'fire_arrows', 'militia', 'fortify'],
    territories: 0,
    lastAction: 0,
    observedPatterns: {
      attackFrequency: 0,
      preferredUnits: [],
      expansionDirection: 'balanced',
      buildPriority: 'balanced',
    },
  };
}

// Decide what building to construct next
export function aiBuildDecision(state: AIState): string | null {
  const priorities = BUILD_PRIORITIES[state.personality];

  // Always build town hall first
  if (!state.buildings.includes('town_hall')) return 'town_hall';

  // Follow priority list, build what we don't have enough of
  for (const buildingType of priorities) {
    const def = BUILDING_DEFS.find((b) => b.type === buildingType);
    if (!def) continue;
    if (def.era > state.era) continue;
    if (!canAffordBuilding(def, state.resources)) continue;

    const count = state.buildings.filter((b) => b === buildingType).length;
    const maxCount = buildingType === 'farm' ? 5 : buildingType === 'house' ? 4 : 2;

    if (count < maxCount) return buildingType;
  }

  return null;
}

// Decide what to research next
export function aiResearchDecision(state: AIState): string | null {
  if (!state.buildings.includes('research_lab')) return null;

  const available = getAvailableResearch(state.completedResearch, state.era);
  const priorities = RESEARCH_PRIORITIES[state.personality];

  // Follow priority order
  for (const resId of priorities) {
    const node = available.find((r) => r.id === resId);
    if (node && canAffordResearch(node, state.resources)) {
      return resId;
    }
  }

  // Pick first affordable
  for (const node of available) {
    if (canAffordResearch(node, state.resources)) return node.id;
  }

  return null;
}

// Decide whether to attack
export function aiAttackDecision(
  state: AIState,
  diplomacy: DiplomacyState,
  playerStrengths: Map<string, number>,
  neighbors: string[]
): string | null {
  const myStrength = playerStrengths.get(state.playerId) || 0;
  const allies = getAllies(diplomacy, state.playerId);

  // Attack threshold by personality
  const aggressionThreshold: Record<AIPersonality, number> = {
    [AIPersonality.AGGRESSIVE]: 0.6,
    [AIPersonality.DEFENSIVE]: 1.5,
    [AIPersonality.ECONOMIC]: 1.2,
    [AIPersonality.DIPLOMATIC]: 1.3,
    [AIPersonality.BALANCED]: 1.0,
  };

  for (const neighbor of neighbors) {
    if (allies.includes(neighbor)) continue;
    if (!isAtWar(diplomacy, state.playerId, neighbor)) continue;

    const theirStrength = playerStrengths.get(neighbor) || 0;
    if (myStrength > theirStrength * aggressionThreshold[state.personality]) {
      return neighbor;
    }
  }

  return null;
}

// Decide diplomacy actions
export function aiDiplomacyDecision(
  state: AIState,
  diplomacy: DiplomacyState,
  otherPlayers: string[],
  playerStrengths: Map<string, number>
): { action: string; target: string } | null {
  const myStrength = playerStrengths.get(state.playerId) || 0;

  for (const other of otherPlayers) {
    if (other === state.playerId) continue;
    const relation = getRelation(diplomacy, state.playerId, other);
    const theirStrength = playerStrengths.get(other) || 0;

    // Seek alliance with strong neutral/friendly players
    if (state.personality === AIPersonality.DIPLOMATIC || state.personality === AIPersonality.DEFENSIVE) {
      if (relation > 10 && theirStrength > myStrength * 0.8 && !isAtWar(diplomacy, state.playerId, other)) {
        if (!getAllies(diplomacy, state.playerId).includes(other)) {
          return { action: 'alliance', target: other };
        }
      }
    }

    // Aggressive AI declares war on weak neighbors
    if (state.personality === AIPersonality.AGGRESSIVE) {
      if (theirStrength < myStrength * 0.7 && !isAtWar(diplomacy, state.playerId, other) && relation < 20) {
        return { action: 'declare_war', target: other };
      }
    }

    // Economic AI seeks trade
    if (state.personality === AIPersonality.ECONOMIC) {
      if (relation > -10 && !isAtWar(diplomacy, state.playerId, other)) {
        return { action: 'trade_agreement', target: other };
      }
    }
  }

  return null;
}

// Observe and learn from player behavior
export function updatePlayerPatterns(state: AIState, event: string, data: unknown): void {
  if (event === 'attack') {
    state.observedPatterns.attackFrequency += 0.1;
  }
  if (event === 'card_played' && typeof data === 'object' && data !== null && 'cardId' in data) {
    const cardId = (data as { cardId: string }).cardId;
    if (!state.observedPatterns.preferredUnits.includes(cardId)) {
      state.observedPatterns.preferredUnits.push(cardId);
    }
  }
}

// Adjust deck based on observations
export function aiUpdateDeck(state: AIState): void {
  const available = getCardsForEra(state.era);
  const deck: string[] = [];

  // Counter observed patterns
  const needsAntiAir = state.observedPatterns.preferredUnits.some(
    (u) => ['fighter_plane', 'bomber', 'helicopter'].includes(u)
  );

  // Build a balanced deck
  const infantry = available.filter((c) => c.category === 'infantry');
  const spells = available.filter((c) => c.category === 'spell');

  // Add 4 infantry
  for (let i = 0; i < Math.min(4, infantry.length); i++) {
    deck.push(infantry[i].id);
  }
  // Add 2 spells
  for (let i = 0; i < Math.min(2, spells.length); i++) {
    deck.push(spells[i].id);
  }
  // Fill rest
  while (deck.length < 8 && available.length > 0) {
    const card = available[Math.floor(Math.random() * available.length)];
    if (!deck.includes(card.id)) deck.push(card.id);
    if (deck.length >= available.length) break;
  }

  state.cardDeck = deck.slice(0, 8);
}
