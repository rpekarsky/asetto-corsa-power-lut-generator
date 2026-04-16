import type { LutPoint } from './types';

interface DrawData {
  canvas: HTMLCanvasElement;
  lut: LutPoint[];
  maxRpm: number;
  peakTorque: number;
  maxPower: number;
}

let currentData: DrawData | null = null;

function interpolateAt(lut: LutPoint[], rpm: number): { torque: number; power: number } {
  for (let i = 1; i < lut.length; i++) {
    if (lut[i].rpm >= rpm) {
      const a = lut[i - 1], b = lut[i];
      const t = b.rpm === a.rpm ? 0 : (rpm - a.rpm) / (b.rpm - a.rpm);
      const torque = a.torque + (b.torque - a.torque) * t;
      const power = (torque * rpm * Math.PI / 30) / 735.5;
      return { torque, power };
    }
  }
  const last = lut[lut.length - 1];
  return { torque: last.torque, power: (last.torque * last.rpm * Math.PI / 30) / 735.5 };
}

export function drawChart(
  canvas: HTMLCanvasElement,
  lut: LutPoint[],
  maxRpm: number,
  peakTorque: number,
  _maxPower: number,
  hoverRpm: number | null = null,
): void {
  currentData = { canvas, lut, maxRpm, peakTorque, maxPower: _maxPower };

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

  // hover overlay
  if (hoverRpm !== null && lut.length > 1) {
    const x = toX(hoverRpm);

    // vertical crosshair
    ctx.beginPath();
    ctx.strokeStyle = 'rgba(255,255,255,0.12)';
    ctx.lineWidth = 1;
    ctx.setLineDash([3, 4]);
    ctx.moveTo(x, pad.t);
    ctx.lineTo(x, H - pad.b);
    ctx.stroke();
    ctx.setLineDash([]);

    const { torque, power } = interpolateAt(lut, hoverRpm);
    const yTorque = toY(torque, unifiedMax);
    const yPower = toY(power, unifiedMax);

    // dot on power curve
    ctx.beginPath();
    ctx.fillStyle = '#e84060';
    ctx.arc(x, yPower, 3.5, 0, Math.PI * 2);
    ctx.fill();

    // dot on torque curve
    ctx.beginPath();
    ctx.fillStyle = '#e8c840';
    ctx.arc(x, yTorque, 3.5, 0, Math.PI * 2);
    ctx.fill();

    // tooltip
    const tipW = 108, tipH = 58, tipPad = 8;
    const tipX = hoverRpm > maxRpm * 0.6 ? x - tipW - 10 : x + 10;
    const tipY = pad.t + 8;

    ctx.fillStyle = 'rgba(8, 8, 18, 0.88)';
    ctx.strokeStyle = 'rgba(255,255,255,0.08)';
    ctx.lineWidth = 0.5;
    ctx.beginPath();
    ctx.roundRect(tipX, tipY, tipW, tipH, 3);
    ctx.fill();
    ctx.stroke();

    ctx.textAlign = 'left';
    ctx.font = '9px Share Tech Mono, monospace';

    ctx.fillStyle = 'rgba(140,140,170,0.85)';
    ctx.fillText(`${Math.round(hoverRpm).toLocaleString()} RPM`, tipX + tipPad, tipY + 15);

    ctx.fillStyle = '#e84060';
    ctx.fillText(`PWR  ${Math.round(power)} PS`, tipX + tipPad, tipY + 32);

    ctx.fillStyle = '#e8c840';
    ctx.fillText(`TRQ  ${Math.round(torque)} N·m`, tipX + tipPad, tipY + 49);
  }
}

export function setupChartHover(canvas: HTMLCanvasElement): void {
  canvas.addEventListener('mousemove', (e) => {
    if (!currentData) return;
    const { lut, maxRpm, peakTorque, maxPower } = currentData;

    const rect = canvas.getBoundingClientRect();
    const mouseX = e.clientX - rect.left;
    const W = rect.width;
    const pad = { l: 48, r: 48 };

    if (mouseX < pad.l || mouseX > W - pad.r) {
      drawChart(canvas, lut, maxRpm, peakTorque, maxPower);
      return;
    }

    const rpm = ((mouseX - pad.l) / (W - pad.l - pad.r)) * maxRpm;
    drawChart(canvas, lut, maxRpm, peakTorque, maxPower, Math.max(0, Math.min(maxRpm, rpm)));
  });

  canvas.addEventListener('mouseleave', () => {
    if (!currentData) return;
    const { lut, maxRpm, peakTorque, maxPower } = currentData;
    drawChart(canvas, lut, maxRpm, peakTorque, maxPower);
  });
}
