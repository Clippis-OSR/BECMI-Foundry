# Spell Seeding + Review Workflow

Use a curated seed-first flow for Basic+Expert spells.

> Note: the Basic+Expert seed pass intentionally captures identity metadata only (`spellKey`, `name`, `spellClass`, `spellLevel`, source and reversible fields). It does **not** populate `range`, `duration`, or `effect` yet.


1. Run `npm run seed:spells` to generate review files from `data/spells/seed-basic-expert.json`.
2. Edit `data/spells/review/spells-review.csv` or `.json` and fill `range`, `duration`, `effect`, `save`, `tags`, `manualNotes`, `pageVerified`, and set `reviewed=true` when done.
3. Optional assist: run `npm run extract:spells` and copy suggestions only for existing seeded `spellKey` rows. Treat suggestions as `confidence` + `needsReview` hints only.
4. Build canonical output with `npm run build:spells`. The build refuses rows with `reviewed=false` unless `--allow-unreviewed` is passed.

This keeps canonical public JSON tied to manually reviewed seed rows and prevents OCR/PDF auto-discovery from inventing spells.
