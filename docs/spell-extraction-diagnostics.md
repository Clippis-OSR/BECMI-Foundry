# Spell Extraction Diagnostics

After running `npm run extract:spells`, review private diagnostics artifacts:

- `private/generated/spell-extraction-diagnostics.json`
- `private/generated/spell-pages.txt`

Then run `npm run debug:spells` for a summary report:

- total candidates by source
- total candidates by class
- total candidates by level
- suspiciously empty fields
- likely missed spell pages

## Recommended review flow

1. Run extraction and confirm candidate count is materially above low-recall baselines.
2. Run debug summary and inspect any source file with unusually low counts.
3. Inspect `skippedPagesWithSpellListHeadings` and `detectedSpellSectionRanges` in diagnostics JSON.
4. Spot check candidate `confidence`, `parseReason`, and `rejectReason` values.
5. Only run `npm run build:spells` after quality is acceptable. Use `npm run build:spells -- --force` only for intentional overrides.
