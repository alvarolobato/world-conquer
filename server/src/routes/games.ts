import { Router } from 'express';
import { getDB } from '../db/schema.js';
import { v4 as uuid } from 'uuid';

const router = Router();

// List games
router.get('/', (_req, res) => {
  const db = getDB();
  const games = db.prepare(
    "SELECT * FROM games WHERE status != 'finished' ORDER BY created_at DESC"
  ).all();
  res.json(games);
});

// Create game
router.post('/', (req, res) => {
  const db = getDB();
  const { name, maxPlayers, mapSize } = req.body;
  const id = uuid();
  const mapSeed = Math.floor(Math.random() * 1_000_000);

  db.prepare(
    'INSERT INTO games (id, name, max_players, map_seed, map_size) VALUES (?, ?, ?, ?, ?)'
  ).run(id, name || 'New Game', maxPlayers || 4, mapSeed, mapSize || 'medium');

  res.status(201).json({ id, mapSeed });
});

// Join game
router.post('/:id/join', (req, res) => {
  const db = getDB();
  const game = db.prepare('SELECT * FROM games WHERE id = ?').get(req.params.id) as { id: string; max_players: number } | undefined;

  if (!game) {
    res.status(404).json({ error: 'Game not found' });
    return;
  }

  const players = db.prepare(
    'SELECT * FROM game_players WHERE game_id = ?'
  ).all() as Array<{ slot: number }>;

  if (players.length >= game.max_players) {
    res.status(400).json({ error: 'Game is full' });
    return;
  }

  const slot = players.length;
  const { userId, color, isAI, aiPersonality } = req.body;

  db.prepare(
    'INSERT INTO game_players (game_id, user_id, slot, is_ai, ai_personality, color) VALUES (?, ?, ?, ?, ?, ?)'
  ).run(game.id, userId || null, slot, isAI ? 1 : 0, aiPersonality || null, color || 0);

  res.status(201).json({ slot });
});

export default router;
