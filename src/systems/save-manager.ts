import type { GameState, SaveData } from '@/types/game';
import { eventBus, GameEvents } from '@/systems/event-bus';
import { GAME_CONFIG } from '@/config/game-config';

const DB_NAME = 'world-conquer';
const DB_VERSION = 1;
const STORE_NAME = 'saves';
const SAVE_VERSION = '1.0.0';

class SaveManager {
  private db: IDBDatabase | null = null;
  private autoSaveTimer: ReturnType<typeof setInterval> | null = null;

  async init(): Promise<void> {
    this.db = await this.openDB();
  }

  private openDB(): Promise<IDBDatabase> {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(DB_NAME, DB_VERSION);

      request.onupgradeneeded = () => {
        const db = request.result;
        if (!db.objectStoreNames.contains(STORE_NAME)) {
          const store = db.createObjectStore(STORE_NAME, { keyPath: 'gameId' });
          store.createIndex('timestamp', 'timestamp', { unique: false });
        }
      };

      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }

  async saveLocal(state: GameState): Promise<void> {
    if (!this.db) await this.init();

    const saveData: SaveData = {
      version: SAVE_VERSION,
      gameId: state.id,
      timestamp: new Date().toISOString(),
      state,
    };

    return new Promise((resolve, reject) => {
      const tx = this.db!.transaction(STORE_NAME, 'readwrite');
      const store = tx.objectStore(STORE_NAME);
      const request = store.put(saveData);
      request.onsuccess = () => {
        eventBus.emit(GameEvents.SAVE_COMPLETED, saveData.gameId);
        resolve();
      };
      request.onerror = () => reject(request.error);
    });
  }

  async loadLocal(gameId: string): Promise<SaveData | null> {
    if (!this.db) await this.init();

    return new Promise((resolve, reject) => {
      const tx = this.db!.transaction(STORE_NAME, 'readonly');
      const store = tx.objectStore(STORE_NAME);
      const request = store.get(gameId);
      request.onsuccess = () => resolve(request.result || null);
      request.onerror = () => reject(request.error);
    });
  }

  async listSaves(): Promise<SaveData[]> {
    if (!this.db) await this.init();

    return new Promise((resolve, reject) => {
      const tx = this.db!.transaction(STORE_NAME, 'readonly');
      const store = tx.objectStore(STORE_NAME);
      const request = store.getAll();
      request.onsuccess = () => {
        const saves = request.result as SaveData[];
        saves.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
        resolve(saves);
      };
      request.onerror = () => reject(request.error);
    });
  }

  async deleteSave(gameId: string): Promise<void> {
    if (!this.db) await this.init();

    return new Promise((resolve, reject) => {
      const tx = this.db!.transaction(STORE_NAME, 'readwrite');
      const store = tx.objectStore(STORE_NAME);
      const request = store.delete(gameId);
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  // Cloud save methods (will connect to backend in Step 1.4)
  async saveCloud(state: GameState): Promise<void> {
    const saveData: SaveData = {
      version: SAVE_VERSION,
      gameId: state.id,
      timestamp: new Date().toISOString(),
      state,
    };

    try {
      const response = await fetch('/api/saves', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(saveData),
      });
      if (!response.ok) {
        console.warn('Cloud save failed, local save retained');
      }
    } catch {
      console.warn('Cloud save unavailable, using local only');
    }
  }

  async loadCloud(gameId: string): Promise<SaveData | null> {
    try {
      const response = await fetch(`/api/saves/${gameId}`);
      if (response.ok) {
        return await response.json();
      }
    } catch {
      console.warn('Cloud load unavailable');
    }
    return null;
  }

  // Hybrid save: local + cloud
  async save(state: GameState): Promise<void> {
    eventBus.emit(GameEvents.SAVE_STARTED);
    await this.saveLocal(state);
    // Fire and forget cloud save
    this.saveCloud(state).catch(() => {});
  }

  // Hybrid load: prefer cloud if newer, fallback to local
  async load(gameId: string): Promise<SaveData | null> {
    const [local, cloud] = await Promise.all([
      this.loadLocal(gameId),
      this.loadCloud(gameId),
    ]);

    if (cloud && local) {
      const cloudTime = new Date(cloud.timestamp).getTime();
      const localTime = new Date(local.timestamp).getTime();
      return cloudTime > localTime ? cloud : local;
    }

    return cloud || local;
  }

  startAutoSave(getState: () => GameState): void {
    this.stopAutoSave();
    this.autoSaveTimer = setInterval(() => {
      this.save(getState()).catch((err) =>
        console.error('Auto-save failed:', err)
      );
    }, GAME_CONFIG.AUTO_SAVE_INTERVAL);
  }

  stopAutoSave(): void {
    if (this.autoSaveTimer) {
      clearInterval(this.autoSaveTimer);
      this.autoSaveTimer = null;
    }
  }
}

export const saveManager = new SaveManager();
