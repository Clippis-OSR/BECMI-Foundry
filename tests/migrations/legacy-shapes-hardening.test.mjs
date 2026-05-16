import { describe, expect, it } from "vitest";
import { migrateLegacyActorForTests, migrateLegacyItemForTests } from "../../module/utils/legacy-document-migration.mjs";
import { validateActorSchema, validateItemSchema } from "../../module/utils/schema-validation.mjs";

describe("migration hardening legacy shapes", () => {
  it("migrates old character shape without deleting custom fields", () => {
    const legacy = {
      type: "character",
      name: "Veteran",
      system: { notes: "player note", customField: { keep: true }, thac0: "18", ac: { value: "4" } }
    };
    const { migrated } = migrateLegacyActorForTests(legacy, []);
    expect(migrated.name).toBe("Veteran");
    expect(migrated.system.notes).toBe("player note");
    expect(migrated.system.customField).toEqual({ keep: true });
    expect(migrated.system.thac0).toBe(18);
    expect(migrated.system.ac.value).toBe(4);
  });

  it("migrates old monster alias and malformed combat fields safely", () => {
    const legacy = {
      type: "monster",
      system: {
        monster: {
          hitDice: "",
          ac: "bad",
          attacks: "2 claws;1 bite",
          movement: null
        }
      }
    };
    const diagnostics = [];
    const { migrated } = migrateLegacyActorForTests(legacy, diagnostics);
    expect(migrated.type).toBe("creature");
    expect(migrated.system.monster.hitDice).toBe("1");
    expect(migrated.system.monster.ac).toBe(9);
    expect(Array.isArray(migrated.system.monster.attacks)).toBe(true);
    expect(diagnostics.length).toBeGreaterThan(0);
    expect(() => validateActorSchema(migrated, "migrated-monster")).not.toThrow();
  });

  it("migrates missing system object and remains idempotent", () => {
    const once = migrateLegacyActorForTests({ type: "character" }, []).migrated;
    const twice = migrateLegacyActorForTests(once, []).migrated;
    expect(twice).toEqual(once);
  });

  it("migrates legacy inventory slot/location and preserves inventory metadata", () => {
    const legacyItem = {
      type: "weapon",
      name: "Old Sword",
      system: {
        slot: "bothHands",
        quantity: "3",
        location: "equipped",
        inventory: { notes: "heirloom", carriedState: "custom", equipped: true }
      }
    };
    const { migrated } = migrateLegacyItemForTests(legacyItem, []);
    expect(migrated.system.slot).toBe("weaponMain");
    expect(migrated.system.inventory.location).toBe("worn");
    expect(migrated.system.inventory.quantity).toBe(3);
    expect(migrated.system.inventory.notes).toBe("heirloom");
    expect(migrated.system.inventory.carriedState).toBe("custom");
    expect(() => validateItemSchema({ ...migrated, system: { ...migrated.system, weaponType: "melee", hands: "one" } }, "migrated-item")).not.toThrow();
  });

  it("migrates old spell shape and preserves spell refs/custom fields", () => {
    const legacySpell = { type: "spell", system: { spellKey: "magic_missile", schemaVersion: null, custom: { x: 1 } } };
    const once = migrateLegacyItemForTests(legacySpell, []).migrated;
    const twice = migrateLegacyItemForTests(once, []).migrated;
    expect(once.system.spellRef).toBe("magic_missile");
    expect(once.system.custom).toEqual({ x: 1 });
    expect(twice).toEqual(once);
  });
});
