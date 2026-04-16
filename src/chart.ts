import type { LutPoint } from './types';

export function drawChart(
  canvas: HTMLCanvasElement,
  lut: LutPoint[],
  maxRpm: number,
  peakTorque: number,
  _maxPower: number,
): void {
  const wrap = canvas.parentElement!;
  const ctx = canvas.getContext('2d')!;
  const W = wrap.clientWidth;
  const H = wrap.clientHeight;

  canvas.width = W * window.devicePixelRatio;
  canvas.height = H * window.devicePixelRatio;
  ctx.scale(window.devicePixelRatio, window.devicePixelRatio);

  const pad = { l: 48, r: 48, t: 10, b: 30 };

  ctx.clearRect(0, 0, W, H);

  // grid
  ctx.strokeStyle = 'rgba(42,42,74,0.8)';
  ctx.lineWidth = 0.5;
  for (let i = 0; i <= 4; i++) {
    const y = pad.t + (H - pad.t - pad.b) * i / 4;
    ctx.beginPath();
    ctx.moveTo(pad.l, y);
    ctx.lineTo(W - pad.r, y);
    ctx.stroke();
  }
  for (let r = 0; r <= maxRpm; r += 3000) {
    const x = pad.l + (W - pad.l - pad.r) * r / maxRpm;
    ctx.beginPath();
    ctx.moveTo(x, pad.t);
    ctx.lineTo(x, H - pad.b);
    ctx.stroke();
    ctx.fillStyle = 'rgba(96,96,128,0.7)';
    ctx.font = '9px Share Tech Mono, monospace';
    ctx.textAlign = 'center';
    ctx.fillText((r / 1000).toFixed(0) + 'k', x, H - pad.b + 14);
  }

  function toX(rpm: number) { return pad.l + (W - pad.l - pad.r) * rpm / maxRpm; }
  function toY(val: number, max: number) { return pad.t + (H - pad.t - pad.b) * (1 - val / max); }

  // compute bhp values
  const bhpData = lut.map(p => (p.torque * p.rpm * Math.PI / 30) / 735.5);
  const actualMaxBhp = Math.max(...bhpData);
  const unifiedMax = Math.max(peakTorque, actualMaxBhp) * 1.08;

  // power curve
  ctx.beginPath();
  ctx.strokeStyle = '#e84060';
  ctx.lineWidth = 1.5;
  lut.forEach((p, i) => {
    const x = toX(p.rpm);
    const y = toY(bhpData[i], unifiedMax);
    i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
  });
  ctx.stroke();

  // torque curve
  ctx.beginPath();
  ctx.strokeStyle = '#e8c840';
  ctx.lineWidth = 2;
  lut.forEach((p, i) => {
    const x = toX(p.rpm);
    const y = toY(p.torque, unifiedMax);
    i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
  });
  ctx.stroke();

  // axis labels
  ctx.fillStyle = 'rgba(96,96,128,0.7)';
  ctx.font = '9px Share Tech Mono, monospace';
  ctx.textAlign = 'right';
  for (let i = 0; i <= 4; i++) {
    const val = Math.round(unifiedMax * (1 - i / 4));
    ctx.fillText(String(val), pad.l - 4, pad.t + (H - pad.t - pad.b) * i / 4 + 3);
  }
}
