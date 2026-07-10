import { PRODUCTION_TASKS, type TaskRule } from '../content/productionRules';
import { findPath, samePosition } from './pathfinding';
import type { Employee, Machine, Task, TaskType, WorldState } from './types';

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
  for (const rule of PRODUCTION_TASKS) {
    if (rule.canStart(world)) {
      ensureTask(world, rule);
    }
  }
}

function ensureTask(world: WorldState, rule: TaskRule): void {
  const alreadyOpen = world.tasks.some((task) => task.type === rule.type && !['completed', 'failed'].includes(task.state));
  if (alreadyOpen) return;

  world.tasks.push({
    id: `task-${world.nextTaskId}`,
    type: rule.type,
    title: rule.title,
    source: world.facilities[rule.source],
    destination: rule.destination ? world.facilities[rule.destination] : undefined,
    requiredSkill: rule.requiredSkill,
    duration: rule.duration,
    priority: rule.priority,
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
  const rule = PRODUCTION_TASKS.find((item) => item.type === task.type);
  if (!rule) {
    task.state = 'failed';
    addLog(world, `${task.title}: нет производственного правила.`);
    releaseEmployee(employee);
    return;
  }

  const resultMessage = rule.complete(world);
  task.state = 'completed';
  addLog(world, `${employee.name}: ${task.title.toLowerCase()}.`);
  if (resultMessage) addLog(world, resultMessage);
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
