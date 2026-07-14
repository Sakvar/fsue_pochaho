import type { TraitId } from '../simulation/types';

export interface TraitDefinition {
  label: string;
  workSpeedMod: number;
  energyDrainMod: number;
  stressGainMod: number;
  /** Multiplier on task assignment score (lower = less eager to take work). */
  taskScoreMod: number;
}

export const TRAITS: Record<TraitId, TraitDefinition> = {
  'old-hand': {
    label: 'старый кадр',
    workSpeedMod: 1.12,
    energyDrainMod: 0.9,
    stressGainMod: 0.85,
    taskScoreMod: 1,
  },
  strict: {
    label: 'строгий контролёр',
    workSpeedMod: 1.06,
    energyDrainMod: 1,
    stressGainMod: 1.1,
    taskScoreMod: 1,
  },
  tireless: {
    label: 'неутомимый',
    workSpeedMod: 1.02,
    energyDrainMod: 0.7,
    stressGainMod: 0.8,
    taskScoreMod: 1.05,
  },
  nervous: {
    label: 'нервный',
    workSpeedMod: 0.94,
    energyDrainMod: 1.05,
    stressGainMod: 1.45,
    taskScoreMod: 0.95,
  },
  'young-specialist': {
    label: 'молодой специалист',
    workSpeedMod: 1.14,
    energyDrainMod: 1.1,
    stressGainMod: 1.35,
    taskScoreMod: 1.08,
  },
  'old-timer': {
    label: 'дедок',
    workSpeedMod: 0.72,
    energyDrainMod: 0.75,
    stressGainMod: 0.7,
    taskScoreMod: 0.45,
  },
};
