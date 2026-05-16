import { getMonsterByKey } from '../monsters/monster-index.mjs';

const CANONICAL_TREASURE_CODES = Object.freeze(['A','B','C','D','E','F','G','H','I','J','K','L','M','N','O','P']);
const COIN_DENOMINATIONS = Object.freeze(['cp', 'sp', 'ep', 'gp', 'pp']);

function normalizeCode(value) {
  const code = String(value ?? '').trim().toUpperCase();
  return CANONICAL_TREASURE_CODES.includes(code) ? code : null;
}

export function parseCanonicalTreasureCodes(input) {
  if (Array.isArray(input)) return input.map((value) => normalizeCode(value)).filter(Boolean);

  const text = String(input ?? '').trim();
  if (!text) return [];
  const codes = [];
  for (const match of text.matchAll(/\b[A-P]\b|\([A-P]\)/gi)) {
    const code = normalizeCode(match[0].replace(/[()]/g, ''));
    if (code) codes.push(code);
  }
  return codes;
}

export function buildCoinTreasure({ cp = 0, sp = 0, ep = 0, gp = 0, pp = 0 } = {}) {
  const coins = { cp, sp, ep, gp, pp };
  const normalized = {};
  for (const denom of COIN_DENOMINATIONS) {
    const n = Number(coins[denom]);
    normalized[denom] = Number.isFinite(n) ? Math.max(0, Math.trunc(n)) : 0;
  }
  return Object.freeze(normalized);
}

export function createTreasureVisibility({ encounterTreasure = true, gmOnlyDetails = true } = {}) {
  return Object.freeze({ encounterTreasure: Boolean(encounterTreasure), gmOnlyDetails: Boolean(gmOnlyDetails) });
}

export function buildGemJewelryHooks({ gems = null, jewelry = null } = {}) {
  return Object.freeze({ gems, jewelry, placeholdersOnly: true });
}

export function lookupCanonicalMonsterTreasure(monsterKey) {
  if (!monsterKey) throw new Error('[BECMI Treasure] lookupCanonicalMonsterTreasure requires monsterKey.');
  const monster = getMonsterByKey(monsterKey);
  if (!monster) throw new Error(`[BECMI Treasure] monster "${monsterKey}" not found in canonical monster index.`);
  const system = monster.system ?? monster;
  const treasure = system.treasure ?? {};
  const codes = parseCanonicalTreasureCodes(
    Array.isArray(treasure.normalizedCodes) && treasure.normalizedCodes.length ? treasure.normalizedCodes : system.treasureType
  );

  return Object.freeze({
    monsterKey: String(system.monsterKey ?? monsterKey),
    raw: String(treasure.raw ?? system.treasureType ?? ''),
    codes,
    canonicalOnly: true
  });
}
