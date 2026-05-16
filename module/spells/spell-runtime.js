const CASTER_LABELS = Object.freeze({ cleric: "Cleric", magicUser: "Magic-User", elf: "Elf", druid: "Druid" });

function text(value) { return typeof value === "string" ? value.trim() : ""; }
function list(value) { return Array.isArray(value) ? value.filter((v) => typeof v === "string" && v.trim()) : []; }

export function buildSpellDurationSummary(duration = {}) {
  const special = text(duration.special);
  const type = text(duration.type) || "special";
  const numericValue = Number(duration.value);
  let family = "special";
  if (["instant", "permanent"].includes(type)) family = "instantPermanent";
  else if (type === "rounds") family = "rounds";
  else if (type === "turns") family = "turns";
  else if (["hours", "days"].includes(type)) family = "hours";
  else if (special.toLowerCase().includes("concentration")) family = "concentrationManual";

  const label = special || (type === "instant" ? "Instant" : type === "permanent" ? "Permanent" : `${Number.isFinite(numericValue) ? numericValue : 0} ${type}`.trim());
  return { type, value: Number.isFinite(numericValue) ? numericValue : null, special, family, label };
}

export function buildSpellEffectSummary(runtime = {}) {
  const effect = runtime.effect ?? {};
  return {
    summary: text(effect.summary),
    area: text(runtime.targeting?.area?.shape) ? `${runtime.targeting.area.shape}${runtime.targeting?.area?.size ? ` ${runtime.targeting.area.size}${runtime.targeting.area.units ? ` ${runtime.targeting.area.units}` : ""}` : ""}`.trim() : "",
    save: runtime.savingThrow?.allowed ? `Save: ${text(runtime.savingThrow?.type) || "See spell text"}${runtime.savingThrow?.negates ? " (negates)" : ""}` : "No saving throw",
    tags: list(runtime.tags)
  };
}

export function buildSpellReversalContext(runtime = {}, casterKey = "") {
  const reversible = Boolean(runtime.reversible);
  const reverse = runtime.reverse ?? {};
  const casterType = text(casterKey);
  const castTimeChoice = reversible && casterType === "cleric";
  const memorizedSeparately = reversible && ["magicUser", "elf"].includes(casterType);
  return {
    reversible,
    reverseSpellKey: text(reverse.spellKey),
    reverseName: text(reverse.name),
    reverseEffect: text(reverse.effect),
    castTimeChoice,
    memorizedSeparately,
    label: reversible ? (castTimeChoice ? "May cast normal or reversed at cast time" : memorizedSeparately ? "Reversed form must be memorized separately" : "Reversible") : "Not reversible"
  };
}

export function buildSpellManualResolutionNotes(runtime = {}, casterKey = "") {
  const notes = [];
  notes.push("Manual resolution required: no automatic actor mutation is applied.");
  const reversal = buildSpellReversalContext(runtime, casterKey);
  if (reversal.castTimeChoice) notes.push("Cleric reversible spells: choose normal or reversed form at cast time.");
  if (reversal.memorizedSeparately) notes.push("Magic-User/Elf reversible spells: memorized normal/reversed forms are tracked separately.");
  if (runtime.stacking?.sameSpellPolicy) notes.push(`Stacking policy: ${runtime.stacking.sameSpellPolicy}`);
  if (text(runtime.manualNotes)) notes.push(text(runtime.manualNotes));
  return notes;
}

export function normalizeSpellRuntimeData(system = {}) {
  const duration = buildSpellDurationSummary(system.duration ?? {});
  return {
    spellKey: text(system.spellKey),
    name: text(system.name),
    spellLists: list(system.spellLists),
    level: Number(system.level) || 1,
    range: { ...system.range, label: text(system.range?.special) || (system.range?.type === "special" ? "Special" : `${Number(system.range?.value) || 0} ${text(system.range?.type)}`.trim()) },
    duration,
    targeting: system.targeting ?? {},
    effect: system.effect ?? {},
    reversible: Boolean(system.reversible),
    reverse: system.reverse ?? { spellKey: "", name: "", effect: "" },
    savingThrow: system.savingThrow ?? { allowed: false, type: "", negates: false },
    source: system.source ?? { book: "", page: "", notes: "" },
    rawRulesText: text(system.description?.text),
    tags: list(system.tags),
    manualNotes: text(system.manualNotes),
    stacking: { sameSpellPolicy: text(system.stacking?.sameSpellPolicy) || "Identical spell effects generally do not stack with themselves.", key: text(system.stacking?.key) || text(system.spellKey) }
  };
}

export function buildSpellCastingContext({ spell, casterKey = "", castAs = "normal" } = {}) {
  const runtime = normalizeSpellRuntimeData(spell?.system ?? spell ?? {});
  const reversal = buildSpellReversalContext(runtime, casterKey);
  const castForm = castAs === "reversed" && reversal.reversible ? "reversed" : "normal";
  return {
    spellKey: runtime.spellKey,
    spellName: runtime.name,
    casterKey,
    casterLabel: CASTER_LABELS[casterKey] ?? casterKey,
    castForm,
    reversal,
    duration: runtime.duration,
    effect: buildSpellEffectSummary(runtime),
    notes: buildSpellManualResolutionNotes(runtime, casterKey),
    chatSummary: `${runtime.name || runtime.spellKey} (${castForm}) • ${runtime.duration.label} • ${buildSpellEffectSummary(runtime).save}`
  };
}
