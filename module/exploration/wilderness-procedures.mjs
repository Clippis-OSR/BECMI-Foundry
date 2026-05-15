const safeInt = (value, fallback = 0) => {
  const n = Number(value);
  return Number.isFinite(n) ? Math.floor(n) : fallback;
};

const clampNonNegative = (value, fallback = 0) => Math.max(0, safeInt(value, fallback));

const normalizeModifier = (value) => safeInt(value, 0);

const normalizeDieRoll = (value, fallback = 1, min = 1, max = 6) => {
  const n = safeInt(value, fallback);
  return Math.max(min, Math.min(max, n));
};

function buildCheckResult({ type, dieRoll, target, modifier, adjustedTarget, success, assumptions, diagnostics }) {
  return Object.freeze({
    type,
    input: Object.freeze({
      dieRoll,
      target,
      modifier,
      adjustedTarget,
      assumptions: Object.freeze([...assumptions])
    }),
    output: Object.freeze({ success, margin: adjustedTarget - dieRoll }),
    diagnostics: Object.freeze([...diagnostics])
  });
}

export function resolveWildernessEncounterCheck(input = {}) {
  const cadenceTurns = Math.max(1, clampNonNegative(input?.cadenceTurns, 3));
  const cadenceCounter = clampNonNegative(input?.cadenceCounter, 0);
  const nextCounter = cadenceCounter + 1;
  const cadenceDue = nextCounter >= cadenceTurns;
  const dieRoll = normalizeDieRoll(input?.dieRoll, 1, 1, 6);
  const baseTarget = Math.max(1, clampNonNegative(input?.target, 1));
  const modifier = normalizeModifier(input?.modifier);
  const adjustedTarget = Math.max(1, Math.min(6, baseTarget + modifier));
  const encounterTriggered = cadenceDue && dieRoll <= adjustedTarget;

  return Object.freeze({
    type: 'wildernessEncounterCheck',
    cadence: Object.freeze({ cadenceTurns, cadenceCounter, nextCounter, cadenceDue }),
    check: buildCheckResult({
      type: 'wildernessEncounterCheck',
      dieRoll,
      target: baseTarget,
      modifier,
      adjustedTarget,
      success: encounterTriggered,
      assumptions: ['d6 check', 'encounter only checked when cadence is due', 'success on roll <= adjusted target'],
      diagnostics: [
        `cadence due: ${cadenceDue ? 'yes' : 'no'}`,
        `encounter check d6=${dieRoll} target<=${adjustedTarget}`
      ]
    }),
    nextCadenceCounter: cadenceDue ? 0 : nextCounter
  });
}

export function resolveWildernessLostCheck(input = {}) {
  const dieRoll = normalizeDieRoll(input?.dieRoll, 1, 1, 6);
  const baseTarget = Math.max(1, clampNonNegative(input?.target, 1));
  const modifier = normalizeModifier(input?.modifier);
  const adjustedTarget = Math.max(1, Math.min(6, baseTarget + modifier));
  const lost = dieRoll <= adjustedTarget;

  return buildCheckResult({
    type: 'wildernessLostCheck',
    dieRoll,
    target: baseTarget,
    modifier,
    adjustedTarget,
    success: lost,
    assumptions: ['d6 check', 'party gets lost on roll <= adjusted target'],
    diagnostics: [`lost check d6=${dieRoll} target<=${adjustedTarget}`]
  });
}

export function resolveWildernessEvasionCheck(input = {}) {
  const dieRoll = normalizeDieRoll(input?.dieRoll, 7, 2, 12);
  const baseTarget = Math.max(2, clampNonNegative(input?.target, 7));
  const modifier = normalizeModifier(input?.modifier);
  const adjustedTarget = Math.max(2, Math.min(12, baseTarget + modifier));
  const evadeSucceeded = dieRoll <= adjustedTarget;

  return buildCheckResult({
    type: 'wildernessEvasionCheck',
    dieRoll,
    target: baseTarget,
    modifier,
    adjustedTarget,
    success: evadeSucceeded,
    assumptions: ['2d6 total check', 'evasion succeeds on roll <= adjusted target'],
    diagnostics: [`evasion check 2d6=${dieRoll} target<=${adjustedTarget}`]
  });
}

export function resolveWildernessPursuitCheck(input = {}) {
  const dieRoll = normalizeDieRoll(input?.dieRoll, 7, 2, 12);
  const baseTarget = Math.max(2, clampNonNegative(input?.target, 7));
  const modifier = normalizeModifier(input?.modifier);
  const adjustedTarget = Math.max(2, Math.min(12, baseTarget + modifier));
  const pursuitSucceeded = dieRoll <= adjustedTarget;

  return buildCheckResult({
    type: 'wildernessPursuitCheck',
    dieRoll,
    target: baseTarget,
    modifier,
    adjustedTarget,
    success: pursuitSucceeded,
    assumptions: ['2d6 total check', 'pursuit catches target on roll <= adjusted target'],
    diagnostics: [`pursuit check 2d6=${dieRoll} target<=${adjustedTarget}`]
  });
}
