const PROTECTED_UPDATE_PATHS = Object.freeze([
  "system.derived",
  "system.saves",
  "system.ac.value",
  "system.ac.base",
  "system.ac.breakdown",
  "system.combat.thac0",
  "system.thac0",
  "system.movement",
  "system.encumbrance",
  "system.thiefSkills",
  "system.turnUndead"
]);

const LEGACY_MANUAL_DERIVED_PATHS = Object.freeze([
  "system.thac0",
  "system.movement",
  "system.encumbrance",
  "system.thiefSkills",
  "system.turnUndead",
  "system.spellSlots"
]);

export function stripProtectedDerivedActorUpdates(changes = {}) {
  const sanitized = foundry.utils.deepClone(changes ?? {});
  const removed = [];
  for (const path of PROTECTED_UPDATE_PATHS) {
    if (foundry.utils.hasProperty(sanitized, path)) {
      foundry.utils.unsetProperty(sanitized, path);
      removed.push(path);
    }
  }
  return { sanitized, removed };
}

export function detectLegacyManualDerivedFields(actorLike = {}) {
  return LEGACY_MANUAL_DERIVED_PATHS.filter((path) => foundry.utils.hasProperty(actorLike, path));
}
