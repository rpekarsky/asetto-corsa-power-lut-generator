import type { InputState, LutPoint, ComputedResult, PowerCharacter, ShapePoint, PowerSamplePoint } from './types';
import { parseEngineIni, totalBoostAt, type EngineIni } from './iniParser';

const PS_TO_W = 735.49875;
const RPM_TO_RAD_S = Math.PI / 30;

// mulberry32 — fast seeded PRNG
function mulberry32(seed: number): () => number {
  return () => {
    seed |= 0;
    seed = seed + 0x6D2B79F5 | 0;
    let t = Math.imul(seed ^ seed >>> 15, 1 | seed);
    t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t;
    return ((t ^ t >>> 14) >>> 0) / 4294967296;
  };
}

function buildShape(
  character: PowerCharacter,
  seed: number,
  peakPos: number,
  sharpness: number,
  noise: number,
  steps = 24,
): ShapePoint[] {
  const rand = mulberry32(seed);
  const raw: { r: number; t: number }[] = [];

  for (let i = 0; i <= steps; i++) {
    const r = i / steps;
    let t: number;

    if (character === 'early') {
      t = Math.pow(Math.sin(r * Math.PI * 0.95), 0.6) * (r < 0.5 ? 1.15 : 1.0);
      t = Math.min(t, 1);
    } else if (character === 'late') {
      t = Math.pow(Math.sin(r * Math.PI * 0.85 + 0.08), 0.75);
      if (r < 0.15) t *= r / 0.15;
    } else if (character === 'sharp') {
      t = Math.exp(-Math.pow((r - 0.70) / 0.22, 2));
      if (r < 0.1) t *= r / 0.1;
    } else if (character === 'flat') {
      if (r < 0.25) t = r / 0.25;
      else if (r < 0.75) t = 1.0 - 0.05 * Math.sin((r - 0.25) / 0.5 * Math.PI);
      else t = Math.pow(1 - (r - 0.75) / 0.25, 1.2);
    } else {
      // mid — classic bell slightly skewed right
      t = Math.pow(Math.sin(r * Math.PI * 0.90 + 0.05), 0.65);
      if (r < 0.1) t *= r / 0.1;
    }

    raw.push({ r, t: Math.max(0, t) });
  }

  // Find natural peak to remap r-axis so it lands at peakPos
  let peakIdx = 0;
  for (let i = 1; i < raw.length; i++) {
    if (raw[i].t > raw[peakIdx].t) peakIdx = i;
  }
  const rPeak = raw[peakIdx].r;
  const remap = (r: number): number => {
    if (rPeak <= 0 || rPeak >= 1) return r;
    if (r <= rPeak) return (r / rPeak) * peakPos;
    return peakPos + ((r - rPeak) / (1 - rPeak)) * (1 - peakPos);
  };

  return raw.map(p => ({
    r: remap(p.r),
    t: Math.min(1, Math.max(0,
      Math.pow(p.t, sharpness) * (1 + (rand() - 0.5) * 2 * noise),
    )),
  }));
}

/** Linearly interpolate shape at ratio r (0..1) */
function interpolateShape(pts: ShapePoint[], r: number): number {
  if (r <= 0) return pts[0].t;
  if (r >= 1) return pts[pts.length - 1].t;

  for (let i = 1; i < pts.length; i++) {
    if (pts[i].r >= r) {
      const prev = pts[i - 1];
      const next = pts[i];
      const frac = (r - prev.r) / (next.r - prev.r);
      return prev.t + (next.t - prev.t) * frac;
    }
  }
  return pts[pts.length - 1].t;
}

/** Build RPM grid: half-step at edges (first/last 15%), full step in the middle */
function buildRpmGrid(maxRpm: number, step: number): number[] {
  step = Math.max(100, Math.abs(step) || 500);
  const fineStep = Math.round(step / 2);
  const edgeThreshold = maxRpm * 0.15;
  const rpms: number[] = [0];

  let rpm = fineStep;
  while (rpm <= maxRpm) {
    rpms.push(rpm);
    const currentStep = (rpm < edgeThreshold || rpm > maxRpm - edgeThreshold) ? fineStep : step;
    rpm += currentStep;
  }

  if (rpms[rpms.length - 1] !== maxRpm) {
    rpms.push(maxRpm);
  }

  return rpms;
}

interface ScaleResolution {
  /** Nm per unit of normalized shape — multiply shape t by this to get torque in Nm */
  torqueScale: number;
  /** Resulting peak in-game power, PS */
  peakPower: number;
  /** RPM where peak power lands */
  peakPowerRpm: number;
}

/**
 * Resolve the torque scale so that the peak in-game power matches the target.
 * In-game power at RPM = T(rpm) · (1 + Σ boost(rpm)) · ω.
 * If peakTorqueOverride is set, scale is fixed and peakPower becomes a derived metric.
 */
function resolveScale(
  shape: ShapePoint[],
  grid: number[],
  maxRpm: number,
  targetMaxPowerPs: number,
  ini: EngineIni | null,
  peakTorqueOverride: number | null,
  minimumRpm: number,
  inversionMaxRpm: number,
): ScaleResolution {
  const turbos = ini?.turbos ?? [];

  const samples = grid
    .filter(rpm => rpm >= minimumRpm && rpm > 0 && rpm <= inversionMaxRpm)
    .map(rpm => {
      const t = interpolateShape(shape, rpm / maxRpm);
      const boostMul = 1 + totalBoostAt(rpm, turbos);
      return { rpm, t, boostMul, normPower: t * boostMul * rpm * RPM_TO_RAD_S };
    });

  if (samples.length === 0) {
    return { torqueScale: 0, peakPower: 0, peakPowerRpm: 0 };
  }

  let peakSample = samples[0];
  let peakShapeT = 0;
  for (const s of samples) {
    if (s.normPower > peakSample.normPower) peakSample = s;
    if (s.t > peakShapeT) peakShapeT = s.t;
  }

  let torqueScale: number;
  if (peakTorqueOverride !== null && peakShapeT > 0) {
    // user-locked peak torque (Nm); shape's max is peakShapeT in normalized terms
    torqueScale = peakTorqueOverride / peakShapeT;
  } else {
    // invert peak power: torqueScale · peakSample.normPower = targetMaxPowerPs · PS_TO_W
    torqueScale = (targetMaxPowerPs * PS_TO_W) / peakSample.normPower;
  }

  const peakPowerW = torqueScale * peakSample.normPower;
  return {
    torqueScale,
    peakPower: peakPowerW / PS_TO_W,
    peakPowerRpm: peakSample.rpm,
  };
}

function buildSamples(
  shape: ShapePoint[],
  grid: number[],
  maxRpm: number,
  torqueScale: number,
  ini: EngineIni | null,
): PowerSamplePoint[] {
  const turbos = ini?.turbos ?? [];
  return grid.map(rpm => {
    const t = interpolateShape(shape, rpm / maxRpm);
    const torque = t * torqueScale;
    const boostMul = 1 + totalBoostAt(rpm, turbos);
    const effectiveTorque = torque * boostMul;
    const power = (effectiveTorque * rpm * RPM_TO_RAD_S) / PS_TO_W;
    return { rpm, torque, effectiveTorque, power };
  });
}

// test-only exports
export const _test = { buildShape, buildRpmGrid, interpolateShape, resolveScale, buildSamples };

/** Pure computation: inputs → result. No DOM, no side effects. */
export function compute(inputs: InputState): ComputedResult {
  const { character, maxRpm, maxPower, seed, lutStep, peakPos, sharpness, noise, peakTorqueOverride, engineIniText } = inputs;

  let parsedIni: EngineIni | null = null;
  if (engineIniText && engineIniText.trim().length > 0) {
    try { parsedIni = parseEngineIni(engineIniText); } catch { parsedIni = null; }
  }

  // LIMITER/MINIMUM only constrain the *physically reachable* range used for peak-power
  // inversion. The LUT itself spans the full UI maxRpm range so the curve isn't truncated.
  const limiter = parsedIni?.limiter ?? null;
  const inversionMaxRpm = limiter !== null && limiter > 0 ? Math.min(maxRpm, limiter) : maxRpm;
  const minimumRpm = parsedIni?.minimum ?? 0;

  const shape = buildShape(character, seed, peakPos, sharpness, noise);
  const grid = buildRpmGrid(maxRpm, lutStep);

  const { torqueScale, peakPower, peakPowerRpm } = resolveScale(
    shape, grid, maxRpm, maxPower, parsedIni, peakTorqueOverride, minimumRpm, inversionMaxRpm,
  );

  const samples = buildSamples(shape, grid, maxRpm, torqueScale, parsedIni);

  const lut: LutPoint[] = samples.map(s => ({ rpm: s.rpm, torque: Math.round(s.torque) }));
  const lutAuto: LutPoint[] = lut.map(p => ({ rpm: p.rpm, torque: Math.round(p.torque * 0.81) }));

  // Stats
  let peakTorqueIdx = 0;
  for (let i = 1; i < lut.length; i++) {
    if (lut[i].torque > lut[peakTorqueIdx].torque) peakTorqueIdx = i;
  }
  const peakTorque = lut[peakTorqueIdx]?.torque ?? 0;
  const peakRpm = lut[peakTorqueIdx]?.rpm ?? 0;

  const bandStart = lut.find(p => p.torque > peakTorque * 0.85)?.rpm ?? 0;
  const bandEnd = [...lut].reverse().find(p => p.torque > peakTorque * 0.85)?.rpm ?? 0;

  return {
    lut,
    lutAuto,
    peakTorque,
    peakRpm,
    peakPower: Math.round(peakPower),
    peakPowerRpm: Math.round(peakPowerRpm),
    bandStart,
    bandEnd,
    samples,
    parsedIni,
  };
}
