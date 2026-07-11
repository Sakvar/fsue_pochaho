import { PRODUCTION_TASKS, type TaskRule } from '../content/productionRules';
import { repairBlockedReason, serviceBlockedReason } from './equipment';
import { findPath, samePosition } from './pathfinding';
import {
  applyActivityFatigue,
  computeWorkSpeed,
  currentShiftPeriod,
  employeeBlockReason,
  grantSkillXp,
  postForTask,
  scoreEmployeeForTask,
  updatePeopleSystems,
} from './people';
import { adjustReputation, reputationLabel } from './quality';
import type { Employee, Machine, ProductionIssue, Task, WorldState } from './types';

export {
  assignEmployeeToPost,
  countPostAssignees,
  currentShiftPeriod,
  isOnShift,
  makeSick,
  postCapacity,
  sendEmployeeToRest,
  setEmployeeShift,
} from './people';

export { reputationLabel } from './quality';

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

export function effectivePriority(task: Task): number {
  return task.priority + task.priorityBoost;
}

export function tickSimulation(world: WorldState, deltaSeconds: number): void {
  if (world.paused) return;

  const scaledDelta = deltaSeconds * world.speed;
  world.timeMinutes += scaledDelta * 8;

  updateMachineFlags(world);
  updateOrderStatus(world);
  updatePeopleSystems(world, scaledDelta);
  enqueueNeededTasks(world);
  assignTasks(world);

  for (const employee of world.employees) {
    updateEmployee(world, employee, scaledDelta);
  }
}

export function addProductionOrder(world: WorldState, amount: number): boolean {
  if (world.order.status !== 'active') {
    addLog(world, 'Изменить закрытый заказ нельзя: требуется оформить новый.');
    return false;
  }

  const availableUnits = countPotentialProducts(world);
  const newTarget = world.order.targetProducts + amount;
  if (newTarget - world.order.completedProducts > availableUnits) {
    addLog(world, `План не увеличен: для ${newTarget} корпусов не хватает листовой стали.`);
    return false;
  }

  world.order.targetProducts += amount;
  addLog(world, `Директор добавил заказ ещё на ${amount} корпуса.`);
  return true;
}

export function damageCutter(world: WorldState): void {
  const cutter = getMachine(world, 'cutter');
  cutter.condition = 0;
  cutter.operational = false;
  addLog(world, 'Станок Р-17 остановлен: характерный запах перегретого наследия.');
}

export function orderSpareParts(world: WorldState, amount = 2): void {
  world.inventory.spareParts += amount;
  addLog(world, `Снабжение выдало запчасти: +${amount} (всего ${world.inventory.spareParts}).`);
}

export function requestScrapInsteadOfRework(world: WorldState): boolean {
  if (world.inventory.defectiveProduct < 1) {
    addLog(world, 'Списывать нечего: брака на ОТК нет.');
    return false;
  }

  world.preferScrap = true;
  const rework = world.tasks.find((task) => task.type === 'rework-product' && !['completed', 'failed'].includes(task.state));
  if (rework) cancelTask(world, rework.id);
  addLog(world, 'Директор приказал списать брак вместо переделки.');
  return true;
}

export function boostTaskPriority(world: WorldState, taskId: string, delta = 20): boolean {
  const task = world.tasks.find((item) => item.id === taskId);
  if (!task || ['completed', 'failed'].includes(task.state)) return false;

  task.priorityBoost = Math.max(-80, Math.min(120, task.priorityBoost + delta));
  addLog(world, `Приоритет «${task.title}» изменён директором (${effectivePriority(task)}).`);
  return true;
}

export function cancelTask(world: WorldState, taskId: string): boolean {
  const task = world.tasks.find((item) => item.id === taskId);
  if (!task || ['completed', 'failed'].includes(task.state)) return false;

  const employee = world.employees.find((item) => item.id === task.assignedEmployeeId);
  if (employee) releaseEmployee(employee);

  task.state = 'failed';
  task.assignedEmployeeId = undefined;
  task.blockedReason = 'Отменено директором';
  addLog(world, `Наряд «${task.title}» отменён директором.`);
  return true;
}

export function replanBlockedWork(world: WorldState): number {
  let count = 0;
  for (const task of world.tasks) {
    if (task.state !== 'blocked') continue;
    task.state = 'queued';
    task.blockedReason = undefined;
    count += 1;
  }

  if (count > 0) {
    addLog(world, `Директор потребовал перепланировать ${count} заблокированных нарядов.`);
  } else {
    addLog(world, 'Перепланировать нечего: заблокированных нарядов нет.');
  }
  return count;
}

function updateMachineFlags(world: WorldState): void {
  for (const machine of world.machines) {
    const wasOperational = machine.operational;
    machine.operational = machine.condition > 20;
    if (wasOperational && !machine.operational) {
      addLog(world, `${machine.name} остановлен из-за критического износа.`);
    }
  }
}

function updateOrderStatus(world: WorldState): void {
  if (world.order.status !== 'active') return;

  if (world.order.completedProducts >= world.order.targetProducts) {
    world.order.status = 'completed';
    if (world.shippedHiddenDefects > 0) {
      adjustReputation(world, -5 * world.shippedHiddenDefects);
      addLog(
        world,
        `Заказ выполнен, но ${world.shippedHiddenDefects} корпус(ов) ушли со скрытым браком. Репутация: ${Math.round(world.reputation)} (${reputationLabel(world.reputation)}).`,
      );
    } else {
      adjustReputation(world, 4);
      addLog(
        world,
        `Заказ выполнен: сдано ${world.order.completedProducts} корпусов. Репутация: ${Math.round(world.reputation)} (${reputationLabel(world.reputation)}).`,
      );
    }
  } else if (currentDay(world) > world.order.dueDay) {
    world.order.status = 'failed';
    adjustReputation(world, -12);
    addLog(world, `Срок заказа сорван: сдано ${world.order.completedProducts} из ${world.order.targetProducts}. Репутация падает.`);
    for (const task of world.tasks.filter((item) => !['completed', 'failed'].includes(item.state))) {
      task.state = 'failed';
      task.blockedReason = 'Заказ закрыт после срыва срока';
      const employee = world.employees.find((item) => item.id === task.assignedEmployeeId);
      if (employee) releaseEmployee(employee);
    }
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
    source: world.facilities[rule.source].position,
    destination: rule.destination ? world.facilities[rule.destination].position : undefined,
    requiredSkill: rule.requiredSkill,
    duration: rule.duration,
    priority: rule.priority,
    priorityBoost: 0,
    state: 'queued',
  });
  world.nextTaskId += 1;
}

function assignTasks(world: WorldState): void {
  const openTasks = world.tasks
    .filter((task) => task.state === 'queued' || task.state === 'blocked')
    .sort((a, b) => effectivePriority(b) - effectivePriority(a));

  for (const task of openTasks) {
    task.blockedReason = undefined;
    const equipmentBlock = getEquipmentBlock(world, task);
    if (equipmentBlock) {
      blockTask(task, equipmentBlock);
      continue;
    }

    const employee = findBestEmployee(world, task);
    if (!employee) {
      const requiredPost = machineOperatorPost(task);
      if (requiredPost) {
        const operators = world.employees.filter((item) => item.assignedPost === requiredPost);
        if (operators.length === 0) {
          blockTask(task, `Нет оператора на посту «${postTitle(requiredPost)}»`);
          continue;
        }
        const reason = operators.map((item) => employeeBlockReason(item, world)).find((item) => item && item !== 'Занят');
        if (reason) {
          blockTask(task, reason);
          continue;
        }
      }

      const qualified = world.employees.filter((item) => !task.requiredSkill || (item.skills[task.requiredSkill] ?? 0) > 0);
      if (qualified.length === 0) {
        blockTask(task, 'Нет сотрудника с требуемым навыком');
      } else {
        const reason = qualified.map((item) => employeeBlockReason(item, world)).find((item) => item && item !== 'Занят');
        task.state = 'queued';
        task.blockedReason = reason ?? 'Ожидает свободного специалиста';
      }
      continue;
    }

    const path = findPath(world, employee.position, task.source);
    if (!samePosition(employee.position, task.source) && path.length === 0) {
      blockTask(task, 'Нет прохода к месту выполнения');
      continue;
    }

    task.state = 'assigned';
    task.blockedReason = undefined;
    task.assignedEmployeeId = employee.id;
    employee.currentTaskId = task.id;
    employee.availability = 'available';
    employee.taskPhase = 'to-source';
    employee.path = path;
    employee.status = path.length > 0 ? 'moving' : 'working';
  }
}

function findBestEmployee(world: WorldState, task: Task): Employee | undefined {
  let best: Employee | undefined;
  let bestScore = Number.NEGATIVE_INFINITY;
  const requiredPost = machineOperatorPost(task);

  for (const employee of world.employees) {
    if (employeeBlockReason(employee, world)) continue;

    const skill = task.requiredSkill ? employee.skills[task.requiredSkill] ?? 0 : 1;
    if (task.requiredSkill && skill <= 0) continue;
    if (requiredPost && employee.assignedPost !== requiredPost) continue;

    const score = scoreEmployeeForTask(employee, task, world);
    if (score > bestScore) {
      best = employee;
      bestScore = score;
    }
  }

  return best;
}

/** Machine posts require a dedicated operator; other work stays open to any qualified staff. */
function machineOperatorPost(task: Task): 'cutter' | 'bench' | undefined {
  const post = postForTask(task);
  return post === 'cutter' || post === 'bench' ? post : undefined;
}

function postTitle(post: 'cutter' | 'bench'): string {
  return post === 'cutter' ? 'резак' : 'сборка';
}

function updateEmployee(world: WorldState, employee: Employee, scaledDelta: number): void {
  if (!employee.currentTaskId) {
    return;
  }

  const task = world.tasks.find((item) => item.id === employee.currentTaskId);
  if (!task || task.state === 'completed' || task.state === 'failed') {
    releaseEmployee(employee);
    return;
  }

  const equipmentBlock = getEquipmentBlock(world, task);
  if (equipmentBlock) {
    blockTask(task, equipmentBlock);
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
    applyActivityFatigue(employee, 'working', scaledDelta);
    employee.workRemaining -= scaledDelta;

    if (employee.workRemaining <= 0) {
      completeTask(world, employee, task);
    }
  }
}

function moveEmployee(world: WorldState, employee: Employee, scaledDelta: number): void {
  employee.status = 'moving';
  employee.moveProgress += scaledDelta;
  applyActivityFatigue(employee, 'moving', scaledDelta);

  while (employee.moveProgress >= MOVE_STEP_SECONDS && employee.path.length > 0) {
    employee.position = employee.path.shift()!;
    employee.moveProgress -= MOVE_STEP_SECONDS;
  }
}

function startWork(employee: Employee, task: Task): void {
  employee.taskPhase = 'work';
  employee.status = 'working';
  employee.workRemaining = task.duration / computeWorkSpeed(employee, task);
}

function completeTask(world: WorldState, employee: Employee, task: Task): void {
  const rule = PRODUCTION_TASKS.find((item) => item.type === task.type);
  if (!rule) {
    task.state = 'failed';
    addLog(world, `${task.title}: нет производственного правила.`);
    releaseEmployee(employee);
    return;
  }

  const resultMessage = rule.complete(world, employee);
  task.state = 'completed';
  grantSkillXp(world, employee, task.requiredSkill, Math.max(8, Math.round(task.duration * 4)));
  employee.morale = Math.min(100, employee.morale + 1.5);
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

function blockTask(task: Task, reason: string): void {
  task.state = 'blocked';
  task.assignedEmployeeId = undefined;
  task.blockedReason = reason;
}

function getEquipmentBlock(world: WorldState, task: Task): string | undefined {
  if (task.type === 'cut-steel') {
    const cutter = getMachine(world, 'cutter');
    return cutter.operational ? undefined : `${cutter.name} неисправен`;
  }

  if (task.type === 'repair-machine') {
    return repairBlockedReason(world);
  }

  if (task.type === 'service-machine') {
    return serviceBlockedReason(world);
  }

  return undefined;
}

function countPotentialProducts(world: WorldState): number {
  const inventory = world.inventory;
  return inventory.steelSheet + inventory.steelAtCutter + inventory.cutBlank + inventory.blankAtBench +
    inventory.assembledAtBench + inventory.inspectedProduct + inventory.defectiveProduct;
}

export function getProductionIssues(world: WorldState): ProductionIssue[] {
  if (world.order.status === 'completed') return [];
  if (world.order.status === 'failed') return [{ code: 'deadline', message: 'Срок заказа сорван' }];

  const issues: ProductionIssue[] = [];
  const remaining = world.order.targetProducts - world.order.completedProducts;
  const missingMaterials = Math.max(0, remaining - countPotentialProducts(world));
  if (missingMaterials > 0) {
    issues.push({ code: 'materials', message: `Не хватает листовой стали: минимум ${missingMaterials} шт.` });
  }

  const cutter = getMachine(world, 'cutter');
  if (!cutter.operational) {
    issues.push({ code: 'machine', message: `${cutter.name} неисправен` });
    if (world.inventory.spareParts < 1) {
      issues.push({ code: 'parts', message: 'Нет запчастей для ремонта Р-17' });
    }
  } else if (cutter.condition <= 55 && world.inventory.spareParts < 1) {
    issues.push({ code: 'parts', message: 'Нет запчастей для обслуживания Р-17' });
  }

  if (!world.employees.some((employee) => employee.assignedPost === 'cutter')) {
    issues.push({ code: 'specialist', message: 'Нет оператора на посту резки' });
  }
  if (!world.employees.some((employee) => employee.assignedPost === 'bench')) {
    issues.push({ code: 'specialist', message: 'Нет оператора на посту сборки' });
  }

  if (world.reputation < 35) {
    issues.push({ code: 'quality', message: `Репутация качества низкая (${Math.round(world.reputation)})` });
  }

  if (world.inventory.defectiveProduct > 0) {
    issues.push({ code: 'quality', message: `На ОТК брак: ${world.inventory.defectiveProduct} шт.` });
  }

  const resting = world.employees.filter((item) => item.availability === 'resting').length;
  const sick = world.employees.filter((item) => item.availability === 'sick' || item.availability === 'absent').length;
  const offShift = world.employees.filter((item) => employeeBlockReason(item, world) === 'Вне смены').length;
  if (sick > 0) issues.push({ code: 'absence', message: `На больничном / отсутствует: ${sick}` });
  if (resting > 0 && world.tasks.some((task) => task.state === 'queued' || task.state === 'blocked')) {
    issues.push({ code: 'fatigue', message: `Отдыхают и не берут наряды: ${resting}` });
  }
  if (offShift > 0 && currentShiftPeriod(world) === 'night') {
    issues.push({ code: 'shift', message: `Ночная смена: дневной персонал вне работы (${offShift})` });
  }

  for (const task of world.tasks.filter((item) => item.state === 'blocked' || (item.state === 'queued' && item.blockedReason))) {
    if (task.blockedReason?.includes('неисправен')) continue;
    const reason = task.blockedReason ?? '';
    let code: ProductionIssue['code'] = 'specialist';
    if (reason.includes('проход')) code = 'route';
    else if (reason.includes('смен')) code = 'shift';
    else if (reason.includes('больнич') || reason.includes('Отсутствует')) code = 'absence';
    else if (reason.includes('отдых') || reason.includes('сил') || reason.includes('предел')) code = 'fatigue';
    else if (reason.includes('запчаст')) code = 'parts';
    if (!issues.some((issue) => issue.code === code && issue.message.includes(task.title))) {
      issues.push({ code, message: `${task.title}: ${reason || 'работа заблокирована'}` });
    }
  }
  return issues;
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
