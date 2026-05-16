import { describe, expect, it } from "vitest";
import {
  createActiveSpellRuntime,
  advanceSpellDurations,
  suppressActiveSpell,
  restoreSuppressedSpell,
  dispelActiveSpell,
  dismissActiveSpell,
  expireActiveSpell,
  migrateActiveSpellRuntime,
  buildActiveSpellSummary,
  removeActiveSpell
} from "../../module/spells/active-spell-runtime.js";

const baseSpell = {
  id: "item-1",
  name: "Protection from Poison",
  system: {
    spellKey: "protection_from_poison",
    duration: { type: "turns", value: 4, special: "" },
    reversible: false,
    stacking: { key: "protection_from_poison" }
  }
};

describe("active spell runtime", () => {
  it("creates deterministic serializable runtime state", () => {
    const runtime = createActiveSpellRuntime({ spell: baseSpell, casterActorId: "a1", targetActorIds: ["a2"] });
    expect(runtime.spellKey).toBe("protection_from_poison");
    expect(runtime.durationType).toBe("turns");
    expect(runtime.remaining.turns).toBe(4);
    expect(JSON.parse(JSON.stringify(runtime)).spellKey).toBe("protection_from_poison");
    expect(baseSpell.system.duration.value).toBe(4);
  });

  it("advances only matching duration families and expires at zero", () => {
    const runtime = createActiveSpellRuntime({ spell: baseSpell });
    const advanced = advanceSpellDurations([runtime], { unit: "turns", amount: 2 });
    expect(advanced.activeSpells[0].remaining.turns).toBe(2);
    const finished = advanceSpellDurations(advanced.activeSpells, { unit: "turns", amount: 2 });
    expect(finished.activeSpells[0].activeState).toBe("expired");
  });

  it("preserves permanent and special durations from auto-expiration", () => {
    const permanent = migrateActiveSpellRuntime({ id: "x", spellKey: "force_field", spellName: "Force Field", durationType: "permanent", activeState: "active" });
    const special = migrateActiveSpellRuntime({ id: "y", spellKey: "shapechange", spellName: "Shapechange", durationType: "special", activeState: "active" });
    const out = advanceSpellDurations([permanent, special], { unit: "turns", amount: 9 });
    expect(out.activeSpells[0].activeState).toBe("active");
    expect(out.activeSpells[1].activeState).toBe("active");
  });

  it("supports suppression, restoration, dispel, dismiss, and manual expire transitions", () => {
    const runtime = createActiveSpellRuntime({ spell: baseSpell });
    expect(suppressActiveSpell(runtime).activeState).toBe("suppressed");
    expect(restoreSuppressedSpell(suppressActiveSpell(runtime)).activeState).toBe("active");
    expect(dispelActiveSpell(runtime).activeState).toBe("dispelled");
    expect(dismissActiveSpell(runtime).activeState).toBe("dismissed");
    expect(expireActiveSpell(runtime).activeState).toBe("expired");
  });

  it("builds runtime summaries and supports historical removal", () => {
    const runtime = createActiveSpellRuntime({ spell: baseSpell, reverseMode: true });
    expect(buildActiveSpellSummary(runtime)).toMatch(/Reverse: Yes/);
    const next = removeActiveSpell([runtime], runtime.id);
    expect(next.length).toBe(0);
  });
});
