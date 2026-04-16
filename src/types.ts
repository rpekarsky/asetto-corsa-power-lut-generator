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

// --- App state (single source of truth) ---

export interface InputState {
  teamName: string;
  engineName: string;
  engineType: EngineType;
  character: PowerCharacter;
  maxRpm: number;
  maxPower: number;
  seed: number;
  lutStep: number;
  peakPos: number;    // 0.30–0.85 — where in RPM range the torque peak lands
  sharpness: number;  // 0.50–2.50 — curve peakiness (t^sharpness transform)
  noise: number;      // 0.00–0.15 — random variation amplitude
}

export interface ComputedResult {
  lut: LutPoint[];
  lutAuto: LutPoint[];
  peakTorque: number;
  peakRpm: number;
  bandStart: number;
  bandEnd: number;
}

export interface AppState {
  inputs: InputState;
  computed: ComputedResult | null;
}
