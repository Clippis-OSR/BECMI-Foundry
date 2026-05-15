export const EXPLORATION_LIGHT_SOURCE_RULES = Object.freeze({
  torch: Object.freeze({
    lightKey: 'torch',
    label: 'Torch',
    radiusFeet: 30,
    durationTurns: 6
  }),
  lantern: Object.freeze({
    lightKey: 'lantern',
    label: 'Lantern',
    radiusFeet: 30,
    durationTurns: 24
  }),
  oilFlask: Object.freeze({
    lightKey: 'oilFlask',
    label: 'Oil Flask',
    radiusFeet: 30,
    durationTurns: 24
  }),
  continualLight: Object.freeze({
    lightKey: 'continualLight',
    label: 'Continual Light',
    radiusFeet: 30,
    durationTurns: Number.POSITIVE_INFINITY
  }),
  genericLight: Object.freeze({
    lightKey: 'genericLight',
    label: 'Generic Light',
    radiusFeet: 20,
    durationTurns: 6
  })
});

export const EXPLORATION_RESOURCE_TICK_EXTENSION_POINTS = Object.freeze({
  light: Object.freeze({ enabled: true, handler: 'tickLightSources' }),
  spellDurations: Object.freeze({ enabled: false, handler: 'tickSpellDurations' }),
  fatigue: Object.freeze({ enabled: false, handler: 'tickFatigue' }),
  rations: Object.freeze({ enabled: false, handler: 'tickRations' }),
  water: Object.freeze({ enabled: false, handler: 'tickWater' }),
  conditions: Object.freeze({ enabled: false, handler: 'tickConditions' })
});
