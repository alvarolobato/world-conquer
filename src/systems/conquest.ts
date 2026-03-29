import { GAME_CONFIG } from '@/config/game-config';
import { eventBus, GameEvents } from '@/systems/event-bus';
import type { Building, Region } from '@/types/game';
import { getBuildingDef, getRepairCost } from '@/systems/buildings';
import type { ResourceStore } from '@/systems/economy';
import { ResourceType } from '@/types/game';

export interface ConquestResult {
  conqueredRegions: Region[];
  survivingBuildings: Building[];
  destroyedBuildings: Building[];
  moneyGained: number;
  populationGained: number;
  integration: 'merge' | 'vassal';
}

export function processConquest(
  winnerRegions: Region[],
  loserRegions: Region[],
  loserBuildings: Building[],
  loserGold: number,
  loserPopulation: number,
  winnerHappiness: number
): ConquestResult {
  // 35% of buildings survive
  const shuffled = [...loserBuildings].sort(() => Math.random() - 0.5);

  // Weight survival toward infrastructure
  shuffled.sort((a, b) => {
    const defA = getBuildingDef(a.type);
    const defB = getBuildingDef(b.type);
    const weightA = defA?.category === 'infrastructure' ? 1 : defA?.category === 'housing' ? 0.7 : 0.3;
    const weightB = defB?.category === 'infrastructure' ? 1 : defB?.category === 'housing' ? 0.7 : 0.3;
    return weightB - weightA + (Math.random() - 0.5) * 0.5;
  });

  const surviveCount = Math.ceil(shuffled.length * GAME_CONFIG.BUILDING_SURVIVAL_RATE);
  const surviving = shuffled.slice(0, surviveCount).map((b) => ({
    ...b,
    damaged: true,
    producing: false,
    health: Math.floor(b.maxHealth * 0.3),
  }));
  const destroyed = shuffled.slice(surviveCount);

  // Determine integration: merge or vassal
  // Base 50/50, modified by happiness and territory size
  let mergeChance = 0.5;
  if (winnerHappiness > 70) mergeChance += 0.2;
  if (winnerHappiness < 40) mergeChance -= 0.2;
  if (loserRegions.length > 10) mergeChance -= 0.15; // Large territories prefer independence
  mergeChance = Math.max(0.1, Math.min(0.9, mergeChance));

  const integration = Math.random() < mergeChance ? 'merge' : 'vassal';

  const result: ConquestResult = {
    conqueredRegions: loserRegions,
    survivingBuildings: surviving,
    destroyedBuildings: destroyed,
    moneyGained: loserGold,
    populationGained: loserPopulation,
    integration,
  };

  if (integration === 'merge') {
    eventBus.emit(GameEvents.CITY_MERGED, result);
  } else {
    eventBus.emit(GameEvents.CITY_VASSALIZED, result);
  }
  eventBus.emit(GameEvents.TERRITORY_CONQUERED, result);

  return result;
}

export interface VassalCity {
  id: string;
  name: string;
  overlord: string;
  regions: string[];
  tributeRate: number; // 0-1
  happiness: number;
  buildings: Building[];
  population: number;
}

export function calculateTribute(vassal: VassalCity, goldIncome: number): number {
  return Math.floor(goldIncome * vassal.tributeRate);
}

export function checkVassalRebellion(vassal: VassalCity): boolean {
  if (vassal.happiness < 15) {
    return Math.random() < 0.1;
  }
  if (vassal.happiness < 30 && vassal.tributeRate > 0.5) {
    return Math.random() < 0.05;
  }
  return false;
}

export function canRepairBuilding(building: Building, resources: ResourceStore): boolean {
  const def = getBuildingDef(building.type);
  if (!def || !building.damaged) return false;
  const cost = getRepairCost(def);
  for (const [res, amount] of Object.entries(cost)) {
    if ((resources[res as ResourceType] || 0) < (amount as number)) return false;
  }
  return true;
}

export function repairBuilding(building: Building, resources: ResourceStore): ResourceStore {
  const def = getBuildingDef(building.type);
  if (!def) return resources;

  const cost = getRepairCost(def);
  const updated = { ...resources };
  for (const [res, amount] of Object.entries(cost)) {
    updated[res as ResourceType] -= amount as number;
  }

  building.damaged = false;
  building.producing = true;
  building.health = def.maxHealth;

  eventBus.emit(GameEvents.BUILDING_REPAIRED, building);
  return updated;
}
