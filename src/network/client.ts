import { io, Socket } from 'socket.io-client';
import { eventBus, GameEvents } from '@/systems/event-bus';

const SERVER_URL = import.meta.env.VITE_SERVER_URL || 'http://localhost:3001';

class NetworkClient {
  private socket: Socket | null = null;
  private gameId: string | null = null;
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;

  connect(): void {
    if (this.socket?.connected) return;

    this.socket = io(SERVER_URL, {
      autoConnect: true,
      reconnection: true,
      reconnectionAttempts: this.maxReconnectAttempts,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000,
    });

    this.socket.on('connect', () => {
      console.log('Connected to server');
      this.reconnectAttempts = 0;
      eventBus.emit(GameEvents.PLAYER_CONNECTED);
    });

    this.socket.on('disconnect', () => {
      console.log('Disconnected from server');
      eventBus.emit(GameEvents.PLAYER_DISCONNECTED);
    });

    // Game events from server
    this.socket.on('player_joined', (data) => {
      console.log('Player joined:', data);
    });

    this.socket.on('player_left', (data) => {
      console.log('Player left:', data);
    });

    this.socket.on('player_ready', (data) => {
      console.log('Player ready:', data);
    });

    this.socket.on('game_start', (data) => {
      console.log('Game starting:', data);
      eventBus.emit(GameEvents.GAME_STARTED, data);
    });

    this.socket.on('game_action', (data) => {
      this.handleGameAction(data);
    });
  }

  disconnect(): void {
    this.socket?.disconnect();
    this.socket = null;
    this.gameId = null;
  }

  joinRoom(gameId: string, name: string, slot: number): void {
    this.gameId = gameId;
    this.socket?.emit('join_room', { gameId, name, slot });
  }

  setReady(gameId: string): void {
    this.socket?.emit('player_ready', { gameId });
  }

  sendAction(action: string, payload: unknown): void {
    if (!this.gameId) return;
    this.socket?.emit('game_action', {
      gameId: this.gameId,
      action,
      payload,
    });
  }

  private handleGameAction(data: { action: string; payload: unknown; from: string }): void {
    // Map network actions to local events
    switch (data.action) {
      case 'spawn_placed':
        eventBus.emit(GameEvents.SPAWN_PLACED, data.payload);
        break;
      case 'territory_claimed':
        eventBus.emit(GameEvents.TERRITORY_CLAIMED, data.payload);
        break;
      case 'building_placed':
        eventBus.emit(GameEvents.BUILDING_PLACED, data.payload);
        break;
      case 'card_played':
        eventBus.emit(GameEvents.CARD_PLAYED, data.payload);
        break;
      case 'battle_started':
        eventBus.emit(GameEvents.BATTLE_STARTED, data.payload);
        break;
      case 'diplomacy_proposal':
        eventBus.emit(GameEvents.ALLIANCE_PROPOSED, data.payload);
        break;
      default:
        console.log('Unknown game action:', data.action);
    }
  }

  get isConnected(): boolean {
    return this.socket?.connected ?? false;
  }
}

export const networkClient = new NetworkClient();
