import type { Employee, Machine, Tile, WorldState } from './types';

function createTiles(width: number, height: number): Tile[] {
  const tiles: Tile[] = [];

  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      const isOuterWall = x === 0 || y === 0 || x === width - 1 || y === height - 1;
      const isVerticalWall = x === 10 && y !== 9 && y !== 10;
      const isHorizontalWall = y === 6 && x > 10 && x < width - 1 && x !== 18;
      const isWall = isOuterWall || isVerticalWall || isHorizontalWall;

      let room: Tile['room'] = 'corridor';
      if (x < 10) room = 'warehouse';
      if (x > 10 && y < 6) room = 'admin';
      if (x > 10 && y >= 6 && x < 20) room = 'cutting';
      if (x >= 20 && y >= 6) room = 'assembly';

      tiles.push({ kind: isWall ? 'wall' : 'floor', room });
    }
  }

  return tiles;
}

export function createInitialWorld(): WorldState {
  const width = 30;
  const height = 20;

  const employees: Employee[] = [
    {
      id: 'emp-boris',
      name: 'Борис',
      role: 'кладовщик',
      position: { x: 4, y: 9 },
      skills: { logistics: 4 },
      energy: 92,
      morale: 62,
      status: 'idle',
      path: [],
      moveProgress: 0,
      workRemaining: 0,
    },
    {
      id: 'emp-nina',
      name: 'Нина',
      role: 'станочник',
      position: { x: 15, y: 9 },
      skills: { machining: 5, logistics: 1 },
      energy: 88,
      morale: 70,
      status: 'idle',
      path: [],
      moveProgress: 0,
      workRemaining: 0,
    },
    {
      id: 'emp-vera',
      name: 'Вера',
      role: 'сборщик',
      position: { x: 23, y: 12 },
      skills: { assembly: 5, logistics: 1 },
      energy: 90,
      morale: 66,
      status: 'idle',
      path: [],
      moveProgress: 0,
      workRemaining: 0,
    },
    {
      id: 'emp-ivan',
      name: 'Иван Петрович',
      role: 'главный механик',
      position: { x: 17, y: 4 },
      skills: { mechanics: 5, logistics: 2, machining: 2 },
      energy: 80,
      morale: 74,
      status: 'idle',
      path: [],
      moveProgress: 0,
      workRemaining: 0,
    },
    {
      id: 'emp-galina',
      name: 'Галина',
      role: 'начальник ОТК',
      position: { x: 25, y: 15 },
      skills: { assembly: 2, logistics: 2 },
      energy: 85,
      morale: 58,
      status: 'idle',
      path: [],
      moveProgress: 0,
      workRemaining: 0,
    },
  ];

  const machines: Machine[] = [
    {
      id: 'machine-cutter',
      name: 'Р-17 «Ветеран»',
      kind: 'cutter',
      position: { x: 15, y: 11 },
      condition: 76,
      operational: true,
    },
    {
      id: 'machine-bench',
      name: 'Верстак сборочный №2',
      kind: 'bench',
      position: { x: 23, y: 12 },
      condition: 92,
      operational: true,
    },
    {
      id: 'machine-press',
      name: 'Пресс списанный, но нужный',
      kind: 'old-press',
      position: { x: 17, y: 3 },
      condition: 18,
      operational: false,
    },
  ];

  return {
    width,
    height,
    tiles: createTiles(width, height),
    facilities: {
      steelStockpile: { x: 4, y: 10 },
      cutter: { x: 15, y: 11 },
      bench: { x: 23, y: 12 },
      finishedStockpile: { x: 27, y: 16 },
    },
    employees,
    machines,
    tasks: [],
    inventory: {
      steelSheet: 8,
      steelAtCutter: 0,
      cutBlank: 0,
      blankAtBench: 0,
      assembledAtBench: 0,
      product: 0,
    },
    order: {
      targetProducts: 3,
      completedProducts: 0,
      dueDay: 30,
    },
    timeMinutes: 8 * 60,
    speed: 1,
    paused: false,
    nextTaskId: 1,
    log: ['Получен заказ: изготовить 3 корпуса за 30 дней.'],
  };
}
