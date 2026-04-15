export interface LutPoint {
  rpm: number;
  torque: number;
}

export interface ShapePoint {
  r: number;
  t: number;
}

export interface EngineConfig {
  powerRange: [number, number];
  charOptions: string[];
  rpmPref: number;
}

export type PowerCharacter = 'early' | 'mid' | 'late' | 'sharp' | 'flat';
export type EngineType = 'v8' | 'v10' | 'v12' | 'v40';
