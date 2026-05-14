import {
  clearSpellReferenceCache,
  getCachedSpellByKey,
  getCachedSpellByUuid,
  setCachedSpellByKey,
  setCachedSpellByUuid
} from "./spell-reference-cache.js";
import { validateSpellReference as baseValidateSpellReference } from "./spell-reference-validation.js";

const UUID_PATTERN = /^(?:Compendium\.|Actor\.|Item\.)/;

function uniqueSpellsByKey(spellKey) {
  const worldItems = Array.from(globalThis.game?.items ?? []).filter((item) => item?.type === "spell" && item?.system?.spellKey === spellKey);
  if (worldItems.length > 1) return { spell: null, duplicate: true };
  return { spell: worldItems[0] ?? null, duplicate: false };
}

function resolveSpellByUuidSync(uuid) {
  if (typeof uuid !== "string" || !uuid) return { spell: null, warning: "missing uuid" };
  if (!UUID_PATTERN.test(uuid)) return { spell: null, error: "invalid uuid" };
  const cached = getCachedSpellByUuid(uuid);
  if (cached) return { spell: cached, method: "uuid" };
  const fn = globalThis.fromUuidSync;
  if (typeof fn !== "function") return { spell: null, error: "missing spell item" };
  const spell = fn(uuid);
  if (!spell || spell?.type !== "spell") return { spell: null, error: "missing spell item" };
  setCachedSpellByUuid(uuid, spell);
  if (spell?.system?.spellKey) setCachedSpellByKey(spell.system.spellKey, spell);
  return { spell, method: "uuid" };
}

export async function resolveSpellByUuid(uuid) {
  const syncResult = resolveSpellByUuidSync(uuid);
  if (syncResult.spell || syncResult.error === "invalid uuid" || syncResult.warning === "missing uuid") return syncResult;
  const fn = globalThis.fromUuid;
  if (typeof fn !== "function") return syncResult;
  const spell = await fn(uuid);
  if (!spell || spell?.type !== "spell") return { spell: null, error: "missing spell item" };
  setCachedSpellByUuid(uuid, spell);
  if (spell?.system?.spellKey) setCachedSpellByKey(spell.system.spellKey, spell);
  return { spell, method: "uuid" };
}

export function resolveSpellByKey(spellKey) {
  if (typeof spellKey !== "string" || !spellKey) return { spell: null, error: "missing spell item" };
  const cached = getCachedSpellByKey(spellKey);
  if (cached) return { spell: cached, method: "spellKey" };
  const match = uniqueSpellsByKey(spellKey);
  if (match.duplicate) return { spell: null, error: "duplicate spellKey" };
  if (!match.spell) return { spell: null, error: "missing spell item" };
  setCachedSpellByKey(spellKey, match.spell);
  if (match.spell.uuid) setCachedSpellByUuid(match.spell.uuid, match.spell);
  return { spell: match.spell, method: "spellKey" };
}

export function resolveSpellByItemId(actor, itemId) {
  if (!actor || typeof itemId !== "string" || !itemId) return { spell: null, warning: "stale itemId" };
  const spell = actor?.items?.get?.(itemId) ?? null;
  if (!spell || spell?.type !== "spell") return { spell: null, warning: "stale itemId" };
  return { spell, method: "itemId", warning: "stale itemId" };
}

export function resolveSpellReferenceSync(ref, actor = null) {
  const validation = baseValidateSpellReference(ref);
  if (!validation.valid) return { spell: null, diagnostics: { valid: false, resolved: false, resolutionMethod: null, warnings: [], errors: validation.errors } };
  const diagnostics = { valid: true, resolved: false, resolutionMethod: null, warnings: [], errors: [] };

  const uuidResult = resolveSpellByUuidSync(ref.uuid);
  if (uuidResult.warning) diagnostics.warnings.push(uuidResult.warning);
  if (uuidResult.error) diagnostics.errors.push(uuidResult.error);
  if (uuidResult.spell) return { spell: uuidResult.spell, diagnostics: { ...diagnostics, resolved: true, resolutionMethod: "uuid" } };

  const keyResult = resolveSpellByKey(ref.spellKey);
  if (keyResult.error) diagnostics.errors.push(keyResult.error);
  if (keyResult.spell) return { spell: keyResult.spell, diagnostics: { ...diagnostics, resolved: true, resolutionMethod: "spellKey" } };

  const itemResult = resolveSpellByItemId(actor, ref.itemId);
  if (itemResult.warning) diagnostics.warnings.push(itemResult.warning);
  if (itemResult.spell) return { spell: itemResult.spell, diagnostics: { ...diagnostics, resolved: true, resolutionMethod: "itemId" } };

  diagnostics.errors.push("unresolved reference");
  return { spell: null, diagnostics };
}

export async function resolveSpellReference(ref, actor = null) {
  const sync = resolveSpellReferenceSync(ref, actor);
  if (sync.spell || sync.diagnostics.errors.includes("invalid uuid") || !ref?.uuid || typeof globalThis.fromUuid !== "function") return sync;

  const diagnostics = { ...sync.diagnostics, warnings: [...sync.diagnostics.warnings], errors: sync.diagnostics.errors.filter((e) => e !== "missing spell item") };
  const uuidResult = await resolveSpellByUuid(ref.uuid);
  if (uuidResult.error) diagnostics.errors.push(uuidResult.error);
  if (uuidResult.spell) return { spell: uuidResult.spell, diagnostics: { ...diagnostics, resolved: true, resolutionMethod: "uuid" } };
  return sync;
}

export function validateSpellReference(ref) { return baseValidateSpellReference(ref); }
export async function getSpellReferenceDiagnostics(ref, actor = null) { return (await resolveSpellReference(ref, actor)).diagnostics; }
export { clearSpellReferenceCache };
