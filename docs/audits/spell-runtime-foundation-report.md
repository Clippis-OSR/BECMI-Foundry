# Spell Runtime Foundation Report

## Current architecture
- Spell schema is canonicalized through `normalizeSpellData` and validated by `validateSpellSchema`.
- Actor spellcasting uses canonical casters (`cleric`, `magicUser`, `elf`) with known/prepared/slots.
- Compendium pipeline validates spell schema and indexes by key/list/level/tag.

## Canonical spell runtime model
Runtime now standardizes:
- spellKey, name, spellLists, level
- range, duration (+ duration family)
- targeting/effect/save summary
- reversible metadata + reverse spell metadata
- source/raw rules text
- tags + manual notes
- stacking metadata and policy text

## Reversible spell policy
- Clerics: reversible spells can be selected at cast time.
- Magic-user/elf: reversed form is memorized separately.
- UX shows this distinction in runtime summaries.

## Memorization/preparation policy
- This pass is manual-first and non-mutating in preview helpers.
- Slot/prepared state remains actor-driven via existing canonical spellcasting structures.

## Manual-first casting UX
- Spell sheet exposes reverse metadata, stacking policy, and GM manual notes.
- Character spell list now surfaces concise per-spell summaries (duration/save/reversal notes).
- No modal spam, no automatic effect application.

## Duration model
- Canonical duration text retained.
- Duration family tags: instant/permanent, rounds, turns, hours, concentration/manual, special.
- No automatic countdown introduced.

## Effect tag model
- Existing `tags` remain canonical and preserved through pipeline.
- Runtime summaries surface tags for future automation hooks.

## Stacking policy
- Policy text now modeled in spell runtime metadata.
- Default policy: identical spell effects generally do not stack with themselves.
- No automatic enforcement in this pass.

## Known limitations
- Cast flow mutation/chat integration remains foundation-only and helper-based.
- No active effect mutation, damage, healing, conditions, movement, light, poison, paralysis automation.

## Future automation candidates
- Optional passive cast-log/chat card renderer.
- Manual confirmation workflow for stacking conflicts.
- Opt-in passive duration tracker.
