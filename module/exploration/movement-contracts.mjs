import { normalizeMovementValue } from "./movement.mjs";

const MOVEMENT_CONTEXTS = Object.freeze(new Set([
  "dungeonExploration",
  "dungeonCombat",
  "wildernessExploration",
  "wildernessCombat",
  "wildernessForcedMarch",
  "dungeonRunning",
  "wildernessPursuit"
]));

const TERRAIN_MULTIPLIERS = Object.freeze({
  normal: 1,
  road: 1.25,
  rough: 0.75,
  mountains: 0.5,
  swamp: 0.5
});

const DISTANCE_CATEGORIES = Object.freeze(new Set([
  "movementDistance",
  "weaponRange",
  "spellRange",
  "spellArea"
]));

const MOVEMENT_SOURCES = Object.freeze(new Set(["actor", "mount", "vehicle"]));

const asArray = (value) => (Array.isArray(value) ? value : []);

const normalizeActorMovement = (actor = {}) => {
  const movementValue = normalizeMovementValue(actor?.movementValue ?? actor?.movement ?? actor?.speed);
  const isActive = actor?.active !== false && actor?.incapacitated !== true;
  return Object.freeze({
    id: actor?.id ?? null,
    name: actor?.name ?? "Unknown",
    movementValue,
    isActive
  });
};

export function getSlowestPartyMember(party = []) {
  const members = asArray(party).map(normalizeActorMovement).filter((member) => member.isActive);
  if (members.length === 0) return null;
  return members.slice().sort((a, b) => (a.movementValue - b.movementValue) || String(a.id).localeCompare(String(b.id)))[0];
}

export function getPartyMovement(party = []) {
  const slowest = getSlowestPartyMember(party);
  return slowest ? slowest.movementValue : 0;
}

export function getPartyMovementSummary(party = []) {
  const normalized = asArray(party).map(normalizeActorMovement);
  const activeMembers = normalized.filter((member) => member.isActive);
  const slowest = getSlowestPartyMember(party);

  return Object.freeze({
    partyMovement: slowest ? slowest.movementValue : 0,
    slowestActorId: slowest?.id ?? null,
    slowestActorName: slowest?.name ?? null,
    diagnostics: Object.freeze([
      `partySize=${normalized.length}`,
      `activePartySize=${activeMembers.length}`,
      `invalidMovementCount=${activeMembers.filter((m) => m.movementValue === 0).length}`
    ])
  });
}

export function normalizeMovementContext(context) {
  return MOVEMENT_CONTEXTS.has(context) ? context : "dungeonExploration";
}

export function getRunningMovement(movementValue, context = "dungeonRunning") {
  const normalizedContext = normalizeMovementContext(context);
  const base = normalizeMovementValue(movementValue);
  return Object.freeze({ context: normalizedContext, movementValue: normalizedContext === "dungeonRunning" ? base * 2 : base, sustainable: false });
}

export function getPursuitMovement(movementValue, context = "wildernessPursuit") {
  const normalizedContext = normalizeMovementContext(context);
  const base = normalizeMovementValue(movementValue);
  return Object.freeze({ context: normalizedContext, movementValue: normalizedContext === "wildernessPursuit" ? base * 2 : base, mayExceedCombatMovement: true });
}

export function getForcedMarchState(milesPerDay, forcedMarchUsed = false) {
  const baseMilesPerDay = Number.isFinite(Number(milesPerDay)) ? Number(milesPerDay) : 0;
  const used = forcedMarchUsed === true;
  const forcedMarchDistanceBonus = used ? baseMilesPerDay * 0.5 : 0;
  return Object.freeze({
    forcedMarchUsed: used,
    forcedMarchDistanceBonus,
    restRequiredAfterForcedMarch: used,
    modifiedMilesPerDay: used ? baseMilesPerDay + forcedMarchDistanceBonus : baseMilesPerDay
  });
}

export function getTerrainModifier(terrainKey = "normal") {
  const key = Object.hasOwn(TERRAIN_MULTIPLIERS, terrainKey) ? terrainKey : "normal";
  return Object.freeze({ terrainKey: key, terrainMultiplier: TERRAIN_MULTIPLIERS[key] });
}

export function applyTerrainToDailyTravel(milesPerDay, terrainKey = "normal") {
  const baseMilesPerDay = Number.isFinite(Number(milesPerDay)) ? Number(milesPerDay) : 0;
  const terrain = getTerrainModifier(terrainKey);
  return Object.freeze({
    terrainKey: terrain.terrainKey,
    terrainMultiplier: terrain.terrainMultiplier,
    modifiedMilesPerDay: baseMilesPerDay * terrain.terrainMultiplier
  });
}

export function getMovementSource(source = "actor") {
  return MOVEMENT_SOURCES.has(source) ? source : "actor";
}

export function resolveMovementFromSource(movementValue, source = "actor") {
  const movementSource = getMovementSource(source);
  return Object.freeze({ movementSource, movementValue: normalizeMovementValue(movementValue), placeholder: movementSource !== "actor" });
}

export function getDistanceCategory(category = "movementDistance") {
  return DISTANCE_CATEGORIES.has(category) ? category : "movementDistance";
}

export function isSpellAreaAlwaysFeet(category = "spellArea") {
  return getDistanceCategory(category) === "spellArea";
}

export function shouldConvertDistance(category, context) {
  const normalizedCategory = getDistanceCategory(category);
  const normalizedContext = normalizeMovementContext(context);
  if (normalizedCategory === "spellArea") return false;
  return normalizedContext.startsWith("wilderness");
}

export function convertDistanceByContext(distanceFeet, category, context) {
  const normalizedDistance = normalizeMovementValue(distanceFeet);
  const normalizedCategory = getDistanceCategory(category);
  const normalizedContext = normalizeMovementContext(context);

  if (!shouldConvertDistance(normalizedCategory, normalizedContext)) return normalizedDistance;
  return normalizedDistance;
}
