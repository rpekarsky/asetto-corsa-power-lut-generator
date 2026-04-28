/** Minimal Assetto Corsa engine.ini parser — only the bits that affect HP. */

export interface TurboConfig {
  maxBoost: number;       // multiplier applied as (1 + boost) on torque
  wastegate: number;      // hard cap on boost
  referenceRpm: number;   // RPM at which boost reaches MAX_BOOST (modulated by gamma)
  gamma: number;          // boost curve exponent
}

export interface EngineIni {
  limiter: number | null;            // RPM cap
  minimum: number | null;             // idle RPM (below = torque irrelevant for power)
  altitudeSensitivity: number | null; // 0..1, affects HP at altitude (we model sea level → factor=1)
  turbos: TurboConfig[];              // each [TURBO_N] block
  inertia: number | null;
  raw: Record<string, Record<string, string>>; // section → key → value (for advanced use)
}

interface ParsedSection {
  name: string;
  index: string;
  keys: Record<string, string>;
}

function stripComment(line: string): string {
  // AC ini supports both ; and // comments mid-line; we trim them.
  let out = line;
  const semi = out.indexOf(';');
  if (semi >= 0) out = out.slice(0, semi);
  const slash = out.indexOf('//');
  if (slash >= 0) out = out.slice(0, slash);
  return out.trim();
}

function parseSections(text: string): ParsedSection[] {
  const sections: ParsedSection[] = [];
  let current: ParsedSection | null = null;

  for (const rawLine of text.split(/\r?\n/)) {
    const line = stripComment(rawLine);
    if (!line) continue;

    const sectionMatch = /^\[([^\]]+)\]$/.exec(line);
    if (sectionMatch) {
      const full = sectionMatch[1].trim();
      const idxMatch = /^(.+?)_(\d+)$/.exec(full);
      current = {
        name: idxMatch ? idxMatch[1] : full,
        index: idxMatch ? idxMatch[2] : '',
        keys: {},
      };
      sections.push(current);
      continue;
    }

    if (!current) continue;
    const eq = line.indexOf('=');
    if (eq < 0) continue;
    const key = line.slice(0, eq).trim().toUpperCase();
    const value = line.slice(eq + 1).trim();
    current.keys[key] = value;
  }

  return sections;
}

function num(v: string | undefined): number | null {
  if (v === undefined) return null;
  const n = parseFloat(v);
  return Number.isFinite(n) ? n : null;
}

export function parseEngineIni(text: string): EngineIni {
  const sections = parseSections(text);
  const raw: Record<string, Record<string, string>> = {};
  for (const s of sections) {
    const key = s.index ? `${s.name}_${s.index}` : s.name;
    raw[key] = s.keys;
  }

  const engineData = sections.find(s => s.name === 'ENGINE_DATA')?.keys ?? {};
  const turboSections = sections.filter(s => s.name === 'TURBO');

  const turbos: TurboConfig[] = turboSections.map(s => ({
    maxBoost: num(s.keys.MAX_BOOST) ?? 0,
    wastegate: num(s.keys.WASTEGATE) ?? Number.POSITIVE_INFINITY,
    referenceRpm: num(s.keys.REFERENCE_RPM) ?? 1,
    gamma: num(s.keys.GAMMA) ?? 1,
  })).filter(t => t.maxBoost > 0);

  return {
    limiter: num(engineData.LIMITER),
    minimum: num(engineData.MINIMUM),
    altitudeSensitivity: num(engineData.ALTITUDE_SENSITIVITY),
    inertia: num(engineData.INERTIA),
    turbos,
    raw,
  };
}

/** Steady-state boost at given RPM, summed across all turbos. */
export function totalBoostAt(rpm: number, turbos: TurboConfig[]): number {
  let total = 0;
  for (const t of turbos) {
    if (t.referenceRpm <= 0) continue;
    const ratio = Math.min(1, rpm / t.referenceRpm);
    const raw = t.maxBoost * Math.pow(ratio, t.gamma);
    total += Math.min(raw, t.wastegate);
  }
  return total;
}
