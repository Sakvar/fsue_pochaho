import type { Machine, TaskType } from '../simulation/types';

export const TASK_LABELS: Record<TaskType, string> = {
  'haul-steel': 'Принести листовой металл',
  'cut-steel': 'Нарезать заготовку',
  'haul-blank': 'Передать заготовку в сборку',
  'assemble-product': 'Собрать корпус',
  'deliver-product': 'Сдать корпус на склад',
  'repair-machine': 'Ремонт станка',
};

export const MACHINE_LABELS: Record<Machine['kind'], string> = {
  cutter: 'станок резки',
  bench: 'сборочный верстак',
  'old-press': 'пресс, который лучше не трогать',
};

export const ROOM_LABELS = {
  warehouse: 'склад',
  cutting: 'мехцех',
  assembly: 'сборка',
  admin: 'администрация',
  corridor: 'коридор',
} as const;
