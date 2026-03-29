import { Era, ResourceType } from '@/types/game';
import { eventBus, GameEvents } from '@/systems/event-bus';
import type { ResourceStore } from '@/systems/economy';

export interface ResearchNode {
  id: string;
  name: string;
  branch: 'military' | 'economy' | 'infrastructure';
  era: Era;
  cost: Partial<Record<ResourceType, number>>;
  researchTime: number; // seconds
  prerequisites: string[];
  description: string;
  unlocks: string; // what it unlocks
}

export const RESEARCH_TREE: ResearchNode[] = [
  // Military Branch
  { id: 'archery', name: 'Archery', branch: 'military', era: Era.ANCIENT, cost: { [ResourceType.GOLD]: 50 }, researchTime: 30, prerequisites: [], description: 'Enables archers', unlocks: 'Archers card' },
  { id: 'fortification', name: 'Fortification', branch: 'military', era: Era.ANCIENT, cost: { [ResourceType.GOLD]: 80, [ResourceType.STONE]: 30 }, researchTime: 45, prerequisites: ['archery'], description: 'Defensive structures', unlocks: 'Bunker building' },
  { id: 'metallurgy', name: 'Metallurgy', branch: 'military', era: Era.MEDIEVAL, cost: { [ResourceType.GOLD]: 120, [ResourceType.IRON]: 40 }, researchTime: 60, prerequisites: ['fortification'], description: 'Advanced metalworking', unlocks: 'Knights card, Era 2' },
  { id: 'gunpowder', name: 'Gunpowder', branch: 'military', era: Era.MEDIEVAL, cost: { [ResourceType.GOLD]: 200 }, researchTime: 90, prerequisites: ['metallurgy'], description: 'Explosive weapons', unlocks: 'Musketeers card' },
  { id: 'artillery_tech', name: 'Artillery', branch: 'military', era: Era.INDUSTRIAL, cost: { [ResourceType.GOLD]: 300, [ResourceType.IRON]: 80 }, researchTime: 120, prerequisites: ['gunpowder'], description: 'Heavy ranged weapons', unlocks: 'Artillery card' },
  { id: 'missiles', name: 'Missiles', branch: 'military', era: Era.MODERN, cost: { [ResourceType.GOLD]: 500, [ResourceType.ELECTRONICS]: 50 }, researchTime: 180, prerequisites: ['artillery_tech'], description: 'Guided projectiles', unlocks: 'Missile Launcher card' },

  // Economy Branch
  { id: 'agriculture', name: 'Agriculture', branch: 'economy', era: Era.ANCIENT, cost: { [ResourceType.GOLD]: 40 }, researchTime: 25, prerequisites: [], description: 'Improved farming', unlocks: '+50% farm output' },
  { id: 'currency', name: 'Currency', branch: 'economy', era: Era.MEDIEVAL, cost: { [ResourceType.GOLD]: 100 }, researchTime: 50, prerequisites: ['agriculture'], description: 'Monetary system', unlocks: 'Bank building, Era 2' },
  { id: 'banking', name: 'Banking', branch: 'economy', era: Era.MEDIEVAL, cost: { [ResourceType.GOLD]: 180 }, researchTime: 70, prerequisites: ['currency'], description: 'Financial institutions', unlocks: '+100% tax income' },
  { id: 'industrialization', name: 'Industrialization', branch: 'economy', era: Era.INDUSTRIAL, cost: { [ResourceType.GOLD]: 300, [ResourceType.COAL]: 50 }, researchTime: 100, prerequisites: ['banking'], description: 'Mass production', unlocks: 'Factory efficiency +50%' },
  { id: 'global_trade', name: 'Global Trade', branch: 'economy', era: Era.MODERN, cost: { [ResourceType.GOLD]: 500 }, researchTime: 150, prerequisites: ['industrialization'], description: 'Worldwide commerce', unlocks: '+100% trade income' },

  // Infrastructure Branch
  { id: 'masonry', name: 'Masonry', branch: 'infrastructure', era: Era.ANCIENT, cost: { [ResourceType.GOLD]: 30 }, researchTime: 20, prerequisites: [], description: 'Stone construction', unlocks: 'Stone buildings' },
  { id: 'engineering', name: 'Engineering', branch: 'infrastructure', era: Era.MEDIEVAL, cost: { [ResourceType.GOLD]: 100, [ResourceType.STONE]: 40 }, researchTime: 50, prerequisites: ['masonry'], description: 'Advanced construction', unlocks: 'Bridge building' },
  { id: 'steam_power', name: 'Steam Power', branch: 'infrastructure', era: Era.INDUSTRIAL, cost: { [ResourceType.GOLD]: 250, [ResourceType.COAL]: 30 }, researchTime: 90, prerequisites: ['engineering'], description: 'Steam engines', unlocks: 'Power Plant, Era 3' },
  { id: 'chemistry', name: 'Chemistry', branch: 'infrastructure', era: Era.INDUSTRIAL, cost: { [ResourceType.GOLD]: 250, [ResourceType.OIL]: 20 }, researchTime: 90, prerequisites: ['steam_power'], description: 'Chemical processes', unlocks: 'Chemicals resource, Era 3' },
  { id: 'electronics_research', name: 'Electronics', branch: 'infrastructure', era: Era.MODERN, cost: { [ResourceType.GOLD]: 400, [ResourceType.STEEL]: 50 }, researchTime: 140, prerequisites: ['chemistry'], description: 'Electronic systems', unlocks: 'Electronics Plant, Era 4' },
  { id: 'nuclear', name: 'Nuclear Power', branch: 'infrastructure', era: Era.MODERN, cost: { [ResourceType.GOLD]: 600, [ResourceType.ELECTRONICS]: 30 }, researchTime: 200, prerequisites: ['electronics_research'], description: 'Nuclear energy', unlocks: 'Nuclear Plant, Era 4' },
];

export function getResearchNode(id: string): ResearchNode | undefined {
  return RESEARCH_TREE.find((r) => r.id === id);
}

export function getAvailableResearch(completed: string[], era: Era): ResearchNode[] {
  return RESEARCH_TREE.filter((r) => {
    if (completed.includes(r.id)) return false;
    if (r.era > era + 1) return false; // Can research 1 era ahead
    return r.prerequisites.every((p) => completed.includes(p));
  });
}

export function canAffordResearch(node: ResearchNode, resources: ResourceStore): boolean {
  for (const [res, amount] of Object.entries(node.cost)) {
    if ((resources[res as ResourceType] || 0) < (amount as number)) return false;
  }
  return true;
}

export function payForResearch(node: ResearchNode, resources: ResourceStore): ResourceStore {
  const updated = { ...resources };
  for (const [res, amount] of Object.entries(node.cost)) {
    updated[res as ResourceType] -= amount as number;
  }
  return updated;
}

export function checkEraAdvancement(
  currentEra: Era,
  completedResearch: string[],
  totalPopulation: number
): Era | null {
  const nextEra = (currentEra + 1) as Era;
  if (nextEra > Era.MODERN) return null;

  const eraRequirements: Record<number, { populationRequired: number; researchRequired: string[] }> = {
    [Era.MEDIEVAL]: { populationRequired: 200, researchRequired: ['metallurgy', 'currency'] },
    [Era.INDUSTRIAL]: { populationRequired: 500, researchRequired: ['steam_power', 'chemistry'] },
    [Era.MODERN]: { populationRequired: 1000, researchRequired: ['electronics_research', 'nuclear'] },
  };
  const { populationRequired, researchRequired } = eraRequirements[nextEra] || { populationRequired: Infinity, researchRequired: [] as string[] };

  if (totalPopulation >= populationRequired &&
      researchRequired.every((r) => completedResearch.includes(r))) {
    return nextEra;
  }
  return null;
}
