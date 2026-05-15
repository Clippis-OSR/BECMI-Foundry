import { describe, expect, it } from "vitest";
import {
  applyTerrainToDailyTravel,
  convertDistanceByContext,
  getDistanceCategory,
  getForcedMarchState,
  getMovementSource,
  getPartyMovement,
  getPartyMovementSummary,
  getPursuitMovement,
  getRunningMovement,
  getSlowestPartyMember,
  getTerrainModifier,
  normalizeMovementContext,
  resolveMovementFromSource,
  shouldConvertDistance
} from "../../module/exploration/movement-contracts.mjs";
import { explorationToCombatMovement } from "../../module/exploration/movement.mjs";

describe("fas 6b-4 movement contracts", () => {
  it("party movement uses slowest member", () => {
    const party = [{ id: "a", name: "A", movementValue: 120 }, { id: "b", name: "B", movementValue: 90 }];
    expect(getPartyMovement(party)).toBe(90);
    expect(getSlowestPartyMember(party)?.id).toBe("b");
  });

  it("invalid actor movement handled safely and deterministic ordering", () => {
    const party = [{ id: "b", name: "B", movementValue: "bad" }, { id: "a", name: "A", movementValue: null }];
    const summary = getPartyMovementSummary(party);
    expect(summary.partyMovement).toBe(0);
    expect(summary.slowestActorId).toBe("a");
  });

  it("running and pursuit contexts resolve", () => {
    expect(getRunningMovement(90, "dungeonRunning").movementValue).toBe(180);
    expect(getPursuitMovement(90, "wildernessPursuit").movementValue).toBe(180);
    expect(normalizeMovementContext("invalid")).toBe("dungeonExploration");
  });

  it("forced march applies 1.5x and requires rest", () => {
    const forced = getForcedMarchState(18, true);
    const normal = getForcedMarchState(18, false);
    expect(forced.modifiedMilesPerDay).toBe(27);
    expect(forced.restRequiredAfterForcedMarch).toBe(true);
    expect(normal.restRequiredAfterForcedMarch).toBe(false);
  });

  it("terrain modifies wilderness daily travel only", () => {
    expect(getTerrainModifier("mountains").terrainMultiplier).toBe(0.5);
    expect(applyTerrainToDailyTravel(20, "rough").modifiedMilesPerDay).toBe(15);
    expect(explorationToCombatMovement(90)).toBe(30);
  });

  it("movement sources resolve safely", () => {
    expect(getMovementSource("actor")).toBe("actor");
    expect(resolveMovementFromSource(90, "mount").movementSource).toBe("mount");
    expect(resolveMovementFromSource(90, "vehicle").movementSource).toBe("vehicle");
  });

  it("distance categories convert by context except spell area", () => {
    expect(shouldConvertDistance("weaponRange", "wildernessExploration")).toBe(true);
    expect(convertDistanceByContext(70, "weaponRange", "wildernessExploration")).toBe(70);
    expect(convertDistanceByContext(60, "spellRange", "wildernessExploration")).toBe(60);
    expect(convertDistanceByContext(40, "spellArea", "wildernessExploration")).toBe(40);
    expect(getDistanceCategory("bad")).toBe("movementDistance");
  });
});
