import { beforeEach, describe, expect, it, vi } from "vitest";
import { installFoundryStubs, createActor } from "../helpers/foundry-test-helpers.mjs";
import { getActorSaves, getCreatureSaves, getMonsterSaves } from "../../module/rules/saves.mjs";

beforeEach(() => {
  installFoundryStubs();
  globalThis.game = { settings: { get: () => false } };
  globalThis.CONFIG = {
    BECMI: {
      classTables: {
        fighter: {
          levels: {
            "1": { saves: { deathRayPoison: 12, magicWands: 13, paralysisTurnStone: 14, dragonBreath: 15, rodStaffSpell: 16 } }
          }
        }
      },
      monsterSaves: {
        entries: {
          "1": { savesAs: { classId: "fighter", level: 1 } }
        }
      }
    }
  };
});

describe("deprecated wrapper routing", () => {
  it("getCreatureSaves remains output-compatible with getActorSaves for creatures", () => {
    const creature = createActor({ type: "creature", system: { monster: { hitDice: "1" }, savesAs: { classId: "fighter", level: 1 } } });
    expect(getCreatureSaves(creature)).toEqual(getActorSaves(creature));
  });

  it("getMonsterSaves resolves same save profile used by canonical actor save flow", () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    expect(getMonsterSaves("1")).toEqual({ deathRayPoison: 12, magicWands: 13, paralysisTurnStone: 14, dragonBreath: 15, rodStaffSpell: 16 });
    expect(warn).toHaveBeenCalled();
    warn.mockRestore();
  });
});
