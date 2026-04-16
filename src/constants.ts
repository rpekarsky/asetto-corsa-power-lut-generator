import type { EngineConfig, EngineType, PowerCharacter } from './types';

export interface CharDefaults {
  peakPos: number;    // slider integer (30–85)
  sharpness: number;  // slider integer (50–250)
  noise: number;      // slider integer (0–15)
}

export const charDefaults: Record<PowerCharacter, CharDefaults> = {
  early: { peakPos: 35, sharpness: 85,  noise: 3 },
  mid:   { peakPos: 52, sharpness: 100, noise: 3 },
  late:  { peakPos: 65, sharpness: 115, noise: 3 },
  sharp: { peakPos: 70, sharpness: 180, noise: 5 },
  flat:  { peakPos: 45, sharpness: 65,  noise: 2 },
};

export const engineDefaults: Record<EngineType, EngineConfig> = {
  v8:  { powerRange: [680, 800], charOptions: ['early', 'flat'],  rpmPref: 13500 },
  v10: { powerRange: [790, 850], charOptions: ['mid', 'flat'],    rpmPref: 13500 },
  v12: { powerRange: [840, 920], charOptions: ['late', 'sharp'],  rpmPref: 15000 },
  v40: { powerRange: [820, 880], charOptions: ['sharp', 'mid'],   rpmPref: 16500 },
};

export const charTags: Record<PowerCharacter, string[]> = {
  early: ['broad torque', 'low-end pull', 'forgiving'],
  mid:   ['balanced', 'smooth delivery', 'versatile'],
  late:  ['high-rev', 'narrow band', 'aggressive'],
  sharp: ['peaky', 'fast spin', 'technical'],
  flat:  ['wide plateau', 'consistent', 'easy to drive'],
};

export const TEAM_NAMES = [
  'THUNDER', 'ECLIPSE', 'NOVA RACING', 'IRON WOLF', 'ZENITH',
  'APEX', 'STORM', 'PHANTOM', 'SIGMA', 'DELTA FORCE',
];

export const ENGINE_NAMES = [
  'Hartwell V8', 'Kronos V10', 'Atlas V12', 'Lumina V10', 'Viper V8',
  'Olympus V12', 'Nexus V10', 'Titan V8', 'Helix V12', 'Pulsar V10',
];

export const ENGINE_TYPES: EngineType[] = ['v8', 'v10', 'v12', 'v40'];
export const CHARACTERS: PowerCharacter[] = ['early', 'mid', 'late', 'sharp', 'flat'];
export const RPMS = ['12000', '13500', '15000', '16500'];
