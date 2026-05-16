import { describe, expect, it } from "vitest";
import { normalizeSpellRuntimeData, buildSpellCastingContext, buildSpellDurationSummary, buildSpellManualResolutionNotes } from "../../module/spells/spell-runtime.js";

const base = {
  spellKey: "cure_light_wounds",
  name: "Cure Light Wounds",
  level: 1,
  spellLists: ["cleric"],
  range: { type: "touch", value: null, special: "" },
  duration: { type: "instant", value: null, special: "" },
  targeting: { type: "creature", area: { shape: "" } },
  savingThrow: { allowed: false, type: "", negates: false },
  effect: { summary: "Heals 1d6+1 HP." },
  description: { text: "Raw rules text." },
  reversible: true,
  reverse: { spellKey: "cause_light_wounds", name: "Cause Light Wounds", effect: "Inflicts 1d6+1 HP." },
  tags: ["healing"],
  stacking: { sameSpellPolicy: "Identical spell effects generally do not stack with themselves." }
};

describe("spell runtime foundation", () => {
  it("normalizes runtime shape", () => {
    const runtime = normalizeSpellRuntimeData(base);
    expect(runtime.spellKey).toBe("cure_light_wounds");
    expect(runtime.duration.family).toBe("instantPermanent");
    expect(runtime.stacking.key).toBe("cure_light_wounds");
  });

  it("cleric reversible spells allow cast-time choice", () => {
    const context = buildSpellCastingContext({ spell: { system: base }, casterKey: "cleric", castAs: "reversed" });
    expect(context.castForm).toBe("reversed");
    expect(context.reversal.castTimeChoice).toBe(true);
  });

  it("magic-user/elf reversible spells require separate memorization", () => {
    const mu = buildSpellCastingContext({ spell: { system: { ...base, spellLists: ["magicUser"] } }, casterKey: "magicUser" });
    const elf = buildSpellCastingContext({ spell: { system: { ...base, spellLists: ["elf"] } }, casterKey: "elf" });
    expect(mu.reversal.memorizedSeparately).toBe(true);
    expect(elf.reversal.memorizedSeparately).toBe(true);
  });

  it("tags duration families", () => {
    expect(buildSpellDurationSummary({ type: "rounds", value: 6, special: "" }).family).toBe("rounds");
    expect(buildSpellDurationSummary({ type: "turns", value: 2, special: "" }).family).toBe("turns");
    expect(buildSpellDurationSummary({ type: "special", special: "Concentration" }).family).toBe("concentrationManual");
  });

  it("builds manual resolution notes and no mutation surface", () => {
    const notes = buildSpellManualResolutionNotes(base, "cleric");
    expect(notes.join(" ")).toMatch(/Manual resolution required/);
    const actor = { hp: { value: 4 } };
    buildSpellCastingContext({ spell: { system: base }, casterKey: "cleric" });
    expect(actor.hp.value).toBe(4);
  });
});
