# Spell Detail Context Assist Report

We are intentionally shifting from brittle OCR-first structured parsing to **assisted human review** for spell details.

- Seed-first remains unchanged: only existing seeded rows are reviewed.
- `assist:spell-details` now writes `private/review/spell-detail-context.json` with page-context clues.
- Context includes nearby OCR blocks, heading confidence, likely Range/Duration/Effect lines, Save references, and reverse wording.
- Suggestions in `spells-review.csv` are assist-only (`suggested*` columns) and are never auto-copied to canonical fields.

## Why TSR OCR layouts are unreliable

TSR scans frequently break columns, hyphenate words across lines, and separate headings from metadata. Fully automatic extraction produces too many false negatives and weakly trusted structured values.

## Workflow

1. `npm run assist:spell-details`
2. `npm run inspect:spell -- --spell="Fire Ball"`
3. `npm run review:spells`
4. Manually fill canonical `range/duration/effect/save/tags/sourcePage` fields from context.
5. Set `reviewed=true` only after verification.

## Privacy and commit boundaries

- Private artifacts: OCR text, context excerpts, `private/review/spell-detail-context.json`.
- Commit-safe: pipeline code, tests, and docs.
