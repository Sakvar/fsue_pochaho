import type { Machine, ServiceRecord, WorldState } from './types';

export function recordService(
  world: WorldState,
  machine: Machine,
  kind: ServiceRecord['kind'],
  note: string,
  partsUsed: number,
): void {
  const day = Math.floor(world.timeMinutes / (24 * 60)) + 1;
  machine.serviceLog.unshift({ day, kind, note, partsUsed });
  machine.serviceLog = machine.serviceLog.slice(0, 8);
  machine.hoursSinceService = 0;
}

export function applyMachineWear(machine: Machine, amount: number): void {
  machine.condition = Math.max(0, machine.condition - amount);
  machine.hoursSinceService += amount;
}

export function canServiceMachine(world: WorldState, kind: Machine['kind']): boolean {
  const machine = world.machines.find((item) => item.kind === kind);
  if (!machine || !machine.operational) return false;
  if (world.inventory.spareParts < 1) return false;
  return machine.condition <= 55 && machine.condition > 20;
}

export function needsRepair(world: WorldState, kind: Machine['kind']): boolean {
  const machine = world.machines.find((item) => item.kind === kind);
  return Boolean(machine && !machine.operational);
}

export function repairBlockedReason(world: WorldState): string | undefined {
  if (world.inventory.spareParts < 1) return 'Нет запчастей для ремонта';
  return undefined;
}

export function serviceBlockedReason(world: WorldState): string | undefined {
  if (world.inventory.spareParts < 1) return 'Нет запчастей для обслуживания';
  return undefined;
}
