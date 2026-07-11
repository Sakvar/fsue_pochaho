import {
  applyMachineWear,
  canServiceMachine,
  needsRepair,
  recordService,
} from '../simulation/equipment';
import {
  adjustReputation,
  computeBlankQuality,
  computeDefectRisk,
  inspectProduct,
  moveBlankToBench,
  pushAssembled,
  pushCutBlank,
  pushInspected,
  takeAssembledRisk,
  takeBlankQuality,
  takeInspected,
} from '../simulation/quality';
import type { Employee, FacilityPositions, Inventory, Skill, TaskType, WorldState } from '../simulation/types';

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
  complete: (world: WorldState, employee: Employee) => string | undefined | void;
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
    canStart: (world) => world.order.status === 'active' && needsRepair(world, 'cutter'),
    complete: (world, employee) => {
      const cutter = world.machines.find((machine) => machine.kind === 'cutter');
      if (!cutter) return undefined;
      if (world.inventory.spareParts < 1) {
        return 'Ремонт сорван: на складе нет запчастей.';
      }

      world.inventory.spareParts -= 1;
      const skill = employee.skills.mechanics ?? 0;
      const restore = 50 + skill * 5;
      cutter.condition = Math.min(100, cutter.condition + restore);
      cutter.operational = cutter.condition > 20;
      recordService(world, cutter, 'repair', `${employee.name} восстановил Р-17`, 1);
      return 'Р-17 снова числится работоспособным. Запчасть списана.';
    },
  },
  {
    type: 'service-machine',
    title: 'Обслуживание Р-17',
    source: 'cutter',
    requiredSkill: 'mechanics',
    duration: 7,
    priority: 72,
    canStart: (world) => world.order.status === 'active' && canServiceMachine(world, 'cutter'),
    complete: (world, employee) => {
      const cutter = world.machines.find((machine) => machine.kind === 'cutter');
      if (!cutter || world.inventory.spareParts < 1) {
        return 'Обслуживание отложено: нет запчастей.';
      }

      world.inventory.spareParts -= 1;
      const skill = employee.skills.mechanics ?? 0;
      cutter.condition = Math.min(100, cutter.condition + 18 + skill * 2);
      cutter.operational = true;
      recordService(world, cutter, 'service', `${employee.name} провёл ТО`, 1);
      return 'Плановое обслуживание Р-17 выполнено.';
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
      const kind = takeInspected(world);
      if (kind === 'hidden') {
        world.shippedHiddenDefects += 1;
        adjustReputation(world, -8);
        return 'Скрытый дефект ушёл заказчику. Репутация качества падает.';
      }
      adjustReputation(world, 1.5);
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
    complete: (world, employee) => {
      const cutter = world.machines.find((machine) => machine.kind === 'cutter');
      world.inventory.steelAtCutter -= 1;
      world.inventory.cutBlank += 1;
      if (cutter) {
        const quality = computeBlankQuality(employee, cutter);
        pushCutBlank(world, quality);
        applyMachineWear(cutter, 9);
      } else {
        pushCutBlank(world, 0.5);
      }
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
    complete: (world, employee) => {
      const blankQuality = takeBlankQuality(world);
      const bench = world.machines.find((machine) => machine.kind === 'bench');
      const risk = computeDefectRisk(employee, blankQuality, bench?.condition ?? 80);
      moveInventory(world, 'blankAtBench', 'assembledAtBench');
      pushAssembled(world, risk);
      if (bench) applyMachineWear(bench, 2);
      return undefined;
    },
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
    complete: (world, employee) => {
      world.inventory.assembledAtBench -= 1;
      world.qualityChecks += 1;
      const risk = takeAssembledRisk(world);
      const outcome = inspectProduct(world, employee, risk);

      if (outcome === 'rejected') {
        world.inventory.defectiveProduct += 1;
        adjustReputation(world, -0.5);
        return 'ОТК завернул корпус: нужна переделка или списание.';
      }

      world.inventory.inspectedProduct += 1;
      if (outcome === 'missed') {
        pushInspected(world, 'hidden');
        return 'ОТК принял корпус. (Внутри что-то щёлкнуло.)';
      }

      pushInspected(world, 'good');
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
    complete: (world) => {
      moveInventory(world, 'cutBlank', 'blankAtBench');
      moveBlankToBench(world);
    },
  },
  {
    type: 'rework-product',
    title: 'Переделать корпус',
    source: 'qualityDesk',
    destination: 'bench',
    requiredSkill: 'assembly',
    duration: 8,
    priority: 58,
    canStart: (world) =>
      world.order.status === 'active' &&
      world.order.completedProducts < world.order.targetProducts &&
      world.inventory.defectiveProduct > 0 &&
      !world.preferScrap,
    complete: (world, employee) => {
      world.inventory.defectiveProduct -= 1;
      world.inventory.assembledAtBench += 1;
      const skill = employee.skills.assembly ?? 0;
      const risk = clamp(0.12 + (5 - skill) * 0.04 + ((100 - employee.energy) / 100) * 0.1, 0.05, 0.55);
      pushAssembled(world, risk);
      return 'Переделанный корпус вернулся на ОТК.';
    },
  },
  {
    type: 'scrap-product',
    title: 'Списать брак',
    source: 'qualityDesk',
    requiredSkill: 'quality',
    duration: 4,
    priority: 70,
    canStart: (world) => world.order.status === 'active' && world.inventory.defectiveProduct > 0 && world.preferScrap,
    complete: (world) => {
      if (world.inventory.defectiveProduct < 1) return 'Списывать нечего: брак уже разобрали.';
      world.inventory.defectiveProduct -= 1;
      world.inventory.scrap += 1;
      adjustReputation(world, -1);
      if (world.inventory.defectiveProduct < 1) world.preferScrap = false;
      return 'Брак списан в металлолом. Материал потерян, зато честно.';
    },
  },
];

export const TASK_LABELS = Object.fromEntries(PRODUCTION_TASKS.map((task) => [task.type, task.title])) as Record<TaskType, string>;

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}
