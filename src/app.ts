import type { AppState, EngineType, InputState, PowerCharacter } from './types';
import type { DomRefs } from './dom';
import { engineDefaults, charDefaults, ENGINE_NAMES, ENGINE_TYPES, CHARACTERS, RPMS, TEAM_NAMES } from './constants';
import { compute } from './engine';
import { render, syncInputs, redrawChart } from './render';

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
    engineType: refs.inputs.engineType.value as EngineType,
    character: refs.inputs.character.value as PowerCharacter,
    maxRpm: parseInt(rpmSource) || 13500,
    maxPower: parseInt(refs.inputs.maxPower.value) || 820,
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
  }

  /** Generate = new seed + recompute */
  function generate() {
    refs.inputs.seed.value = '';
    update();
  }

  /** Debounced update for live parameter changes */
  function debouncedUpdate() {
    clearTimeout(debounceTimer);
    debounceTimer = setTimeout(update, 250);
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
    const et = pick(ENGINE_TYPES);
    const def = engineDefaults[et];
    const ps = def.powerRange[0] + Math.round(Math.random() * (def.powerRange[1] - def.powerRange[0]));
    const character = pick(CHARACTERS);

    refs.inputs.engineType.value = et;
    refs.inputs.character.value = character;
    refs.inputs.maxRpm.value = pick(RPMS);
    refs.inputs.maxRpm.classList.remove('hidden');
    refs.inputs.maxRpmCustom.classList.add('hidden');
    refs.buttons.toggleRpm.classList.remove('active');
    refs.inputs.maxPower.value = String(ps);
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

  return { generate, update, debouncedUpdate, randomize, applyCharacterDefaults, copyLut, handleResize, toggleRpm };
}
