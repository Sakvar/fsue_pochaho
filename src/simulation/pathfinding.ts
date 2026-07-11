import type { Position, WorldState } from './types';

const NEIGHBORS: Position[] = [
  { x: 1, y: 0 },
  { x: -1, y: 0 },
  { x: 0, y: 1 },
  { x: 0, y: -1 },
];

export function samePosition(a: Position, b: Position): boolean {
  return a.x === b.x && a.y === b.y;
}

export function positionKey(position: Position): string {
  return `${position.x},${position.y}`;
}

export function isInside(world: WorldState, position: Position): boolean {
  return position.x >= 0 && position.y >= 0 && position.x < world.width && position.y < world.height;
}

export function tileAt(world: WorldState, position: Position) {
  return world.tiles[position.y * world.width + position.x];
}

export function isPassable(world: WorldState, position: Position): boolean {
  if (!isInside(world, position)) return false;

  const tile = tileAt(world, position);
  if (tile.kind === 'wall') return false;
  if (tile.kind === 'door' && tile.doorOpen === false) return false;
  if (tile.zone === 'forbidden') return false;
  return true;
}

export function findPath(world: WorldState, start: Position, goal: Position): Position[] {
  if (samePosition(start, goal)) {
    return [];
  }

  const frontier: Position[] = [start];
  const cameFrom = new Map<string, Position | null>();
  cameFrom.set(positionKey(start), null);

  while (frontier.length > 0) {
    const current = frontier.shift()!;

    if (samePosition(current, goal)) {
      break;
    }

    for (const offset of NEIGHBORS) {
      const next = { x: current.x + offset.x, y: current.y + offset.y };
      const key = positionKey(next);

      if (!cameFrom.has(key) && isPassable(world, next)) {
        frontier.push(next);
        cameFrom.set(key, current);
      }
    }
  }

  if (!cameFrom.has(positionKey(goal))) {
    return [];
  }

  const path: Position[] = [];
  let current: Position | null = goal;

  while (current && !samePosition(current, start)) {
    path.unshift(current);
    current = cameFrom.get(positionKey(current)) ?? null;
  }

  return path;
}
