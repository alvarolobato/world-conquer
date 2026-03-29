import { GAME_CONFIG } from '@/config/game-config';
import { eventBus, GameEvents } from '@/systems/event-bus';
import type { CardDefinition, Point } from '@/types/game';
import { getCardDef, getUpgradedStats } from '@/systems/cards';

export interface BattleUnit {
  id: string;
  cardId: string;
  owner: string;
  position: Point;
  targetPosition: Point;
  hp: number;
  maxHp: number;
  dps: number;
  speed: number;
  range: number;
  splashRadius: number;
  alive: boolean;
}

export interface BattleState {
  id: string;
  attacker: string;
  defender: string;
  units: BattleUnit[];
  attackerElixir: number;
  defenderElixir: number;
  timer: number;
  phase: 'active' | 'overtime' | 'ended';
  winner: string | null;
  attackerDamage: number;
  defenderDamage: number;
}

let unitIdCounter = 0;

export function createBattle(attacker: string, defender: string): BattleState {
  return {
    id: `battle_${Date.now()}`,
    attacker,
    defender,
    units: [],
    attackerElixir: GAME_CONFIG.START_ELIXIR,
    defenderElixir: GAME_CONFIG.START_ELIXIR,
    timer: GAME_CONFIG.BATTLE_DURATION,
    phase: 'active',
    winner: null,
    attackerDamage: 0,
    defenderDamage: 0,
  };
}

export function deployCard(
  battle: BattleState,
  cardId: string,
  playerId: string,
  position: Point,
  cardLevel: number = 1
): boolean {
  const cardDef = getCardDef(cardId);
  if (!cardDef) return false;

  const isAttacker = playerId === battle.attacker;
  const elixir = isAttacker ? battle.attackerElixir : battle.defenderElixir;

  if (elixir < cardDef.elixirCost) return false;

  // Deduct elixir
  if (isAttacker) {
    battle.attackerElixir -= cardDef.elixirCost;
  } else {
    battle.defenderElixir -= cardDef.elixirCost;
  }

  const stats = getUpgradedStats(cardDef, cardLevel);

  // Create unit(s)
  const unitCount = cardId === 'militia' ? 3 : cardId === 'reinforcements' ? 5 : 1;
  for (let i = 0; i < unitCount; i++) {
    const unit: BattleUnit = {
      id: `unit_${++unitIdCounter}`,
      cardId,
      owner: playerId,
      position: {
        x: position.x + (i - Math.floor(unitCount / 2)) * 15,
        y: position.y,
      },
      targetPosition: {
        x: isAttacker ? position.x + 500 : position.x - 500,
        y: position.y,
      },
      hp: Math.floor(stats.hp / unitCount),
      maxHp: Math.floor(stats.hp / unitCount),
      dps: Math.floor(stats.dps / unitCount),
      speed: stats.speed,
      range: stats.range * 20, // Convert to pixels
      splashRadius: (stats.splashRadius || 0) * 20,
      alive: true,
    };
    battle.units.push(unit);
  }

  eventBus.emit(GameEvents.CARD_PLAYED, { cardId, playerId });
  return true;
}

export function updateBattle(battle: BattleState, deltaMs: number): void {
  if (battle.phase === 'ended') return;

  const dt = deltaMs / 1000;

  // Regenerate elixir
  battle.attackerElixir = Math.min(
    GAME_CONFIG.MAX_ELIXIR,
    battle.attackerElixir + GAME_CONFIG.ELIXIR_REGEN_RATE * dt
  );
  battle.defenderElixir = Math.min(
    GAME_CONFIG.MAX_ELIXIR,
    battle.defenderElixir + GAME_CONFIG.ELIXIR_REGEN_RATE * dt
  );

  // Update timer
  battle.timer -= dt;
  if (battle.timer <= 0) {
    if (battle.phase === 'active') {
      // Check if it's close - go to overtime
      const diff = Math.abs(battle.attackerDamage - battle.defenderDamage);
      if (diff < 200) {
        battle.phase = 'overtime';
        battle.timer = GAME_CONFIG.OVERTIME_DURATION;
      } else {
        endBattle(battle);
        return;
      }
    } else {
      endBattle(battle);
      return;
    }
  }

  const aliveUnits = battle.units.filter((u) => u.alive);

  for (const unit of aliveUnits) {
    // Find nearest enemy
    const enemies = aliveUnits.filter((e) => e.owner !== unit.owner);
    if (enemies.length === 0) {
      // No enemies - advance toward target
      moveToward(unit, unit.targetPosition, dt);
      continue;
    }

    let nearest = enemies[0];
    let nearestDist = dist(unit.position, nearest.position);
    for (const enemy of enemies) {
      const d = dist(unit.position, enemy.position);
      if (d < nearestDist) {
        nearestDist = d;
        nearest = enemy;
      }
    }

    if (nearestDist <= unit.range) {
      // Attack
      const damage = unit.dps * dt;

      if (unit.splashRadius > 0) {
        // Splash damage
        for (const enemy of enemies) {
          if (dist(nearest.position, enemy.position) <= unit.splashRadius) {
            applyDamage(battle, enemy, damage * 0.5, unit.owner);
          }
        }
      }
      applyDamage(battle, nearest, damage, unit.owner);
    } else if (unit.speed > 0) {
      // Move toward enemy
      moveToward(unit, nearest.position, dt);
    }
  }

  // Remove dead units
  battle.units = battle.units.filter((u) => {
    if (!u.alive) {
      eventBus.emit(GameEvents.UNIT_DIED, { unitId: u.id, cardId: u.cardId });
    }
    return u.alive;
  });

  // Auto-end if one side eliminated
  const attackerAlive = battle.units.filter((u) => u.owner === battle.attacker && u.alive).length;
  const defenderAlive = battle.units.filter((u) => u.owner === battle.defender && u.alive).length;
  if (attackerAlive === 0 && defenderAlive > 0 && battle.timer < GAME_CONFIG.BATTLE_DURATION - 10) {
    // Grace period before auto-ending
  }
}

function applyDamage(battle: BattleState, target: BattleUnit, damage: number, sourceOwner: string): void {
  target.hp -= damage;
  if (sourceOwner === battle.attacker) {
    battle.attackerDamage += damage;
  } else {
    battle.defenderDamage += damage;
  }
  if (target.hp <= 0) {
    target.alive = false;
    target.hp = 0;
  }
}

function moveToward(unit: BattleUnit, target: Point, dt: number): void {
  const dx = target.x - unit.position.x;
  const dy = target.y - unit.position.y;
  const d = Math.sqrt(dx * dx + dy * dy);
  if (d < 2) return;

  const speed = unit.speed * 30 * dt;
  unit.position.x += (dx / d) * speed;
  unit.position.y += (dy / d) * speed;
}

function dist(a: Point, b: Point): number {
  return Math.sqrt((a.x - b.x) ** 2 + (a.y - b.y) ** 2);
}

function endBattle(battle: BattleState): void {
  battle.phase = 'ended';

  if (battle.attackerDamage > battle.defenderDamage) {
    battle.winner = battle.attacker;
  } else if (battle.defenderDamage > battle.attackerDamage) {
    battle.winner = battle.defender;
  } else {
    battle.winner = battle.defender; // Defender wins ties
  }

  eventBus.emit(GameEvents.BATTLE_ENDED, {
    winner: battle.winner,
    attacker: battle.attacker,
    defender: battle.defender,
    attackerDamage: battle.attackerDamage,
    defenderDamage: battle.defenderDamage,
  });
}

// AI card deployment logic
export function aiDeployCard(
  battle: BattleState,
  playerId: string,
  availableCards: string[],
  era: number
): void {
  const isAttacker = playerId === battle.attacker;
  const elixir = isAttacker ? battle.attackerElixir : battle.defenderElixir;

  if (elixir < 3) return; // Save up

  // Pick affordable card
  const affordable = availableCards
    .map((id) => getCardDef(id))
    .filter((c): c is CardDefinition => c !== undefined && c.elixirCost <= elixir && c.era <= era);

  if (affordable.length === 0) return;

  const card = affordable[Math.floor(Math.random() * affordable.length)];

  // Deploy at a strategic position
  const y = 150 + Math.random() * 300;
  const x = isAttacker ? 100 + Math.random() * 150 : 450 + Math.random() * 150;

  deployCard(battle, card.id, playerId, { x, y });
}
