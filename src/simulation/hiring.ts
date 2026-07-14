import { CANDIDATE_POOL } from '../content/candidates';
import { STAFF_SOFT_CAP } from '../content/contracts';
import { assignEmployeeToPost } from './people';
import type { Candidate, Employee, WorldState } from './types';

const DAY_MINUTES = 24 * 60;

export function hireCandidate(world: WorldState, candidateId: string): boolean {
  if (world.employees.length >= STAFF_SOFT_CAP) {
    addHireLog(world, `Штат заполнен (лимит ${STAFF_SOFT_CAP}).`);
    return false;
  }

  const index = world.hirePool.findIndex((item) => item.id === candidateId);
  if (index < 0) {
    addHireLog(world, 'Кандидат уже недоступен.');
    return false;
  }

  const candidate = world.hirePool[index];
  if (world.funds < candidate.hireCost) {
    addHireLog(world, `Не хватает средств на найм ${candidate.name} (нужно ${candidate.hireCost}).`);
    return false;
  }

  world.funds -= candidate.hireCost;
  world.hirePool.splice(index, 1);

  const employee = candidateToEmployee(world, candidate);
  world.employees.push(employee);
  if (candidate.preferredPost !== 'none') {
    assignEmployeeToPost(world, employee.id, candidate.preferredPost);
  }

  refillHirePool(world);
  addHireLog(world, `Нанят(а) ${candidate.name} (−${candidate.hireCost}). Оклад ${candidate.salary}/день. Бюджет: ${Math.round(world.funds)}.`);
  return true;
}

export function refillHirePool(world: WorldState, targetSize = 4): void {
  const usedNames = new Set([
    ...world.hirePool.map((item) => item.name),
    ...world.employees.map((item) => item.name),
  ]);

  while (world.hirePool.length < targetSize) {
    const next = CANDIDATE_POOL.find((item) => !usedNames.has(item.name));
    if (!next) break;
    usedNames.add(next.name);
    world.hirePool.push({ ...next, id: `cand-${world.nextEmployeeId}-${next.id}`, skills: { ...next.skills }, traits: [...next.traits] });
  }
}

export function candidateToEmployee(world: WorldState, candidate: Candidate): Employee {
  const id = `emp-${world.nextEmployeeId}`;
  world.nextEmployeeId += 1;
  return {
    id,
    name: candidate.name,
    role: candidate.role,
    position: { x: 12, y: 4 },
    skills: { ...candidate.skills },
    salary: candidate.salary,
    energy: 88,
    morale: 64,
    stress: 20,
    health: 100,
    shiftId: 'day',
    availability: 'available',
    traits: [...candidate.traits],
    assignedPost: 'none',
    status: 'idle',
    path: [],
    moveProgress: 0,
    workRemaining: 0,
  };
}

function addHireLog(world: WorldState, message: string): void {
  const day = Math.floor(world.timeMinutes / DAY_MINUTES) + 1;
  const minutes = Math.floor(world.timeMinutes % DAY_MINUTES);
  const hours = Math.floor(minutes / 60).toString().padStart(2, '0');
  const rest = (minutes % 60).toString().padStart(2, '0');
  world.log.unshift(`[День ${day}, ${hours}:${rest}] ${message}`);
  world.log = world.log.slice(0, 12);
}
