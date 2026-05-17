import { describe, expect, it } from "vitest";
import { normalizeActorSpellcasting } from "../../module/actors/spellcasting/spellcasting-normalization.js";
import { prepareSpellcastingData } from "../../module/actors/spellcasting/spellcasting-data.js";
import { validateSpellCastState, applySpellCastToState } from "../../module/actors/spellcasting/spellcasting-cast.js";

function buildActor() {
  const system = {};
  normalizeActorSpellcasting(system);
  system.spellcasting.casters.magicUser.enabled = true;
  system.spellcasting.casters.magicUser.prepared["1"].push({ spellKey: "magic_missile", itemId: "s1", uuid: "Item.s1" });
  system.spellcasting.casters.magicUser.known["1"].push({ spellKey: "magic_missile", itemId: "s1", uuid: "Item.s1" });
  system.spellcasting.casters.magicUser.slots["1"] = { max: 1, used: 0 };
  return { system };
}

describe("spell cast workflow", () => {
  it("renders known/prepared/slot data in derived spellcasting", () => {
    const derived = prepareSpellcastingData(buildActor());
    expect(derived.magicUser.slots["1"].max).toBe(1);
    expect(derived.magicUser.slots["1"].knownReferences).toHaveLength(1);
    expect(derived.magicUser.slots["1"].preparedReferences).toHaveLength(1);
  });

  it("rejects invalid cast states", () => {
    const actor = buildActor();
    actor.system.spellcasting.casters.magicUser.enabled = false;
    expect(validateSpellCastState({ actor, casterKey: "magicUser", level: "1", preparedIndex: 0 }).ok).toBe(false);

    const actor2 = buildActor();
    actor2.system.spellcasting.casters.magicUser.prepared["1"] = [];
    expect(validateSpellCastState({ actor: actor2, casterKey: "magicUser", level: "1", preparedIndex: 0 }).ok).toBe(false);

    const actor3 = buildActor();
    actor3.system.spellcasting.casters.magicUser.slots["1"].used = 1;
    expect(validateSpellCastState({ actor: actor3, casterKey: "magicUser", level: "1", preparedIndex: 0 }).ok).toBe(false);
  });

  it("consumes only runtime prepared/slot state", () => {
    const actor = buildActor();
    const originalKey = actor.system.spellcasting.casters.magicUser.prepared["1"][0].spellKey;
    applySpellCastToState({ system: actor.system, casterKey: "magicUser", level: "1", preparedIndex: 0, shouldConsumePrepared: true });
    expect(actor.system.spellcasting.casters.magicUser.slots["1"].used).toBe(1);
    expect(actor.system.spellcasting.casters.magicUser.prepared["1"]).toHaveLength(0);
    expect(originalKey).toBe("magic_missile");
  });

  it("non-casters return safe no-op validation", () => {
    const system = {};
    normalizeActorSpellcasting(system);
    const actor = { system };
    const result = validateSpellCastState({ actor, casterKey: "cleric", level: "1", preparedIndex: 0 });
    expect(result.ok).toBe(false);
  });

  it("active spell runtime summaries remain when present and absent remains safe", () => {
    const actor = buildActor();
    actor.system.activeSpells = [{ id: "a1", spellKey: "magic_missile", runtime: {}, status: "active", createdAt: new Date().toISOString() }];
    const derived = prepareSpellcastingData(actor);
    expect(derived.activeSpells).toHaveLength(1);

    const actorWithoutRuntime = buildActor();
    delete actorWithoutRuntime.system.activeSpells;
    const derivedWithout = prepareSpellcastingData(actorWithoutRuntime);
    expect(derivedWithout.activeSpells).toEqual([]);
  });
});
