import { describe, it, expect } from 'vitest';
import { compute, _test } from './engine';
import type { InputState } from './types';

const { buildRpmGrid, buildShape, interpolateShape } = _test;

const baseInputs: InputState = {
  teamName: 'TEST',
  engineName: 'Test Engine',
  character: 'mid',
  maxRpm: 15000,
  maxPower: 820,
  peakTorqueOverride: null,
  seed: 42,
  lutStep: 500,
  peakPos: 0.52,
  sharpness: 1.0,
  noise: 0.03,
  engineIniText: '',
};

describe('buildRpmGrid', () => {
  it('produces many points with step=500 maxRpm=15000', () => {
    const grid = buildRpmGrid(15000, 500);
    expect(grid.length).toBeGreaterThan(20);
    expect(grid[0]).toBe(0);
    expect(grid[grid.length - 1]).toBe(15000);
  });

  it('handles step=NaN gracefully (falls back to 500)', () => {
    const grid = buildRpmGrid(15000, NaN);
    expect(grid.length).toBeGreaterThan(20);
  });

  it('handles step=0 gracefully (falls back to 500)', () => {
    const grid = buildRpmGrid(15000, 0);
    expect(grid.length).toBeGreaterThan(20);
  });

  it('has finer resolution at edges', () => {
    const grid = buildRpmGrid(15000, 1000);
    const firstGap = grid[1] - grid[0];
    expect(firstGap).toBe(500);
    const midIdx = Math.floor(grid.length / 2);
    const midGap = grid[midIdx] - grid[midIdx - 1];
    expect(midGap).toBe(1000);
  });

  it('is sorted ascending', () => {
    const grid = buildRpmGrid(15000, 500);
    for (let i = 1; i < grid.length; i++) {
      expect(grid[i]).toBeGreaterThan(grid[i - 1]);
    }
  });
});

describe('buildShape', () => {
  it('produces 25 points for steps=24', () => {
    const shape = buildShape('mid', 42, 0.52, 1.0, 0.03);
    expect(shape.length).toBe(25);
  });

  it('starts at r=0, ends at r=1', () => {
    const shape = buildShape('mid', 42, 0.52, 1.0, 0.03);
    expect(shape[0].r).toBe(0);
    expect(shape[shape.length - 1].r).toBe(1);
  });

  it('same seed = same result', () => {
    const a = buildShape('mid', 12345, 0.52, 1.0, 0.03);
    const b = buildShape('mid', 12345, 0.52, 1.0, 0.03);
    expect(a).toEqual(b);
  });

  it('all t values are between 0 and 1', () => {
    for (const char of ['early', 'mid', 'late', 'sharp', 'flat'] as const) {
      const shape = buildShape(char, 999, 0.52, 1.0, 0.03);
      for (const p of shape) {
        expect(p.t).toBeGreaterThanOrEqual(0);
        expect(p.t).toBeLessThanOrEqual(1);
      }
    }
  });

  it('peak lands at requested peakPos (±5%)', () => {
    for (const targetPos of [0.35, 0.52, 0.70] as const) {
      const shape = buildShape('mid', 42, targetPos, 1.0, 0.0);
      let peakIdx = 0;
      shape.forEach((p, i) => { if (p.t > shape[peakIdx].t) peakIdx = i; });
      expect(shape[peakIdx].r).toBeCloseTo(targetPos, 1);
    }
  });
});

describe('interpolateShape', () => {
  const pts = [
    { r: 0, t: 0 },
    { r: 0.5, t: 1 },
    { r: 1, t: 0 },
  ];

  it('returns exact values at control points', () => {
    expect(interpolateShape(pts, 0)).toBe(0);
    expect(interpolateShape(pts, 0.5)).toBe(1);
    expect(interpolateShape(pts, 1)).toBe(0);
  });

  it('interpolates between points', () => {
    expect(interpolateShape(pts, 0.25)).toBeCloseTo(0.5);
    expect(interpolateShape(pts, 0.75)).toBeCloseTo(0.5);
  });
});

describe('compute (full pipeline)', () => {
  it('peak in-game power matches target maxPower (no turbo)', () => {
    const result = compute({ ...baseInputs, maxPower: 820 });
    expect(result.peakPower).toBeGreaterThanOrEqual(819);
    expect(result.peakPower).toBeLessThanOrEqual(821);
  });

  it('peak power stays at target across all characters (NA)', () => {
    for (const character of ['early', 'mid', 'late', 'sharp', 'flat'] as const) {
      const result = compute({ ...baseInputs, character, maxPower: 750 });
      expect(result.peakPower).toBeGreaterThanOrEqual(749);
      expect(result.peakPower).toBeLessThanOrEqual(751);
    }
  });

  it('peak power stays at target across peakPos values', () => {
    for (const peakPos of [0.30, 0.45, 0.60, 0.80] as const) {
      const result = compute({ ...baseInputs, peakPos, maxPower: 800 });
      expect(result.peakPower).toBeGreaterThanOrEqual(799);
      expect(result.peakPower).toBeLessThanOrEqual(801);
    }
  });

  it('LUT starts at 0 RPM with 0 torque', () => {
    const result = compute(baseInputs);
    expect(result.lut[0].rpm).toBe(0);
    expect(result.lut[0].torque).toBe(0);
  });

  it('LUT ends at maxRpm', () => {
    const result = compute(baseInputs);
    expect(result.lut[result.lut.length - 1].rpm).toBe(15000);
  });

  it('LUT is sorted by RPM', () => {
    const result = compute(baseInputs);
    for (let i = 1; i < result.lut.length; i++) {
      expect(result.lut[i].rpm).toBeGreaterThan(result.lut[i - 1].rpm);
    }
  });

  it('lutAuto is 81% of lut torque', () => {
    const result = compute(baseInputs);
    for (let i = 0; i < result.lut.length; i++) {
      expect(result.lutAuto[i].torque).toBe(Math.round(result.lut[i].torque * 0.81));
    }
  });

  it('same seed = deterministic output', () => {
    const a = compute(baseInputs);
    const b = compute(baseInputs);
    expect(a.lut).toEqual(b.lut);
    expect(a.peakTorque).toBe(b.peakTorque);
  });

  it('handles lutStep=NaN without crashing', () => {
    const result = compute({ ...baseInputs, lutStep: NaN });
    expect(result.lut.length).toBeGreaterThan(20);
  });

  it('LUT spans full maxRpm regardless of LIMITER', () => {
    const ini = `[ENGINE_DATA]
LIMITER=10000
MINIMUM=4000`;
    const result = compute({ ...baseInputs, maxRpm: 15000, engineIniText: ini });
    const lastRpm = result.lut[result.lut.length - 1].rpm;
    expect(lastRpm).toBe(15000);
    expect(result.parsedIni?.limiter).toBe(10000);
  });

  it('peak power inversion ignores points outside [MINIMUM, LIMITER]', () => {
    // Place natural peak above LIMITER — peak power should still be at target
    const ini = `[ENGINE_DATA]
LIMITER=8000
MINIMUM=2000`;
    const result = compute({ ...baseInputs, maxRpm: 15000, peakPos: 0.85, maxPower: 800, engineIniText: ini });
    expect(result.peakPower).toBeGreaterThanOrEqual(799);
    expect(result.peakPower).toBeLessThanOrEqual(801);
    expect(result.peakPowerRpm).toBeLessThanOrEqual(8000);
  });

  it('LUT torque values are non-zero across full range (no MINIMUM zeroing)', () => {
    const ini = `[ENGINE_DATA]
LIMITER=10000
MINIMUM=4000`;
    const result = compute({ ...baseInputs, maxRpm: 12000, engineIniText: ini });
    const below = result.lut.filter(p => p.rpm > 500 && p.rpm < 4000);
    expect(below.some(p => p.torque > 0)).toBe(true);
  });

  it('with turbo, peak in-game power still matches target', () => {
    const ini = `[ENGINE_DATA]
LIMITER=10000
MINIMUM=2000
[TURBO_0]
MAX_BOOST=0.5
WASTEGATE=0.5
REFERENCE_RPM=3000
GAMMA=0.2
[TURBO_1]
MAX_BOOST=0.5
WASTEGATE=0.5
REFERENCE_RPM=3000
GAMMA=0.2`;
    const result = compute({ ...baseInputs, maxRpm: 10000, maxPower: 700, engineIniText: ini });
    expect(result.peakPower).toBeGreaterThanOrEqual(699);
    expect(result.peakPower).toBeLessThanOrEqual(701);
    // bare LUT torque should be much lower than effective with 2x boost
    const bareLutPeak = Math.max(...result.lut.map(p => p.torque));
    const effectivePeak = Math.max(...result.samples.map(s => s.effectiveTorque));
    expect(effectivePeak / bareLutPeak).toBeGreaterThan(1.5); // ≈ 2x at full boost
  });

  it('peakTorqueOverride takes precedence over power inversion', () => {
    const result = compute({ ...baseInputs, peakTorqueOverride: 500 });
    expect(result.peakTorque).toBeGreaterThanOrEqual(498);
    expect(result.peakTorque).toBeLessThanOrEqual(502);
  });
});
