# Inventory Polish Report

## Current inventory model summary
- Actor-owned items remain flat siblings; containment is represented by `item.system.containerId`.
- Canonical inventory locations: carried, worn, equipped, backpack, beltPouch, sack, storage, treasure.
- Currency is split into `system.currency.carried` vs `system.currency.treasureHorde`.

## Carried/stored/equipped rules
- Carried locations contribute to carried encumbrance.
- Storage/treasure locations do not contribute unless represented as carried items.
- Equipped items are expected to also be in carried-compatible locations.

## Container behavior
- Containers are items with `type=container` and `system.containerType` capacity rules.
- Contents are items referencing container id.
- Carried container contents affect carried encumbrance; stored container contents affect stored totals.

## Diagnostics added
- Invalid item location, invalid/missing container links.
- Equipped-but-not-carried impossible state.
- Negative/malformed quantity and weight values.
- Invalid currency bucket/coin quantity.
- Container cycle and orphan-contained-item detection.
- Missing required inventory objects.
- Runtime diagnostics are read-only and do not mutate data.

## BECMI sheet mapping
- Inventory sections include belt pouch, worn, backpack, sack #1/#2, carried loose/other, and stored containers.
- Existing sheet style and controls preserved.

## Known limitations
- Sack #1 and Sack #2 are currently two views into canonical `sack` location.
- Custom sub-container labels depend on item naming rather than dedicated per-slot metadata.

## Remaining TODOs
- Add explicit per-container grouping rows for multiple sacks/backpacks by item id.
- Surface diagnostics inline in character sheet UI (currently context-only).
