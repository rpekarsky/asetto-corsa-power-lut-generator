import type { EngineType, LutPoint, PowerCharacter } from './types';
import { charTags, engineDefaults, ENGINE_NAMES, ENGINE_TYPES, CHARACTERS, RPMS, TEAM_NAMES } from './constants';
import { buildShape, computeLut, powerToTorque } from './engine';
import { drawChart } from './chart';

let currentLut: LutPoint[] = [];
let currentLutAuto: LutPoint[] = [];

function getInput(id: string): string {
  return (document.getElementById(id) as HTMLInputElement).value;
}

function setInput(id: string, value: string): void {
  (document.getElementById(id) as HTMLInputElement).value = value;
}

function setText(id: string, text: string): void {
  document.getElementById(id)!.textContent = text;
}

function pick<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

export function generate(): void {
  const teamName = getInput('teamName').trim().toUpperCase() || 'UNNAMED';
  const engineName = getInput('engineName').trim() || '—';
  const engineType = getInput('engineType') as EngineType;
  const character = getInput('character') as PowerCharacter;
  const maxRpm = parseInt(getInput('maxRpm'));
  let maxPower = parseInt(getInput('maxPower'));

  if (isNaN(maxPower) || maxPower < 500 || maxPower > 1200) {
    const def = engineDefaults[engineType].powerRange;
    maxPower = def[0] + Math.round(Math.random() * (def[1] - def[0]));
    setInput('maxPower', String(maxPower));
  }

  const shape = buildShape(character, maxRpm);
  let peakIdx = 0;
  shape.forEach((p, i) => { if (p.t > shape[peakIdx].t) peakIdx = i; });
  const peakRpm = Math.round(shape[peakIdx].r * maxRpm / 900) * 900;

  const maxTorqueNm = powerToTorque(maxPower, peakRpm);

  const lut = computeLut(shape, maxRpm, maxTorqueNm);
  lut[0].torque = 0;
  lut[1].torque = 0;

  currentLut = lut;
  currentLutAuto = lut.map(p => ({ rpm: p.rpm, torque: Math.round(p.torque * 0.81) }));

  // stats
  const peakTorque = Math.round(maxTorqueNm);
  setText('statTorque', peakTorque + ' N·m');
  setText('statRpm', peakRpm.toLocaleString() + ' RPM');
  setText('statPower', maxPower + ' PS');

  const bandStart = lut.find(p => p.torque > maxTorqueNm * 0.85)?.rpm || 0;
  const bandEnd = [...lut].reverse().find(p => p.torque > maxTorqueNm * 0.85)?.rpm || 0;
  setText('statBand', (bandStart / 1000).toFixed(1) + 'k – ' + (bandEnd / 1000).toFixed(1) + 'k');

  // display
  const displayTeam = document.getElementById('displayTeam')!;
  displayTeam.textContent = teamName;
  displayTeam.classList.add('flash');
  setTimeout(() => displayTeam.classList.remove('flash'), 400);

  setText('displayEngine', engineName + ' · ' + engineType.toUpperCase());
  document.getElementById('displayPower')!.innerHTML = maxPower + '<br><span>PS · 7-speed</span>';

  const tags = charTags[character] || [];
  document.getElementById('displayTags')!.innerHTML =
    tags.map(t => `<span class="tag active">${t}</span>`).join('');

  // lut text
  setText('lutTorque', lut.map(p => `${p.rpm}|${p.torque}`).join('\n'));
  setText('lutAuto', currentLutAuto.map(p => `${p.rpm}|${p.torque}`).join('\n'));

  const canvas = document.getElementById('chart') as HTMLCanvasElement;
  drawChart(canvas, lut, maxRpm, peakTorque, maxPower);
}

export function randomize(): void {
  const et = pick(ENGINE_TYPES);
  const def = engineDefaults[et];
  const ps = def.powerRange[0] + Math.round(Math.random() * (def.powerRange[1] - def.powerRange[0]));

  setInput('engineType', et);
  setInput('character', pick(CHARACTERS));
  setInput('maxRpm', pick(RPMS));
  setInput('maxPower', String(ps));
  setInput('teamName', pick(TEAM_NAMES));
  setInput('engineName', pick(ENGINE_NAMES));

  generate();
}

export function copyLut(which: 'torque' | 'auto'): void {
  const el = document.getElementById(which === 'torque' ? 'lutTorque' : 'lutAuto')!;
  navigator.clipboard.writeText(el.textContent || '').then(() => {
    el.style.color = 'var(--green)';
    setTimeout(() => el.style.color = 'var(--accent2)', 600);
  });
}

export function handleResize(): void {
  if (currentLut.length) {
    const peakTorque = Math.max(...currentLut.map(p => p.torque));
    const maxPower = parseInt(getInput('maxPower'));
    const maxRpm = parseInt(getInput('maxRpm'));
    const canvas = document.getElementById('chart') as HTMLCanvasElement;
    drawChart(canvas, currentLut, maxRpm, peakTorque, maxPower);
  }
}
