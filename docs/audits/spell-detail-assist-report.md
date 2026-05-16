# Spell Detail Assist Report

## Seed-first workflow
- `seed:spells` remains authoritative for row identity (`spellKey`, `name`, `spellClass`, `spellLevel`, `sourceBook`).
- `assist:spell-details` only proposes details for existing seeded rows.
- No free-form spell discovery is reintroduced.

## Private extraction suggestions
- `npm run assist:spell-details` reads `private/rules/*.pdf` and writes `private/generated/spell-detail-suggestions.json`.
- Suggestions may include local extracted text context in private files only.

## Review process
- `npm run review:spells` starts from seed rows and merges optional suggestions into a `suggestions` object.
- Suggested fields are advisory, include per-field confidence, and never set `reviewed=true`.
- `pageVerified` stays `false` until manual confirmation.

## Privacy and commit boundaries
- Keep extracted/raw OCR outputs in `private/` only.
- Commit only structured seed/review/build logic and reviewed canonical metadata.
- Do not commit long verbatim spell descriptions.

## Known OCR limitations
- Heading matching uses normalization and may still be ambiguous for duplicated spell names.
- Ambiguous matches are flagged with low confidence and `needsReview`.

## Commands
1. `npm run seed:spells`
2. `npm run assist:spell-details`
3. `npm run review:spells`
4. `npm run debug:spells`
5. `npm run build:spells` (only after manual review; otherwise blocked unless `--allow-unreviewed`)
