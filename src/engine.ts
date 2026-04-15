import type { InputState, LutPoint, ComputedResult, PowerCharacter, ShapePoint } from './types';

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

function buildShape(character: PowerCharacter, seed: number, steps = 18): ShapePoint[] {
  const rand = mulberry32(seed);
  const pts: ShapePoint[] = [];

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
      const peak = 0.70;
      t = Math.exp(-Math.pow((r - peak) / 0.22, 2));
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

    t = Math.max(0, t);
    pts.push({ r, t });
  }

  return pts.map(p => ({
    r: p.r,
    t: Math.min(1, p.t * (1 + (rand() - 0.5) * 0.06)),
  }));
}

function computeLut(pts: ShapePoint[], maxRpm: number, maxTorqueNm: number): LutPoint[] {
  const map = new Map<number, number>();

  for (const p of pts) {
    const rpm = Math.round(p.r * maxRpm / 900) * 900;
    const torque = Math.round(p.t * maxTorqueNm);
    map.set(rpm, torque);
  }

  return Array.from(map, ([rpm, torque]) => ({ rpm, torque }));
}

function powerToTorque(ps: number, rpm: number): number {
  return (ps * 735.5) / (rpm * Math.PI / 30);
}

/** Pure computation: inputs → result. No DOM, no side effects. */
export function compute(inputs: InputState): ComputedResult {
  const { character, maxRpm, maxPower, seed } = inputs;

  const shape = buildShape(character, seed);

  let peakIdx = 0;
  shape.forEach((p, i) => { if (p.t > shape[peakIdx].t) peakIdx = i; });
  const peakRpm = Math.round(shape[peakIdx].r * maxRpm / 900) * 900;

  const maxTorqueNm = powerToTorque(maxPower, peakRpm);

  const lut = computeLut(shape, maxRpm, maxTorqueNm);
  lut[0].torque = 0;
  lut[1].torque = 0;

  const lutAuto = lut.map(p => ({ rpm: p.rpm, torque: Math.round(p.torque * 0.81) }));

  const peakTorque = Math.round(maxTorqueNm);
  const bandStart = lut.find(p => p.torque > maxTorqueNm * 0.85)?.rpm ?? 0;
  const bandEnd = [...lut].reverse().find(p => p.torque > maxTorqueNm * 0.85)?.rpm ?? 0;

  return { lut, lutAuto, peakTorque, peakRpm, bandStart, bandEnd };
}
