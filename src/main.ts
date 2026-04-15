import './styles.css';
import { generate, randomize, copyLut, handleResize } from './ui';

document.getElementById('btnGenerate')!.addEventListener('click', generate);
document.getElementById('btnRandomize')!.addEventListener('click', randomize);
document.getElementById('btnCopyTorque')!.addEventListener('click', () => copyLut('torque'));
document.getElementById('btnCopyAuto')!.addEventListener('click', () => copyLut('auto'));

window.addEventListener('resize', handleResize);

randomize();
