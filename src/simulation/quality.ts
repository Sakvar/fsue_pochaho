import type { Employee, Machine, WorldState } from './types';
import { nextChance, nextFloat } from './rng';

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

/** Blank quality 0–1 after cutting: skill, fatigue, machine condition. */
export function computeBlankQuality(employee: Employee, machine: Machine): number {
  const skill = employee.skills.machining ?? 0;
  const quality =
    0.28 +
    skill * 0.1 +
    (employee.energy / 100) * 0.18 +
    (machine.condition / 100) * 0.38 -
    (employee.stress / 100) * 0.12;
  return clamp(quality, 0.12, 0.98);
}

/** Latent defect risk 0–1 after assembly. */
export function computeDefectRisk(employee: Employee, blankQuality: number, benchCondition: number): number {
  const skill = employee.skills.assembly ?? 0;
  const risk =
    (1 - blankQuality) * 0.55 +
    (5 - skill) * 0.07 +
    ((100 - employee.energy) / 100) * 0.18 +
    (employee.stress / 100) * 0.1 +
    ((100 - benchCondition) / 100) * 0.12;
  return clamp(risk, 0.02, 0.88);
}

export function pushCutBlank(world: WorldState, quality: number): void {
  world.qualityQueues.cutBlank.push(quality);
}

export function moveBlankToBench(world: WorldState): void {
  const quality = world.qualityQueues.cutBlank.shift() ?? 0.55;
  world.qualityQueues.blankAtBench.push(quality);
}

export function pushAssembled(world: WorldState, defectRisk: number): void {
  world.qualityQueues.assembledAtBench.push(defectRisk);
}

export function takeAssembledRisk(world: WorldState): number {
  return world.qualityQueues.assembledAtBench.shift() ?? 0.25;
}

export function pushInspected(world: WorldState, kind: 'good' | 'hidden'): void {
  world.qualityQueues.inspectedProduct.push(kind);
}

export function takeInspected(world: WorldState): 'good' | 'hidden' {
  return world.qualityQueues.inspectedProduct.shift() ?? 'good';
}

export function takeBlankQuality(world: WorldState): number {
  return world.qualityQueues.blankAtBench.shift() ?? 0.55;
}

export type InspectOutcome = 'accepted' | 'rejected' | 'missed';

export function inspectProduct(
  world: WorldState,
  inspector: Employee,
  defectRisk: number,
): InspectOutcome {
  const hasDefect = nextChance(world, defectRisk);
  if (!hasDefect) return 'accepted';

  const skill = inspector.skills.quality ?? 0;
  let detection =
    0.42 +
    skill * 0.1 +
    (inspector.energy / 100) * 0.12 -
    (inspector.stress / 100) * 0.1;
  if (inspector.traits.includes('strict')) detection += 0.14;
  if (inspector.traits.includes('nervous')) detection -= 0.05;
  detection = clamp(detection, 0.2, 0.95);

  if (nextFloat(world) < detection) return 'rejected';
  return 'missed';
}

export function adjustReputation(world: WorldState, delta: number, reason?: string): void {
  const before = world.reputation;
  world.reputation = clamp(world.reputation + delta, 0, 100);
  if (reason && Math.round(before) !== Math.round(world.reputation)) {
    // caller logs; keep pure here
  }
}

export function reputationLabel(reputation: number): string {
  if (reputation >= 75) return 'надёжный поставщик';
  if (reputation >= 55) return 'приемлемо';
  if (reputation >= 35) return 'замечания заказчика';
  return 'под угрозой контракта';
}
