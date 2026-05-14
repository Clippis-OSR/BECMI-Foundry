import { describe, expect, it } from "vitest";

import { normalizeSpellData } from "../../module/items/spell/spell-data.js";
import { validateSpellSchema } from "../../module/items/spell/spell-validation.js";

function createValidSpell(overrides = {}) {
  const base = {
    type: "spell",
    name: "Magic Missile",
    id: "abc123",
    system: {
      schemaVersion: 1,
      spellKey: "magic_missile",
      level: 1,
      spellLists: ["magicUser"],
      range: { type: "feet", value: 120, special: "" },
      duration: { type: "rounds", value: 1, special: "" },
      targeting: { type: "creature", value: 1, units: "target", area: { shape: "", size: null, units: "" } },
      savingThrow: { allowed: false, type: "", negates: false },
      effect: { summary: "", damage: [], conditions: [] },
      scaling: { progression: "", formula: "" },
      automation: { supported: false, mode: "none", config: {} },
      source: { book: "", page: "", notes: "" },
      description: { summary: "", text: "" }
    }
  };
  return {
    ...base,
    ...overrides,
    system: {
      ...base.system,
      ...(overrides.system ?? {})
    }
  };
}

describe("spell schema freeze regression tests", () => {
  it("accepts a fully canonical spell", () => {
    const validSpell = createValidSpell();
    expect(() => validateSpellSchema(validSpell)).not.toThrow();
  });

  it("rejects invalid spellList values", () => {
    const invalid = createValidSpell({ system: { spellLists: ["wizard"] } });
    expect(() => validateSpellSchema(invalid)).toThrow(/Invalid spell list "wizard"/);
  });

  it("rejects invalid range.type", () => {
    const invalid = createValidSpell({ system: { range: { type: "meters", value: 10, special: "" } } });
    expect(() => validateSpellSchema(invalid)).toThrow(/Invalid range\.type "meters"/);
  });

  it("rejects invalid targeting.type", () => {
    const invalid = createValidSpell({ system: { targeting: { type: "enemy", value: 1, units: "", area: { shape: "", size: null, units: "" } } } });
    expect(() => validateSpellSchema(invalid)).toThrow(/Invalid targeting\.type "enemy"/);
  });

  it("rejects invalid duration.type", () => {
    const invalid = createValidSpell({ system: { duration: { type: "minutes", value: 1, special: "" } } });
    expect(() => validateSpellSchema(invalid)).toThrow(/Invalid duration\.type "minutes"/);
  });

  it("rejects missing schemaVersion", () => {
    const invalid = createValidSpell({ system: { schemaVersion: undefined } });
    expect(() => validateSpellSchema(invalid)).toThrow(/schemaVersion is required/);
  });

  it("rejects invalid spellKey formats and accepts snake_case", () => {
    const invalidKeys = ["Magic Missile", "magic-missile", "magicMissile", "MAGIC_MISSILE"];
    for (const spellKey of invalidKeys) {
      expect(() => validateSpellSchema(createValidSpell({ system: { spellKey } }))).toThrow(/must be lowercase snake_case/);
    }
    expect(() => validateSpellSchema(createValidSpell({ system: { spellKey: "magic_missile" } }))).not.toThrow();
  });

  it("rejects level lower than 1", () => {
    expect(() => validateSpellSchema(createValidSpell({ system: { level: 0 } }))).toThrow(/level must be an integer >= 1/);
    expect(() => validateSpellSchema(createValidSpell({ system: { level: -1 } }))).toThrow(/level must be an integer >= 1/);
  });

  it("enforces canonical serialization integrity from item.toObject", () => {
    const raw = createValidSpell({
      system: {
        range: { type: "feet", value: undefined, special: "" },
        description: { summary: undefined, text: "Arcane bolts" }
      }
    });

    const item = {
      ...raw,
      toObject() {
        return { ...raw, system: normalizeSpellData(raw.system) };
      }
    };

    const serialized = item.toObject();
    expect(serialized.system.schemaVersion).toBe(1);
    expect(serialized.system).toHaveProperty("range");
    expect(serialized.system).toHaveProperty("duration");
    expect(serialized.system).toHaveProperty("targeting");
    expect(serialized.system).toHaveProperty("savingThrow");
    expect(serialized.system).toHaveProperty("effect");
    expect(serialized.system).toHaveProperty("scaling");
    expect(serialized.system).toHaveProperty("automation");
    expect(serialized.system).toHaveProperty("source");
    expect(serialized.system).toHaveProperty("description");
    expect(serialized.system).not.toHaveProperty("spellRange");
    expect(serialized.system).not.toHaveProperty("spellDuration");
    expect(serialized.system.description.summary).toBe("");
    expect(serialized.system.range.value).toBeNull();
  });

  it("normalizeSpellData rejects legacy aliases and strips undefined values", () => {
    expect(() => normalizeSpellData({ spellRange: 120 })).toThrow(/Legacy field "spellRange"/);
    const normalized = normalizeSpellData(createValidSpell().system);
    expect(JSON.stringify(normalized)).not.toContain("undefined");
  });
});
