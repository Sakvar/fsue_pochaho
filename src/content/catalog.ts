import type { Machine } from '../simulation/types';

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
