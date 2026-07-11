import type { TraitId } from '../simulation/types';

export interface TraitDefinition {
  label: string;
  workSpeedMod: number;
  energyDrainMod: number;
  stressGainMod: number;
}

export const TRAITS: Record<TraitId, TraitDefinition> = {
  'old-hand': {
    label: 'старый кадр',
    workSpeedMod: 1.12,
    energyDrainMod: 0.9,
    stressGainMod: 0.85,
  },
  strict: {
    label: 'строгий контролёр',
    workSpeedMod: 1.06,
    energyDrainMod: 1,
    stressGainMod: 1.1,
  },
  tireless: {
    label: 'неутомимый',
    workSpeedMod: 1.02,
    energyDrainMod: 0.7,
    stressGainMod: 0.8,
  },
  nervous: {
    label: 'нервный',
    workSpeedMod: 0.94,
    energyDrainMod: 1.05,
    stressGainMod: 1.45,
  },
};
