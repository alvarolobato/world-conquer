# World Conquer

A browser-based strategy game combining territory expansion (FrontWars), city building (SimCity/Anno 1800), and card-based combat (Clash Royale).

## Tech Stack

- **Game Engine**: Phaser.js 3.x
- **Language**: TypeScript
- **Bundler**: Vite
- **Backend**: Node.js + Express + Socket.io
- **Database**: SQLite (better-sqlite3)
- **Art Style**: 2D cartoon/vector

## Getting Started

### Frontend (Game Client)

```bash
npm install
npm run dev       # Start dev server on port 3000
npm run build     # Production build to dist/
```

### Backend (Game Server)

```bash
cd server
npm install
npm run dev       # Start server on port 3001
```

## Game Phases

1. **Expansion** - Choose spawn point, claim territory on a procedurally generated map
2. **City Building** - Build farms, houses, military buildings, manage economy and population
3. **Combat** - Deploy cards (troops, vehicles, spells) to conquer enemy territories

## Project Structure

```
src/
  scenes/      # Phaser scenes (Boot, Menu, Lobby, Phase1-3, Victory)
  entities/    # Game objects (buildings, units, cards, terrain)
  systems/     # Core systems (economy, combat, diplomacy, AI, save)
  ui/          # UI components
  network/     # WebSocket client
  config/      # Game constants and configuration
  types/       # TypeScript type definitions
  utils/       # Shared utilities
server/
  src/         # Express + Socket.io server
    routes/    # REST API endpoints
    db/        # Database schema
```
