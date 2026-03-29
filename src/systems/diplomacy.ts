import { DiplomacyAction } from '@/types/game';
import { eventBus, GameEvents } from '@/systems/event-bus';

export interface DiplomacyState {
  relations: Map<string, Map<string, number>>; // playerId -> targetId -> score (-100 to 100)
  treaties: Treaty[];
  warStates: WarState[];
}

export interface Treaty {
  id: string;
  type: DiplomacyAction;
  players: [string, string];
  startTime: number;
  duration: number; // 0 = permanent until broken
  active: boolean;
}

export interface WarState {
  attacker: string;
  defender: string;
  startTime: number;
  battlesWon: Record<string, number>;
  active: boolean;
}

export function createDiplomacyState(playerIds: string[]): DiplomacyState {
  const relations = new Map<string, Map<string, number>>();
  for (const id of playerIds) {
    const targets = new Map<string, number>();
    for (const other of playerIds) {
      if (other !== id) targets.set(other, 0); // Neutral
    }
    relations.set(id, targets);
  }
  return { relations, treaties: [], warStates: [] };
}

export function getRelation(state: DiplomacyState, from: string, to: string): number {
  return state.relations.get(from)?.get(to) ?? 0;
}

export function modifyRelation(state: DiplomacyState, from: string, to: string, delta: number): void {
  const current = getRelation(state, from, to);
  const newVal = Math.max(-100, Math.min(100, current + delta));
  state.relations.get(from)?.set(to, newVal);
  state.relations.get(to)?.set(from, newVal + delta * 0.5); // Reciprocal but less
}

export function proposeAlliance(state: DiplomacyState, from: string, to: string): Treaty | null {
  // Can't ally if at war
  if (isAtWar(state, from, to)) return null;
  // Can't ally if already allied
  if (hasActiveTreaty(state, from, to, DiplomacyAction.ALLIANCE)) return null;

  const treaty: Treaty = {
    id: `treaty_${Date.now()}`,
    type: DiplomacyAction.ALLIANCE,
    players: [from, to],
    startTime: Date.now(),
    duration: 0,
    active: true,
  };
  state.treaties.push(treaty);
  modifyRelation(state, from, to, 30);
  eventBus.emit(GameEvents.ALLIANCE_ACCEPTED, { from, to });
  return treaty;
}

export function proposeNonAggression(state: DiplomacyState, from: string, to: string): Treaty | null {
  if (isAtWar(state, from, to)) return null;

  const treaty: Treaty = {
    id: `treaty_${Date.now()}`,
    type: DiplomacyAction.NON_AGGRESSION,
    players: [from, to],
    startTime: Date.now(),
    duration: 300_000, // 5 minutes
    active: true,
  };
  state.treaties.push(treaty);
  modifyRelation(state, from, to, 15);
  return treaty;
}

export function proposeTradeAgreement(state: DiplomacyState, from: string, to: string): Treaty | null {
  const treaty: Treaty = {
    id: `treaty_${Date.now()}`,
    type: DiplomacyAction.TRADE_AGREEMENT,
    players: [from, to],
    startTime: Date.now(),
    duration: 0,
    active: true,
  };
  state.treaties.push(treaty);
  modifyRelation(state, from, to, 10);
  return treaty;
}

export function declarePeace(state: DiplomacyState, from: string, to: string): Treaty | null {
  const war = state.warStates.find(
    (w) => w.active && ((w.attacker === from && w.defender === to) || (w.attacker === to && w.defender === from))
  );
  if (!war) return null;

  war.active = false;

  const treaty: Treaty = {
    id: `treaty_${Date.now()}`,
    type: DiplomacyAction.PEACE_TREATY,
    players: [from, to],
    startTime: Date.now(),
    duration: 300_000, // 5 min peace
    active: true,
  };
  state.treaties.push(treaty);
  modifyRelation(state, from, to, 10);
  eventBus.emit(GameEvents.PEACE_SIGNED, { from, to });
  return treaty;
}

export function declareWar(state: DiplomacyState, from: string, to: string): WarState | null {
  if (isAtWar(state, from, to)) return null;
  if (hasActiveTreaty(state, from, to, DiplomacyAction.PEACE_TREATY)) return null;
  if (hasActiveTreaty(state, from, to, DiplomacyAction.NON_AGGRESSION)) {
    modifyRelation(state, from, to, -40); // Breaking pact
  }

  // Break alliance if exists
  const alliance = state.treaties.find(
    (t) => t.active && t.type === DiplomacyAction.ALLIANCE &&
    t.players.includes(from) && t.players.includes(to)
  );
  if (alliance) {
    alliance.active = false;
    modifyRelation(state, from, to, -50);
  }

  const war: WarState = {
    attacker: from,
    defender: to,
    startTime: Date.now(),
    battlesWon: { [from]: 0, [to]: 0 },
    active: true,
  };
  state.warStates.push(war);
  modifyRelation(state, from, to, -30);
  eventBus.emit(GameEvents.WAR_DECLARED, { from, to });
  return war;
}

export function setEmbargo(state: DiplomacyState, from: string, to: string): Treaty {
  // Remove trade agreements
  state.treaties
    .filter((t) => t.active && t.type === DiplomacyAction.TRADE_AGREEMENT &&
      t.players.includes(from) && t.players.includes(to))
    .forEach((t) => t.active = false);

  const treaty: Treaty = {
    id: `treaty_${Date.now()}`,
    type: DiplomacyAction.EMBARGO,
    players: [from, to],
    startTime: Date.now(),
    duration: 0,
    active: true,
  };
  state.treaties.push(treaty);
  modifyRelation(state, from, to, -15);
  return treaty;
}

export function isAtWar(state: DiplomacyState, a: string, b: string): boolean {
  return state.warStates.some(
    (w) => w.active && ((w.attacker === a && w.defender === b) || (w.attacker === b && w.defender === a))
  );
}

export function hasActiveTreaty(state: DiplomacyState, a: string, b: string, type: DiplomacyAction): boolean {
  return state.treaties.some(
    (t) => t.active && t.type === type && t.players.includes(a) && t.players.includes(b)
  );
}

export function getAllies(state: DiplomacyState, playerId: string): string[] {
  return state.treaties
    .filter((t) => t.active && t.type === DiplomacyAction.ALLIANCE && t.players.includes(playerId))
    .map((t) => t.players.find((p) => p !== playerId)!);
}

export function getEnemies(state: DiplomacyState, playerId: string): string[] {
  return state.warStates
    .filter((w) => w.active && (w.attacker === playerId || w.defender === playerId))
    .map((w) => w.attacker === playerId ? w.defender : w.attacker);
}

// Expire old treaties
export function updateDiplomacy(state: DiplomacyState): void {
  const now = Date.now();
  for (const treaty of state.treaties) {
    if (treaty.active && treaty.duration > 0 && now - treaty.startTime > treaty.duration) {
      treaty.active = false;
    }
  }
}
