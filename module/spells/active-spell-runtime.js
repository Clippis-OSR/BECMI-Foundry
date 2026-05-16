import { buildSpellDurationSummary, normalizeSpellRuntimeData } from "./spell-runtime.js";

const VERSION = 1;
const ACTIVE_STATES = Object.freeze(["active", "suppressed", "expired", "dismissed", "dispelled"]);
const DURATION_TYPES = Object.freeze(["instant", "rounds", "turns", "hours", "days", "special", "permanent"]);

function text(value) { return typeof value === "string" ? value.trim() : ""; }
function asInt(value, fallback = null) { const n = Number(value); return Number.isFinite(n) ? Math.trunc(n) : fallback; }
function clone(v) { return globalThis.foundry?.utils?.deepClone ? globalThis.foundry.utils.deepClone(v) : JSON.parse(JSON.stringify(v)); }

function normalizeRemaining(durationType, durationValue, remaining = {}) {
  if (["instant", "permanent", "special"].includes(durationType)) return {};
  const key = durationType;
  const base = asInt(durationValue, 0);
  const value = asInt(remaining?.[key], base);
  return { [key]: Math.max(0, value) };
}

export function deriveDurationTypeFromSpell(spellRuntime = {}) {
  const duration = buildSpellDurationSummary(spellRuntime.duration ?? {});
  return DURATION_TYPES.includes(duration.type) ? duration.type : "special";
}

export function createActiveSpellRuntime({ spell, casterActorId = "", casterTokenId = "", targetActorIds = [], targetTokenIds = [], sourceItemUuid = "", reverseMode = false, createdByUserId = "", concentrationLike = false, notes = [] } = {}) {
  const runtime = normalizeSpellRuntimeData(spell?.system ? { ...spell.system, name: spell.name } : spell ?? {});
  const durationType = deriveDurationTypeFromSpell(runtime);
  const durationValue = asInt(runtime.duration?.value, null);
  return {
    version: VERSION,
    id: globalThis.foundry?.utils?.randomID ? globalThis.foundry.utils.randomID() : `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    spellId: text(spell?.id),
    spellKey: text(runtime.spellKey),
    spellName: text(runtime.name),
    casterActorId: text(casterActorId) || undefined,
    casterTokenId: text(casterTokenId) || undefined,
    targetActorIds: Array.isArray(targetActorIds) ? targetActorIds.filter(Boolean) : [],
    targetTokenIds: Array.isArray(targetTokenIds) ? targetTokenIds.filter(Boolean) : [],
    sourceItemUuid: text(sourceItemUuid) || undefined,
    startedRound: undefined,
    startedTurn: undefined,
    startedTimestamp: Date.now(),
    durationType,
    durationValue,
    remaining: normalizeRemaining(durationType, durationValue),
    concentrationLike: Boolean(concentrationLike),
    reversible: Boolean(runtime.reversible),
    reverseMode: Boolean(reverseMode),
    dispellable: true,
    activeState: "active",
    stackingKey: text(runtime.stacking?.key || runtime.spellKey) || undefined,
    notes: Array.isArray(notes) ? notes.filter((n) => typeof n === "string" && n.trim()) : [],
    createdByUserId: text(createdByUserId) || undefined
  };
}

export function migrateActiveSpellRuntime(activeSpell = {}) {
  const next = clone(activeSpell ?? {});
  next.version = asInt(next.version, VERSION);
  if (!ACTIVE_STATES.includes(next.activeState)) next.activeState = "active";
  if (!DURATION_TYPES.includes(next.durationType)) next.durationType = "special";
  next.remaining = normalizeRemaining(next.durationType, next.durationValue, next.remaining ?? {});
  return next;
}

export function advanceSpellDurations(activeSpells = [], { unit = "rounds", amount = 1, includeSuppressed = false } = {}) {
  const step = Math.max(0, asInt(amount, 0));
  const updates = [];
  const messages = [];
  for (const raw of activeSpells) {
    const spell = migrateActiveSpellRuntime(raw);
    if (spell.activeState !== "active" && !(includeSuppressed && spell.activeState === "suppressed")) { updates.push(spell); continue; }
    if (!["rounds", "turns", "hours", "days"].includes(spell.durationType) || spell.durationType !== unit) { updates.push(spell); continue; }
    const before = asInt(spell.remaining?.[unit], 0);
    const after = Math.max(0, before - step);
    spell.remaining = { ...spell.remaining, [unit]: after };
    if (after === 0) {
      spell.activeState = "expired";
      messages.push(`${spell.spellName || spell.spellKey} effect expires.`);
    } else {
      messages.push(`${spell.spellName || spell.spellKey} has ${after} ${unit} remaining.`);
    }
    updates.push(spell);
  }
  return { activeSpells: updates, messages };
}

function transition(activeSpell, activeState, note) {
  const spell = migrateActiveSpellRuntime(activeSpell);
  spell.activeState = activeState;
  if (note) spell.notes = [...(spell.notes ?? []), note];
  return spell;
}

export const expireActiveSpell = (a, note = "Expired by adjudication.") => transition(a, "expired", note);
export const dismissActiveSpell = (a, note = "Dismissed by caster/GM.") => transition(a, "dismissed", note);
export const suppressActiveSpell = (a, note = "Suppressed by anti-magic/adjudication.") => transition(a, "suppressed", note);
export const restoreSuppressedSpell = (a, note = "Suppression lifted.") => transition(a, "active", note);
export const dispelActiveSpell = (a, note = "Dispelled.") => transition(a, "dispelled", note);
export const removeActiveSpell = (activeSpells = [], id = "") => activeSpells.filter((s) => text(s?.id) !== text(id));

export function buildActiveSpellSummary(activeSpell = {}) {
  const spell = migrateActiveSpellRuntime(activeSpell);
  const title = spell.reverseMode ? `${spell.spellName || spell.spellKey} (Reverse: Yes)` : `${spell.spellName || spell.spellKey} (Reverse: No)`;
  if (spell.durationType === "permanent") return `${title} — Permanent${spell.activeState === "active" ? "" : ` (${spell.activeState})`}`;
  if (spell.durationType === "special") return `${title} — Special Duration (${spell.activeState})`;
  if (spell.activeState !== "active") return `${title} — ${spell.activeState}`;
  const remaining = asInt(spell.remaining?.[spell.durationType], 0);
  return `${title} — ${remaining} ${spell.durationType} remaining`;
}
