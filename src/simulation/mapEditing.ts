import { findPath, isInside, samePosition, tileAt } from './pathfinding';
import type { Employee, Position, RoomId, Task, WorldState, ZoneKind } from './types';

export type MapEditResult = { ok: true } | { ok: false; reason: string };

export function placeWall(world: WorldState, position: Position): MapEditResult {
  const check = canEditStructure(world, position);
  if (!check.ok) return check;

  const tile = tileAt(world, position);
  if (tile.kind === 'wall') return { ok: false, reason: 'Здесь уже стена.' };

  tile.kind = 'wall';
  tile.doorOpen = undefined;
  tile.zone = 'none';
  finishMapEdit(world, `Возведена стена в клетке ${position.x}:${position.y}.`);
  return { ok: true };
}

export function removeStructure(world: WorldState, position: Position): MapEditResult {
  if (!isInside(world, position)) return { ok: false, reason: 'Клетка вне карты.' };
  if (isOuterBoundary(world, position)) return { ok: false, reason: 'Несущие стены корпуса сносить нельзя.' };

  const tile = tileAt(world, position);
  if (tile.kind === 'floor') return { ok: false, reason: 'Сносить нечего: здесь уже проход.' };

  tile.kind = 'floor';
  tile.doorOpen = undefined;
  finishMapEdit(world, `Демонтирована преграда в клетке ${position.x}:${position.y}.`);
  return { ok: true };
}

export function placeDoor(world: WorldState, position: Position, open = true): MapEditResult {
  const check = canEditStructure(world, position);
  if (!check.ok) return check;

  const tile = tileAt(world, position);
  tile.kind = 'door';
  tile.doorOpen = open;
  if (tile.zone === 'forbidden') tile.zone = 'none';
  finishMapEdit(world, `Установлена дверь в клетке ${position.x}:${position.y} (${open ? 'открыта' : 'закрыта'}).`);
  return { ok: true };
}

export function toggleDoor(world: WorldState, position: Position): MapEditResult {
  if (!isInside(world, position)) return { ok: false, reason: 'Клетка вне карты.' };

  const tile = tileAt(world, position);
  if (tile.kind !== 'door') return { ok: false, reason: 'Здесь нет двери.' };

  tile.doorOpen = !tile.doorOpen;
  finishMapEdit(world, `Дверь ${position.x}:${position.y} ${tile.doorOpen ? 'открыта' : 'закрыта'}.`);
  return { ok: true };
}

export function setTileZone(world: WorldState, position: Position, zone: ZoneKind): MapEditResult {
  if (!isInside(world, position)) return { ok: false, reason: 'Клетка вне карты.' };

  const tile = tileAt(world, position);
  if (tile.kind === 'wall') return { ok: false, reason: 'Зону нельзя назначить на стену.' };

  tile.zone = zone;
  finishMapEdit(
    world,
    zone === 'none'
      ? `Зона снята с клетки ${position.x}:${position.y}.`
      : `Клетка ${position.x}:${position.y} помечена как зона «${zoneLabel(zone)}».`,
  );
  return { ok: true };
}

export function rebuildRooms(world: WorldState): void {
  for (let y = 0; y < world.height; y += 1) {
    for (let x = 0; x < world.width; x += 1) {
      tileAt(world, { x, y }).room = roomForPosition({ x, y });
    }
  }
}

export function roomForPosition(position: Position): RoomId {
  const { x, y } = position;
  if (x < 10) return 'warehouse';
  if (x > 10 && y < 6) return 'admin';
  if (x > 10 && y >= 6 && x < 20) return 'cutting';
  if (x >= 20 && y >= 6) return 'assembly';
  return 'corridor';
}

export function invalidatePaths(world: WorldState): void {
  for (const employee of world.employees) {
    if (!employee.currentTaskId) continue;

    const task = world.tasks.find((item) => item.id === employee.currentTaskId);
    if (!task || task.state === 'completed' || task.state === 'failed') {
      releaseEmployee(employee);
      continue;
    }

    if (employee.taskPhase === 'work') continue;

    const goal = employee.taskPhase === 'to-destination' && task.destination ? task.destination : task.source;
    if (samePosition(employee.position, goal)) {
      employee.path = [];
      continue;
    }

    const path = findPath(world, employee.position, goal);
    if (path.length === 0) {
      blockTask(task, 'Нет прохода к месту выполнения');
      releaseEmployee(employee);
      continue;
    }

    employee.path = path;
    employee.moveProgress = 0;
  }
}

function finishMapEdit(world: WorldState, message: string): void {
  world.mapVersion += 1;
  rebuildRooms(world);
  invalidatePaths(world);
  appendLog(world, message);
}

function canEditStructure(world: WorldState, position: Position): MapEditResult {
  if (!isInside(world, position)) return { ok: false, reason: 'Клетка вне карты.' };
  if (isOuterBoundary(world, position)) return { ok: false, reason: 'Несущие стены корпуса менять нельзя.' };
  if (isOccupied(world, position)) return { ok: false, reason: 'Клетка занята оборудованием или сотрудником.' };
  return { ok: true };
}

function isOuterBoundary(world: WorldState, position: Position): boolean {
  return position.x === 0 || position.y === 0 || position.x === world.width - 1 || position.y === world.height - 1;
}

function isOccupied(world: WorldState, position: Position): boolean {
  if (world.employees.some((employee) => samePosition(employee.position, position))) return true;
  if (world.machines.some((machine) => samePosition(machine.position, position))) return true;
  return Object.values(world.facilities).some((facility) => samePosition(facility, position));
}

function blockTask(task: Task, reason: string): void {
  task.state = 'blocked';
  task.assignedEmployeeId = undefined;
  task.blockedReason = reason;
}

function releaseEmployee(employee: Employee): void {
  employee.currentTaskId = undefined;
  employee.taskPhase = undefined;
  employee.path = [];
  employee.status = 'idle';
  employee.workRemaining = 0;
}

function appendLog(world: WorldState, message: string): void {
  const day = Math.floor(world.timeMinutes / (24 * 60)) + 1;
  const minutes = Math.floor(world.timeMinutes % (24 * 60));
  const hours = Math.floor(minutes / 60).toString().padStart(2, '0');
  const rest = (minutes % 60).toString().padStart(2, '0');
  world.log.unshift(`[День ${day}, ${hours}:${rest}] ${message}`);
  world.log = world.log.slice(0, 12);
}

function zoneLabel(zone: ZoneKind): string {
  switch (zone) {
    case 'storage':
      return 'хранение';
    case 'work':
      return 'работа';
    case 'forbidden':
      return 'запретная';
    default:
      return 'нет';
  }
}
