import { describe, expect, it } from "vitest";

import { normalizeMonsterData } from "../../module/monsters/monster-data.mjs";
import { validateMonsterSchema } from "../../module/monsters/monster-validation.mjs";

function createValidMonster(overrides = {}) {
  const base = {
    system: {
      monsterKey: "owl_bear",
      schemaVersion: 1,
      name: "Owl Bear",
      source: { book: "Basic", page: "52", notes: "" },
      ac: 5,
      hitDice: "5",
      movement: "120' (40')",
      movementModes: { move: "120(40)" },
      attacks: [{ type: "claw", count: 2, raw: "2 claws" }],
      damage: "1d6/1d6/1d8",
      damageParts: [{ raw: "1d6", dice: "1d6", rider: null }],
      numberAppearing: "1d2 (1d4)",
      saveAs: "F3",
      morale: 9,
      treasureType: "C",
      treasure: { raw: "C", normalizedCodes: ["C"] },
      alignment: "Neutral",
      xp: 175,
      specialAbilities: "Bear hug",
      description: { text: "Large omnivorous predator.", notes: "Raw BECMI wording preserved." },
      notes: "Raw text notes"
    }
  };

  return { ...base, ...overrides, system: { ...base.system, ...(overrides.system ?? {}) } };
}

describe("monster schema lock", () => {
  it("accepts a valid canonical monster schema", () => {
    expect(() => validateMonsterSchema(createValidMonster())).not.toThrow();
  });

  it("rejects invalid monsterKey format", () => {
    expect(() => validateMonsterSchema(createValidMonster({ system: { monsterKey: "Owl-Bear" } }))).toThrow(/lowercase snake_case/);
  });

  it("rejects missing schemaVersion", () => {
    expect(() => validateMonsterSchema(createValidMonster({ system: { schemaVersion: undefined } }))).toThrow(/Missing required canonical field "schemaVersion"/);
  });

  it("rejects legacy aliases", () => {
    expect(() => normalizeMonsterData({ id: "owl-bear" })).toThrow(/Legacy field "id"/);
    expect(() => validateMonsterSchema(createValidMonster({ system: { armorClass: 5 } }))).toThrow(/Legacy monster alias "armorClass"/);
  });

  it("normalization preserves raw BECMI strings", () => {
    const normalized = normalizeMonsterData(createValidMonster().system);
    expect(normalized.movement).toBe("120' (40')");
    expect(normalized.damage).toBe("1d6/1d6/1d8");
    expect(normalized.specialAbilities).toBe("Bear hug");
    expect(normalized.description.text).toContain("Large omnivorous predator");
  });

  it("prevents monsterKey mutation after creation", () => {
    const original = createValidMonster({ system: { monsterKey: "owl_bear" } });
    const updated = createValidMonster({ system: { monsterKey: "owlbear" } });
    expect(() => validateMonsterSchema(updated, "update", { originalMonsterData: original })).toThrow(/immutable/);
  });
});
