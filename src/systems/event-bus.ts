type EventCallback = (...args: unknown[]) => void;

class EventBus {
  private listeners: Map<string, EventCallback[]> = new Map();

  on(event: string, callback: EventCallback): void {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, []);
    }
    this.listeners.get(event)!.push(callback);
  }

  off(event: string, callback: EventCallback): void {
    const callbacks = this.listeners.get(event);
    if (callbacks) {
      this.listeners.set(
        event,
        callbacks.filter((cb) => cb !== callback)
      );
    }
  }

  emit(event: string, ...args: unknown[]): void {
    const callbacks = this.listeners.get(event);
    if (callbacks) {
      callbacks.forEach((cb) => cb(...args));
    }
  }

  removeAll(): void {
    this.listeners.clear();
  }
}

export const eventBus = new EventBus();

// Event constants
export const GameEvents = {
  // Phase transitions
  PHASE_CHANGED: 'phase:changed',
  GAME_STARTED: 'game:started',
  GAME_ENDED: 'game:ended',

  // Phase 1
  SPAWN_PLACED: 'spawn:placed',
  TERRITORY_CLAIMED: 'territory:claimed',
  EXPANSION_COMPLETE: 'expansion:complete',

  // Phase 2
  BUILDING_PLACED: 'building:placed',
  BUILDING_UPGRADED: 'building:upgraded',
  BUILDING_DEMOLISHED: 'building:demolished',
  BUILDING_REPAIRED: 'building:repaired',
  RESOURCE_CHANGED: 'resource:changed',
  POPULATION_CHANGED: 'population:changed',
  ERA_ADVANCED: 'era:advanced',
  RESEARCH_COMPLETED: 'research:completed',
  TAX_COLLECTED: 'tax:collected',

  // Phase 3
  BATTLE_STARTED: 'battle:started',
  CARD_PLAYED: 'card:played',
  UNIT_SPAWNED: 'unit:spawned',
  UNIT_DIED: 'unit:died',
  BATTLE_ENDED: 'battle:ended',

  // Conquest
  TERRITORY_CONQUERED: 'territory:conquered',
  CITY_MERGED: 'city:merged',
  CITY_VASSALIZED: 'city:vassalized',

  // Diplomacy
  ALLIANCE_PROPOSED: 'diplomacy:alliance_proposed',
  ALLIANCE_ACCEPTED: 'diplomacy:alliance_accepted',
  WAR_DECLARED: 'diplomacy:war_declared',
  PEACE_SIGNED: 'diplomacy:peace_signed',
  TRADE_OFFERED: 'diplomacy:trade_offered',

  // System
  SAVE_STARTED: 'save:started',
  SAVE_COMPLETED: 'save:completed',
  PLAYER_CONNECTED: 'player:connected',
  PLAYER_DISCONNECTED: 'player:disconnected',
} as const;
