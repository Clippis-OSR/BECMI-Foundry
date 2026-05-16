# Local-Only Spell Extraction Pipeline Report

## Overview
This pipeline reads locally stored, legally owned rulebook PDFs from `private/rules/`, extracts spell candidates into private artifacts, supports manual review, and builds sanitized canonical spell JSON for public repository data.

## Privacy and Copyright Boundaries
- **Always private:** source PDFs, raw page text, OCR/extraction dumps, review work-in-progress files.
- **May be committed:** structured sanitized spell metadata (name, level, ranges, durations, tags, source/page refs, short manual summaries).
- No full verbatim rulebook spell text is emitted in public output.

## Commands
1. `npm run extract:spells`
   - Requires `private/rules/` with one or more PDFs.
   - Writes `private/generated/spells.raw.json`.
2. `npm run review:spells`
   - Reads raw extraction.
   - Writes `private/review/spells-review.json` and `.csv`.
   - Existing review files are backed up automatically.
3. `npm run build:spells`
   - Reads reviewed JSON.
   - Includes only records with `needsReview=false`.
   - Writes sanitized canonical output to `data/spells/canonical.json`.
4. `npm run validate:spells`
   - Validates canonical schema shape, duplicates, reversible consistency, and summary-size safeguards.

## Manual Review Expectations
- Manually fix spell names/classes/levels and key fields.
- Add tags and short summaries in `manualNotes`.
- Set `needsReview=false` only when verified.

## Known Limitations
- Spell heading detection is heuristic and may miss unusual formatting.
- Range/duration/effect/save extraction relies on recognizable label patterns.
- Reversible detection is keyword-based and may require manual correction.

## Dependency Note
- The pipeline uses local poppler CLI tools (`pdfinfo` and `pdftotext`) instead of adding a heavy Node PDF dependency, keeping setup lightweight and extraction local-only.

## Safety Notes
- Keep all raw extraction artifacts under `private/`.
- Do not paste copyrighted full spell text into committed files.
