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

// live update on parameter changes
const textInputs = [refs.inputs.maxPower, refs.inputs.maxRpmCustom, refs.inputs.lutStep, refs.inputs.teamName, refs.inputs.engineName, refs.inputs.seed];
for (const el of textInputs) {
  el.addEventListener('input', app.debouncedUpdate);
}
const selects = [refs.inputs.engineType, refs.inputs.character, refs.inputs.maxRpm];
for (const el of selects) {
  el.addEventListener('change', app.debouncedUpdate);
}

window.addEventListener('resize', app.handleResize);

app.randomize();
