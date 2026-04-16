import type { PowerCharacter } from './types';

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

export const POWER_RANGE: [number, number] = [680, 920];

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

export const CHARACTERS: PowerCharacter[] = ['early', 'mid', 'late', 'sharp', 'flat'];
export const RPMS = ['12000', '13500', '15000', '16500'];
