import { Router } from 'express';
import { getDB } from '../db/schema.js';
import { v4 as uuid } from 'uuid';

const router = Router();

// List saves
router.get('/', (req, res) => {
  const db = getDB();
  const saves = db.prepare(
    'SELECT id, game_id, timestamp FROM saves ORDER BY timestamp DESC'
  ).all();
  res.json(saves);
});

// Get specific save
router.get('/:id', (req, res) => {
  const db = getDB();
  const save = db.prepare('SELECT * FROM saves WHERE id = ?').get(req.params.id) as { data_json: string } | undefined;
  if (!save) {
    res.status(404).json({ error: 'Save not found' });
    return;
  }
  res.json({ ...save, data_json: JSON.parse(save.data_json) });
});

// Create/update save
router.post('/', (req, res) => {
  const db = getDB();
  const { gameId, state } = req.body;

  if (!gameId || !state) {
    res.status(400).json({ error: 'gameId and state are required' });
    return;
  }

  const id = uuid();
  db.prepare(
    'INSERT INTO saves (id, game_id, data_json) VALUES (?, ?, ?)'
  ).run(id, gameId, JSON.stringify(state));

  res.status(201).json({ id, gameId });
});

// Delete save
router.delete('/:id', (req, res) => {
  const db = getDB();
  const result = db.prepare('DELETE FROM saves WHERE id = ?').run(req.params.id);
  if (result.changes === 0) {
    res.status(404).json({ error: 'Save not found' });
    return;
  }
  res.json({ deleted: true });
});

export default router;
