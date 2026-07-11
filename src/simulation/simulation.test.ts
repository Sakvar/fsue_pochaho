import { describe, expect, it } from 'vitest';
import { createInitialWorld } from './createInitialWorld';
import { placeWall, removeStructure, setTileZone, toggleDoor } from './mapEditing';
import { computeWorkSpeed, makeSick } from './people';
import { computeBlankQuality, computeDefectRisk, inspectProduct } from './quality';
import {
  addProductionOrder,
  assignEmployeeToPost,
  boostTaskPriority,
  cancelTask,
  damageCutter,
  getProductionIssues,
  orderSpareParts,
  replanBlockedWork,
  requestScrapInsteadOfRework,
  sendEmployeeToRest,
  setEmployeeShift,
  tickSimulation,
} from './simulation';

describe('factory simulation prototype', () => {
  it('completes the starter order autonomously', () => {
    const world = createInitialWorld();

    for (let i = 0; i < 2200; i += 1) {
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

  it('blocks repair without spare parts', () => {
    const world = createInitialWorld();
    world.inventory.spareParts = 0;
    damageCutter(world);
    tickSimulation(world, 0.25);

    const repair = world.tasks.find((task) => task.type === 'repair-machine');
    expect(repair?.state).toBe('blocked');
    expect(repair?.blockedReason).toContain('запчаст');
    expect(getProductionIssues(world).some((issue) => issue.code === 'parts')).toBe(true);
  });

  it('repairs the cutter using a spare part and records service history', () => {
    const world = createInitialWorld();
    world.inventory.spareParts = 1;
    damageCutter(world);

    for (let i = 0; i < 400; i += 1) tickSimulation(world, 0.25);

    const cutter = world.machines.find((machine) => machine.kind === 'cutter')!;
    expect(cutter.operational).toBe(true);
    expect(world.inventory.spareParts).toBe(0);
    expect(cutter.serviceLog[0]?.kind).toBe('repair');
    expect(cutter.serviceLog[0]?.partsUsed).toBe(1);
  });

  it('schedules preventive service when the cutter wears down', () => {
    const world = createInitialWorld();
    const cutter = world.machines.find((machine) => machine.kind === 'cutter')!;
    cutter.condition = 40;
    world.inventory.spareParts = 2;

    tickSimulation(world, 0.25);

    expect(world.tasks.some((task) => task.type === 'service-machine')).toBe(true);
  });

  it('routes assembled products through quality control', () => {
    const world = createInitialWorld();
    world.inventory.assembledAtBench = 1;
    world.qualityQueues.assembledAtBench.push(0.1);
    tickSimulation(world, 0.25);

    expect(world.tasks.some((task) => task.type === 'inspect-product')).toBe(true);
  });

  it('rejects high-risk products and queues rework', () => {
    const world = createInitialWorld();
    world.inventory.assembledAtBench = 1;
    world.qualityQueues.assembledAtBench.push(0.99);
    world.rngState = 1;

    for (let i = 0; i < 300; i += 1) {
      tickSimulation(world, 0.25);
    }

    expect(world.qualityChecks).toBeGreaterThan(0);
    const reworked =
      world.inventory.defectiveProduct > 0 ||
      world.tasks.some((task) => task.type === 'rework-product') ||
      world.tasks.some((task) => task.type === 'rework-product' && task.state === 'completed') ||
      world.inventory.assembledAtBench > 0;
    expect(reworked).toBe(true);
  });

  it('can scrap defective products instead of reworking them', () => {
    const world = createInitialWorld();
    world.inventory.defectiveProduct = 1;
    tickSimulation(world, 0.25);

    expect(world.tasks.some((task) => task.type === 'rework-product')).toBe(true);
    expect(requestScrapInsteadOfRework(world)).toBe(true);

    for (let i = 0; i < 300; i += 1) tickSimulation(world, 0.25);

    expect(world.inventory.scrap).toBeGreaterThan(0);
    expect(world.inventory.defectiveProduct).toBe(0);
  });

  it('lowers reputation when a hidden defect is shipped', () => {
    const world = createInitialWorld();
    world.inventory.inspectedProduct = 1;
    world.qualityQueues.inspectedProduct.push('hidden');
    world.order.targetProducts = 1;
    const before = world.reputation;

    for (let i = 0; i < 200; i += 1) tickSimulation(world, 0.25);

    expect(world.order.status).toBe('completed');
    expect(world.shippedHiddenDefects).toBe(1);
    expect(world.reputation).toBeLessThan(before);
  });

  it('computes worse blank quality on a worn machine with a tired operator', () => {
    const world = createInitialWorld();
    const nina = world.employees.find((item) => item.id === 'emp-nina')!;
    const cutter = world.machines.find((machine) => machine.kind === 'cutter')!;

    nina.energy = 95;
    nina.stress = 10;
    cutter.condition = 95;
    const fresh = computeBlankQuality(nina, cutter);

    nina.energy = 20;
    nina.stress = 80;
    cutter.condition = 25;
    const worn = computeBlankQuality(nina, cutter);

    expect(worn).toBeLessThan(fresh);
  });

  it('raises defect risk when blank quality and assembly skill are poor', () => {
    const world = createInitialWorld();
    const vera = world.employees.find((item) => item.id === 'emp-vera')!;
    vera.skills.assembly = 5;
    vera.energy = 95;
    vera.stress = 10;
    const good = computeDefectRisk(vera, 0.95, 95);

    vera.skills.assembly = 1;
    vera.energy = 25;
    vera.stress = 80;
    const bad = computeDefectRisk(vera, 0.2, 40);

    expect(bad).toBeGreaterThan(good);
  });

  it('lets a strict inspector catch defects more often than a weak one', () => {
    const world = createInitialWorld();
    const galina = world.employees.find((item) => item.id === 'emp-galina')!;
    const weak = {
      ...galina,
      skills: { quality: 1 },
      traits: [] as typeof galina.traits,
      energy: 40,
      stress: 70,
    };

    let strictCatches = 0;
    let weakCatches = 0;
    for (let i = 0; i < 80; i += 1) {
      world.rngState = 1000 + i;
      if (inspectProduct(world, galina, 0.9) === 'rejected') strictCatches += 1;
      world.rngState = 1000 + i;
      if (inspectProduct(world, weak, 0.9) === 'rejected') weakCatches += 1;
    }

    expect(strictCatches).toBeGreaterThan(weakCatches);
  });

  it('orders spare parts on director request', () => {
    const world = createInitialWorld();
    world.inventory.spareParts = 0;
    orderSpareParts(world, 2);
    expect(world.inventory.spareParts).toBe(2);
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
    const cutter = world.facilities.cutter.position;
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

  it('wears the cutter down and spends spare parts on service or repair', () => {
    const world = createInitialWorld();
    expect(addProductionOrder(world, 4)).toBe(true);
    const partsBefore = world.inventory.spareParts;
    orderSpareParts(world, 2);

    for (let i = 0; i < 8000; i += 1) tickSimulation(world, 0.25);

    const maintained = world.tasks.some(
      (task) =>
        (task.type === 'repair-machine' || task.type === 'service-machine') && task.state === 'completed',
    );
    expect(maintained).toBe(true);
    expect(world.inventory.spareParts).toBeLessThan(partsBefore + 2);
    expect(world.order.completedProducts).toBe(7);
  });

  it('blocks work after a wall seals the route and restores it when the wall is removed', () => {
    const world = createInitialWorld();
    world.inventory.steelSheet = 0;
    world.inventory.steelAtCutter = 1;

    const seals = [
      { x: 15, y: 13 },
      { x: 14, y: 12 },
      { x: 16, y: 12 },
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
    expect(setTileZone(world, world.facilities.cutter.position, 'forbidden').ok).toBe(true);
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
      source: world.facilities.cutter.position,
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
    assignEmployeeToPost(world, nina.id, 'none');
    assignEmployeeToPost(world, ivan.id, 'cutter');

    tickSimulation(world, 0.25);

    const task = world.tasks.find((item) => item.type === 'cut-steel');
    expect(task?.assignedEmployeeId).toBe('emp-ivan');
  });

  it('limits machine operator posts to one person per machine', () => {
    const world = createInitialWorld();
    const nina = world.employees.find((item) => item.id === 'emp-nina')!;
    const ivan = world.employees.find((item) => item.id === 'emp-ivan')!;

    expect(nina.assignedPost).toBe('cutter');
    expect(assignEmployeeToPost(world, ivan.id, 'cutter')).toBe(false);
    expect(ivan.assignedPost).toBe('none');

    expect(assignEmployeeToPost(world, nina.id, 'none')).toBe(true);
    expect(assignEmployeeToPost(world, ivan.id, 'cutter')).toBe(true);
    expect(ivan.assignedPost).toBe('cutter');
  });

  it('blocks cutting when no cutter operator is assigned', () => {
    const world = createInitialWorld();
    world.inventory.steelSheet = 0;
    world.inventory.steelAtCutter = 1;
    const nina = world.employees.find((item) => item.id === 'emp-nina')!;
    assignEmployeeToPost(world, nina.id, 'none');

    tickSimulation(world, 0.25);

    const task = world.tasks.find((item) => item.type === 'cut-steel');
    expect(task?.state).toBe('blocked');
    expect(task?.blockedReason).toContain('Нет оператора');
  });

  it('lets the director change shifts', () => {
    const world = createInitialWorld();
    const nina = world.employees.find((item) => item.id === 'emp-nina')!;
    expect(setEmployeeShift(world, nina.id, 'night')).toBe(true);
    expect(nina.shiftId).toBe('night');
  });
});
