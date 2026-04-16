import type { AppState } from './types';
import type { DomRefs } from './dom';
import { charTags } from './constants';
import { drawChart } from './chart';

/** Write input state back to DOM (e.g. after randomize) */
export function syncInputs(state: AppState, refs: DomRefs): void {
  const { inputs } = state;
  refs.inputs.teamName.value = inputs.teamName;
  refs.inputs.engineName.value = inputs.engineName;
  refs.inputs.engineType.value = inputs.engineType;
  refs.inputs.character.value = inputs.character;
  refs.inputs.maxRpm.value = String(inputs.maxRpm);
  refs.inputs.maxPower.value = String(inputs.maxPower);
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

/** Render computed results to DOM */
export function render(state: AppState, refs: DomRefs): void {
  const { inputs, computed } = state;
  if (!computed) return;

  const { lut, lutAuto, peakTorque, peakRpm, bandStart, bandEnd } = computed;

  // stats
  refs.stats.torque.textContent = `${peakTorque} N·m`;
  refs.stats.rpm.textContent = `${peakRpm.toLocaleString()} RPM`;
  refs.stats.power.textContent = `${inputs.maxPower} PS`;
  refs.stats.band.textContent =
    `${(bandStart / 1000).toFixed(1)}k – ${(bandEnd / 1000).toFixed(1)}k`;

  // header display
  const teamDisplay = inputs.teamName.trim().toUpperCase() || 'UNNAMED';
  refs.display.team.textContent = teamDisplay;
  refs.display.team.classList.add('flash');
  setTimeout(() => refs.display.team.classList.remove('flash'), 400);

  const engineLabel = inputs.engineName.trim() || '—';
  refs.display.engine.textContent = `${engineLabel} · ${inputs.engineType.toUpperCase()}`;

  // power badge (one of the few places we need structured content)
  refs.display.power.textContent = '';
  refs.display.power.append(
    String(inputs.maxPower),
    document.createElement('br'),
  );
  const span = document.createElement('span');
  span.textContent = 'PS · 7-speed';
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
  drawChart(refs.chart, lut, inputs.maxRpm, peakTorque, inputs.maxPower);
}

/** Redraw chart only (on resize) */
export function redrawChart(state: AppState, refs: DomRefs): void {
  if (!state.computed) return;
  const { lut, peakTorque } = state.computed;
  drawChart(refs.chart, lut, state.inputs.maxRpm, peakTorque, state.inputs.maxPower);
}
