import { CardCategory, CardRarity, Era } from '@/types/game';
import type { CardDefinition } from '@/types/game';

export const CARD_DEFINITIONS: CardDefinition[] = [
  // --- Infantry (8) ---
  { id: 'militia', name: 'Militia', category: CardCategory.INFANTRY, rarity: CardRarity.COMMON, era: Era.ANCIENT, elixirCost: 2, stats: { hp: 200, dps: 50, speed: 3, range: 1 }, description: 'Spawns 3 light units' },
  { id: 'archers', name: 'Archers', category: CardCategory.INFANTRY, rarity: CardRarity.COMMON, era: Era.ANCIENT, elixirCost: 3, stats: { hp: 150, dps: 80, speed: 2, range: 5 }, description: 'Ranged attackers' },
  { id: 'knights', name: 'Knights', category: CardCategory.INFANTRY, rarity: CardRarity.RARE, era: Era.MEDIEVAL, elixirCost: 4, stats: { hp: 500, dps: 100, speed: 2, range: 1 }, description: 'Heavy armored melee' },
  { id: 'pikemen', name: 'Pikemen', category: CardCategory.INFANTRY, rarity: CardRarity.COMMON, era: Era.MEDIEVAL, elixirCost: 3, stats: { hp: 300, dps: 120, speed: 2, range: 2 }, description: 'Bonus vs cavalry' },
  { id: 'musketeers', name: 'Musketeers', category: CardCategory.INFANTRY, rarity: CardRarity.RARE, era: Era.INDUSTRIAL, elixirCost: 4, stats: { hp: 350, dps: 150, speed: 2, range: 6 }, description: 'Long range shooters' },
  { id: 'riflemen', name: 'Riflemen', category: CardCategory.INFANTRY, rarity: CardRarity.COMMON, era: Era.INDUSTRIAL, elixirCost: 3, stats: { hp: 250, dps: 130, speed: 3, range: 5 }, description: 'Rapid fire infantry' },
  { id: 'special_forces', name: 'Special Forces', category: CardCategory.INFANTRY, rarity: CardRarity.EPIC, era: Era.MODERN, elixirCost: 5, stats: { hp: 400, dps: 200, speed: 4, range: 4 }, description: 'Stealth first strike' },
  { id: 'marines', name: 'Marines', category: CardCategory.INFANTRY, rarity: CardRarity.RARE, era: Era.MODERN, elixirCost: 6, stats: { hp: 600, dps: 180, speed: 2, range: 4 }, description: 'Amphibious elite' },

  // --- Vehicles (6) ---
  { id: 'cavalry', name: 'Cavalry', category: CardCategory.VEHICLE, rarity: CardRarity.RARE, era: Era.MEDIEVAL, elixirCost: 4, stats: { hp: 400, dps: 120, speed: 5, range: 1 }, description: 'Fast charge attack' },
  { id: 'cannon', name: 'Cannon', category: CardCategory.VEHICLE, rarity: CardRarity.RARE, era: Era.MEDIEVAL, elixirCost: 5, stats: { hp: 300, dps: 200, speed: 0, range: 8, splashRadius: 2 }, description: 'Stationary splash damage' },
  { id: 'tank', name: 'Tank', category: CardCategory.VEHICLE, rarity: CardRarity.EPIC, era: Era.INDUSTRIAL, elixirCost: 6, stats: { hp: 800, dps: 150, speed: 1.5, range: 5, splashRadius: 1.5 }, description: 'Heavy armored vehicle' },
  { id: 'apc', name: 'APC', category: CardCategory.VEHICLE, rarity: CardRarity.RARE, era: Era.INDUSTRIAL, elixirCost: 5, stats: { hp: 500, dps: 80, speed: 3, range: 3 }, description: 'Carries 5 infantry' },
  { id: 'artillery', name: 'Artillery', category: CardCategory.VEHICLE, rarity: CardRarity.EPIC, era: Era.INDUSTRIAL, elixirCost: 6, stats: { hp: 250, dps: 250, speed: 0, range: 10, splashRadius: 3 }, description: 'Very long range splash' },
  { id: 'rocket_launcher', name: 'Rocket Launcher', category: CardCategory.VEHICLE, rarity: CardRarity.LEGENDARY, era: Era.MODERN, elixirCost: 7, stats: { hp: 300, dps: 300, speed: 1, range: 8, splashRadius: 4 }, description: 'Massive area damage' },

  // --- Air (5) ---
  { id: 'scout_balloon', name: 'Scout Balloon', category: CardCategory.AIR, rarity: CardRarity.COMMON, era: Era.MEDIEVAL, elixirCost: 2, stats: { hp: 100, dps: 0, speed: 4, range: 0 }, description: 'Reveals large area' },
  { id: 'fighter_plane', name: 'Fighter Plane', category: CardCategory.AIR, rarity: CardRarity.RARE, era: Era.INDUSTRIAL, elixirCost: 5, stats: { hp: 350, dps: 180, speed: 6, range: 5 }, description: 'Fast air superiority' },
  { id: 'bomber', name: 'Bomber', category: CardCategory.AIR, rarity: CardRarity.EPIC, era: Era.INDUSTRIAL, elixirCost: 6, stats: { hp: 400, dps: 250, speed: 3, range: 4, splashRadius: 3 }, description: 'Ground splash bombing' },
  { id: 'helicopter', name: 'Helicopter', category: CardCategory.AIR, rarity: CardRarity.RARE, era: Era.MODERN, elixirCost: 5, stats: { hp: 300, dps: 160, speed: 4, range: 4 }, description: 'Versatile air unit' },
  { id: 'stealth_bomber', name: 'Stealth Bomber', category: CardCategory.AIR, rarity: CardRarity.LEGENDARY, era: Era.MODERN, elixirCost: 8, stats: { hp: 500, dps: 400, speed: 4, range: 5, splashRadius: 4 }, description: 'Invisible until attack' },

  // --- Spells (7) ---
  { id: 'heal', name: 'Heal', category: CardCategory.SPELL, rarity: CardRarity.COMMON, era: Era.ANCIENT, elixirCost: 3, stats: { hp: 0, dps: -200, speed: 0, range: 3 }, description: 'Restore HP in area' },
  { id: 'shield', name: 'Shield', category: CardCategory.SPELL, rarity: CardRarity.COMMON, era: Era.ANCIENT, elixirCost: 2, stats: { hp: 0, dps: 0, speed: 0, range: 3 }, description: 'Temporary damage reduction' },
  { id: 'fire_arrows', name: 'Fire Arrows', category: CardCategory.SPELL, rarity: CardRarity.RARE, era: Era.ANCIENT, elixirCost: 4, stats: { hp: 0, dps: 100, speed: 0, range: 4, splashRadius: 3 }, description: 'Area damage over time' },
  { id: 'air_strike', name: 'Air Strike', category: CardCategory.SPELL, rarity: CardRarity.EPIC, era: Era.INDUSTRIAL, elixirCost: 5, stats: { hp: 0, dps: 300, speed: 0, range: 3, splashRadius: 2 }, description: 'Heavy instant damage' },
  { id: 'emp', name: 'EMP', category: CardCategory.SPELL, rarity: CardRarity.EPIC, era: Era.MODERN, elixirCost: 4, stats: { hp: 0, dps: 50, speed: 0, range: 5, splashRadius: 4 }, description: 'Disables vehicles' },
  { id: 'reinforcements', name: 'Reinforcements', category: CardCategory.SPELL, rarity: CardRarity.RARE, era: Era.MEDIEVAL, elixirCost: 5, stats: { hp: 0, dps: 0, speed: 0, range: 0 }, description: 'Spawn wave of militia' },
  { id: 'fortify', name: 'Fortify', category: CardCategory.SPELL, rarity: CardRarity.COMMON, era: Era.MEDIEVAL, elixirCost: 3, stats: { hp: 0, dps: 0, speed: 0, range: 2 }, description: 'Temporary barrier wall' },

  // --- Siege (4) ---
  { id: 'battering_ram', name: 'Battering Ram', category: CardCategory.SIEGE, rarity: CardRarity.COMMON, era: Era.ANCIENT, elixirCost: 4, stats: { hp: 600, dps: 300, speed: 1, range: 1 }, description: 'Destroys buildings fast' },
  { id: 'catapult', name: 'Catapult', category: CardCategory.SIEGE, rarity: CardRarity.RARE, era: Era.MEDIEVAL, elixirCost: 5, stats: { hp: 300, dps: 400, speed: 0, range: 7, splashRadius: 2 }, description: 'Ranged building destroyer' },
  { id: 'siege_tower', name: 'Siege Tower', category: CardCategory.SIEGE, rarity: CardRarity.RARE, era: Era.MEDIEVAL, elixirCost: 6, stats: { hp: 800, dps: 200, speed: 0.5, range: 1 }, description: 'Carries troops over walls' },
  { id: 'missile_launcher', name: 'Missile Launcher', category: CardCategory.SIEGE, rarity: CardRarity.LEGENDARY, era: Era.MODERN, elixirCost: 8, stats: { hp: 400, dps: 600, speed: 0.5, range: 10, splashRadius: 3 }, description: 'Long range devastation' },
];

export function getCardDef(id: string): CardDefinition | undefined {
  return CARD_DEFINITIONS.find((c) => c.id === id);
}

export function getCardsForEra(era: Era): CardDefinition[] {
  return CARD_DEFINITIONS.filter((c) => c.era <= era);
}

export function getCardsByCategory(category: CardCategory): CardDefinition[] {
  return CARD_DEFINITIONS.filter((c) => c.category === category);
}

// Card upgrade: stats increase per level
export function getUpgradedStats(card: CardDefinition, level: number): CardDefinition['stats'] {
  const mult = 1 + (level - 1) * 0.1; // +10% per level
  const dpsMult = 1 + (level - 1) * 0.08; // +8% DPS per level
  return {
    hp: Math.floor(card.stats.hp * mult),
    dps: Math.floor(card.stats.dps * dpsMult),
    speed: card.stats.speed,
    range: card.stats.range,
    splashRadius: card.stats.splashRadius,
  };
}

// Duplicates needed per level
export function getDuplicatesForUpgrade(level: number): number {
  return Math.floor(2 * Math.pow(1.5, level - 1));
}

// Gold cost per level
export function getUpgradeGoldCost(rarity: CardRarity, level: number): number {
  const base = { common: 50, rare: 100, epic: 200, legendary: 500 }[rarity];
  return Math.floor(base * Math.pow(1.4, level - 1));
}

// Card modifications/perks
export interface CardModification {
  id: string;
  name: string;
  description: string;
  effect: string;
  unlockLevel: number;
}

export const CARD_MODIFICATIONS: CardModification[] = [
  { id: 'speed_boost', name: 'Speed Boost', description: '+20% movement speed', effect: 'speed_1.2', unlockLevel: 3 },
  { id: 'splash_damage', name: 'Splash Damage', description: 'Attacks deal area damage', effect: 'splash_1.5', unlockLevel: 5 },
  { id: 'life_steal', name: 'Life Steal', description: 'Heal 15% of damage dealt', effect: 'lifesteal_0.15', unlockLevel: 7 },
  { id: 'extended_range', name: 'Extended Range', description: '+30% attack range', effect: 'range_1.3', unlockLevel: 4 },
  { id: 'cost_reduction', name: 'Cost Reduction', description: '-1 elixir cost', effect: 'cost_-1', unlockLevel: 9 },
];

// Generate a random card pack
export function generateCardPack(era: Era, rarity: 'common' | 'rare' | 'epic'): CardDefinition[] {
  const available = getCardsForEra(era);
  const pack: CardDefinition[] = [];
  const count = rarity === 'epic' ? 5 : rarity === 'rare' ? 4 : 3;

  for (let i = 0; i < count; i++) {
    // Weight by rarity
    let roll = Math.random();
    let targetRarity: CardRarity;
    if (rarity === 'epic') {
      targetRarity = roll < 0.3 ? CardRarity.EPIC : roll < 0.7 ? CardRarity.RARE : CardRarity.COMMON;
    } else if (rarity === 'rare') {
      targetRarity = roll < 0.1 ? CardRarity.EPIC : roll < 0.4 ? CardRarity.RARE : CardRarity.COMMON;
    } else {
      targetRarity = roll < 0.05 ? CardRarity.RARE : CardRarity.COMMON;
    }

    const pool = available.filter((c) => c.rarity === targetRarity);
    if (pool.length > 0) {
      pack.push(pool[Math.floor(Math.random() * pool.length)]);
    } else {
      pack.push(available[Math.floor(Math.random() * available.length)]);
    }
  }
  return pack;
}
