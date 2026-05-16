# Spell Review Productivity Report

Human-assisted workflow is authoritative: seed rows define scope, suggestions are non-authoritative hints, and only reviewed structured fields can build canonical output.

## Command sequence
1. `npm run seed:spells` or `npm run review:spells` (preserves review edits).
2. `npm run spell:progress` and `npm run spell:missing`.
3. Optionally `npm run spell:apply-suggestions`.
4. Fill details manually in private review files.
5. `npm run spell:validate-review`.
6. `npm run build:spells`.

## Reviewed definition
`reviewed=true` requires sourcePage, range, duration, effect, save, tags (or explicit empty), and manualNotes. `pageVerified=true` requires sourcePage.

## Privacy
Private review JSON/CSV/context remain under `private/review` and are not public canonical content.

## Commit safety
Commit scripts/tests/docs only. Do not commit PDFs, OCR dumps, or private review files.

## Known limitations
Suggestions may be wrong; reviewer must confirm source text and normalize details.
