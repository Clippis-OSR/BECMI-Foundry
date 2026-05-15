import { EXPLORATION_LIGHT_SOURCE_RULES } from '../rules/exploration.mjs';

const asArray = (value) => (Array.isArray(value) ? value : []);

const isInfiniteDuration = (value) => value === Number.POSITIVE_INFINITY;

const asTurnCount = (value, fallback = 0) => {
  if (isInfiniteDuration(value)) return Number.POSITIVE_INFINITY;
  const n = Number(value);
  if (!Number.isFinite(n)) return fallback;
  return Math.max(0, Math.floor(n));
};

export function getLightSourceRules(lightKey) {
  const key = String(lightKey ?? '').trim();
  return EXPLORATION_LIGHT_SOURCE_RULES[key] ?? EXPLORATION_LIGHT_SOURCE_RULES.genericLight;
}

export function getLightSourceOptions() {
  return Object.values(EXPLORATION_LIGHT_SOURCE_RULES).map((rule) => Object.freeze({
    lightKey: rule.lightKey,
    label: rule.label,
    radiusFeet: rule.radiusFeet,
    durationTurns: rule.durationTurns
  }));
}

export function normalizeLightSource(source = {}) {
  const requestedKey = String(source?.lightKey ?? source?.key ?? '').trim();
  const fallbackUsed = Boolean(requestedKey) && !EXPLORATION_LIGHT_SOURCE_RULES[requestedKey];
  const rules = getLightSourceRules(requestedKey);
  const diagnostics = [];

  if (fallbackUsed) diagnostics.push(`invalid lightKey: ${requestedKey}`);

  const hasSourceDuration = source?.durationTurns !== undefined && source?.durationTurns !== null;
  const durationTurns = asTurnCount(
    hasSourceDuration ? source.durationTurns : rules.durationTurns,
    Number.NaN
  );

  if (!Number.isFinite(durationTurns) && !isInfiniteDuration(durationTurns)) {
    diagnostics.push(`missing duration: ${rules.lightKey}`);
  }

  const canonicalDuration = Number.isFinite(durationTurns) || isInfiniteDuration(durationTurns)
    ? durationTurns
    : 0;

  const rawRemaining = source?.remainingTurns;
  let remainingTurns = rawRemaining === undefined || rawRemaining === null
    ? canonicalDuration
    : asTurnCount(rawRemaining, canonicalDuration);

  if (Number(rawRemaining) < 0) {
    diagnostics.push(`negative remainingTurns: ${rules.lightKey}`);
    remainingTurns = 0;
  }

  const active = Boolean(source?.active ?? true) && (isInfiniteDuration(remainingTurns) || remainingTurns > 0);

  if (!active && !isInfiniteDuration(remainingTurns) && remainingTurns <= 0) {
    diagnostics.push(`expired light: ${rules.lightKey}`);
  }

  return Object.freeze({
    lightKey: rules.lightKey,
    label: String(source?.label ?? rules.label),
    radiusFeet: Number.isFinite(Number(source?.radiusFeet)) ? Number(source.radiusFeet) : rules.radiusFeet,
    durationTurns: canonicalDuration,
    remainingTurns,
    active,
    sourceItemId: source?.sourceItemId ?? source?.itemId ?? null,
    uuid: source?.uuid ?? null,
    diagnostics: Object.freeze(diagnostics)
  });
}

export const normalizeActiveLightSource = normalizeLightSource;

export function tickLightSources(activeSources = [], explorationTurns = 1) {
  const turnsToTick = asTurnCount(explorationTurns, 0);
  return asArray(activeSources).map((entry) => {
    const source = normalizeLightSource(entry);
    if (!source.active || turnsToTick <= 0 || isInfiniteDuration(source.remainingTurns)) return source;

    const remainingTurns = Math.max(0, source.remainingTurns - turnsToTick);
    const diagnostics = [...source.diagnostics];

    if (remainingTurns === 0 && source.remainingTurns > 0) diagnostics.push(`expired light: ${source.lightKey}`);

    return Object.freeze({
      ...source,
      remainingTurns,
      active: remainingTurns > 0,
      diagnostics: Object.freeze(diagnostics)
    });
  });
}

export function getExpiredLightSources(activeSources = []) {
  return asArray(activeSources)
    .map((source) => normalizeLightSource(source))
    .filter((source) => !source.active || (!isInfiniteDuration(source.remainingTurns) && source.remainingTurns <= 0));
}

export function getActiveLightSummary(activeSources = []) {
  const normalized = asArray(activeSources).map((source) => normalizeLightSource(source));
  const activeSourcesOnly = normalized.filter((source) => source.active);
  const inactiveSourcesOnly = normalized.filter((source) => !source.active);

  return Object.freeze({
    activeCount: activeSourcesOnly.length,
    inactiveCount: inactiveSourcesOnly.length,
    brightestRadiusFeet: activeSourcesOnly.reduce((max, source) => Math.max(max, source.radiusFeet), 0),
    active: Object.freeze(activeSourcesOnly),
    inactive: Object.freeze(inactiveSourcesOnly),
    diagnostics: Object.freeze(normalized.flatMap((source) => source.diagnostics))
  });
}
