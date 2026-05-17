import { buildSpellCastingContext, buildSpellDurationSummary, buildSpellEffectSummary, buildSpellManualResolutionNotes } from "../../spells/spell-runtime.js";

export function validateSpellCastState({ actor, casterKey = "", level = "1", preparedIndex = -1 } = {}) {
  const caster = actor?.system?.spellcasting?.casters?.[casterKey];
  if (!caster?.enabled) return { ok: false, reason: "Actor is not a valid caster." };
  const prepared = caster?.prepared?.[level];
  if (!Array.isArray(prepared)) return { ok: false, reason: "Prepared spell list is unavailable." };
  const ref = prepared[Number(preparedIndex)];
  if (!ref?.spellKey) return { ok: false, reason: "Prepared spell entry is missing." };
  const slot = caster?.slots?.[level];
  const max = Number(slot?.max) || 0;
  const used = Number(slot?.used) || 0;
  if (used >= max) return { ok: false, reason: "No spell slots available at this level." };
  return { ok: true, ref };
}

export function buildSpellCastChatContent({ actorName = "", castContext, shouldTrack = false } = {}) {
  const duration = buildSpellDurationSummary(castContext.duration);
  const effect = buildSpellEffectSummary(castContext.runtime);
  const notes = buildSpellManualResolutionNotes(castContext.runtime, castContext.casterKey);
  return `<div class="becmi-spell-card"><h3>${actorName} casts ${castContext.displayName}.</h3><p><strong>Caster:</strong> ${castContext.casterLabel}</p><p><strong>Range:</strong> ${effect.range || "See spell text"}</p><p><strong>Duration:</strong> ${duration.label}</p><p><strong>Save:</strong> ${effect.save}</p><p><strong>Area/Effect:</strong> ${effect.area || effect.text || "See spell text"}</p><p><strong>Track Active Spell:</strong> ${shouldTrack ? "Yes" : "No"}</p><ul>${notes.map((n) => `<li>Manual: ${n}</li>`).join("")}</ul></div>`;
}

export function applySpellCastToState({ system, casterKey = "", level = "1", preparedIndex = -1, shouldConsumePrepared = true } = {}) {
  const caster = system?.spellcasting?.casters?.[casterKey];
  const slot = caster?.slots?.[level];
  const prepared = caster?.prepared?.[level];
  if (!caster || !slot || !Array.isArray(prepared)) return false;
  slot.used = Math.min(Number(slot.max) || 0, (Number(slot.used) || 0) + 1);
  if (shouldConsumePrepared) prepared.splice(Number(preparedIndex), 1);
  return true;
}

export function buildCastContext({ spellItem, casterKey = "", castAs = "normal" } = {}) {
  return buildSpellCastingContext({ spell: spellItem, casterKey, castAs });
}
