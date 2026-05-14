import { beforeEach, describe, expect, it } from "vitest";
import {
  clearSpellReferenceCache,
  getSpellReferenceDiagnostics,
  resolveSpellByItemId,
  resolveSpellByKey,
  resolveSpellReference,
  resolveSpellReferenceSync,
  validateSpellReference
} from "../../module/spells/spell-reference.js";

function spell(id, key, uuid = `Item.${id}`) { return { id, uuid, type: "spell", system: { spellKey: key } }; }

describe("spell reference resolution", () => {
  beforeEach(() => {
    clearSpellReferenceCache();
    globalThis.game = { items: [spell("a", "magic_missile")] };
    globalThis.fromUuidSync = (uuid) => (uuid === "Item.a" ? spell("a", "magic_missile") : null);
    globalThis.fromUuid = async (uuid) => (uuid === "Compendium.becmi.spells.Item.b" ? spell("b", "sleep", "Compendium.becmi.spells.Item.b") : null);
  });

  it("resolves by uuid first", async () => {
    const result = await resolveSpellReference({ spellKey: "magic_missile", uuid: "Item.a", itemId: "x" });
    expect(result.spell?.id).toBe("a");
    expect(result.diagnostics.resolutionMethod).toBe("uuid");
  });

  it("falls back to spellKey", async () => {
    const result = await resolveSpellReference({ spellKey: "magic_missile", uuid: "", itemId: "" });
    expect(result.spell?.id).toBe("a");
    expect(result.diagnostics.resolutionMethod).toBe("spellKey");
  });

  it("falls back to itemId as last resort", async () => {
    const actor = { items: new Map([["item-1", spell("item-1", "magic_missile")]]) };
    actor.items.get = actor.items.get.bind(actor.items);
    const result = await resolveSpellReference({ spellKey: "unknown_spell", uuid: "", itemId: "item-1" }, actor);
    expect(result.spell?.id).toBe("item-1");
    expect(result.diagnostics.resolutionMethod).toBe("itemId");
  });

  it("handles invalid uuid", async () => {
    const result = await resolveSpellReference({ spellKey: "magic_missile", uuid: "bad", itemId: "" });
    expect(result.diagnostics.errors).toContain("invalid uuid");
    expect(result.diagnostics.resolutionMethod).toBe("spellKey");
  });

  it("rejects duplicate spellKey", () => {
    globalThis.game.items = [spell("a", "sleep"), spell("b", "sleep")];
    const result = resolveSpellByKey("sleep");
    expect(result.error).toBe("duplicate spellKey");
  });

  it("rejects malformed references", () => {
    const result = validateSpellReference({ spellName: "Magic Missile" });
    expect(result.valid).toBe(false);
  });

  it("cache consistency", async () => {
    const first = await resolveSpellReference({ spellKey: "magic_missile", uuid: "Item.a", itemId: "" });
    globalThis.fromUuidSync = () => null;
    const second = resolveSpellReferenceSync({ spellKey: "magic_missile", uuid: "Item.a", itemId: "" });
    expect(first.spell?.id).toBe("a");
    expect(second.spell?.id).toBe("a");
  });

  it("unresolved diagnostics and null safety", async () => {
    const result = await resolveSpellReference({ spellKey: "no_spell", uuid: "", itemId: "" });
    expect(result.spell).toBeNull();
    expect(result.diagnostics.errors).toContain("unresolved reference");
    const diagnostics = await getSpellReferenceDiagnostics({ spellKey: "no_spell", uuid: "", itemId: "" });
    expect(diagnostics.resolved).toBe(false);
  });

  it("deterministic lookup ordering", async () => {
    globalThis.game.items = [spell("k", "magic_missile")];
    globalThis.fromUuidSync = () => spell("u", "other_spell", "Item.u");
    const result = await resolveSpellReference({ spellKey: "magic_missile", uuid: "Item.u", itemId: "" });
    expect(result.spell?.id).toBe("u");
  });

  it("actor-local itemId lookup helper", () => {
    const actor = { items: new Map([["item-2", spell("item-2", "read_magic")]]) };
    actor.items.get = actor.items.get.bind(actor.items);
    expect(resolveSpellByItemId(actor, "item-2").spell?.id).toBe("item-2");
    expect(resolveSpellByItemId(actor, "missing").spell).toBeNull();
  });
});
