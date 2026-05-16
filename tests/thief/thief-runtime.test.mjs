import { describe, it, expect, beforeAll, vi } from "vitest";
import fs from "node:fs";
import path from "node:path";

const read = (name) => JSON.parse(fs.readFileSync(path.resolve(process.cwd(), `data/classes/${name}.json`), "utf8"));

beforeAll(() => {
  globalThis.CONFIG = { BECMI: { classTables: {
    thief: read("thief"),
    fighter: read("fighter"),
    halfling: read("halfling")
  } } };
  globalThis.game = { settings: { get: () => false } };
});

describe("thief runtime", () => {
  it("derives canonical thief progression only from class level tables", async () => {
    const { getThiefSkills } = await import("../../module/rules/thief-skills.mjs");
    expect(getThiefSkills("thief", 1)).toEqual({
      openLocks: 15,
      findRemoveTraps: 10,
      pickPockets: 20,
      moveSilently: 20,
      climbWalls: 87,
      hideInShadows: 10,
      hearNoise: 33
    });
  });

  it("non-thief classes do not gain thief progression", async () => {
    const { getThiefSkills } = await import("../../module/rules/thief-skills.mjs");
    expect(getThiefSkills("fighter", 3)).toBeNull();
    expect(getThiefSkills("halfling", 2)).toBeNull();
  });

  it("uses derived thief values for deterministic percentile action targets", async () => {
    const { rollThiefSkill } = await import("../../module/rolls/becmi-rolls.mjs");

    const evaluate = vi.fn(async function () {
      this.total = 35;
      return this;
    });
    const toMessage = vi.fn(async () => {});
    globalThis.Roll = vi.fn().mockImplementation(() => ({ total: 0, evaluate, toMessage }));
    globalThis.ChatMessage = { getSpeaker: () => ({}) };

    const actor = {
      system: { thiefSkills: { openLocks: 99 }, derived: { thiefSkills: { openLocks: 15 } } }
    };

    await rollThiefSkill(actor, "openLocks", "Open Locks");
    const msg = toMessage.mock.calls[0][0].flavor;
    expect(msg).toContain("Chance:</strong> 15%");
    expect(msg).toContain("FAILURE");
  });
});
