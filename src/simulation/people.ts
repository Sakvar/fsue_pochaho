import { TRAITS } from '../content/traits';
import type {
  Employee,
  ShiftId,
  Skill,
  Task,
  TraitId,
  WorkPost,
  WorldState,
} from './types';

const DAY_MINUTES = 24 * 60;
const XP_PER_LEVEL = 100;
const MAX_SKILL = 5;

export function minuteOfDay(world: WorldState): number {
  return Math.floor(world.timeMinutes % DAY_MINUTES);
}

export function isOnShift(employee: Employee, world: WorldState): boolean {
  if (employee.shiftId === 'off') return false;
  const minute = minuteOfDay(world);
  const inDay = minute >= world.schedule.dayStartMinute && minute < world.schedule.dayEndMinute;
  return employee.shiftId === 'day' ? inDay : !inDay;
}

export function currentShiftPeriod(world: WorldState): 'day' | 'night' {
  const minute = minuteOfDay(world);
  return minute >= world.schedule.dayStartMinute && minute < world.schedule.dayEndMinute ? 'day' : 'night';
}

export function postForTask(task: Task): WorkPost {
  switch (task.type) {
    case 'cut-steel':
      return 'cutter';
    case 'assemble-product':
    case 'rework-product':
      return 'bench';
    case 'inspect-product':
    case 'scrap-product':
      return 'quality';
    case 'haul-steel':
    case 'haul-blank':
    case 'deliver-product':
      return 'logistics';
    case 'repair-machine':
    case 'service-machine':
      return 'none';
    default:
      return 'none';
  }
}

export function computeWorkSpeed(employee: Employee, task: Task): number {
  const skill = task.requiredSkill ? employee.skills[task.requiredSkill] ?? 0 : 3;
  let speed = 0.7 + skill * 0.08;
  speed *= clamp(0.55 + employee.energy / 200, 0.55, 1.05);
  speed *= clamp(0.85 + employee.morale / 400, 0.85, 1.1);
  speed *= clamp(1.05 - employee.stress / 250, 0.65, 1.05);

  for (const trait of employee.traits) {
    speed *= TRAITS[trait].workSpeedMod;
  }

  return clamp(speed, 0.4, 1.45);
}

export function employeeBlockReason(employee: Employee, world: WorldState): string | undefined {
  if (employee.currentTaskId) return 'Занят';
  if (employee.availability === 'sick') return 'На больничном';
  if (employee.availability === 'absent') return 'Отсутствует';
  if (!isOnShift(employee, world)) return 'Вне смены';
  if (employee.availability === 'resting') return 'Отдыхает';
  if (employee.energy <= 5) return 'Нет сил';
  if (employee.stress >= 95) return 'На пределе, нужен отдых';
  return undefined;
}

export function scoreEmployeeForTask(employee: Employee, task: Task, world: WorldState): number {
  const skill = task.requiredSkill ? employee.skills[task.requiredSkill] ?? 0 : 1;
  const distance = Math.abs(employee.position.x - task.source.x) + Math.abs(employee.position.y - task.source.y);
  const postBonus = employee.assignedPost !== 'none' && employee.assignedPost === postForTask(task) ? 15 : 0;
  return skill * 10 + employee.energy * 0.05 + employee.morale * 0.02 - employee.stress * 0.03 + postBonus - distance;
}

export function updatePeopleSystems(world: WorldState, scaledDelta: number): void {
  recoverFromIllness(world);
  checkDailyIllness(world);

  for (const employee of world.employees) {
    if (employee.availability === 'sick' || employee.availability === 'absent') continue;
    if (employee.currentTaskId) continue;
    updateIdleEmployee(world, employee, scaledDelta);
  }
}

export function applyActivityFatigue(employee: Employee, activity: 'moving' | 'working', scaledDelta: number): void {
  const drainMod = traitProduct(employee.traits, 'energyDrainMod');
  const stressMod = traitProduct(employee.traits, 'stressGainMod');

  if (activity === 'working') {
    employee.energy = Math.max(0, employee.energy - scaledDelta * 0.08 * drainMod);
    employee.stress = Math.min(100, employee.stress + scaledDelta * 0.045 * stressMod);
    employee.morale = Math.max(0, employee.morale - scaledDelta * 0.01);
  } else {
    employee.energy = Math.max(0, employee.energy - scaledDelta * 0.03 * drainMod);
    employee.stress = Math.min(100, employee.stress + scaledDelta * 0.012 * stressMod);
  }
}

export function grantSkillXp(world: WorldState, employee: Employee, skill: Skill | undefined, amount: number): void {
  if (!skill || amount <= 0) return;

  const currentSkill = employee.skills[skill] ?? 0;
  if (currentSkill >= MAX_SKILL) return;

  const xp = (employee.skillXp[skill] ?? 0) + amount;
  if (xp < XP_PER_LEVEL) {
    employee.skillXp[skill] = xp;
    return;
  }

  employee.skills[skill] = currentSkill + 1;
  employee.skillXp[skill] = xp - XP_PER_LEVEL;
  employee.morale = Math.min(100, employee.morale + 4);
  addPeopleLog(world, `${employee.name} повысил(а) квалификацию: ${skillLabel(skill)} → ${employee.skills[skill]}.`);
}

export function setEmployeeShift(world: WorldState, employeeId: string, shiftId: ShiftId): boolean {
  const employee = world.employees.find((item) => item.id === employeeId);
  if (!employee) return false;

  employee.shiftId = shiftId;
  addPeopleLog(world, `${employee.name}: смена изменена на «${shiftLabel(shiftId)}».`);
  return true;
}

/** Max operators for a machine post; `undefined` means no hard limit. */
export function postCapacity(world: WorldState, post: WorkPost): number | undefined {
  if (post === 'cutter') {
    return Math.max(0, world.machines.filter((machine) => machine.kind === 'cutter').length);
  }
  if (post === 'bench') {
    return Math.max(0, world.machines.filter((machine) => machine.kind === 'bench').length);
  }
  return undefined;
}

export function countPostAssignees(world: WorldState, post: WorkPost, exceptEmployeeId?: string): number {
  return world.employees.filter(
    (employee) => employee.assignedPost === post && employee.id !== exceptEmployeeId,
  ).length;
}

export function assignEmployeeToPost(world: WorldState, employeeId: string, post: WorkPost): boolean {
  const employee = world.employees.find((item) => item.id === employeeId);
  if (!employee) return false;
  if (employee.assignedPost === post) return true;

  const capacity = postCapacity(world, post);
  if (capacity !== undefined) {
    const occupied = countPostAssignees(world, post, employeeId);
    if (occupied >= capacity) {
      addPeopleLog(
        world,
        `Пост «${postLabel(post)}» занят (${occupied}/${capacity}). Снимите текущего оператора.`,
      );
      return false;
    }
  }

  employee.assignedPost = post;
  addPeopleLog(world, `${employee.name}: назначение «${postLabel(post)}».`);
  return true;
}

export function sendEmployeeToRest(world: WorldState, employeeId: string): boolean {
  const employee = world.employees.find((item) => item.id === employeeId);
  if (!employee || employee.availability === 'sick') return false;

  if (employee.currentTaskId) {
    const task = world.tasks.find((item) => item.id === employee.currentTaskId);
    if (task && !['completed', 'failed'].includes(task.state)) {
      task.state = 'queued';
      task.assignedEmployeeId = undefined;
      task.blockedReason = undefined;
    }
    releaseEmployeeLocal(employee);
  }

  employee.availability = 'resting';
  employee.status = 'idle';
  addPeopleLog(world, `${employee.name} отправлен(а) на отдых директором.`);
  return true;
}

function updateIdleEmployee(world: WorldState, employee: Employee, scaledDelta: number): void {
  const needsRest = employee.energy < 22 || employee.stress >= 88 || employee.availability === 'resting' || !isOnShift(employee, world);

  if (needsRest) {
    employee.availability = 'resting';
    employee.status = 'idle';
    employee.energy = Math.min(100, employee.energy + scaledDelta * 0.15);
    employee.stress = Math.max(0, employee.stress - scaledDelta * 0.08);
    employee.morale = Math.min(100, employee.morale + scaledDelta * 0.02);
    employee.health = Math.min(100, employee.health + scaledDelta * 0.01);

    if (employee.energy >= 50 && employee.stress < 70 && isOnShift(employee, world)) {
      employee.availability = 'available';
    }
    return;
  }

  employee.availability = 'available';
  employee.status = 'idle';
  employee.energy = Math.min(100, employee.energy + scaledDelta * 0.04);
  employee.stress = Math.max(0, employee.stress - scaledDelta * 0.015);
  employee.morale = Math.min(100, employee.morale + scaledDelta * 0.005);
}

function recoverFromIllness(world: WorldState): void {
  for (const employee of world.employees) {
    if (employee.availability !== 'sick') continue;
    if (employee.sickUntilMinute !== undefined && world.timeMinutes < employee.sickUntilMinute) continue;

    employee.availability = 'available';
    employee.sickUntilMinute = undefined;
    employee.health = Math.min(100, employee.health + 15);
    employee.stress = Math.max(0, employee.stress - 10);
    addPeopleLog(world, `${employee.name} вышел(ла) с больничного.`);
  }
}

function checkDailyIllness(world: WorldState): void {
  const day = Math.floor(world.timeMinutes / DAY_MINUTES) + 1;
  if (day <= world.lastPeopleDay) return;
  world.lastPeopleDay = day;

  for (const employee of world.employees) {
    if (employee.availability === 'sick') continue;

    const risk = employee.stress * 0.35 + (100 - employee.energy) * 0.2 + (100 - employee.health) * 0.25;
    const chance = Math.min(35, Math.max(0, Math.floor(risk - 40)));
    if (chance <= 0) continue;

    const roll = hashDayEmployee(day, employee.id) % 100;
    if (roll >= chance) continue;

    makeSick(world, employee, 8 * 60);
  }
}

export function makeSick(world: WorldState, employee: Employee, durationMinutes: number): void {
  if (employee.currentTaskId) {
    const task = world.tasks.find((item) => item.id === employee.currentTaskId);
    if (task && !['completed', 'failed'].includes(task.state)) {
      task.state = 'queued';
      task.assignedEmployeeId = undefined;
      task.blockedReason = undefined;
    }
    releaseEmployeeLocal(employee);
  }

  employee.availability = 'sick';
  employee.sickUntilMinute = world.timeMinutes + durationMinutes;
  employee.health = Math.max(20, employee.health - 20);
  employee.status = 'idle';
  addPeopleLog(world, `${employee.name} не вышел(ла) на смену: справка.`);
}

function releaseEmployeeLocal(employee: Employee): void {
  employee.currentTaskId = undefined;
  employee.taskPhase = undefined;
  employee.path = [];
  employee.status = 'idle';
  employee.workRemaining = 0;
}

function traitProduct(traits: TraitId[], key: 'energyDrainMod' | 'stressGainMod'): number {
  return traits.reduce((product, trait) => product * TRAITS[trait][key], 1);
}

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

function hashDayEmployee(day: number, employeeId: string): number {
  let hash = day * 17;
  for (let i = 0; i < employeeId.length; i += 1) {
    hash = (hash * 31 + employeeId.charCodeAt(i)) % 10007;
  }
  return hash;
}

function skillLabel(skill: Skill): string {
  return {
    logistics: 'логистика',
    machining: 'станки',
    assembly: 'сборка',
    mechanics: 'механика',
    quality: 'ОТК',
  }[skill];
}

function shiftLabel(shiftId: ShiftId): string {
  return { day: 'дневная', night: 'ночная', off: 'выходной' }[shiftId];
}

function postLabel(post: WorkPost): string {
  return {
    none: 'без поста',
    cutter: 'резак',
    bench: 'сборка',
    quality: 'ОТК',
    logistics: 'логистика',
  }[post];
}

function addPeopleLog(world: WorldState, message: string): void {
  const day = Math.floor(world.timeMinutes / DAY_MINUTES) + 1;
  const minutes = Math.floor(world.timeMinutes % DAY_MINUTES);
  const hours = Math.floor(minutes / 60).toString().padStart(2, '0');
  const rest = (minutes % 60).toString().padStart(2, '0');
  world.log.unshift(`[День ${day}, ${hours}:${rest}] ${message}`);
  world.log = world.log.slice(0, 12);
}
