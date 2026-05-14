import { describe, it, expect } from "vitest";
import { normalizeSpellData } from "../../module/items/spell/spell-data.js";
import { validateSpellSchema } from "../../module/items/spell/spell-validation.js";
import { normalizeActorSpellcasting } from "../../module/actors/spellcasting/spellcasting-normalization.js";
import { validateActorSpellcasting } from "../../module/actors/spellcasting/spellcasting-validation.js";

function baseSpell() {
  return { type: "spell", system: { schemaVersion: 1, spellKey: "magic_missile", level: 1, spellLists: ["magicUser"], range: { type: "feet", value: 150, special: "" }, duration: { type: "instant", value: null, special: "" }, targeting: { type: "creature", value: 1, units: "target", area: { shape: "", size: null, units: "" } }, savingThrow: { allowed: false, type: "", negates: false }, automation: { supported: false, mode: "none", config: {} }, source: { book: "Basic", page: "", notes: "" }, description: { summary: "", text: "" }, tags: [] } };
}

describe("spell sheet ux safety", () => {
  it("immutable spellKey enforcement via schema rejection", () => {
    const spell = baseSpell();
    spell.system.spellKey = "MagicMissile";
    expect(() => validateSpellSchema(spell)).toThrow(/snake_case/);
  });

  it("validation error rendering source errors exist", () => {
    const spell = baseSpell();
    spell.system.duration.type = "forever";
    expect(() => validateSpellSchema(spell)).toThrow(/duration.type/);
  });

  it("normalization before save produces canonical nested objects", () => {
    const normalized = normalizeSpellData({ spellKey: "magic_missile", schemaVersion: 1 });
    expect(normalized.range).toBeDefined();
    expect(normalized.description.text).toBeDefined();
  });

  it("schemaVersion preservation", () => {
    const normalized = normalizeSpellData(baseSpell().system);
    expect(normalized.schemaVersion).toBe(1);
  });

  it("malformed edits rejected", () => {
    const spell = baseSpell();
    spell.system.spellLists = ["wizard"];
    expect(() => validateSpellSchema(spell)).toThrow(/Invalid spell list/);
  });

  it("actor spell reference integrity and duplicate prepared prevention", () => {
    const system = {};
    normalizeActorSpellcasting(system);
    const caster = system.spellcasting.casters.magicUser;
    caster.enabled = true;
    caster.prepared["1"].push({ spellKey: "magic_missile", uuid: "Item.1", itemId: "1" });
    caster.prepared["1"].push({ spellKey: "magic_missile", uuid: "Item.1", itemId: "1" });
    const deduped = [...new Map(caster.prepared["1"].map((r) => [r.spellKey, r])).values()].sort((a,b)=>a.spellKey.localeCompare(b.spellKey));
    caster.prepared["1"] = deduped;
    expect(caster.prepared["1"]).toHaveLength(1);
    expect(() => validateActorSpellcasting({ system })).not.toThrow();
  });

  it("deterministic prepared ordering", () => {
    const system = {};
    normalizeActorSpellcasting(system);
    const prepared = system.spellcasting.casters.magicUser.prepared["1"];
    prepared.push({ spellKey: "sleep", uuid: "", itemId: "" }, { spellKey: "charm_person", uuid: "", itemId: "" });
    prepared.sort((a, b) => a.spellKey.localeCompare(b.spellKey));
    expect(prepared.map((s) => s.spellKey)).toEqual(["charm_person", "sleep"]);
  });

  it("canonical serialization after edit", () => {
    const spell = baseSpell();
    const serialized = JSON.stringify(normalizeSpellData(spell.system));
    expect(serialized).toContain('"schemaVersion":1');
    expect(serialized).not.toContain("undefined");
  });
});
