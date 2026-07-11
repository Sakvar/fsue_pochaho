import type { WorldState } from './types';

/** Deterministic [0, 1) float from world seed (mulberry32). */
export function nextFloat(world: WorldState): number {
  world.rngState = (world.rngState + 0x6d2b79f5) >>> 0;
  let t = world.rngState;
  t = Math.imul(t ^ (t >>> 15), t | 1);
  t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
}

export function nextChance(world: WorldState, probability: number): boolean {
  if (probability <= 0) return false;
  if (probability >= 1) return true;
  return nextFloat(world) < probability;
}
