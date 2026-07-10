import { describe, expect, it } from 'vitest';
import { createInitialWorld } from './createInitialWorld';
import { damageCutter, tickSimulation } from './simulation';

describe('factory simulation prototype', () => {
  it('completes the starter order autonomously', () => {
    const world = createInitialWorld();

    for (let i = 0; i < 1600; i += 1) {
      tickSimulation(world, 0.25);
    }

    expect(world.order.completedProducts).toBe(3);
    expect(world.inventory.product).toBe(3);
  });

  it('creates a repair task when the cutter is broken', () => {
    const world = createInitialWorld();
    damageCutter(world);
    tickSimulation(world, 0.25);

    expect(world.tasks.some((task) => task.type === 'repair-machine')).toBe(true);
  });

  it('routes assembled products through quality control', () => {
    const world = createInitialWorld();
    world.inventory.assembledAtBench = 1;
    tickSimulation(world, 0.25);

    expect(world.tasks.some((task) => task.type === 'inspect-product')).toBe(true);
  });

  it('sends every fourth inspected product back to rework', () => {
    const world = createInitialWorld();
    world.inventory.assembledAtBench = 1;
    world.qualityChecks = 3;

    for (let i = 0; i < 200; i += 1) {
      tickSimulation(world, 0.25);
    }

    expect(world.qualityChecks).toBeGreaterThan(3);
    expect(world.tasks.some((task) => task.type === 'rework-product')).toBe(true);
  });
});
