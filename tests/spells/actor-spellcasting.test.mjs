import { describe, expect, it } from "vitest";
import { normalizeActorSpellcasting } from "../../module/actors/spellcasting/spellcasting-normalization.js";
import { validateActorSpellcasting } from "../../module/actors/spellcasting/spellcasting-validation.js";
import { prepareSpellcastingData } from "../../module/actors/spellcasting/spellcasting-data.js";

function validSystem() {
  const system = {};
  normalizeActorSpellcasting(system);
  system.spellcasting.casters.magicUser.enabled = true;
  system.spellcasting.casters.magicUser.known["1"].push({ spellKey: "magic_missile", uuid: "", itemId: "" });
  system.spellcasting.casters.magicUser.prepared["1"].push({ spellKey: "magic_missile", uuid: "", itemId: "" });
  system.spellcasting.casters.magicUser.slots["1"] = { max: 1, used: 0 };
  return system;
}

describe("actor spellcasting schema", () => {
  it("valid spellcasting schema", () => expect(() => validateActorSpellcasting({ system: validSystem() })).not.toThrow());
  it("invalid caster rejection", () => { const s = validSystem(); s.spellcasting.casters.wizard = {}; expect(() => validateActorSpellcasting({ system: s })).toThrow(/Invalid caster key/); });
  it("invalid spell level rejection", () => { const s = validSystem(); s.spellcasting.casters.magicUser.prepared["7"] = []; expect(() => validateActorSpellcasting({ system: s })).toThrow(); });
  it("invalid spell reference rejection", () => { const s = validSystem(); s.spellcasting.casters.magicUser.prepared["1"] = [{ name: "Magic Missile" }]; expect(() => validateActorSpellcasting({ system: s })).toThrow(/spellKey/); });
  it("used > max rejection", () => { const s = validSystem(); s.spellcasting.casters.magicUser.slots["1"] = { max: 1, used: 2 }; expect(() => validateActorSpellcasting({ system: s })).toThrow(/cannot exceed max/); });
  it("missing schemaVersion rejection", () => { const s = validSystem(); delete s.spellcasting.schemaVersion; expect(() => validateActorSpellcasting({ system: s })).toThrow(/schemaVersion/); });
  it("normalization integrity", () => { const s = {}; normalizeActorSpellcasting(s); expect(s.spellcasting.casters.cleric.prepared["6"]).toEqual([]); expect(s.spellcasting.casters.elf.known["1"]).toEqual([]); });
  it("canonical serialization", () => { const s = validSystem(); expect(JSON.stringify(s.spellcasting)).toContain('"schemaVersion":1'); expect(JSON.stringify(s.spellcasting)).not.toContain("undefined"); });
  it("legacy alias rejection", () => { expect(() => normalizeActorSpellcasting({ spellsKnown: {} })).toThrow(/Legacy spellcasting alias/); });
  it("deterministic prepareData output", () => { const a = { system: validSystem() }; const b = { system: validSystem() }; expect(prepareSpellcastingData(a)).toEqual(prepareSpellcastingData(b)); });
});
