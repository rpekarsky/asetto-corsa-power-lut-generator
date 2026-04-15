import type { LutPoint, PowerCharacter, ShapePoint } from './types';

export function buildShape(character: PowerCharacter, _maxRpm: number, steps = 18): ShapePoint[] {
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

  // add small random variation per point (+-3%)
  return pts.map(p => ({
    r: p.r,
    t: Math.min(1, p.t * (1 + (Math.random() - 0.5) * 0.06)),
  }));
}

export function computeLut(pts: ShapePoint[], maxRpm: number, maxTorqueNm: number): LutPoint[] {
  const map = new Map<number, number>();

  pts.forEach(p => {
    const rpm = Math.round(p.r * maxRpm / 900) * 900;
    const torque = Math.round(p.t * maxTorqueNm);
    map.set(rpm, torque);
  });

  return Array.from(map, ([rpm, torque]) => ({ rpm, torque }));
}

export function powerToTorque(ps: number, rpm: number): number {
  return (ps * 735.5) / (rpm * Math.PI / 30);
}
