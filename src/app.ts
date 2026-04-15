import type { AppState, EngineType, InputState, PowerCharacter } from './types';
import type { DomRefs } from './dom';
import { engineDefaults, ENGINE_NAMES, ENGINE_TYPES, CHARACTERS, RPMS, TEAM_NAMES } from './constants';
import { compute } from './engine';
import { render, syncInputs, redrawChart } from './render';

function pick<T>(arr: readonly T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

function newSeed(): number {
  return Math.floor(Math.random() * 0xFFFFFFFF);
}

/** Read current input values from DOM into typed state */
function readInputs(refs: DomRefs): InputState {
  const engineType = refs.inputs.engineType.value as EngineType;
  let maxPower = parseInt(refs.inputs.maxPower.value);
  const maxRpm = parseInt(refs.inputs.maxRpm.value);

  if (isNaN(maxPower) || maxPower < 500 || maxPower > 1200) {
    const [lo, hi] = engineDefaults[engineType].powerRange;
    maxPower = lo + Math.round(Math.random() * (hi - lo));
  }

  const seedValue = refs.inputs.seed.value.trim();
  const seed = seedValue ? (parseInt(seedValue) || 0) : newSeed();

  return {
    teamName: refs.inputs.teamName.value,
    engineName: refs.inputs.engineName.value,
    engineType,
    character: refs.inputs.character.value as PowerCharacter,
    maxRpm: isNaN(maxRpm) ? 13500 : maxRpm,
    maxPower,
    seed,
  };
}

export function createApp(refs: DomRefs) {
  const state: AppState = {
    inputs: readInputs(refs),
    computed: null,
  };

  function generate() {
    state.inputs = readInputs(refs);
    state.computed = compute(state.inputs);
    syncInputs(state, refs);
    render(state, refs);
  }

  function randomize() {
    const et = pick(ENGINE_TYPES);
    const def = engineDefaults[et];
    const ps = def.powerRange[0] + Math.round(Math.random() * (def.powerRange[1] - def.powerRange[0]));

    refs.inputs.engineType.value = et;
    refs.inputs.character.value = pick(CHARACTERS);
    refs.inputs.maxRpm.value = pick(RPMS);
    refs.inputs.maxPower.value = String(ps);
    refs.inputs.teamName.value = pick(TEAM_NAMES);
    refs.inputs.engineName.value = pick(ENGINE_NAMES);
    refs.inputs.seed.value = '';

    generate();
  }

  function copyLut(which: 'torque' | 'auto') {
    const el = which === 'torque' ? refs.lut.torque : refs.lut.auto;
    navigator.clipboard.writeText(el.textContent ?? '').then(() => {
      el.style.color = 'var(--green)';
      setTimeout(() => el.style.color = '', 600);
    });
  }

  function handleResize() {
    redrawChart(state, refs);
  }

  return { generate, randomize, copyLut, handleResize };
}
