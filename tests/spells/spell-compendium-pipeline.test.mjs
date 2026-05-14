import { describe, expect, it } from "vitest";

import { buildSpellCompendium, validateCompendiumIntegrity } from "../../module/spells/spell-compendium.js";
import { clearSpellIndexes, getSpellByKey, getSpellsByLevel, getSpellsByList, getSpellsByTag } from "../../module/spells/spell-index.js";
import { importSpellData } from "../../module/spells/spell-importer.js";

function createCanonicalSpell(overrides = {}) {
  const base = {
    schemaVersion: 1,
    spellKey: "magic_missile",
    name: "Magic Missile",
    level: 1,
    spellLists: ["magicUser"],
    tags: ["arcane"],
    range: { type: "feet", value: 150, special: "" },
    duration: { type: "instant", value: null, special: "" },
    targeting: { type: "creature", value: 1, units: "target", area: { shape: "", size: null, units: "" } },
    savingThrow: { allowed: false, type: "", negates: false },
    effect: { summary: "", damage: [], conditions: [] },
    scaling: { progression: "", formula: "" },
    automation: { supported: false, mode: "none", config: {} },
    source: { book: "BECMI Basic", page: 41, notes: "" },
    description: { summary: "", text: "Canonical text" }
  };
  return { ...base, ...overrides };
}

describe("spell compendium pipeline", () => {
  it("imports valid canonical spells", () => {
    clearSpellIndexes();
    const { spells, diagnostics } = importSpellData([createCanonicalSpell()]);
    expect(spells).toHaveLength(1);
    expect(diagnostics.imported).toBe(1);
  });

  it("rejects duplicate spellKey imports", () => {
    clearSpellIndexes();
    expect(() => importSpellData([createCanonicalSpell(), createCanonicalSpell()])).toThrow(/duplicate spellKey/);
  });

  it("rejects malformed spells", () => {
    clearSpellIndexes();
    expect(() => importSpellData([createCanonicalSpell({ targeting: { type: "enemy" } })])).toThrow(/Invalid targeting\.type/);
  });

  it("builds deterministic indexes", () => {
    clearSpellIndexes();
    importSpellData([createCanonicalSpell()]);
    expect(getSpellByKey("magic_missile")?.name).toBe("Magic Missile");
    expect(getSpellsByLevel(1)).toHaveLength(1);
  });

  it("validates compendium integrity", () => {
    const entry = { type: "spell", name: "Magic Missile", system: createCanonicalSpell() };
    expect(() => validateCompendiumIntegrity([entry])).not.toThrow();
    expect(() => validateCompendiumIntegrity([entry, entry])).toThrow(/duplicate spellKey/);
  });

  it("normalizes before import", () => {
    clearSpellIndexes();
    const raw = createCanonicalSpell({ range: { type: "feet", special: "" } });
    const { spells } = importSpellData([raw]);
    expect(spells[0].system.range.value).toBeNull();
  });

  it("preserves schemaVersion", () => {
    clearSpellIndexes();
    const { spells } = importSpellData([createCanonicalSpell({ schemaVersion: 1 })]);
    expect(spells[0].system.schemaVersion).toBe(1);
  });

  it("indexes by spellList", () => {
    clearSpellIndexes();
    importSpellData([createCanonicalSpell({ spellLists: ["magicUser", "elf"] })]);
    expect(getSpellsByList("elf")).toHaveLength(1);
  });

  it("indexes by tags", () => {
    clearSpellIndexes();
    importSpellData([createCanonicalSpell({ tags: ["arcane", "damage"] })]);
    expect(getSpellsByTag("damage")).toHaveLength(1);
  });

  it("returns structured diagnostics for successful compendium build", () => {
    clearSpellIndexes();
    const { spells } = importSpellData([createCanonicalSpell()]);
    const entries = buildSpellCompendium(spells);
    expect(entries).toHaveLength(1);
  });
});
