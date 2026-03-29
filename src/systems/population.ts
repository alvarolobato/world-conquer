import { PopulationClass, Era } from '@/types/game';
import { eventBus, GameEvents } from '@/systems/event-bus';
import type { TaxConfig } from '@/systems/economy';
import { getTaxHappinessModifier } from '@/systems/economy';

export interface PopulationStore {
  [PopulationClass.FARMERS]: number;
  [PopulationClass.WORKERS]: number;
  [PopulationClass.MERCHANTS]: number;
  [PopulationClass.ENGINEERS]: number;
  [PopulationClass.ELITES]: number;
}

export function createStartingPopulation(): PopulationStore {
  return {
    [PopulationClass.FARMERS]: 30,
    [PopulationClass.WORKERS]: 10,
    [PopulationClass.MERCHANTS]: 0,
    [PopulationClass.ENGINEERS]: 0,
    [PopulationClass.ELITES]: 0,
  };
}

export function getTotalPopulation(pop: PopulationStore): number {
  return Object.values(pop).reduce((a, b) => a + b, 0);
}

// Class unlock by era
const CLASS_ERA: Record<PopulationClass, Era> = {
  [PopulationClass.FARMERS]: Era.ANCIENT,
  [PopulationClass.WORKERS]: Era.ANCIENT,
  [PopulationClass.MERCHANTS]: Era.MEDIEVAL,
  [PopulationClass.ENGINEERS]: Era.INDUSTRIAL,
  [PopulationClass.ELITES]: Era.MODERN,
};

// Needs per class
export interface NeedStatus {
  name: string;
  fulfilled: boolean;
  isBasic: boolean;
}

export interface ClassNeeds {
  basic: string[];
  luxury: string[];
}

export const CLASS_NEEDS: Record<PopulationClass, ClassNeeds> = {
  [PopulationClass.FARMERS]: {
    basic: ['food', 'housing'],
    luxury: ['church'],
  },
  [PopulationClass.WORKERS]: {
    basic: ['food', 'housing', 'clothing', 'safety'],
    luxury: ['entertainment', 'church'],
  },
  [PopulationClass.MERCHANTS]: {
    basic: ['food', 'housing', 'clothing', 'safety'],
    luxury: ['food_variety', 'entertainment', 'education'],
  },
  [PopulationClass.ENGINEERS]: {
    basic: ['food', 'housing', 'clothing', 'safety', 'education'],
    luxury: ['electricity', 'entertainment', 'luxury_goods'],
  },
  [PopulationClass.ELITES]: {
    basic: ['food', 'housing', 'clothing', 'safety', 'education', 'electricity'],
    luxury: ['luxury_goods', 'culture', 'entertainment'],
  },
};

// Map building types to needs they fulfill
export const NEED_PROVIDERS: Record<string, string[]> = {
  farm: ['food'],
  bakery: ['food_variety'],
  hut: ['housing'],
  house: ['housing'],
  apartment: ['housing'],
  mansion: ['housing'],
  factory: ['clothing'],
  police_station: ['safety'],
  hospital: ['safety'],
  school: ['education'],
  church: ['culture', 'church'],
  market: ['entertainment'],
  monument: ['culture'],
  power_plant: ['electricity'],
};

export function evaluateNeeds(
  cls: PopulationClass,
  buildingTypes: string[]
): { basicMet: number; luxuryMet: number; needs: NeedStatus[] } {
  const needs = CLASS_NEEDS[cls];
  const provided = new Set<string>();
  for (const bt of buildingTypes) {
    const p = NEED_PROVIDERS[bt];
    if (p) p.forEach((n) => provided.add(n));
  }

  const statuses: NeedStatus[] = [];
  let basicMet = 0;
  let luxuryMet = 0;

  for (const n of needs.basic) {
    const fulfilled = provided.has(n);
    statuses.push({ name: n, fulfilled, isBasic: true });
    if (fulfilled) basicMet++;
  }
  for (const n of needs.luxury) {
    const fulfilled = provided.has(n);
    statuses.push({ name: n, fulfilled, isBasic: false });
    if (fulfilled) luxuryMet++;
  }

  return {
    basicMet: needs.basic.length > 0 ? basicMet / needs.basic.length : 1,
    luxuryMet: needs.luxury.length > 0 ? luxuryMet / needs.luxury.length : 0,
    needs: statuses,
  };
}

export function calculateHappiness(
  population: PopulationStore,
  buildingTypes: string[],
  taxConfig: TaxConfig,
  isConquered: boolean,
  conqueredTimer: number
): number {
  let happiness = 60; // Base happiness

  // Evaluate needs across all classes
  for (const cls of Object.values(PopulationClass)) {
    if (population[cls] <= 0) continue;
    const { basicMet, luxuryMet } = evaluateNeeds(cls, buildingTypes);
    happiness += (basicMet - 0.5) * 20; // -10 if none met, +10 if all met
    happiness += luxuryMet * 8;
  }

  // Tax modifier
  happiness += getTaxHappinessModifier(taxConfig);

  // Conquered penalty
  if (isConquered && conqueredTimer > 0) {
    happiness -= 30 * (conqueredTimer / 300);
  }

  return Math.max(0, Math.min(100, Math.round(happiness)));
}

export function processPopulationGrowth(
  population: PopulationStore,
  happiness: number,
  housingCapacity: number,
  foodAvailable: boolean,
  era: Era
): PopulationStore {
  const updated = { ...population };
  const total = getTotalPopulation(updated);

  // Growth rate based on happiness
  let growthRate = 0;
  if (happiness > 80) growthRate = 0.05;
  else if (happiness > 50) growthRate = 0.02;
  else if (happiness > 20) growthRate = 0;
  else growthRate = -0.03; // Decline

  if (!foodAvailable) growthRate -= 0.05;
  if (total >= housingCapacity) growthRate = Math.min(growthRate, 0);

  // Apply growth to farmers first
  if (growthRate > 0) {
    const growth = Math.max(1, Math.floor(updated[PopulationClass.FARMERS] * growthRate));
    updated[PopulationClass.FARMERS] += growth;
  } else if (growthRate < 0) {
    const decline = Math.max(1, Math.ceil(total * Math.abs(growthRate)));
    updated[PopulationClass.FARMERS] = Math.max(0, updated[PopulationClass.FARMERS] - decline);
  }

  // Class upgrades based on era and building availability
  if (era >= Era.ANCIENT && updated[PopulationClass.FARMERS] > 20) {
    const upgrade = Math.floor(updated[PopulationClass.FARMERS] * 0.02);
    if (upgrade > 0) {
      updated[PopulationClass.FARMERS] -= upgrade;
      updated[PopulationClass.WORKERS] += upgrade;
    }
  }
  if (era >= Era.MEDIEVAL && updated[PopulationClass.WORKERS] > 20) {
    const upgrade = Math.floor(updated[PopulationClass.WORKERS] * 0.015);
    if (upgrade > 0) {
      updated[PopulationClass.WORKERS] -= upgrade;
      updated[PopulationClass.MERCHANTS] += upgrade;
    }
  }
  if (era >= Era.INDUSTRIAL && updated[PopulationClass.MERCHANTS] > 10) {
    const upgrade = Math.floor(updated[PopulationClass.MERCHANTS] * 0.01);
    if (upgrade > 0) {
      updated[PopulationClass.MERCHANTS] -= upgrade;
      updated[PopulationClass.ENGINEERS] += upgrade;
    }
  }
  if (era >= Era.MODERN && updated[PopulationClass.ENGINEERS] > 5) {
    const upgrade = Math.floor(updated[PopulationClass.ENGINEERS] * 0.008);
    if (upgrade > 0) {
      updated[PopulationClass.ENGINEERS] -= upgrade;
      updated[PopulationClass.ELITES] += upgrade;
    }
  }

  return updated;
}

// Check rebellion
export function checkRebellion(happiness: number): boolean {
  if (happiness < 20) {
    return Math.random() < (20 - happiness) / 100;
  }
  return false;
}
