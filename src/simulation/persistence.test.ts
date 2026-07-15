import { describe, expect, it } from 'vitest';
import { createInitialWorld } from './createInitialWorld';
import { deserializeWorld, loadWorld, SAVE_STORAGE_KEY, saveWorld, serializeWorld } from './persistence';

describe('save games', () => {
  it('round-trips the complete world state', () => {
    const world = createInitialWorld();
    world.funds = 12_345;
    world.timeMinutes = 777;

    expect(deserializeWorld(serializeWorld(world))).toEqual(world);
  });

  it('stores and loads a world through a storage adapter', () => {
    const values = new Map<string, string>();
    const storage = {
      getItem: (key: string) => values.get(key) ?? null,
      setItem: (key: string, value: string) => values.set(key, value),
    };
    const world = createInitialWorld();

    saveWorld(world, storage);

    expect(values.has(SAVE_STORAGE_KEY)).toBe(true);
    expect(loadWorld(storage)).toEqual(world);
  });

  it('rejects malformed and incompatible saves', () => {
    expect(() => deserializeWorld('{"version":999,"world":{}}')).toThrow(/другой версией/);
    expect(() => deserializeWorld('not-json')).toThrow();
  });
});
