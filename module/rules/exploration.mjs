export const EXPLORATION_LIGHT_SOURCE_RULES = Object.freeze({
  torch: Object.freeze({
    lightKey: 'torch',
    label: 'Torch',
    radius: 30,
    durationTurns: 6
  }),
  lantern: Object.freeze({
    lightKey: 'lantern',
    label: 'Lantern',
    radius: 30,
    durationTurns: 24
  }),
  oilFlask: Object.freeze({
    lightKey: 'oilFlask',
    label: 'Oil Flask',
    radius: 30,
    durationTurns: 24
  }),
  genericLight: Object.freeze({
    lightKey: 'genericLight',
    label: 'Generic Light',
    radius: 20,
    durationTurns: 6
  })
});

export const EXPLORATION_RESOURCE_TICK_EXTENSION_POINTS = Object.freeze({
  light: Object.freeze({ enabled: true, handler: 'tickLightSources' }),
  rations: Object.freeze({ enabled: false, handler: 'tickRations' }),
  water: Object.freeze({ enabled: false, handler: 'tickWater' }),
  spellDurations: Object.freeze({ enabled: false, handler: 'tickSpellDurations' }),
  fatigue: Object.freeze({ enabled: false, handler: 'tickFatigue' }),
  effects: Object.freeze({ enabled: false, handler: 'tickEffects' })
});
