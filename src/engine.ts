import type { InputState, LutPoint, ComputedResult, PowerCharacter, ShapePoint } from './types';
import { charDefaults } from './constants';

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

function computeLut(shape: ShapePoint[], maxRpm: number, maxTorqueNm: number, step: number): LutPoint[] {
  const grid = buildRpmGrid(maxRpm, step);

  return grid.map(rpm => {
    const r = rpm / maxRpm;
    const t = interpolateShape(shape, r);
    return { rpm, torque: Math.round(t * maxTorqueNm) };
  });
}

function powerToTorque(ps: number, rpm: number): number {
  return (ps * 735.5) / (rpm * Math.PI / 30);
}

// test-only exports
export const _test = { buildShape, buildRpmGrid, interpolateShape, computeLut };

/** Pure computation: inputs → result. No DOM, no side effects. */
export function compute(inputs: InputState): ComputedResult {
  const { character, maxRpm, maxPower, seed, lutStep, peakPos, sharpness, noise } = inputs;

  const shape = buildShape(character, seed, peakPos, sharpness, noise);

  let peakIdx = 0;
  shape.forEach((p, i) => { if (p.t > shape[peakIdx].t) peakIdx = i; });
  const peakRpm = Math.round(shape[peakIdx].r * maxRpm / 900) * 900;

  const maxTorqueNm = powerToTorque(maxPower, peakRpm);

  const lut = computeLut(shape, maxRpm, maxTorqueNm, lutStep);
  // zero torque at idle
  for (const p of lut) {
    if (p.rpm <= 300) p.torque = 0;
    else break;
  }

  const lutAuto = lut.map(p => ({ rpm: p.rpm, torque: Math.round(p.torque * 0.81) }));

  const peakTorque = Math.round(maxTorqueNm);
  const bandStart = lut.find(p => p.torque > maxTorqueNm * 0.85)?.rpm ?? 0;
  const bandEnd = [...lut].reverse().find(p => p.torque > maxTorqueNm * 0.85)?.rpm ?? 0;

  return { lut, lutAuto, peakTorque, peakRpm, bandStart, bandEnd };
}
