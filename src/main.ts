import './styles.css';
import { collectRefs } from './dom';
import { createApp } from './app';

const refs = collectRefs();
const app = createApp(refs);

refs.buttons.generate.addEventListener('click', app.generate);
refs.buttons.randomize.addEventListener('click', app.randomize);
refs.buttons.copyTorque.addEventListener('click', () => app.copyLut('torque'));
refs.buttons.copyAuto.addEventListener('click', () => app.copyLut('auto'));
window.addEventListener('resize', app.handleResize);

app.randomize();
