import express from 'express';
import cors from 'cors';
import { createServer } from 'http';
import { Server as SocketServer } from 'socket.io';
import { mkdirSync } from 'fs';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';

import savesRouter from './routes/saves.js';
import gamesRouter from './routes/games.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const PORT = process.env.PORT || 3001;

// Ensure data directory exists
mkdirSync(join(__dirname, '..', 'data'), { recursive: true });

// Express setup
const app = express();
app.use(cors());
app.use(express.json({ limit: '10mb' }));

// REST API routes
app.use('/api/saves', savesRouter);
app.use('/api/games', gamesRouter);

// Health check
app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// HTTP + WebSocket server
const httpServer = createServer(app);
const io = new SocketServer(httpServer, {
  cors: { origin: '*', methods: ['GET', 'POST'] },
});

// --- WebSocket Game Rooms ---

interface RoomPlayer {
  socketId: string;
  name: string;
  slot: number;
  ready: boolean;
}

const gameRooms = new Map<string, RoomPlayer[]>();

io.on('connection', (socket) => {
  console.log(`Player connected: ${socket.id}`);

  // Join game room
  socket.on('join_room', (data: { gameId: string; name: string; slot: number }) => {
    const { gameId, name, slot } = data;
    socket.join(gameId);

    if (!gameRooms.has(gameId)) {
      gameRooms.set(gameId, []);
    }

    const room = gameRooms.get(gameId)!;
    room.push({ socketId: socket.id, name, slot, ready: false });

    io.to(gameId).emit('player_joined', { name, slot, players: room });
    console.log(`${name} joined room ${gameId}`);
  });

  // Ready up
  socket.on('player_ready', (data: { gameId: string }) => {
    const room = gameRooms.get(data.gameId);
    if (room) {
      const player = room.find((p) => p.socketId === socket.id);
      if (player) {
        player.ready = true;
        io.to(data.gameId).emit('player_ready', { slot: player.slot, players: room });

        // Check if all ready
        if (room.every((p) => p.ready)) {
          io.to(data.gameId).emit('game_start', { players: room });
        }
      }
    }
  });

  // Game state sync
  socket.on('game_action', (data: { gameId: string; action: string; payload: unknown }) => {
    // Broadcast action to all other players in the room
    socket.to(data.gameId).emit('game_action', {
      action: data.action,
      payload: data.payload,
      from: socket.id,
    });
  });

  // Disconnect
  socket.on('disconnect', () => {
    console.log(`Player disconnected: ${socket.id}`);

    // Remove from all rooms
    for (const [gameId, room] of gameRooms.entries()) {
      const index = room.findIndex((p) => p.socketId === socket.id);
      if (index !== -1) {
        const player = room[index];
        room.splice(index, 1);
        io.to(gameId).emit('player_left', { name: player.name, slot: player.slot, players: room });

        if (room.length === 0) {
          gameRooms.delete(gameId);
        }
        break;
      }
    }
  });
});

httpServer.listen(PORT, () => {
  console.log(`World Conquer server running on http://localhost:${PORT}`);
  console.log(`WebSocket server ready`);
});
