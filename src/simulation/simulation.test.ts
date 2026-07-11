import { describe, expect, it } from 'vitest';
import { createInitialWorld } from './createInitialWorld';
import { placeWall, removeStructure, setTileZone, toggleDoor } from './mapEditing';
import { computeWorkSpeed, makeSick } from './people';
import {
  addProductionOrder,
  assignEmployeeToPost,
  boostTaskPriority,
  cancelTask,
  damageCutter,
  getProductionIssues,
  replanBlockedWork,
  sendEmployeeToRest,
  setEmployeeShift,
  tickSimulation,
} from './simulation';

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

    for (let i = 0; i < 7000; i += 1) tickSimulation(world, 0.25);

    expect(world.log.concat(world.tasks.map((task) => task.title)).join(' ')).toContain('Ремонт станка');
    expect(world.tasks.some((task) => task.type === 'repair-machine' && task.state === 'completed')).toBe(true);
    expect(world.order.completedProducts).toBe(7);
  });

  it('blocks work after a wall seals the route and restores it when the wall is removed', () => {
    const world = createInitialWorld();
    world.inventory.steelSheet = 0;
    world.inventory.steelAtCutter = 1;

    const seals = [
      { x: 15, y: 10 },
      { x: 15, y: 12 },
      { x: 14, y: 11 },
      { x: 16, y: 11 },
    ];
    for (const position of seals) expect(placeWall(world, position).ok).toBe(true);
    tickSimulation(world, 0.25);

    const blocked = world.tasks.find((item) => item.type === 'cut-steel');
    expect(blocked?.state).toBe('blocked');
    expect(blocked?.blockedReason).toBe('Нет прохода к месту выполнения');

    for (const position of seals) expect(removeStructure(world, position).ok).toBe(true);
    tickSimulation(world, 0.25);

    const reopened = world.tasks.find((item) => item.type === 'cut-steel');
    expect(reopened?.state).not.toBe('blocked');
  });

  it('blocks routes through closed doors and forbidden zones', () => {
    const world = createInitialWorld();
    world.inventory.steelSheet = 0;
    world.inventory.steelAtCutter = 1;
    const nina = world.employees.find((item) => item.id === 'emp-nina')!;
    nina.position = { x: 4, y: 9 };

    expect(toggleDoor(world, { x: 10, y: 9 }).ok).toBe(true);
    expect(toggleDoor(world, { x: 10, y: 10 }).ok).toBe(true);
    tickSimulation(world, 0.25);
    expect(world.tasks.find((item) => item.type === 'cut-steel')?.blockedReason).toBe('Нет прохода к месту выполнения');

    expect(toggleDoor(world, { x: 10, y: 9 }).ok).toBe(true);
    expect(toggleDoor(world, { x: 10, y: 10 }).ok).toBe(true);
    expect(setTileZone(world, world.facilities.cutter, 'forbidden').ok).toBe(true);
    tickSimulation(world, 0.25);
    expect(world.tasks.find((item) => item.type === 'cut-steel')?.blockedReason).toBe('Нет прохода к месту выполнения');
  });

  it('lets the director boost priority and cancel a task', () => {
    const world = createInitialWorld();
    tickSimulation(world, 0.25);

    const haul = world.tasks.find((item) => item.type === 'haul-steel');
    expect(haul).toBeTruthy();
    expect(boostTaskPriority(world, haul!.id, 40)).toBe(true);
    expect(haul!.priorityBoost).toBe(40);

    const employee = world.employees.find((item) => item.id === haul!.assignedEmployeeId);
    expect(cancelTask(world, haul!.id)).toBe(true);
    expect(haul!.state).toBe('failed');
    expect(employee?.currentTaskId).toBeUndefined();
  });

  it('replans blocked work on director request', () => {
    const world = createInitialWorld();
    world.inventory.steelSheet = 0;
    world.inventory.steelAtCutter = 1;
    for (const employee of world.employees) delete employee.skills.machining;
    tickSimulation(world, 0.25);

    expect(world.tasks.some((task) => task.state === 'blocked')).toBe(true);
    expect(replanBlockedWork(world)).toBeGreaterThan(0);
    expect(world.tasks.every((task) => task.state !== 'blocked')).toBe(true);
  });

  it('does not assign day-shift workers during the night', () => {
    const world = createInitialWorld();
    world.timeMinutes = 22 * 60;
    world.inventory.steelSheet = 0;
    world.inventory.steelAtCutter = 1;

    tickSimulation(world, 0.25);

    const task = world.tasks.find((item) => item.type === 'cut-steel');
    expect(task?.assignedEmployeeId).toBeUndefined();
    expect(task?.blockedReason).toBe('Вне смены');
  });

  it('sends an employee to rest and recovers energy faster', () => {
    const world = createInitialWorld();
    const nina = world.employees.find((item) => item.id === 'emp-nina')!;
    nina.energy = 30;

    expect(sendEmployeeToRest(world, nina.id)).toBe(true);
    expect(nina.availability).toBe('resting');

    for (let i = 0; i < 80; i += 1) tickSimulation(world, 0.25);

    const gained = nina.energy - 30;
    expect(gained).toBeGreaterThan(80 * 0.25 * 0.08);
  });

  it('blocks assignment while an employee is sick', () => {
    const world = createInitialWorld();
    world.inventory.steelSheet = 0;
    world.inventory.steelAtCutter = 1;
    for (const employee of world.employees) {
      if (employee.id !== 'emp-nina') delete employee.skills.machining;
    }
    const nina = world.employees.find((item) => item.id === 'emp-nina')!;
    makeSick(world, nina, 8 * 60);

    tickSimulation(world, 0.25);

    const task = world.tasks.find((item) => item.type === 'cut-steel');
    expect(nina.availability).toBe('sick');
    expect(task?.assignedEmployeeId).toBeUndefined();
    expect(task?.blockedReason).toBe('На больничном');
  });

  it('grows skills from completed work', () => {
    const world = createInitialWorld();
    const boris = world.employees.find((item) => item.id === 'emp-boris')!;
    boris.skills.logistics = 3;
    boris.skillXp.logistics = 90;

    tickSimulation(world, 0.25);
    const haul = world.tasks.find((item) => item.type === 'haul-steel' && item.assignedEmployeeId === boris.id);
    expect(haul).toBeTruthy();

    for (let i = 0; i < 200; i += 1) tickSimulation(world, 0.25);

    expect(boris.skills.logistics).toBeGreaterThanOrEqual(4);
  });

  it('slows work when energy is low and stress is high', () => {
    const world = createInitialWorld();
    const nina = world.employees.find((item) => item.id === 'emp-nina')!;
    const task = {
      id: 'task-test',
      type: 'cut-steel' as const,
      title: 'Резка',
      source: world.facilities.cutter,
      requiredSkill: 'machining' as const,
      duration: 10,
      priority: 1,
      priorityBoost: 0,
      state: 'queued' as const,
    };

    nina.energy = 95;
    nina.stress = 10;
    nina.morale = 80;
    const fresh = computeWorkSpeed(nina, task);

    nina.energy = 20;
    nina.stress = 90;
    nina.morale = 40;
    const tired = computeWorkSpeed(nina, task);

    expect(tired).toBeLessThan(fresh);
  });

  it('prefers the employee assigned to the matching post', () => {
    const world = createInitialWorld();
    world.inventory.steelSheet = 0;
    world.inventory.steelAtCutter = 1;
    const nina = world.employees.find((item) => item.id === 'emp-nina')!;
    const ivan = world.employees.find((item) => item.id === 'emp-ivan')!;
    ivan.skills.machining = 5;
    ivan.energy = 99;
    nina.energy = 99;
    assignEmployeeToPost(world, ivan.id, 'cutter');
    assignEmployeeToPost(world, nina.id, 'none');

    tickSimulation(world, 0.25);

    const task = world.tasks.find((item) => item.type === 'cut-steel');
    expect(task?.assignedEmployeeId).toBe('emp-ivan');
  });

  it('lets the director change shifts', () => {
    const world = createInitialWorld();
    const nina = world.employees.find((item) => item.id === 'emp-nina')!;
    expect(setEmployeeShift(world, nina.id, 'night')).toBe(true);
    expect(nina.shiftId).toBe('night');
  });
});
