import type { AppState, InputState, PowerCharacter } from './types';
import type { DomRefs } from './dom';
import { charDefaults, ENGINE_NAMES, CHARACTERS, RPMS, TEAM_NAMES, POWER_RANGE } from './constants';
import { compute } from './engine';
import { render, syncInputs, redrawChart } from './render';
import { saveState, loadState } from './storage';

function pick<T>(arr: readonly T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

function newSeed(): number {
  return Math.floor(Math.random() * 0xFFFFFFFF);
}

function isCustomRpmMode(refs: DomRefs): boolean {
  return !refs.inputs.maxRpmCustom.classList.contains('hidden');
}

/** Read current input values from DOM into typed state — no validation, no coercion */
function readInputs(refs: DomRefs): InputState {
  const seedValue = refs.inputs.seed.value.trim();
  const rpmSource = isCustomRpmMode(refs)
    ? refs.inputs.maxRpmCustom.value
    : refs.inputs.maxRpm.value;

  return {
    teamName: refs.inputs.teamName.value,
    engineName: refs.inputs.engineName.value,
    character: refs.inputs.character.value as PowerCharacter,
    maxRpm: parseInt(rpmSource) || 13500,
    maxPower: parseInt(refs.inputs.maxPower.value) || 820,
    peakTorqueOverride: (() => { const v = parseInt(refs.inputs.peakTorque.value); return v > 0 ? v : null; })(),
    seed: seedValue ? (parseInt(seedValue) || 0) : newSeed(),
    lutStep: parseInt(refs.inputs.lutStep.value) || 500,
    peakPos: (parseInt(refs.inputs.peakPos.value) || 52) / 100,
    sharpness: (parseInt(refs.inputs.sharpness.value) || 100) / 100,
    noise: (parseInt(refs.inputs.noise.value) || 0) / 100,
  };
}

export function createApp(refs: DomRefs) {
  const state: AppState = {
    inputs: readInputs(refs),
    computed: null,
  };

  let debounceTimer: ReturnType<typeof setTimeout>;

  function update() {
    state.inputs = readInputs(refs);
    state.computed = compute(state.inputs);
    syncInputs(state, refs);
    render(state, refs);
    saveState(state.inputs);
  }

  function restore(): boolean {
    const saved = loadState();
    if (!saved) return false;

    if (saved.teamName !== undefined) refs.inputs.teamName.value = saved.teamName;
    if (saved.engineName !== undefined) refs.inputs.engineName.value = saved.engineName;
    if (saved.character !== undefined) refs.inputs.character.value = saved.character;
    if (saved.maxPower !== undefined) refs.inputs.maxPower.value = String(saved.maxPower);
    if (saved.peakTorqueOverride !== undefined) refs.inputs.peakTorque.value = saved.peakTorqueOverride != null ? String(saved.peakTorqueOverride) : '';
    if (saved.lutStep !== undefined) refs.inputs.lutStep.value = String(saved.lutStep);
    if (saved.seed !== undefined) refs.inputs.seed.value = String(saved.seed);
    if (saved.peakPos !== undefined) refs.inputs.peakPos.value = String(Math.round(saved.peakPos * 100));
    if (saved.sharpness !== undefined) refs.inputs.sharpness.value = String(Math.round(saved.sharpness * 100));
    if (saved.noise !== undefined) refs.inputs.noise.value = String(Math.round(saved.noise * 100));

    if (saved.maxRpm !== undefined) {
      const rpmStr = String(saved.maxRpm);
      if (RPMS.includes(rpmStr)) {
        refs.inputs.maxRpm.value = rpmStr;
        refs.inputs.maxRpm.classList.remove('hidden');
        refs.inputs.maxRpmCustom.classList.add('hidden');
        refs.buttons.toggleRpm.classList.remove('active');
      } else {
        refs.inputs.maxRpmCustom.value = rpmStr;
        refs.inputs.maxRpm.classList.add('hidden');
        refs.inputs.maxRpmCustom.classList.remove('hidden');
        refs.buttons.toggleRpm.classList.add('active');
      }
    }

    update();
    return true;
  }

  /** Generate = new seed + recompute */
  function generate() {
    refs.inputs.seed.value = '';
    update();
  }

  /** Debounced update for live parameter changes */
  function debouncedUpdate() {
    clearTimeout(debounceTimer);
    debounceTimer = setTimeout(update, 100);
  }

  function applyCharacterDefaults() {
    const character = refs.inputs.character.value as PowerCharacter;
    const def = charDefaults[character];
    refs.inputs.peakPos.value = String(def.peakPos);
    refs.inputs.sharpness.value = String(def.sharpness);
    refs.inputs.noise.value = String(def.noise);
    update();
  }

  function randomize() {
    const ps = POWER_RANGE[0] + Math.round(Math.random() * (POWER_RANGE[1] - POWER_RANGE[0]));
    const character = pick(CHARACTERS);

    refs.inputs.character.value = character;
    refs.inputs.maxRpm.value = pick(RPMS);
    refs.inputs.maxRpm.classList.remove('hidden');
    refs.inputs.maxRpmCustom.classList.add('hidden');
    refs.buttons.toggleRpm.classList.remove('active');
    refs.inputs.maxPower.value = String(ps);
    refs.inputs.peakTorque.value = '';
    refs.inputs.teamName.value = pick(TEAM_NAMES);
    refs.inputs.engineName.value = pick(ENGINE_NAMES);
    refs.inputs.seed.value = '';

    const cd = charDefaults[character];
    refs.inputs.peakPos.value = String(cd.peakPos);
    refs.inputs.sharpness.value = String(cd.sharpness);
    refs.inputs.noise.value = String(cd.noise);

    update();
  }

  function copyLut(which: 'torque' | 'auto') {
    const el = which === 'torque' ? refs.lut.torque : refs.lut.auto;
    navigator.clipboard.writeText(el.textContent ?? '').then(() => {
      el.style.color = 'var(--green)';
      setTimeout(() => el.style.color = '', 600);
    });
  }

  function toggleRpm() {
    const custom = refs.inputs.maxRpmCustom;
    const select = refs.inputs.maxRpm;
    const btn = refs.buttons.toggleRpm;
    const goingCustom = custom.classList.contains('hidden');

    if (goingCustom) {
      custom.value = select.value;
      select.classList.add('hidden');
      custom.classList.remove('hidden');
      btn.classList.add('active');
      custom.focus();
    } else {
      select.classList.remove('hidden');
      custom.classList.add('hidden');
      btn.classList.remove('active');
    }
  }

  function handleResize() {
    redrawChart(state, refs);
  }

  return { generate, update, debouncedUpdate, randomize, restore, applyCharacterDefaults, copyLut, handleResize, toggleRpm };
}
