import { EXPLORATION_LIGHT_SOURCE_RULES } from '../rules/exploration.mjs';

const safeTurns = (value, fallback = 0) => {
  const n = Number(value);
  if (!Number.isFinite(n)) return fallback;
  return Math.max(0, Math.floor(n));
};

const asArray = (value) => (Array.isArray(value) ? value : []);

export function getLightSourceRules(lightKey) {
  const key = String(lightKey ?? '').trim();
  return EXPLORATION_LIGHT_SOURCE_RULES[key] ?? EXPLORATION_LIGHT_SOURCE_RULES.genericLight;
}

export function getLightSourceOptions() {
  return Object.values(EXPLORATION_LIGHT_SOURCE_RULES).map((rule) => Object.freeze({
    lightKey: rule.lightKey,
    label: rule.label,
    radius: rule.radius,
    durationTurns: rule.durationTurns
  }));
}

export function normalizeActiveLightSource(source = {}) {
  const requestedKey = String(source?.lightKey ?? source?.key ?? '').trim();
  const fallbackUsed = !EXPLORATION_LIGHT_SOURCE_RULES[requestedKey];
  const rules = getLightSourceRules(requestedKey);

  const diagnostics = [];
  if (requestedKey && fallbackUsed) diagnostics.push(`unknown light source: ${requestedKey}`);

  const durationTurns = safeTurns(source?.durationTurns, safeTurns(rules.durationTurns, 0));
  if (durationTurns <= 0) diagnostics.push(`missing duration: ${rules.lightKey}`);

  const rawRemaining = Number(source?.remainingTurns);
  let remainingTurns = Number.isFinite(rawRemaining) ? Math.floor(rawRemaining) : durationTurns;
  if (remainingTurns < 0) {
    diagnostics.push(`negative remainingTurns normalized to 0: ${rules.lightKey}`);
    remainingTurns = 0;
  }

  const active = Boolean(source?.active ?? true) && remainingTurns > 0;
  if (!active && remainingTurns <= 0) diagnostics.push(`expired light: ${rules.lightKey}`);

  return Object.freeze({
    lightKey: rules.lightKey,
    label: String(source?.label ?? rules.label),
    radius: Number.isFinite(Number(source?.radius)) ? Number(source.radius) : rules.radius,
    durationTurns,
    remainingTurns,
    sourceItemId: source?.sourceItemId ?? source?.itemId ?? null,
    uuid: source?.uuid ?? null,
    active,
    diagnostics: Object.freeze(diagnostics)
  });
}

export function tickLightSources(activeSources = [], explorationTurn = 0) {
  const turnsToTick = safeTurns(explorationTurn, 0);
  const normalized = asArray(activeSources).map((source) => normalizeActiveLightSource(source));

  return normalized.map((source) => {
    if (!source.active || turnsToTick === 0) return source;
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
    .map((source) => normalizeActiveLightSource(source))
    .filter((source) => source.remainingTurns <= 0 || source.active === false);
}

export function getActiveLightSummary(activeSources = []) {
  const normalized = asArray(activeSources).map((source) => normalizeActiveLightSource(source));
  const active = normalized.filter((source) => source.active);
  const expired = normalized.filter((source) => !source.active);

  return Object.freeze({
    activeCount: active.length,
    inactiveCount: expired.length,
    brightestRadius: active.reduce((max, source) => Math.max(max, source.radius), 0),
    active: Object.freeze(active),
    inactive: Object.freeze(expired),
    diagnostics: Object.freeze(normalized.flatMap((source) => source.diagnostics))
  });
}
