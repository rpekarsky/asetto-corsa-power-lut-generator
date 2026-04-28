import type { EngineIni } from './iniParser';

export interface LutPoint {
  rpm: number;
  torque: number;
}

export interface ShapePoint {
  r: number;
  t: number;
}

export type PowerCharacter = 'early' | 'mid' | 'late' | 'sharp' | 'flat';

// --- App state (single source of truth) ---

export interface InputState {
  teamName: string;
  engineName: string;
  character: PowerCharacter;
  maxRpm: number;
  maxPower: number;
  seed: number;
  lutStep: number;
  peakPos: number;             // 0.30–0.85 — where in RPM range the torque peak lands
  sharpness: number;           // 0.50–2.50 — curve peakiness (t^sharpness transform)
  noise: number;               // 0.00–0.15 — random variation amplitude
  peakTorqueOverride: number | null; // null = auto-computed from power+rpm
  engineIniText: string;       // raw engine.ini content; empty = no overrides
}

export interface PowerSamplePoint {
  rpm: number;
  torque: number;        // engine torque (Nm) — what goes into LUT
  effectiveTorque: number; // torque after turbo boost (what game uses for HP)
  power: number;         // PS, computed from effectiveTorque · ω
}

export interface ComputedResult {
  lut: LutPoint[];
  lutAuto: LutPoint[];
  peakTorque: number;       // Nm, max of LUT
  peakRpm: number;          // RPM at peak torque
  peakPower: number;        // PS, computed in-game peak (with turbo boost if any)
  peakPowerRpm: number;     // RPM at peak power
  bandStart: number;
  bandEnd: number;
  samples: PowerSamplePoint[]; // dense samples for chart/inspection
  parsedIni: EngineIni | null; // null if no engine.ini supplied or parse failed
}

export interface AppState {
  inputs: InputState;
  computed: ComputedResult | null;
}
