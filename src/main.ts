import './styles.css';
import { collectRefs } from './dom';
import { createApp } from './app';
import { setupChartHover } from './chart';

const refs = collectRefs();
const app = createApp(refs);
setupChartHover(refs.chart);

// actions
refs.buttons.generate.addEventListener('click', app.generate);
refs.buttons.randomize.addEventListener('click', app.randomize);
refs.buttons.copyTorque.addEventListener('click', () => app.copyLut('torque'));
refs.buttons.copyAuto.addEventListener('click', () => app.copyLut('auto'));
refs.buttons.toggleRpm.addEventListener('click', app.toggleRpm);

// character change resets sliders to character defaults
refs.inputs.character.addEventListener('change', app.applyCharacterDefaults);

/** Throttle with trailing call: fires immediately, then at most every `ms` ms, always fires final value. */
function throttle(fn: () => void, ms: number): () => void {
  let last = 0;
  let timer: ReturnType<typeof setTimeout> | null = null;
  return () => {
    const now = Date.now();
    if (timer) clearTimeout(timer);
    if (now - last >= ms) {
      last = now;
      fn();
    } else {
      timer = setTimeout(() => { last = Date.now(); fn(); }, ms - (now - last));
    }
  };
}

// live update on text/select changes (maxPower fires only on blur)
const textInputs = [refs.inputs.peakTorque, refs.inputs.maxRpmCustom, refs.inputs.lutStep, refs.inputs.teamName, refs.inputs.engineName, refs.inputs.seed];
for (const el of textInputs) {
  el.addEventListener('input', app.debouncedUpdate);
}
refs.inputs.engineIni.addEventListener('input', app.debouncedUpdate);
refs.inputs.maxPower.addEventListener('blur', app.update);
for (const el of [refs.inputs.maxRpm]) {
  el.addEventListener('change', app.debouncedUpdate);
}

// sliders: update label immediately, throttle+debounce the recompute
const sliders: Array<{ input: HTMLInputElement; label: HTMLElement; fmt: (v: string) => string }> = [
  { input: refs.inputs.peakPos,   label: refs.display.peakPosVal,   fmt: v => `${v}%` },
  { input: refs.inputs.sharpness, label: refs.display.sharpnessVal, fmt: v => (parseInt(v) / 100).toFixed(2) },
  { input: refs.inputs.noise,     label: refs.display.noiseVal,     fmt: v => `${v}%` },
];
for (const { input, label, fmt } of sliders) {
  const throttledUpdate = throttle(app.update, 80);
  input.addEventListener('input', () => {
    label.textContent = fmt(input.value);
    throttledUpdate();
  });
}

window.addEventListener('resize', app.handleResize);

if (!app.restore()) app.randomize();
