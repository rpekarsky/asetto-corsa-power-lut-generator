export interface DomRefs {
  inputs: {
    teamName: HTMLInputElement;
    engineName: HTMLInputElement;
    character: HTMLSelectElement;
    maxRpm: HTMLSelectElement;
    maxRpmCustom: HTMLInputElement;
    maxPower: HTMLInputElement;
    peakTorque: HTMLInputElement;
    lutStep: HTMLInputElement;
    seed: HTMLInputElement;
    peakPos: HTMLInputElement;
    sharpness: HTMLInputElement;
    noise: HTMLInputElement;
  };
  stats: {
    torque: HTMLElement;
    rpm: HTMLElement;
    power: HTMLElement;
    band: HTMLElement;
  };
  display: {
    team: HTMLElement;
    engine: HTMLElement;
    power: HTMLElement;
    tags: HTMLElement;
    peakPosVal: HTMLElement;
    sharpnessVal: HTMLElement;
    noiseVal: HTMLElement;
  };
  lut: {
    torque: HTMLElement;
    auto: HTMLElement;
  };
  chart: HTMLCanvasElement;
  buttons: {
    generate: HTMLElement;
    randomize: HTMLElement;
    copyTorque: HTMLElement;
    copyAuto: HTMLElement;
    toggleRpm: HTMLElement;
  };
}

function ref<T extends HTMLElement>(id: string): T {
  const el = document.getElementById(id);
  if (!el) throw new Error(`Missing DOM element: #${id}`);
  return el as T;
}

export function collectRefs(): DomRefs {
  return {
    inputs: {
      teamName: ref<HTMLInputElement>('teamName'),
      engineName: ref<HTMLInputElement>('engineName'),
      character: ref<HTMLSelectElement>('character'),
      maxRpm: ref<HTMLSelectElement>('maxRpm'),
      maxRpmCustom: ref<HTMLInputElement>('maxRpmCustom'),
      maxPower: ref<HTMLInputElement>('maxPower'),
      peakTorque: ref<HTMLInputElement>('peakTorque'),
      lutStep: ref<HTMLInputElement>('lutStep'),
      seed: ref<HTMLInputElement>('seed'),
      peakPos: ref<HTMLInputElement>('peakPos'),
      sharpness: ref<HTMLInputElement>('sharpness'),
      noise: ref<HTMLInputElement>('noise'),
    },
    stats: {
      torque: ref('statTorque'),
      rpm: ref('statRpm'),
      power: ref('statPower'),
      band: ref('statBand'),
    },
    display: {
      team: ref('displayTeam'),
      engine: ref('displayEngine'),
      power: ref('displayPower'),
      tags: ref('displayTags'),
      peakPosVal: ref('peakPosVal'),
      sharpnessVal: ref('sharpnessVal'),
      noiseVal: ref('noiseVal'),
    },
    lut: {
      torque: ref('lutTorque'),
      auto: ref('lutAuto'),
    },
    chart: ref<HTMLCanvasElement>('chart'),
    buttons: {
      generate: ref('btnGenerate'),
      randomize: ref('btnRandomize'),
      copyTorque: ref('btnCopyTorque'),
      copyAuto: ref('btnCopyAuto'),
      toggleRpm: ref('btnToggleRpm'),
    },
  };
}
