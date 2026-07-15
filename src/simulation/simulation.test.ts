import { describe, expect, it } from 'vitest';
import { SPARE_PART_UNIT_COST } from '../content/contracts';
import { createInitialWorld } from './createInitialWorld';
import { processDailyPayroll, upgradeCutterReliability } from './economy';
import { placeWall, removeStructure, setTileZone, toggleDoor } from './mapEditing';
import { computeWorkSpeed, makeSick } from './people';
import { computeBlankQuality, computeDefectRisk, inspectProduct } from './quality';
import { makeOffer, refreshContractOffers } from './contracts';
import { CONTRACT_TEMPLATES } from '../content/contracts';
import {
  acceptContract,
  assignEmployeeToPost,
  boostTaskPriority,
  cancelTask,
  damageCutter,
  getProductionIssues,
  hireCandidate,
  orderSpareParts,
  replanBlockedWork,
  requestScrapInsteadOfRework,
  setEmployeeShift,
  tickSimulation,
} from './simulation';
import type { WorldState } from './types';

function acceptFirstContract(world: WorldState): void {
  const offer = world.contracts.find((item) => item.status === 'offered');
  expect(offer).toBeTruthy();
  expect(acceptContract(world, offer!.id)).toBe(true);
}

describe('factory simulation prototype', () => {
  it('completes an accepted contract autonomously', () => {
    const world = createInitialWorld();
    acceptFirstContract(world);

    for (let i = 0; i < 2200; i += 1) {
      tickSimulation(world, 0.25);
    }

    expect(world.order.completedProducts).toBe(world.order.targetProducts);
    expect(world.inventory.product).toBe(world.order.targetProducts);
    expect(world.order.status).toBe('completed');
  });

  it('pays advance on accept and completion pay on finish', () => {
    const world = createInitialWorld();
    const offer = world.contracts.find((item) => item.targetProducts === 3)!;
    const fundsBefore = world.funds;
    expect(acceptContract(world, offer.id)).toBe(true);
    expect(world.funds).toBe(fundsBefore + offer.advance);

    world.order.completedProducts = world.order.targetProducts;
    tickSimulation(world, 0.25);

    expect(world.order.status).toBe('completed');
    expect(world.funds).toBe(fundsBefore + offer.advance + offer.completionPay + offer.grant);
  });

  it('creates a repair task when the cutter is broken', () => {
    const world = createInitialWorld();
    acceptFirstContract(world);
    damageCutter(world);
    tickSimulation(world, 0.25);

    expect(world.tasks.some((task) => task.type === 'repair-machine')).toBe(true);
  });

  it('blocks repair without spare parts', () => {
    const world = createInitialWorld();
    acceptFirstContract(world);
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
    acceptFirstContract(world);
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
    acceptFirstContract(world);
    const cutter = world.machines.find((machine) => machine.kind === 'cutter')!;
    cutter.condition = 40;
    world.inventory.spareParts = 2;

    tickSimulation(world, 0.25);

    expect(world.tasks.some((task) => task.type === 'service-machine')).toBe(true);
  });

  it('routes assembled products through quality control', () => {
    const world = createInitialWorld();
    acceptFirstContract(world);
    world.inventory.assembledAtBench = 1;
    world.qualityQueues.assembledAtBench.push(0.1);
    tickSimulation(world, 0.25);

    expect(world.tasks.some((task) => task.type === 'inspect-product')).toBe(true);
  });

  it('rejects high-risk products and queues rework', () => {
    const world = createInitialWorld();
    acceptFirstContract(world);
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
      world.inventory.assembledAtBench > 0 ||
      world.inventory.product > 0;
    expect(reworked).toBe(true);
  });

  it('charges funds for spare parts and refuses when broke', () => {
    const world = createInitialWorld();
    world.inventory.spareParts = 0;
    world.funds = SPARE_PART_UNIT_COST;
    expect(orderSpareParts(world, 2)).toBe(false);
    expect(world.inventory.spareParts).toBe(0);

    world.funds = SPARE_PART_UNIT_COST * 2;
    expect(orderSpareParts(world, 2)).toBe(true);
    expect(world.inventory.spareParts).toBe(2);
    expect(world.funds).toBe(0);
  });

  it('upgrades cutter reliability once for funds', () => {
    const world = createInitialWorld();
    const cutter = world.machines.find((machine) => machine.kind === 'cutter')!;
    const fundsBefore = world.funds;
    expect(upgradeCutterReliability(world)).toBe(true);
    expect(cutter.upgraded).toBe(true);
    expect(cutter.wearMod).toBeLessThan(1);
    expect(world.funds).toBeLessThan(fundsBefore);
    expect(upgradeCutterReliability(world)).toBe(false);
  });

  it('pays daily payroll and hurts morale on shortfall', () => {
    const world = createInitialWorld();
    const total = world.employees.reduce((sum, employee) => sum + employee.salary, 0);
    world.funds = total - 10;
    const moraleBefore = world.employees.map((employee) => employee.morale);

    processDailyPayroll(world);

    expect(world.funds).toBe(0);
    for (let i = 0; i < world.employees.length; i += 1) {
      expect(world.employees[i].morale).toBeLessThan(moraleBefore[i]);
    }
  });

  it('hires a candidate from the pool for a fee', () => {
    const world = createInitialWorld();
    const candidate = world.hirePool[0];
    const staffBefore = world.employees.length;
    const fundsBefore = world.funds;

    expect(hireCandidate(world, candidate.id)).toBe(true);
    expect(world.employees.length).toBe(staffBefore + 1);
    expect(world.funds).toBe(fundsBefore - candidate.hireCost);
    expect(world.employees.some((employee) => employee.name === candidate.name)).toBe(true);
  });

  it('lets a neglected young specialist quit or walk out', () => {
    const world = createInitialWorld();
    const candidate = world.hirePool.find((item) => item.traits.includes('young-specialist'))!;
    expect(hireCandidate(world, candidate.id)).toBe(true);
    const young = world.employees.find((employee) => employee.name === candidate.name)!;
    young.morale = 10;
    world.funds = 0;

    processDailyPayroll(world);

    const stillHere = world.employees.find((employee) => employee.name === candidate.name);
    expect(!stillHere || stillHere.availability === 'absent').toBe(true);
  });

  it('old-timers work slower than peers with equal vitals', () => {
    const world = createInitialWorld();
    const ivan = world.employees.find((item) => item.id === 'emp-ivan')!;
    const nina = world.employees.find((item) => item.id === 'emp-nina')!;
    const task = {
      id: 'task-test',
      type: 'repair-machine' as const,
      title: 'Ремонт',
      source: world.facilities.cutter.position,
      requiredSkill: 'mechanics' as const,
      duration: 10,
      priority: 1,
      priorityBoost: 0,
      state: 'queued' as const,
    };

    nina.skills.mechanics = 5;
    nina.traits = [];
    nina.energy = 90;
    nina.stress = 20;
    nina.morale = 70;
    ivan.energy = 90;
    ivan.stress = 20;
    ivan.morale = 70;

    expect(computeWorkSpeed(ivan, task)).toBeLessThan(computeWorkSpeed(nina, task));
  });

  it('reports missing contract when idle', () => {
    const world = createInitialWorld();
    expect(getProductionIssues(world)).toContainEqual({
      code: 'deadline',
      message: 'Нет активного контракта — примите заказ в дирекции',
    });
  });

  it('reports a material shortage when the order exceeds available stock', () => {
    const world = createInitialWorld();
    acceptFirstContract(world);
    world.order.targetProducts = 9;

    expect(getProductionIssues(world)).toContainEqual({
      code: 'materials',
      message: 'Не хватает листовой стали: минимум 1 шт.',
    });
  });

  it('blocks work when there is no qualified specialist', () => {
    const world = createInitialWorld();
    acceptFirstContract(world);
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
    acceptFirstContract(world);
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
    acceptFirstContract(world);
    world.order.dueDay = 1;
    world.timeMinutes = 24 * 60;

    tickSimulation(world, 0.25);

    expect(world.order.status).toBe('failed');
    expect(getProductionIssues(world)).toContainEqual({ code: 'deadline', message: 'Срок контракта сорван' });
  });

  it('wears the cutter down and spends spare parts on service or repair', () => {
    const world = createInitialWorld();
    const big = world.contracts.find((item) => item.targetProducts >= 5)!;
    expect(acceptContract(world, big.id)).toBe(true);
    world.funds = 2000;
    const partsBefore = world.inventory.spareParts;
    orderSpareParts(world, 2);

    for (let i = 0; i < 8000; i += 1) tickSimulation(world, 0.25);

    const maintained = world.tasks.some(
      (task) =>
        (task.type === 'repair-machine' || task.type === 'service-machine') && task.state === 'completed',
    );
    expect(maintained).toBe(true);
    expect(world.inventory.spareParts).toBeLessThan(partsBefore + 2);
    expect(world.order.completedProducts).toBe(big.targetProducts);
  });

  it('blocks work after a wall seals the route and restores it when the wall is removed', () => {
    const world = createInitialWorld();
    acceptFirstContract(world);
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
    acceptFirstContract(world);
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
    acceptFirstContract(world);
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
    acceptFirstContract(world);
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
    acceptFirstContract(world);
    world.timeMinutes = 22 * 60;
    world.inventory.steelSheet = 0;
    world.inventory.steelAtCutter = 1;

    tickSimulation(world, 0.25);

    const task = world.tasks.find((item) => item.type === 'cut-steel');
    expect(task?.assignedEmployeeId).toBeUndefined();
    expect(task?.blockedReason).toBe('Вне смены');
  });

  it('auto-rests a low-energy employee without director action', () => {
    const world = createInitialWorld();
    acceptFirstContract(world);
    const nina = world.employees.find((item) => item.id === 'emp-nina')!;
    nina.energy = 15;
    nina.currentTaskId = undefined;

    tickSimulation(world, 0.25);

    expect(nina.availability).toBe('resting');
  });

  it('blocks assignment while an employee is sick', () => {
    const world = createInitialWorld();
    acceptFirstContract(world);
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
    acceptFirstContract(world);
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
    acceptFirstContract(world);
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

  it('can scrap defectives on director request', () => {
    const world = createInitialWorld();
    acceptFirstContract(world);
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
    acceptFirstContract(world);
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

  it('locks prestigious contracts until quality reputation is earned', () => {
    const world = createInitialWorld();
    const prestigious = CONTRACT_TEMPLATES.find((item) => item.id === 'corp-medical')!;
    const offer = makeOffer(prestigious, 99);
    world.contracts.push(offer);

    expect(acceptContract(world, offer.id)).toBe(false);
    expect(world.order.status).toBe('idle');
    expect(world.log[0]).toContain('требует репутацию');

    world.reputation = prestigious.reputationRequired!;
    expect(acceptContract(world, offer.id)).toBe(true);
  });

  it('only refreshes offers that the factory reputation has unlocked', () => {
    const world = createInitialWorld();
    world.contracts = [];
    world.nextContractOffer = 0;
    world.reputation = 61;
    refreshContractOffers(world, 10);

    expect(world.contracts.length).toBeGreaterThan(0);
    expect(world.contracts.every((item) => (item.reputationRequired ?? 0) <= world.reputation)).toBe(true);
    expect(world.contracts.some((item) => item.title.includes('Министерский'))).toBe(false);
  });

  it('awards a premium for a flawless early urgent delivery', () => {
    const world = createInitialWorld();
    const urgent = world.contracts.find((item) => item.title.includes('Срочная'))!;
    const fundsBefore = world.funds;
    expect(acceptContract(world, urgent.id)).toBe(true);
    world.order.completedProducts = world.order.targetProducts;
    tickSimulation(world, 0.25);

    const expected = fundsBefore + urgent.advance + urgent.completionPay + urgent.grant +
      urgent.flawlessBonus! + urgent.earlyBonus!;
    expect(world.funds).toBe(expected);
    expect(world.log[0]).toContain('премия');
  });
});
