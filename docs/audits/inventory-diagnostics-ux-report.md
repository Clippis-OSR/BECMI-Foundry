# Inventory Diagnostics UX Pass Report

## UX decisions
- Diagnostics are now visible directly inside the character sheet equipment tab.
- Actor-wide diagnostics render in a compact summary block with severity counters.
- Item-specific diagnostics render inline under each affected item row with a compact count badge.
- Messaging is short and table-readable to preserve active-play flow.

## Severity model
- **error**: broken data likely to affect inventory integrity.
- **warning**: inconsistent but recoverable state needing user attention.
- **info**: non-blocking advisory state.

Presentation severity is normalized by diagnostic code to keep output deterministic between renders.

## Diagnostic categories covered
- Invalid container reference.
- Orphaned contained item.
- Container cycle.
- Equipped but not carried.
- Malformed quantity/weight.
- Invalid inventory location.
- Invalid currency bucket/value.
- Missing inventory fields.

## Rendering rules (actor vs item level)
- Item-level diagnostics attach to the affected item by `itemId` and render inline near that item.
- Actor-level diagnostics (for example currency bucket/value issues) render only in the summary section.
- Duplicates are deduplicated by severity+code+item+message before rendering.
- Diagnostics are sorted by severity, code, item, then message for stable ordering.

## Quick-fix philosophy
- UI includes suggestion text that tells users what manual repair to perform.
- No quick fix is auto-applied by runtime logic.
- Suggestions are intentionally conservative and do not change gameplay behavior.

## Known limitations
- Summary currently focuses on actor-wide diagnostics only; item diagnostics stay near rows.
- Suggestions are text guidance only (no one-click actions yet).
- Severity remapping is code-driven and may need expansion if new diagnostic codes are added.

## Future polish opportunities
- Add expandable/collapsible item diagnostic details for large inventories.
- Add filter toggles (errors only / warnings only) in the summary area.
- Add optional chat export for GMs reviewing persistent actor data issues.
