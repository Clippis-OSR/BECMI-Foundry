import { resolveSpellReferenceSync } from "../../spells/spell-reference.js";
import { normalizeSpellRuntimeData, buildSpellDurationSummary, buildSpellEffectSummary, buildSpellReversalContext } from "../../spells/spell-runtime.js";
import { migrateActiveSpellRuntime, buildActiveSpellSummary } from "../../spells/active-spell-runtime.js";

const SPELL_LEVELS = ["1", "2", "3", "4", "5", "6"];
const CASTER_ORDER = ["magicUser", "cleric", "elf"];
const LABELS = { magicUser: "Magic-User", cleric: "Cleric", elf: "Elf" };

function resolveEntries(actor, entries, casterKey) {
  if (!Array.isArray(entries)) return [];
  return entries.map((ref) => {
    const resolved = resolveSpellReferenceSync(ref, actor);
    const runtime = resolved.spell ? normalizeSpellRuntimeData({ ...resolved.spell.system, name: resolved.spell.name }) : null;
    const duration = runtime ? buildSpellDurationSummary(runtime.duration) : null;
    const effect = runtime ? buildSpellEffectSummary(runtime) : null;
    const reversal = runtime ? buildSpellReversalContext(runtime, casterKey) : null;
    return {
      reference: ref,
      ...resolved,
      summary: runtime ? `${runtime.name} • ${duration.label} • ${effect.save}${reversal?.reversible ? ` • ${reversal.label}` : ""}` : ref.spellKey
    };
  });
}

export function prepareSpellcastingData(actor) {
  const spellcasting = actor?.system?.spellcasting;
  const derived = {};
  for (const casterKey of CASTER_ORDER) {
    const caster = spellcasting?.casters?.[casterKey]; if (!caster) continue;
    let totalKnown = 0, totalPrepared = 0; const slots = {};
    for (const level of SPELL_LEVELS) {
      const knownCount = Array.isArray(caster?.known?.[level]) ? caster.known[level].length : 0;
      const preparedCount = Array.isArray(caster?.prepared?.[level]) ? caster.prepared[level].length : 0;
      totalKnown += knownCount; totalPrepared += preparedCount;
      const max = Number(caster?.slots?.[level]?.max) || 0; const used = Number(caster?.slots?.[level]?.used) || 0;
      slots[level] = {
        max,
        used,
        remaining: Math.max(0, max - used),
        knownReferences: resolveEntries(actor, caster?.known?.[level], casterKey),
        preparedReferences: resolveEntries(actor, caster?.prepared?.[level], casterKey)
      };
    }
    derived[casterKey] = { enabled: caster.enabled === true, totalKnown, totalPrepared, slots, summaryLabel: `${LABELS[casterKey]}: ${totalPrepared} prepared` };
  }
  const activeSpells = Array.isArray(actor?.system?.activeSpells) ? actor.system.activeSpells.map((entry) => {
    const runtime = migrateActiveSpellRuntime(entry);
    return { ...runtime, summary: buildActiveSpellSummary(runtime) };
  }) : [];
  derived.activeSpells = activeSpells;
  return derived;
}
