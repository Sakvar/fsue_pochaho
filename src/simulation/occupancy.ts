import type { Facility, Machine, Position, Size, WorldState } from './types';

export function footprintCells(position: Position, size: Size): Position[] {
  const cells: Position[] = [];
  for (let y = 0; y < size.height; y += 1) {
    for (let x = 0; x < size.width; x += 1) {
      cells.push({ x: position.x + x, y: position.y + y });
    }
  }
  return cells;
}

export function occupiesCell(position: Position, size: Size, cell: Position): boolean {
  return (
    cell.x >= position.x &&
    cell.y >= position.y &&
    cell.x < position.x + size.width &&
    cell.y < position.y + size.height
  );
}

export function facilityAccess(facility: Facility): Position {
  return facility.position;
}

export function machineAt(world: WorldState, cell: Position): Machine | undefined {
  return world.machines.find((machine) => occupiesCell(machine.position, machine.size, cell));
}

export function facilityAt(
  world: WorldState,
  cell: Position,
): { key: keyof WorldState['facilities']; facility: Facility } | undefined {
  for (const [key, facility] of Object.entries(world.facilities) as Array<
    [keyof WorldState['facilities'], Facility]
  >) {
    if (occupiesCell(facility.position, facility.size, cell)) {
      return { key, facility };
    }
  }
  return undefined;
}

/** Solid objects block movement (machines and multi-cell props). */
export function isBlockedByObject(world: WorldState, cell: Position): boolean {
  if (world.machines.some((machine) => occupiesCell(machine.position, machine.size, cell))) {
    return true;
  }

  for (const facility of Object.values(world.facilities)) {
    if (facility.size.width * facility.size.height <= 1) continue;
    if (occupiesCell(facility.position, facility.size, cell)) return true;
  }

  return false;
}

export function isOccupied(world: WorldState, cell: Position): boolean {
  if (world.employees.some((employee) => employee.position.x === cell.x && employee.position.y === cell.y)) {
    return true;
  }
  if (world.machines.some((machine) => occupiesCell(machine.position, machine.size, cell))) return true;
  return Object.values(world.facilities).some((facility) =>
    occupiesCell(facility.position, facility.size, cell),
  );
}

export function formatSize(size: Size): string {
  return `${size.width}×${size.height}`;
}
