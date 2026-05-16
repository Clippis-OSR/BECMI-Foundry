# ARCHIVED DOCUMENT

This document reflects repository state at the time it was written.
It is no longer a canonical source of truth.
See:
- /docs/architecture/canonical-architecture.md
- /docs/audits/current-system-audit.md

# Spell Reference Architecture Audit (2026-05-14)

## Scope

This is an architecture-only assessment for actor spell reference identity in BECMI Foundry.
No gameplay automation changes are included.

Current actor spell reference shape in schema and normalization:

```json
{ "spellKey": "", "uuid": "", "itemId": "" }
```

## Current In-Repo Baseline

- Actor spellcasting normalization preserves all three identifiers (`spellKey`, `uuid`, `itemId`) as canonical fields in each spell reference object.
- Validation requires `spellKey` snake_case and string types for `uuid`/`itemId`.
- Migration currently normalizes schema v1 and rejects unknown future schema versions.
- Spell item schema uses canonical `system.spellKey`.

## Foundry VTT Behavior Relevant to Identity

### UUID behavior

- Foundry UUIDs are globally scoped document pointers (world or compendium) and are first-class for cross-collection lookup via `fromUuid()`.
- UUIDs can represent embedded documents (for example actor-owned items) with parent + embedded segments.
- UUID resolution for compendium entries depends on the pack + document id path; if that backing entity disappears or is replaced, resolution fails.

### itemId behavior

- `itemId` on actor-owned items is local to the parent actor’s embedded collection.
- Actor cloning/duplication/import generally creates new embedded item ids.
- `itemId` is therefore fast for local actor sheet interaction, but not stable as a long-lived cross-world reference.

### Compendium import/export and world behavior

- Importing from compendium creates localized world/embedded copies; those copies are distinct documents.
- Re-export/rebuild operations can replace document ids depending on workflow options.
- Any reference strategy anchored solely to mutable doc ids (world or compendium) is vulnerable to rebuild drift.

## Analysis by Key Type

## 1) `uuid`

**Strengths**
- Best runtime dereference primitive in Foundry (`fromUuid`) when source docs still exist.
- Works across world and compendium contexts, including embedded ownership pathing.

**Weaknesses**
- Brittle across destructive compendium rebuilds, deleted source docs, or changed ids.
- If actor is duplicated and embedded items are regenerated, old embedded UUIDs no longer point at the clone’s new items.

## 2) `itemId`

**Strengths**
- Fast local lookup (`actor.items.get(itemId)`) for current actor instance.
- Ideal as an ephemeral UI/runtime convenience cache.

**Weaknesses**
- Not portable across actor copies, world export/import boundaries, or embedded regen.
- Not globally unique; only meaningful within one actor’s current embedded collection.

## 3) `spellKey`

**Strengths**
- Deterministic, content-identity style key already canonicalized in item schema.
- Most stable for migration and import recovery when document identities drift.
- Supports compendium rebuild scenarios as long as canonical content map is maintained.

**Weaknesses**
- Requires a resolver/index (key -> current item/uuid) and collision policy.
- Cannot by itself distinguish duplicated variants if multiple items intentionally share one key (policy needed: disallow or namespace).

## Recommendations

## Runtime reference recommendation

**Primary runtime lookup should be `uuid`, with fallback through `spellKey`, and `itemId` as actor-local final convenience.**

Recommended runtime order:

1. `uuid`
2. `spellKey`
3. `itemId` (only if parent actor context is known and local)

Rationale:
- `uuid` is the native Foundry lookup primitive and supports cross-collection resolution.
- `spellKey` is more stable than ids when data has been migrated/reimported/rebuilt.
- `itemId` is cheapest local fallback but least stable beyond the current actor instance.

## Persistence recommendation

**Persist `spellKey` as canonical durability anchor, persist `uuid` as preferred direct pointer, persist `itemId` as non-canonical cache/hint.**

Canonical persistence semantics:
- `spellKey`: required canonical identity for long-term safety and migration repair.
- `uuid`: optional/expected pointer for direct runtime resolution when valid.
- `itemId`: optional actor-local cache, safe to refresh/ignore when stale.

This keeps persistence resilient while still enabling fast runtime dereference.

## Explicit answers to required technical questions

### A) Should UUID become the primary runtime lookup key?

**Yes.** Use UUID first at runtime because Foundry’s document resolution model is built around UUID and `fromUuid()`.

### B) Should spellKey remain the canonical migration/import identifier?

**Yes.** `spellKey` should remain canonical for migration/import durability because it survives id churn better than UUID/itemId.

### C) Should itemId only be treated as temporary/local convenience?

**Yes.** Treat `itemId` as actor-local ephemeral convenience only.

### D) Should actor spell references support fallback resolution order?

**Yes.** Recommended order for deterministic robustness:

1. `uuid`
2. `spellKey`
3. `itemId` (actor-local only)

Why this order:
- Prioritizes native direct document pointers.
- Recovers cleanly from UUID drift via canonical key remapping.
- Uses itemId only when still in same actor-local embedded context.

## Failure-mode analysis

### World duplication / actor cloning
- `itemId`: likely changes -> stale.
- embedded `uuid`: likely changes if clone regenerates ids.
- `spellKey`: stable if canonical content is preserved.

### Compendium rebuilds / pack id churn
- compendium `uuid`: may break if document id/path changes.
- `itemId`: irrelevant for compendium identity.
- `spellKey`: recoverable via rebuilt key index.

### Deleted compendium entries
- `uuid`: unresolved.
- `itemId`: unresolved unless local actor still owns copy.
- `spellKey`: can recover if alternate source/library entry exists.

### Export/import across worlds
- local ids/embedded ids can be rewritten.
- UUIDs can change when world ids differ.
- `spellKey` provides deterministic rebind anchor.

### Migration drift
- id-based references accumulate staleness through repeated transforms.
- key-based canonical identity enables id rehydration during migration normalization.

## Recommended future-safe architecture policy

1. Keep triad fields in actor spell refs: `spellKey`, `uuid`, `itemId`.
2. Define `spellKey` as canonical identity contract (required and validated).
3. Treat `uuid` as preferred runtime pointer that may be refreshed.
4. Treat `itemId` as actor-local optimization hint only.
5. During future migrations, add a deterministic rebind step:
   - resolve by uuid if valid;
   - else resolve by spellKey against canonical registry/compendium index;
   - else attempt local actor itemId;
   - then rewrite `uuid`/`itemId` to fresh values while preserving `spellKey`.

This gives long-term stability, migration safety, compendium resilience, and deterministic Foundry-compatible behavior.

## External references consulted

- Foundry API docs: `fromUuidSync`, `parseUuid`, and `ResolvedUUID` behavior.
- Foundry user docs: Compendium import/export behavior and item embedding model.
