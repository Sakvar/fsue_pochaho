import { FACILITY_SIZES, MACHINE_SIZES } from '../content/catalog';
import { CANDIDATE_POOL } from '../content/candidates';
import { CONTRACT_TEMPLATES, STARTING_FUNDS } from '../content/contracts';
import { idleOrder, makeOffer } from './contracts';
import { roomForPosition } from './mapEditing';
import type { Employee, Machine, Tile, WorldState } from './types';

function createTiles(width: number, height: number): Tile[] {
  const tiles: Tile[] = [];

  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      const isOuterWall = x === 0 || y === 0 || x === width - 1 || y === height - 1;
      const isVerticalDoor = x === 10 && (y === 9 || y === 10);
      const isHorizontalDoor = y === 6 && x === 18;
      const isVerticalWall = x === 10 && !isVerticalDoor;
      const isHorizontalWall = y === 6 && x > 10 && x < width - 1 && !isHorizontalDoor;
      const isWall = isOuterWall || isVerticalWall || isHorizontalWall;

      let kind: Tile['kind'] = 'floor';
      let doorOpen: boolean | undefined;
      if (isWall) kind = 'wall';
      else if (isVerticalDoor || isHorizontalDoor) {
        kind = 'door';
        doorOpen = true;
      }

      tiles.push({
        kind,
        room: roomForPosition({ x, y }),
        zone: 'none',
        doorOpen,
      });
    }
  }

  return tiles;
}

function employee(partial: Omit<Employee, 'stress' | 'health' | 'availability' | 'status' | 'path' | 'moveProgress' | 'workRemaining'> & Partial<Employee>): Employee {
  return {
    stress: 18,
    health: 100,
    availability: 'available',
    status: 'idle',
    path: [],
    moveProgress: 0,
    workRemaining: 0,
    ...partial,
  };
}

export function createInitialWorld(): WorldState {
  const width = 30;
  const height = 20;

  const employees: Employee[] = [
    employee({
      id: 'emp-boris',
      name: 'Борис',
      role: 'кладовщик',
      position: { x: 5, y: 8 },
      skills: { logistics: 4 },
      salary: 16,
      energy: 92,
      morale: 62,
      stress: 22,
      shiftId: 'day',
      traits: ['tireless'],
      assignedPost: 'logistics',
    }),
    employee({
      id: 'emp-nina',
      name: 'Нина',
      role: 'станочник',
      position: { x: 15, y: 9 },
      skills: { machining: 5, logistics: 1 },
      salary: 20,
      energy: 88,
      morale: 70,
      stress: 20,
      shiftId: 'day',
      traits: [],
      assignedPost: 'cutter',
    }),
    employee({
      id: 'emp-vera',
      name: 'Вера',
      role: 'сборщик',
      position: { x: 24, y: 13 },
      skills: { assembly: 5, logistics: 1 },
      salary: 18,
      energy: 90,
      morale: 66,
      stress: 16,
      shiftId: 'day',
      traits: [],
      assignedPost: 'bench',
    }),
    employee({
      id: 'emp-ivan',
      name: 'Иван Петрович',
      role: 'главный механик',
      position: { x: 19, y: 4 },
      skills: { mechanics: 5, logistics: 2, machining: 2 },
      salary: 24,
      energy: 80,
      morale: 74,
      stress: 28,
      shiftId: 'day',
      traits: ['old-timer', 'old-hand'],
      assignedPost: 'none',
    }),
    employee({
      id: 'emp-galina',
      name: 'Галина',
      role: 'начальник ОТК',
      position: { x: 25, y: 16 },
      skills: { quality: 5, assembly: 2, logistics: 2 },
      salary: 22,
      energy: 85,
      morale: 58,
      stress: 34,
      shiftId: 'day',
      traits: ['strict', 'nervous'],
      assignedPost: 'quality',
    }),
  ];

  const machines: Machine[] = [
    {
      id: 'machine-cutter',
      name: 'Р-17 «Ветеран»',
      kind: 'cutter',
      position: { x: 14, y: 10 },
      size: { ...MACHINE_SIZES.cutter },
      condition: 76,
      operational: true,
      hoursSinceService: 40,
      wearMod: 1,
      serviceLog: [{ day: 1, kind: 'service', note: 'Последнее ТО по журналу (бумага помнит)', partsUsed: 1 }],
    },
    {
      id: 'machine-bench',
      name: 'Верстак сборочный №2',
      kind: 'bench',
      position: { x: 22, y: 12 },
      size: { ...MACHINE_SIZES.bench },
      condition: 92,
      operational: true,
      hoursSinceService: 12,
      wearMod: 1,
      serviceLog: [],
    },
    {
      id: 'machine-press',
      name: 'Пресс списанный, но нужный',
      kind: 'old-press',
      position: { x: 16, y: 2 },
      size: { ...MACHINE_SIZES['old-press'] },
      condition: 18,
      operational: false,
      hoursSinceService: 200,
      wearMod: 1,
      serviceLog: [{ day: 1, kind: 'repair', note: 'Ремонт отклонён снабжением', partsUsed: 0 }],
    },
  ];

  return {
    width,
    height,
    tiles: createTiles(width, height),
    mapVersion: 0,
    facilities: {
      steelStockpile: { position: { x: 3, y: 10 }, size: { ...FACILITY_SIZES.steelStockpile } },
      cutter: { position: { x: 15, y: 12 }, size: { ...FACILITY_SIZES.cutter } },
      bench: { position: { x: 23, y: 13 }, size: { ...FACILITY_SIZES.bench } },
      qualityDesk: { position: { x: 24, y: 15 }, size: { ...FACILITY_SIZES.qualityDesk } },
      finishedStockpile: { position: { x: 26, y: 15 }, size: { ...FACILITY_SIZES.finishedStockpile } },
    },
    employees,
    hirePool: CANDIDATE_POOL.slice(0, 4).map((item) => ({
      ...item,
      skills: { ...item.skills },
      traits: [...item.traits],
    })),
    machines,
    tasks: [],
    inventory: {
      steelSheet: 8,
      steelAtCutter: 0,
      cutBlank: 0,
      blankAtBench: 0,
      assembledAtBench: 0,
      inspectedProduct: 0,
      defectiveProduct: 0,
      product: 0,
      spareParts: 3,
      scrap: 0,
    },
    qualityQueues: {
      cutBlank: [],
      blankAtBench: [],
      assembledAtBench: [],
      inspectedProduct: [],
    },
    funds: STARTING_FUNDS,
    contracts: CONTRACT_TEMPLATES.slice(0, 3).map((template, index) => makeOffer(template, index)),
    order: idleOrder(),
    qualityChecks: 0,
    reputation: 58,
    shippedHiddenDefects: 0,
    preferScrap: false,
    rngState: 20260710,
    schedule: {
      dayStartMinute: 8 * 60,
      dayEndMinute: 20 * 60,
    },
    lastPeopleDay: 1,
    nextEmployeeId: 100,
    nextContractOffer: 3,
    timeMinutes: 8 * 60,
    speed: 1,
    paused: false,
    nextTaskId: 1,
    log: ['На столе три контракта. Без принятого заказа цех стоит.'],
  };
}
