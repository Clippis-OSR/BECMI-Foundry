import {
  normalizeExplorationState as canonicalNormalizeExplorationState,
  advanceExplorationTurn as canonicalAdvanceExplorationTurn,
  getExplorationSummary as canonicalGetExplorationSummary
} from './runtime.mjs';

let warned = false;

function warnDeprecated() {
  if (warned) return;
  warned = true;
  console.warn('[BECMI Exploration] module/exploration/exploration-state.mjs is deprecated and will be removed. Use module/exploration/runtime.mjs as the sole exploration authority.');
}

export function normalizeExplorationState(state = {}, runtime = {}) {
  warnDeprecated();
  return canonicalNormalizeExplorationState(state, runtime);
}

export function advanceExplorationTurn(state = {}, runtime = {}) {
  warnDeprecated();
  return canonicalAdvanceExplorationTurn(state, runtime);
}

export function getExplorationSummary(state = {}, runtime = {}) {
  warnDeprecated();
  return canonicalGetExplorationSummary(state, runtime);
}
