import { describe, it, expect } from 'vitest';
import { compute, _test } from './engine';
import type { InputState } from './types';

const { buildRpmGrid, buildShape, interpolateShape, computeLut } = _test;

describe('buildRpmGrid', () => {
  it('produces many points with step=500 maxRpm=15000', () => {
    const grid = buildRpmGrid(15000, 500);
    expect(grid.length).toBeGreaterThan(20);
    expect(grid[0]).toBe(0);
    expect(grid[grid.length - 1]).toBe(15000);
  });

  it('produces many points with step=900 maxRpm=13500', () => {
    const grid = buildRpmGrid(13500, 900);
    expect(grid.length).toBeGreaterThan(10);
    expect(grid[0]).toBe(0);
    expect(grid[grid.length - 1]).toBe(13500);
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
    // first few gaps should be ~500 (half-step)
    const firstGap = grid[1] - grid[0];
    expect(firstGap).toBe(500);
    // middle gaps should be ~1000
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
    const shape = buildShape('mid', 42);
    expect(shape.length).toBe(25);
  });

  it('starts at r=0, ends at r=1', () => {
    const shape = buildShape('mid', 42);
    expect(shape[0].r).toBe(0);
    expect(shape[shape.length - 1].r).toBe(1);
  });

  it('same seed = same result', () => {
    const a = buildShape('mid', 12345);
    const b = buildShape('mid', 12345);
    expect(a).toEqual(b);
  });

  it('different seed = different result', () => {
    const a = buildShape('mid', 1);
    const b = buildShape('mid', 2);
    const same = a.every((p, i) => p.t === b[i].t);
    expect(same).toBe(false);
  });

  it('all t values are between 0 and 1', () => {
    for (const char of ['early', 'mid', 'late', 'sharp', 'flat'] as const) {
      const shape = buildShape(char, 999);
      for (const p of shape) {
        expect(p.t).toBeGreaterThanOrEqual(0);
        expect(p.t).toBeLessThanOrEqual(1);
      }
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
  const defaults: InputState = {
    teamName: 'TEST',
    engineName: 'Test Engine',
    engineType: 'v10',
    character: 'mid',
    maxRpm: 15000,
    maxPower: 820,
    seed: 42,
    lutStep: 500,
  };

  it('produces more than 20 LUT points with default settings', () => {
    const result = compute(defaults);
    expect(result.lut.length).toBeGreaterThan(20);
  });

  it('LUT starts at 0 RPM with 0 torque', () => {
    const result = compute(defaults);
    expect(result.lut[0].rpm).toBe(0);
    expect(result.lut[0].torque).toBe(0);
  });

  it('LUT ends at maxRpm', () => {
    const result = compute(defaults);
    expect(result.lut[result.lut.length - 1].rpm).toBe(15000);
  });

  it('LUT is sorted by RPM', () => {
    const result = compute(defaults);
    for (let i = 1; i < result.lut.length; i++) {
      expect(result.lut[i].rpm).toBeGreaterThan(result.lut[i - 1].rpm);
    }
  });

  it('lutAuto is 81% of lut torque', () => {
    const result = compute(defaults);
    for (let i = 0; i < result.lut.length; i++) {
      expect(result.lutAuto[i].torque).toBe(Math.round(result.lut[i].torque * 0.81));
    }
  });

  it('same seed = deterministic output', () => {
    const a = compute(defaults);
    const b = compute(defaults);
    expect(a.lut).toEqual(b.lut);
    expect(a.peakTorque).toBe(b.peakTorque);
  });

  it('works with all character types', () => {
    for (const character of ['early', 'mid', 'late', 'sharp', 'flat'] as const) {
      const result = compute({ ...defaults, character });
      expect(result.lut.length).toBeGreaterThan(20);
      expect(result.peakTorque).toBeGreaterThan(0);
    }
  });

  it('handles lutStep=NaN without crashing', () => {
    const result = compute({ ...defaults, lutStep: NaN });
    expect(result.lut.length).toBeGreaterThan(20);
  });

  it('handles lutStep=0 without crashing', () => {
    const result = compute({ ...defaults, lutStep: 0 });
    expect(result.lut.length).toBeGreaterThan(20);
  });
});
