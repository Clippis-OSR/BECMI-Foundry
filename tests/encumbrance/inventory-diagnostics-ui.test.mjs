import { describe, expect, it } from "vitest";
import { buildInventoryDiagnosticsPresentation } from "../../module/items/inventory-diagnostics-ui.mjs";

describe("inventory diagnostics UI presentation", () => {
  it("builds stable severity grouping and item associations", () => {
    const raw = [
      { severity: "error", code: "invalidQuantity", itemId: "i2", message: "q bad" },
      { severity: "error", code: "invalidQuantity", itemId: "i1", message: "q bad" },
      { severity: "error", code: "invalidContainer", itemId: "i1", message: "bad container" },
      { severity: "error", code: "invalidContainer", itemId: "i1", message: "bad container" },
      { severity: "error", code: "invalidCurrency", message: "bad coin" }
    ];
    const view = buildInventoryDiagnosticsPresentation(raw);
    expect(view.diagnostics.length).toBe(4);
    expect(view.severityCounts.error).toBe(3);
    expect(view.severityCounts.warning).toBe(1);
    expect(view.actorDiagnostics.some((d) => d.code === "invalidCurrency")).toBe(true);
    expect(view.itemDiagnosticsById.i1.map((d) => d.code)).toEqual(["invalidContainer", "invalidQuantity"]);
  });

  it("does not mutate incoming diagnostics", () => {
    const raw = Object.freeze([{ severity: "error", code: "missingInventoryFields", itemId: "x", message: "missing inv" }]);
    const view = buildInventoryDiagnosticsPresentation(raw);
    expect(raw[0].severity).toBe("error");
    expect(view.itemDiagnosticsById.x[0].suggestion.length).toBeGreaterThan(0);
  });
});
