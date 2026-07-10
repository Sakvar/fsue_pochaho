import type { FacilityPositions, Inventory, Skill, TaskType, WorldState } from '../simulation/types';

type InventoryKey = keyof Inventory;
type FacilityKey = keyof FacilityPositions;

export interface TaskRule {
  type: TaskType;
  title: string;
  source: FacilityKey;
  destination?: FacilityKey;
  requiredSkill?: Skill;
  duration: number;
  priority: number;
  canStart: (world: WorldState) => boolean;
  complete: (world: WorldState) => string | undefined | void;
}

function moveInventory(world: WorldState, from: InventoryKey, to: InventoryKey): void {
  world.inventory[from] -= 1;
  world.inventory[to] += 1;
}

export const PRODUCTION_TASKS: TaskRule[] = [
  {
    type: 'repair-machine',
    title: 'Ремонт станка',
    source: 'cutter',
    requiredSkill: 'mechanics',
    duration: 12,
    priority: 100,
    canStart: (world) => world.order.status === 'active' && !world.machines.some((machine) => machine.kind === 'cutter' && machine.operational),
    complete: (world) => {
      const cutter = world.machines.find((machine) => machine.kind === 'cutter');
      if (!cutter) return undefined;
      cutter.condition = Math.min(100, cutter.condition + 65);
      cutter.operational = true;
      return 'Р-17 снова числится работоспособным.';
    },
  },
  {
    type: 'deliver-product',
    title: 'Сдать корпус на склад',
    source: 'qualityDesk',
    destination: 'finishedStockpile',
    requiredSkill: 'logistics',
    duration: 2,
    priority: 65,
    canStart: (world) => world.order.status === 'active' && world.order.completedProducts < world.order.targetProducts && world.inventory.inspectedProduct > 0,
    complete: (world) => {
      world.inventory.inspectedProduct -= 1;
      world.inventory.product += 1;
      world.order.completedProducts += 1;
      return undefined;
    },
  },
  {
    type: 'cut-steel',
    title: 'Нарезать заготовку',
    source: 'cutter',
    requiredSkill: 'machining',
    duration: 8,
    priority: 60,
    canStart: (world) =>
      world.order.status === 'active' &&
      world.order.completedProducts < world.order.targetProducts &&
      world.inventory.steelAtCutter > 0 &&
      world.machines.some((machine) => machine.kind === 'cutter' && machine.operational),
    complete: (world) => {
      const cutter = world.machines.find((machine) => machine.kind === 'cutter');
      world.inventory.steelAtCutter -= 1;
      world.inventory.cutBlank += 1;
      if (cutter) cutter.condition = Math.max(0, cutter.condition - 9);
      return undefined;
    },
  },
  {
    type: 'assemble-product',
    title: 'Собрать корпус',
    source: 'bench',
    requiredSkill: 'assembly',
    duration: 10,
    priority: 55,
    canStart: (world) => world.order.status === 'active' && world.order.completedProducts < world.order.targetProducts && world.inventory.blankAtBench > 0,
    complete: (world) => moveInventory(world, 'blankAtBench', 'assembledAtBench'),
  },
  {
    type: 'inspect-product',
    title: 'Проверить корпус ОТК',
    source: 'bench',
    destination: 'qualityDesk',
    requiredSkill: 'quality',
    duration: 6,
    priority: 52,
    canStart: (world) => world.order.status === 'active' && world.order.completedProducts < world.order.targetProducts && world.inventory.assembledAtBench > 0,
    complete: (world) => {
      world.inventory.assembledAtBench -= 1;
      world.qualityChecks += 1;

      if (world.qualityChecks % 4 === 0) {
        world.inventory.defectiveProduct += 1;
        return 'ОТК завернул корпус: нужна переделка.';
      }

      world.inventory.inspectedProduct += 1;
      return 'ОТК принял корпус.';
    },
  },
  {
    type: 'haul-steel',
    title: 'Принести листовой металл',
    source: 'steelStockpile',
    destination: 'cutter',
    requiredSkill: 'logistics',
    duration: 2.5,
    priority: 50,
    canStart: (world) =>
      world.order.status === 'active' &&
      world.order.completedProducts < world.order.targetProducts &&
      world.inventory.steelSheet > 0 &&
      world.inventory.steelAtCutter < 1,
    complete: (world) => moveInventory(world, 'steelSheet', 'steelAtCutter'),
  },
  {
    type: 'haul-blank',
    title: 'Передать заготовку в сборку',
    source: 'cutter',
    destination: 'bench',
    requiredSkill: 'logistics',
    duration: 2.5,
    priority: 45,
    canStart: (world) => world.order.status === 'active' && world.order.completedProducts < world.order.targetProducts && world.inventory.cutBlank > 0 && world.inventory.blankAtBench < 1,
    complete: (world) => moveInventory(world, 'cutBlank', 'blankAtBench'),
  },
  {
    type: 'rework-product',
    title: 'Переделать корпус',
    source: 'qualityDesk',
    destination: 'bench',
    requiredSkill: 'assembly',
    duration: 8,
    priority: 58,
    canStart: (world) => world.order.status === 'active' && world.order.completedProducts < world.order.targetProducts && world.inventory.defectiveProduct > 0,
    complete: (world) => {
      world.inventory.defectiveProduct -= 1;
      world.inventory.assembledAtBench += 1;
      return 'Переделанный корпус вернулся на ОТК.';
    },
  },
];

export const TASK_LABELS = Object.fromEntries(PRODUCTION_TASKS.map((task) => [task.type, task.title])) as Record<TaskType, string>;
