import './styles.css';
import { collectRefs } from './dom';
import { createApp } from './app';

const refs = collectRefs();
const app = createApp(refs);

// actions
refs.buttons.generate.addEventListener('click', app.generate);
refs.buttons.randomize.addEventListener('click', app.randomize);
refs.buttons.copyTorque.addEventListener('click', () => app.copyLut('torque'));
refs.buttons.copyAuto.addEventListener('click', () => app.copyLut('auto'));
refs.buttons.toggleRpm.addEventListener('click', app.toggleRpm);

// character change resets sliders to character defaults
refs.inputs.character.addEventListener('change', app.applyCharacterDefaults);

// live update on text/select changes
const textInputs = [refs.inputs.maxPower, refs.inputs.maxRpmCustom, refs.inputs.lutStep, refs.inputs.teamName, refs.inputs.engineName, refs.inputs.seed];
for (const el of textInputs) {
  el.addEventListener('input', app.debouncedUpdate);
}
for (const el of [refs.inputs.engineType, refs.inputs.maxRpm]) {
  el.addEventListener('change', app.debouncedUpdate);
}

// sliders: update value label immediately, debounce the recompute
const sliders: Array<{ input: HTMLInputElement; label: HTMLElement; fmt: (v: string) => string }> = [
  { input: refs.inputs.peakPos,   label: refs.display.peakPosVal,   fmt: v => `${v}%` },
  { input: refs.inputs.sharpness, label: refs.display.sharpnessVal, fmt: v => (parseInt(v) / 100).toFixed(2) },
  { input: refs.inputs.noise,     label: refs.display.noiseVal,     fmt: v => `${v}%` },
];
for (const { input, label, fmt } of sliders) {
  input.addEventListener('input', () => {
    label.textContent = fmt(input.value);
    app.debouncedUpdate();
  });
}

window.addEventListener('resize', app.handleResize);

app.randomize();
