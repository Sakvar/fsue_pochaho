import { describe, expect, it } from 'vitest';
import { createInitialWorld } from './createInitialWorld';
import { addProductionOrder, damageCutter, getProductionIssues, tickSimulation } from './simulation';

describe('factory simulation prototype', () => {
  it('completes the starter order autonomously', () => {
    const world = createInitialWorld();

    for (let i = 0; i < 1600; i += 1) {
      tickSimulation(world, 0.25);
    }

    expect(world.order.completedProducts).toBe(3);
    expect(world.inventory.product).toBe(3);
    expect(world.order.status).toBe('completed');
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

  it('rejects a plan increase that cannot be supplied with raw material', () => {
    const world = createInitialWorld();

    expect(addProductionOrder(world, 6)).toBe(false);
    expect(world.order.targetProducts).toBe(3);
    expect(world.log[0]).toContain('не хватает листовой стали');
  });

  it('reports a material shortage when the order exceeds available stock', () => {
    const world = createInitialWorld();
    world.order.targetProducts = 9;

    expect(getProductionIssues(world)).toContainEqual({
      code: 'materials',
      message: 'Не хватает листовой стали: минимум 1 шт.',
    });
  });

  it('blocks work when there is no qualified specialist', () => {
    const world = createInitialWorld();
    world.inventory.steelSheet = 0;
    world.inventory.steelAtCutter = 1;
    for (const employee of world.employees) delete employee.skills.machining;

    tickSimulation(world, 0.25);

    const task = world.tasks.find((item) => item.type === 'cut-steel');
    expect(task?.state).toBe('blocked');
    expect(task?.blockedReason).toContain('требуемым навыком');
  });

  it('blocks work when the destination cannot be reached', () => {
    const world = createInitialWorld();
    world.inventory.steelSheet = 0;
    world.inventory.steelAtCutter = 1;
    const cutter = world.facilities.cutter;
    world.tiles[cutter.y * world.width + cutter.x].kind = 'wall';

    tickSimulation(world, 0.25);

    const task = world.tasks.find((item) => item.type === 'cut-steel');
    expect(task?.state).toBe('blocked');
    expect(task?.blockedReason).toBe('Нет прохода к месту выполнения');
  });

  it('fails an unfinished order after its due day', () => {
    const world = createInitialWorld();
    world.order.dueDay = 1;
    world.timeMinutes = 24 * 60;

    tickSimulation(world, 0.25);

    expect(world.order.status).toBe('failed');
    expect(getProductionIssues(world)).toContainEqual({ code: 'deadline', message: 'Срок заказа сорван' });
  });

  it('wears the cutter down naturally and repairs it during a longer order', () => {
    const world = createInitialWorld();
    expect(addProductionOrder(world, 4)).toBe(true);

    for (let i = 0; i < 5000; i += 1) tickSimulation(world, 0.25);

    expect(world.log.concat(world.tasks.map((task) => task.title)).join(' ')).toContain('Ремонт станка');
    expect(world.tasks.some((task) => task.type === 'repair-machine' && task.state === 'completed')).toBe(true);
    expect(world.order.completedProducts).toBe(7);
  });
});
