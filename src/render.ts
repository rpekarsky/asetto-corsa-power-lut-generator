import type { AppState, ComputedResult } from './types';
import type { DomRefs } from './dom';
import { charTags } from './constants';
import { drawChart } from './chart';

/** Write input state back to DOM (e.g. after randomize) */
export function syncInputs(state: AppState, refs: DomRefs): void {
  const { inputs } = state;
  refs.inputs.teamName.value = inputs.teamName;
  refs.inputs.engineName.value = inputs.engineName;
  refs.inputs.character.value = inputs.character;
  refs.inputs.maxRpm.value = String(inputs.maxRpm);
  refs.inputs.maxPower.value = String(inputs.maxPower);
  refs.inputs.peakTorque.value = inputs.peakTorqueOverride !== null ? String(inputs.peakTorqueOverride) : '';
  refs.inputs.lutStep.value = String(inputs.lutStep);
  refs.inputs.seed.value = String(inputs.seed);

  const peakPosInt = Math.round(inputs.peakPos * 100);
  const sharpnessInt = Math.round(inputs.sharpness * 100);
  const noiseInt = Math.round(inputs.noise * 100);
  refs.inputs.peakPos.value = String(peakPosInt);
  refs.inputs.sharpness.value = String(sharpnessInt);
  refs.inputs.noise.value = String(noiseInt);
  refs.display.peakPosVal.textContent = `${peakPosInt}%`;
  refs.display.sharpnessVal.textContent = (inputs.sharpness).toFixed(2);
  refs.display.noiseVal.textContent = `${noiseInt}%`;
}

function renderIniInfo(computed: ComputedResult, hasText: boolean, refs: DomRefs): void {
  const el = refs.engineIniInfo;
  el.classList.remove('active', 'error');

  if (!hasText) {
    el.textContent = '// no engine.ini loaded — using LUT bare T·ω, full RPM range';
    return;
  }

  const ini = computed.parsedIni;
  if (!ini) {
    el.classList.add('error');
    el.textContent = '// failed to parse engine.ini';
    return;
  }

  el.classList.add('active');
  const lines: string[] = [];
  if (ini.limiter !== null) lines.push(`LIMITER       ${ini.limiter} RPM`);
  if (ini.minimum !== null) lines.push(`MINIMUM       ${ini.minimum} RPM`);
  if (ini.altitudeSensitivity !== null) lines.push(`ALT_SENS      ${ini.altitudeSensitivity}`);
  if (ini.inertia !== null) lines.push(`INERTIA       ${ini.inertia}`);
  if (ini.turbos.length === 0) {
    lines.push('TURBO         none (NA)');
  } else {
    const totalBoost = ini.turbos.reduce((s, t) => s + Math.min(t.maxBoost, t.wastegate), 0);
    lines.push(`TURBO         ${ini.turbos.length}× → +${(totalBoost * 100).toFixed(0)}% peak boost`);
    ini.turbos.forEach((t, i) => {
      lines.push(`  [${i}]  boost=${t.maxBoost.toFixed(2)} ref=${t.referenceRpm} γ=${t.gamma}`);
    });
  }
  el.textContent = lines.join('\n');
}

/** Render computed results to DOM */
export function render(state: AppState, refs: DomRefs): void {
  const { inputs, computed } = state;
  if (!computed) return;

  const { lut, lutAuto, peakTorque, peakRpm, peakPower, peakPowerRpm, bandStart, bandEnd } = computed;

  // stats
  refs.stats.torque.textContent = `${peakTorque} N·m`;
  refs.stats.rpm.textContent = `${peakRpm.toLocaleString()} RPM`;
  refs.stats.power.textContent = `${peakPower} PS`;
  refs.stats.powerRpm.textContent = `${peakPowerRpm.toLocaleString()} RPM`;
  refs.stats.band.textContent =
    `${(bandStart / 1000).toFixed(1)}k – ${(bandEnd / 1000).toFixed(1)}k`;

  // engine.ini info panel
  renderIniInfo(computed, inputs.engineIniText.trim().length > 0, refs);

  // header display
  const teamDisplay = inputs.teamName.trim().toUpperCase() || 'UNNAMED';
  refs.display.team.textContent = teamDisplay;
  refs.display.team.classList.add('flash');
  setTimeout(() => refs.display.team.classList.remove('flash'), 400);

  const engineLabel = inputs.engineName.trim() || '—';
  refs.display.engine.textContent = engineLabel;

  // power badge — show actual in-game peak power, not the user input
  refs.display.power.textContent = '';
  refs.display.power.append(
    String(peakPower),
    document.createElement('br'),
  );
  const span = document.createElement('span');
  span.textContent = 'PS · in-game';
  refs.display.power.append(span);

  // tags
  const tags = charTags[inputs.character] ?? [];
  refs.display.tags.textContent = '';
  for (const tag of tags) {
    const el = document.createElement('span');
    el.className = 'tag active';
    el.textContent = tag;
    refs.display.tags.append(el);
  }

  // LUT output
  refs.lut.torque.textContent = lut.map(p => `${p.rpm}|${p.torque}`).join('\n');
  refs.lut.auto.textContent = lutAuto.map(p => `${p.rpm}|${p.torque}`).join('\n');

  // chart
  drawChart(refs.chart, computed, inputs.maxRpm);
}

/** Redraw chart only (on resize) */
export function redrawChart(state: AppState, refs: DomRefs): void {
  if (!state.computed) return;
  drawChart(refs.chart, state.computed, state.inputs.maxRpm);
}
