import { Era, ResourceType, PopulationClass } from '@/types/game';
import { ERA_CONFIG } from '@/config/game-config';
import { eventBus, GameEvents } from '@/systems/event-bus';

export interface ResourceStore {
  [ResourceType.FOOD]: number;
  [ResourceType.WOOD]: number;
  [ResourceType.STONE]: number;
  [ResourceType.IRON]: number;
  [ResourceType.GOLD]: number;
  [ResourceType.COAL]: number;
  [ResourceType.OIL]: number;
  [ResourceType.TEXTILES]: number;
  [ResourceType.ELECTRONICS]: number;
  [ResourceType.STEEL]: number;
  [ResourceType.CHEMICALS]: number;
}

export function createEmptyResources(): ResourceStore {
  return {
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
  };
}

export function getAvailableResources(era: Era): ResourceType[] {
  const all: ResourceType[] = [];
  for (let e = Era.ANCIENT; e <= era; e++) {
    all.push(...ERA_CONFIG[e as Era].unlockedResources);
  }
  return all;
}

// Supply chain definitions
export interface SupplyChain {
  id: string;
  name: string;
  inputs: Partial<Record<ResourceType, number>>;
  outputs: Partial<Record<ResourceType, number>>;
  buildingType: string;
  era: Era;
}

export const SUPPLY_CHAINS: SupplyChain[] = [
  { id: 'farming', name: 'Farming', inputs: {}, outputs: { [ResourceType.FOOD]: 5 }, buildingType: 'farm', era: Era.ANCIENT },
  { id: 'logging', name: 'Logging', inputs: {}, outputs: { [ResourceType.WOOD]: 4 }, buildingType: 'lumber_mill', era: Era.ANCIENT },
  { id: 'quarrying', name: 'Quarrying', inputs: {}, outputs: { [ResourceType.STONE]: 3 }, buildingType: 'quarry', era: Era.ANCIENT },
  { id: 'mining_iron', name: 'Iron Mining', inputs: {}, outputs: { [ResourceType.IRON]: 2 }, buildingType: 'mine', era: Era.MEDIEVAL },
  { id: 'mining_gold', name: 'Gold Mining', inputs: {}, outputs: { [ResourceType.GOLD]: 1 }, buildingType: 'mine', era: Era.MEDIEVAL },
  { id: 'smelting', name: 'Smelting', inputs: { [ResourceType.IRON]: 2, [ResourceType.COAL]: 1 }, outputs: { [ResourceType.STEEL]: 2 }, buildingType: 'factory', era: Era.INDUSTRIAL },
  { id: 'weaving', name: 'Weaving', inputs: { [ResourceType.FOOD]: 1 }, outputs: { [ResourceType.TEXTILES]: 2 }, buildingType: 'factory', era: Era.INDUSTRIAL },
  { id: 'coal_mining', name: 'Coal Mining', inputs: {}, outputs: { [ResourceType.COAL]: 3 }, buildingType: 'mine', era: Era.INDUSTRIAL },
  { id: 'oil_drilling', name: 'Oil Drilling', inputs: {}, outputs: { [ResourceType.OIL]: 2 }, buildingType: 'oil_rig', era: Era.INDUSTRIAL },
  { id: 'chemicals', name: 'Chemical Processing', inputs: { [ResourceType.OIL]: 2 }, outputs: { [ResourceType.CHEMICALS]: 2 }, buildingType: 'factory', era: Era.MODERN },
  { id: 'electronics_mfg', name: 'Electronics Manufacturing', inputs: { [ResourceType.STEEL]: 1, [ResourceType.CHEMICALS]: 1 }, outputs: { [ResourceType.ELECTRONICS]: 1 }, buildingType: 'electronics_plant', era: Era.MODERN },
];

export interface TaxConfig {
  [PopulationClass.FARMERS]: number;
  [PopulationClass.WORKERS]: number;
  [PopulationClass.MERCHANTS]: number;
  [PopulationClass.ENGINEERS]: number;
  [PopulationClass.ELITES]: number;
}

const TAX_BASE_RATE: Record<PopulationClass, number> = {
  [PopulationClass.FARMERS]: 1,
  [PopulationClass.WORKERS]: 2,
  [PopulationClass.MERCHANTS]: 5,
  [PopulationClass.ENGINEERS]: 8,
  [PopulationClass.ELITES]: 15,
};

export function createDefaultTaxConfig(): TaxConfig {
  return {
    [PopulationClass.FARMERS]: 0.3,
    [PopulationClass.WORKERS]: 0.3,
    [PopulationClass.MERCHANTS]: 0.3,
    [PopulationClass.ENGINEERS]: 0.3,
    [PopulationClass.ELITES]: 0.3,
  };
}

export function calculateTaxIncome(
  population: Record<PopulationClass, number>,
  taxConfig: TaxConfig
): number {
  let total = 0;
  for (const cls of Object.values(PopulationClass)) {
    total += (population[cls] || 0) * TAX_BASE_RATE[cls] * (taxConfig[cls] || 0.3);
  }
  return Math.floor(total);
}

export function getTaxHappinessModifier(taxConfig: TaxConfig): number {
  const avgTax = Object.values(taxConfig).reduce((a, b) => a + b, 0) / 5;
  // Below 30% = happiness boost, above 50% = happiness penalty
  if (avgTax < 0.3) return 10;
  if (avgTax < 0.5) return 0;
  if (avgTax < 0.7) return -10;
  return -25;
}

// Trade offer between players
export interface TradeOffer {
  id: string;
  fromPlayer: string;
  toPlayer: string;
  offering: Partial<Record<ResourceType, number>>;
  requesting: Partial<Record<ResourceType, number>>;
  status: 'pending' | 'accepted' | 'rejected';
}

export class EconomyManager {
  private tradeOffers: TradeOffer[] = [];

  processProduction(
    resources: ResourceStore,
    buildings: Array<{ type: string; producing: boolean; tier: number }>,
    era: Era
  ): ResourceStore {
    const updated = { ...resources };

    for (const building of buildings) {
      if (!building.producing) continue;

      const chains = SUPPLY_CHAINS.filter(
        (c) => c.buildingType === building.type && c.era <= era
      );

      for (const chain of chains) {
        // Check inputs
        let canProduce = true;
        for (const [res, amount] of Object.entries(chain.inputs)) {
          if ((updated[res as ResourceType] || 0) < (amount as number)) {
            canProduce = false;
            break;
          }
        }

        if (canProduce) {
          // Consume inputs
          for (const [res, amount] of Object.entries(chain.inputs)) {
            updated[res as ResourceType] -= amount as number;
          }
          // Produce outputs (tier bonus)
          const tierMultiplier = 1 + (building.tier - 1) * 0.3;
          for (const [res, amount] of Object.entries(chain.outputs)) {
            updated[res as ResourceType] += Math.floor((amount as number) * tierMultiplier);
          }
        }
      }
    }

    return updated;
  }

  collectTaxes(
    population: Record<PopulationClass, number>,
    taxConfig: TaxConfig,
    resources: ResourceStore
  ): ResourceStore {
    const income = calculateTaxIncome(population, taxConfig);
    const updated = { ...resources };
    updated[ResourceType.GOLD] += income;
    eventBus.emit(GameEvents.TAX_COLLECTED, income);
    return updated;
  }

  createTradeOffer(offer: Omit<TradeOffer, 'id' | 'status'>): TradeOffer {
    const trade: TradeOffer = {
      ...offer,
      id: `trade_${Date.now()}`,
      status: 'pending',
    };
    this.tradeOffers.push(trade);
    eventBus.emit(GameEvents.TRADE_OFFERED, trade);
    return trade;
  }

  acceptTrade(
    tradeId: string,
    fromResources: ResourceStore,
    toResources: ResourceStore
  ): { from: ResourceStore; to: ResourceStore } | null {
    const trade = this.tradeOffers.find((t) => t.id === tradeId);
    if (!trade || trade.status !== 'pending') return null;

    const from = { ...fromResources };
    const to = { ...toResources };

    // Verify resources
    for (const [res, amount] of Object.entries(trade.offering)) {
      if (from[res as ResourceType] < (amount as number)) return null;
    }
    for (const [res, amount] of Object.entries(trade.requesting)) {
      if (to[res as ResourceType] < (amount as number)) return null;
    }

    // Execute trade
    for (const [res, amount] of Object.entries(trade.offering)) {
      from[res as ResourceType] -= amount as number;
      to[res as ResourceType] += amount as number;
    }
    for (const [res, amount] of Object.entries(trade.requesting)) {
      to[res as ResourceType] -= amount as number;
      from[res as ResourceType] += amount as number;
    }

    trade.status = 'accepted';
    return { from, to };
  }

  getPendingOffers(playerId: string): TradeOffer[] {
    return this.tradeOffers.filter(
      (t) => t.toPlayer === playerId && t.status === 'pending'
    );
  }
}

export const economyManager = new EconomyManager();
