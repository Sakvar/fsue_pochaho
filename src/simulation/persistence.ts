import type { WorldState } from './types';

export const SAVE_VERSION = 1;
export const SAVE_STORAGE_KEY = 'pochaho.save.v1';

interface SaveEnvelope {
  version: number;
  savedAt: string;
  world: WorldState;
}

export function serializeWorld(world: WorldState): string {
  const envelope: SaveEnvelope = {
    version: SAVE_VERSION,
    savedAt: new Date().toISOString(),
    world,
  };
  return JSON.stringify(envelope);
}

export function deserializeWorld(value: string): WorldState {
  const parsed: unknown = JSON.parse(value);
  if (!isSaveEnvelope(parsed)) {
    throw new Error('Файл сохранения повреждён или создан другой версией игры.');
  }
  return parsed.world;
}

export function saveWorld(world: WorldState, storage: Pick<Storage, 'setItem'> = localStorage): void {
  storage.setItem(SAVE_STORAGE_KEY, serializeWorld(world));
}

export function loadWorld(storage: Pick<Storage, 'getItem'> = localStorage): WorldState | undefined {
  const value = storage.getItem(SAVE_STORAGE_KEY);
  return value ? deserializeWorld(value) : undefined;
}

function isSaveEnvelope(value: unknown): value is SaveEnvelope {
  if (!value || typeof value !== 'object') return false;
  const envelope = value as Partial<SaveEnvelope>;
  if (envelope.version !== SAVE_VERSION || typeof envelope.savedAt !== 'string') return false;
  const world = envelope.world as Partial<WorldState> | undefined;
  return Boolean(
    world
      && typeof world.width === 'number'
      && typeof world.height === 'number'
      && Array.isArray(world.tiles)
      && Array.isArray(world.employees)
      && Array.isArray(world.tasks)
      && Array.isArray(world.log)
      && world.order
      && Array.isArray(world.contracts),
  );
}
