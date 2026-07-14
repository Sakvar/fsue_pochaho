import { CUTTER_UPGRADE_COST, SPARE_PART_UNIT_COST } from '../content/contracts';
import type { Employee, WorldState } from './types';

const DAY_MINUTES = 24 * 60;

export function orderSpareParts(world: WorldState, amount = 2): boolean {
  const cost = amount * SPARE_PART_UNIT_COST;
  if (world.funds < cost) {
    addEconomyLog(world, `Запчасти не выданы: нужно ${cost}, в кассе ${Math.round(world.funds)}.`);
    return false;
  }

  world.funds -= cost;
  world.inventory.spareParts += amount;
  addEconomyLog(world, `Закуплены запчасти: +${amount} (−${cost}). Всего ${world.inventory.spareParts}. Бюджет: ${Math.round(world.funds)}.`);
  return true;
}

export function upgradeCutterReliability(world: WorldState): boolean {
  const cutter = world.machines.find((machine) => machine.kind === 'cutter');
  if (!cutter) return false;
  if (cutter.upgraded) {
    addEconomyLog(world, 'Р-17 уже прошёл модернизацию надёжности.');
    return false;
  }
  if (world.funds < CUTTER_UPGRADE_COST) {
    addEconomyLog(world, `Модернизация Р-17 недоступна: нужно ${CUTTER_UPGRADE_COST}.`);
    return false;
  }

  world.funds -= CUTTER_UPGRADE_COST;
  cutter.upgraded = true;
  cutter.wearMod = 0.55;
  cutter.condition = Math.min(100, cutter.condition + 15);
  if (cutter.condition > 20) cutter.operational = true;
  addEconomyLog(world, `Модернизация Р-17: износ снижен (−${CUTTER_UPGRADE_COST}). Бюджет: ${Math.round(world.funds)}.`);
  return true;
}

/** Daily payroll + archetype reactions. Called once per calendar day. */
export function processDailyPayroll(world: WorldState): void {
  const total = world.employees.reduce((sum, employee) => sum + employee.salary, 0);
  if (total <= 0) return;

  if (world.funds >= total) {
    world.funds -= total;
    addEconomyLog(world, `Зарплата выплачена: −${total}. Бюджет: ${Math.round(world.funds)}.`);
    for (const employee of world.employees) {
      employee.morale = Math.min(100, employee.morale + 1);
    }
  } else {
    const paid = world.funds;
    world.funds = 0;
    addEconomyLog(world, `Касса пуста: выплачено ${paid} из ${total}. Коллектив недоволен.`);
    for (const employee of world.employees) {
      const young = employee.traits.includes('young-specialist');
      employee.morale = Math.max(0, employee.morale - (young ? 22 : 12));
      employee.stress = Math.min(100, employee.stress + (young ? 14 : 8));
    }
  }

  updateArchetypeBehaviors(world);
}

export function updateArchetypeBehaviors(world: WorldState): void {
  const broken = world.machines.some((machine) => machine.kind === 'cutter' && !machine.operational);

  for (const employee of [...world.employees]) {
    if (employee.traits.includes('young-specialist')) {
      tickYoungSpecialist(world, employee, broken);
    }
  }
}

function tickYoungSpecialist(world: WorldState, employee: Employee, brokenMachine: boolean): void {
  if (brokenMachine) {
    employee.morale = Math.max(0, employee.morale - 6);
    employee.stress = Math.min(100, employee.stress + 4);
  }

  if (employee.morale < 40) {
    addEconomyLog(world, `${employee.name}: «Здесь всё не так, как учили».`);
    for (const other of world.employees) {
      if (other.id === employee.id) continue;
      other.stress = Math.min(100, other.stress + 3);
    }
  }

  if (employee.morale < 22 && employee.availability !== 'absent') {
    const roll = hashDayEmployee(Math.floor(world.timeMinutes / DAY_MINUTES) + 1, employee.id) % 100;
    if (roll < 55) {
      quitEmployee(world, employee);
    } else {
      employee.availability = 'absent';
      employee.currentTaskId = undefined;
      employee.path = [];
      employee.status = 'idle';
      addEconomyLog(world, `${employee.name} не вышел(ла): «переосмысливаю карьеру».`);
    }
  }
}

function quitEmployee(world: WorldState, employee: Employee): void {
  if (employee.currentTaskId) {
    const task = world.tasks.find((item) => item.id === employee.currentTaskId);
    if (task && !['completed', 'failed'].includes(task.state)) {
      task.state = 'queued';
      task.assignedEmployeeId = undefined;
      task.blockedReason = undefined;
    }
  }

  world.employees = world.employees.filter((item) => item.id !== employee.id);
  addEconomyLog(world, `${employee.name} уволился(ась) с формулировкой «условия труда».`);
}

function hashDayEmployee(day: number, employeeId: string): number {
  let hash = day * 17;
  for (let i = 0; i < employeeId.length; i += 1) {
    hash = (hash * 31 + employeeId.charCodeAt(i)) % 10007;
  }
  return hash;
}

function addEconomyLog(world: WorldState, message: string): void {
  const day = Math.floor(world.timeMinutes / DAY_MINUTES) + 1;
  const minutes = Math.floor(world.timeMinutes % DAY_MINUTES);
  const hours = Math.floor(minutes / 60).toString().padStart(2, '0');
  const rest = (minutes % 60).toString().padStart(2, '0');
  world.log.unshift(`[День ${day}, ${hours}:${rest}] ${message}`);
  world.log = world.log.slice(0, 12);
}
