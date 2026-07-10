import { TASK_LABELS } from '../content/catalog';
import { findPath, samePosition } from './pathfinding';
import type { Employee, Machine, Position, Skill, Task, TaskType, WorldState } from './types';

const MOVE_STEP_SECONDS = 0.18;
const DAY_MINUTES = 24 * 60;

export function currentDay(world: WorldState): number {
  return Math.floor(world.timeMinutes / DAY_MINUTES) + 1;
}

export function currentClock(world: WorldState): string {
  const minutes = Math.floor(world.timeMinutes % DAY_MINUTES);
  const hours = Math.floor(minutes / 60).toString().padStart(2, '0');
  const rest = (minutes % 60).toString().padStart(2, '0');
  return `${hours}:${rest}`;
}

export function tickSimulation(world: WorldState, deltaSeconds: number): void {
  if (world.paused) return;

  const scaledDelta = deltaSeconds * world.speed;
  world.timeMinutes += scaledDelta * 8;

  updateMachineFlags(world);
  enqueueNeededTasks(world);
  assignTasks(world);

  for (const employee of world.employees) {
    updateEmployee(world, employee, scaledDelta);
  }
}

export function addProductionOrder(world: WorldState, amount: number): void {
  world.order.targetProducts += amount;
  addLog(world, `Директор добавил заказ ещё на ${amount} корпуса.`);
}

export function damageCutter(world: WorldState): void {
  const cutter = getMachine(world, 'cutter');
  cutter.condition = 0;
  cutter.operational = false;
  addLog(world, 'Станок Р-17 остановлен: характерный запах перегретого наследия.');
}

function updateMachineFlags(world: WorldState): void {
  for (const machine of world.machines) {
    machine.operational = machine.condition > 20;
  }
}

function enqueueNeededTasks(world: WorldState): void {
  const cutter = getMachine(world, 'cutter');

  if (!cutter.operational) {
    ensureTask(world, 'repair-machine', cutter.position, undefined, 'mechanics', 12, 100);
    return;
  }

  if (world.order.completedProducts >= world.order.targetProducts) {
    return;
  }

  if (world.inventory.steelSheet > 0 && world.inventory.steelAtCutter < 1) {
    ensureTask(world, 'haul-steel', world.facilities.steelStockpile, world.facilities.cutter, 'logistics', 2.5, 50);
  }

  if (world.inventory.steelAtCutter > 0) {
    ensureTask(world, 'cut-steel', world.facilities.cutter, undefined, 'machining', 8, 60);
  }

  if (world.inventory.cutBlank > 0 && world.inventory.blankAtBench < 1) {
    ensureTask(world, 'haul-blank', world.facilities.cutter, world.facilities.bench, 'logistics', 2.5, 45);
  }

  if (world.inventory.blankAtBench > 0) {
    ensureTask(world, 'assemble-product', world.facilities.bench, undefined, 'assembly', 10, 55);
  }

  if (world.inventory.assembledAtBench > 0) {
    ensureTask(world, 'deliver-product', world.facilities.bench, world.facilities.finishedStockpile, 'logistics', 2, 65);
  }
}

function ensureTask(
  world: WorldState,
  type: TaskType,
  source: Position,
  destination: Position | undefined,
  requiredSkill: Skill | undefined,
  duration: number,
  priority: number,
): void {
  const alreadyOpen = world.tasks.some((task) => task.type === type && !['completed', 'failed'].includes(task.state));
  if (alreadyOpen) return;

  world.tasks.push({
    id: `task-${world.nextTaskId}`,
    type,
    title: TASK_LABELS[type],
    source,
    destination,
    requiredSkill,
    duration,
    priority,
    state: 'queued',
  });
  world.nextTaskId += 1;
}

function assignTasks(world: WorldState): void {
  const openTasks = world.tasks
    .filter((task) => task.state === 'queued')
    .sort((a, b) => b.priority - a.priority);

  for (const task of openTasks) {
    const employee = findBestEmployee(world, task);
    if (!employee) continue;

    const path = findPath(world, employee.position, task.source);
    if (!samePosition(employee.position, task.source) && path.length === 0) {
      task.state = 'failed';
      addLog(world, `${task.title}: проход не найден.`);
      continue;
    }

    task.state = 'assigned';
    task.assignedEmployeeId = employee.id;
    employee.currentTaskId = task.id;
    employee.taskPhase = 'to-source';
    employee.path = path;
    employee.status = path.length > 0 ? 'moving' : 'working';
  }
}

function findBestEmployee(world: WorldState, task: Task): Employee | undefined {
  let best: Employee | undefined;
  let bestScore = Number.NEGATIVE_INFINITY;

  for (const employee of world.employees) {
    if (employee.currentTaskId || employee.energy <= 5) continue;

    const skill = task.requiredSkill ? employee.skills[task.requiredSkill] ?? 0 : 1;
    if (task.requiredSkill && skill <= 0) continue;

    const distance = Math.abs(employee.position.x - task.source.x) + Math.abs(employee.position.y - task.source.y);
    const score = skill * 10 + employee.energy * 0.05 - distance;

    if (score > bestScore) {
      best = employee;
      bestScore = score;
    }
  }

  return best;
}

function updateEmployee(world: WorldState, employee: Employee, scaledDelta: number): void {
  if (!employee.currentTaskId) {
    employee.status = 'idle';
    employee.energy = Math.min(100, employee.energy + scaledDelta * 0.04);
    return;
  }

  const task = world.tasks.find((item) => item.id === employee.currentTaskId);
  if (!task || task.state === 'completed' || task.state === 'failed') {
    releaseEmployee(employee);
    return;
  }

  if (employee.taskPhase === 'to-source') {
    task.state = 'moving';
    moveEmployee(world, employee, scaledDelta);

    if (samePosition(employee.position, task.source)) {
      if (task.destination) {
        const path = findPath(world, employee.position, task.destination);
        if (path.length === 0) {
          task.state = 'failed';
          addLog(world, `${task.title}: ${employee.name} не смог дойти до точки назначения.`);
          releaseEmployee(employee);
          return;
        }
        employee.path = path;
        employee.taskPhase = 'to-destination';
      } else {
        startWork(employee, task);
      }
    }
    return;
  }

  if (employee.taskPhase === 'to-destination') {
    task.state = 'moving';
    moveEmployee(world, employee, scaledDelta);

    if (task.destination && samePosition(employee.position, task.destination)) {
      startWork(employee, task);
    }
    return;
  }

  if (employee.taskPhase === 'work') {
    task.state = 'working';
    employee.status = 'working';
    employee.energy = Math.max(0, employee.energy - scaledDelta * 0.08);
    employee.workRemaining -= scaledDelta;

    if (employee.workRemaining <= 0) {
      completeTask(world, employee, task);
    }
  }
}

function moveEmployee(world: WorldState, employee: Employee, scaledDelta: number): void {
  employee.status = 'moving';
  employee.moveProgress += scaledDelta;
  employee.energy = Math.max(0, employee.energy - scaledDelta * 0.03);

  while (employee.moveProgress >= MOVE_STEP_SECONDS && employee.path.length > 0) {
    employee.position = employee.path.shift()!;
    employee.moveProgress -= MOVE_STEP_SECONDS;
  }
}

function startWork(employee: Employee, task: Task): void {
  employee.taskPhase = 'work';
  employee.status = 'working';
  employee.workRemaining = task.duration;
}

function completeTask(world: WorldState, employee: Employee, task: Task): void {
  switch (task.type) {
    case 'haul-steel':
      world.inventory.steelSheet -= 1;
      world.inventory.steelAtCutter += 1;
      break;
    case 'cut-steel': {
      const cutter = getMachine(world, 'cutter');
      world.inventory.steelAtCutter -= 1;
      world.inventory.cutBlank += 1;
      cutter.condition = Math.max(0, cutter.condition - 9);
      break;
    }
    case 'haul-blank':
      world.inventory.cutBlank -= 1;
      world.inventory.blankAtBench += 1;
      break;
    case 'assemble-product':
      world.inventory.blankAtBench -= 1;
      world.inventory.assembledAtBench += 1;
      break;
    case 'deliver-product':
      world.inventory.assembledAtBench -= 1;
      world.inventory.product += 1;
      world.order.completedProducts += 1;
      break;
    case 'repair-machine': {
      const cutter = getMachine(world, 'cutter');
      cutter.condition = Math.min(100, cutter.condition + 65);
      cutter.operational = true;
      break;
    }
  }

  task.state = 'completed';
  addLog(world, `${employee.name}: ${task.title.toLowerCase()}.`);
  releaseEmployee(employee);
}

function releaseEmployee(employee: Employee): void {
  employee.currentTaskId = undefined;
  employee.taskPhase = undefined;
  employee.path = [];
  employee.status = 'idle';
  employee.workRemaining = 0;
}

function getMachine(world: WorldState, kind: Machine['kind']): Machine {
  const machine = world.machines.find((item) => item.kind === kind);
  if (!machine) {
    throw new Error(`Machine not found: ${kind}`);
  }
  return machine;
}

function addLog(world: WorldState, message: string): void {
  world.log.unshift(`[День ${currentDay(world)}, ${currentClock(world)}] ${message}`);
  world.log = world.log.slice(0, 12);
}
