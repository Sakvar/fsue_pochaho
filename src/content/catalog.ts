import type { FacilityPositions, Machine, ShiftId, EmployeeAvailability, Size, WorkPost, ZoneKind } from '../simulation/types';
import { TRAITS } from './traits';

export const MACHINE_LABELS: Record<Machine['kind'], string> = {
  cutter: 'станок резки',
  bench: 'сборочный верстак',
  'old-press': 'пресс, который лучше не трогать',
};

export const MACHINE_SIZES: Record<Machine['kind'], Size> = {
  cutter: { width: 3, height: 2 },
  bench: { width: 2, height: 1 },
  'old-press': { width: 2, height: 2 },
};

export const FACILITY_LABELS: Record<keyof FacilityPositions, string> = {
  steelStockpile: 'штабель стали',
  cutter: 'пост резки',
  bench: 'пост сборки',
  qualityDesk: 'стол ОТК',
  finishedStockpile: 'готовая продукция',
};

export const FACILITY_SIZES: Record<keyof FacilityPositions, Size> = {
  steelStockpile: { width: 2, height: 2 },
  cutter: { width: 1, height: 1 },
  bench: { width: 1, height: 1 },
  qualityDesk: { width: 2, height: 1 },
  finishedStockpile: { width: 2, height: 2 },
};

export const ROOM_LABELS = {
  warehouse: 'склад',
  cutting: 'мехцех',
  assembly: 'сборка',
  admin: 'администрация',
  corridor: 'коридор',
} as const;

export const ZONE_LABELS: Record<ZoneKind, string> = {
  none: 'нет',
  storage: 'хранение',
  work: 'работа',
  forbidden: 'запретная',
};

export const TILE_KIND_LABELS = {
  floor: 'пол',
  wall: 'стена',
  door: 'дверь',
} as const;

export const SHIFT_LABELS: Record<ShiftId, string> = {
  day: 'дневная',
  night: 'ночная',
  off: 'выходной',
};

export const AVAILABILITY_LABELS: Record<EmployeeAvailability, string> = {
  available: 'на месте',
  resting: 'отдых',
  sick: 'больничный',
  absent: 'отсутствует',
};

export const POST_LABELS: Record<WorkPost, string> = {
  none: 'без поста',
  cutter: 'резак',
  bench: 'сборка',
  quality: 'ОТК',
  logistics: 'логистика',
};

export const TRAIT_LABELS = Object.fromEntries(
  Object.entries(TRAITS).map(([id, trait]) => [id, trait.label]),
) as Record<keyof typeof TRAITS, string>;

export const SKILL_LABELS = {
  logistics: 'логистика',
  machining: 'станки',
  assembly: 'сборка',
  mechanics: 'механика',
  quality: 'ОТК',
} as const;

export type BuildTool = 'inspect' | 'wall' | 'door' | 'destroy' | 'zone-storage' | 'zone-work' | 'zone-forbidden' | 'zone-clear';

export const BUILD_TOOL_LABELS: Record<BuildTool, string> = {
  inspect: 'Осмотр',
  wall: 'Стена',
  door: 'Дверь',
  destroy: 'Снос',
  'zone-storage': 'Зона хранения',
  'zone-work': 'Рабочая зона',
  'zone-forbidden': 'Запретная зона',
  'zone-clear': 'Снять зону',
};
