const titleCase = (value) => String(value ?? "").replace(/([A-Z])/g, " $1").replace(/^./, (m) => m.toUpperCase()).trim();

import { normalizeSpellRuntimeData, buildSpellEffectSummary, buildSpellDurationSummary, buildSpellReversalContext, buildSpellManualResolutionNotes } from "../../spells/spell-runtime.js";

const LEGACY_FIELDS = Object.freeze(["spellRange", "spellDuration", "targetType", "saveType"]);

function assert(condition, message) {
  if (!condition) throw new Error(`[BECMI Spell Schema] ${message}`);
}

function sanitizeObject(value) {
  if (Array.isArray(value)) return value.map((entry) => sanitizeObject(entry)).filter((entry) => entry !== undefined);
  if (value && typeof value === "object") {
    const out = {};
    for (const [key, child] of Object.entries(value)) {
      const next = sanitizeObject(child);
      if (next !== undefined) out[key] = next;
    }
    return out;
  }
  return value === undefined ? undefined : value;
}

export function normalizeSpellData(system = {}) {
  assert(system && typeof system === "object" && !Array.isArray(system), "system must be an object.");
  for (const field of LEGACY_FIELDS) {
    assert(!(field in system), `Legacy field "${field}" is not allowed in canonical spell schema.`);
  }

  const normalized = {
    ...system,
    range: sanitizeObject({ type: system.range?.type ?? "special", value: system.range?.value ?? null, special: system.range?.special ?? "" }),
    duration: sanitizeObject({ type: system.duration?.type ?? "instant", value: system.duration?.value ?? null, special: system.duration?.special ?? "" }),
    targeting: sanitizeObject({
      type: system.targeting?.type ?? "self",
      value: system.targeting?.value ?? null,
      units: system.targeting?.units ?? "",
      area: sanitizeObject({
        shape: system.targeting?.area?.shape ?? "",
        size: system.targeting?.area?.size ?? null,
        units: system.targeting?.area?.units ?? ""
      })
    }),
    savingThrow: sanitizeObject({ allowed: Boolean(system.savingThrow?.allowed), type: system.savingThrow?.type ?? "", negates: Boolean(system.savingThrow?.negates) }),
    effect: sanitizeObject({ summary: system.effect?.summary ?? "", damage: Array.isArray(system.effect?.damage) ? system.effect.damage : [], conditions: Array.isArray(system.effect?.conditions) ? system.effect.conditions : [] }),
    scaling: sanitizeObject({ progression: system.scaling?.progression ?? "", formula: system.scaling?.formula ?? "" }),
    automation: sanitizeObject({ supported: Boolean(system.automation?.supported), mode: system.automation?.mode ?? "none", config: sanitizeObject(system.automation?.config ?? {}) }),
    source: sanitizeObject({ book: system.source?.book ?? "", page: system.source?.page ?? "", notes: system.source?.notes ?? "" }),
    description: sanitizeObject({ summary: system.description?.summary ?? "", text: system.description?.text ?? "" }),
    reverse: sanitizeObject({ spellKey: system.reverse?.spellKey ?? "", name: system.reverse?.name ?? "", effect: system.reverse?.effect ?? "" }),
    manualNotes: system.manualNotes ?? "",
    stacking: sanitizeObject({ sameSpellPolicy: system.stacking?.sameSpellPolicy ?? "", key: system.stacking?.key ?? "" })
  };

  return sanitizeObject(normalized);
}

function formatDuration(duration = {}) {
  if (duration.special) return duration.special;
  if (duration.type === "instant") return "Instant";
  if (duration.type === "permanent") return "Permanent";
  return `${Number(duration.value) || 0} ${duration.type ?? ""}`.trim();
}

function formatRange(range = {}) {
  if (range.type === "special") return range.special || "Special";
  if (["self", "touch", "unlimited"].includes(range.type)) return titleCase(range.type);
  return `${Number(range.value) || 0} ${range.type ?? ""}`.trim();
}

export function prepareSpellData(item) {
  if (!item || item.type !== "spell") return {};
  const system = normalizeSpellData(item.system ?? {});
  const spellLists = Array.isArray(system.spellLists) ? system.spellLists : [];
  const runtime = normalizeSpellRuntimeData({ ...system, name: item.name });
  const effectSummary = buildSpellEffectSummary(runtime);
  const durationSummary = buildSpellDurationSummary(runtime.duration);
  const reversal = buildSpellReversalContext(runtime);
  return {
    labels: {
      spellLists: spellLists.map(titleCase).join(", "),
      duration: formatDuration(system.duration),
      range: formatRange(system.range),
      effect: effectSummary.summary || "See spell text",
      durationFamily: durationSummary.family,
      save: effectSummary.save,
      reversible: reversal.label
    },
    computed: {
      hasAreaTargeting: Boolean(system.targeting?.area?.shape),
      hasSavingThrow: Boolean(system.savingThrow?.allowed),
      supportsAutomation: Boolean(system.automation?.supported),
      runtime,
      manualResolutionNotes: buildSpellManualResolutionNotes(runtime),
      area: effectSummary.area
    }
  };
}
