# Spell Casting UX Integration Report

## Scope
This pass integrates actor-sheet casting UX with canonical spell runtime and active runtime state while preserving manual-first BECMI adjudication.

## Casting Flow Architecture
- Added sheet-level **Cast** actions for prepared spells by caster and level.
- Cast flow resolves spell reference, builds canonical casting context, prompts cleric reversible choice when applicable, optionally creates active runtime, updates explicit spell slot usage, and posts a manual-first chat card.
- No auto-targeting, auto-damage, auto-saves, or auto-condition mutation.

## Prepared/Memorized Policy
- Slot spending is explicit on cast (`used += 1` bounded by `max`).
- Manual restoration is explicit via **Restore 1** slot control.
- Cleric reversible choice is prompt-driven at cast time.
- MU/Elf prepared entries remain explicit list entries; casting consumes the prepared entry to reflect memorization usage.

## Runtime Integration Flow
- Cast dialog asks **Track Active Spell?**.
- If confirmed, system creates an active runtime entry via canonical active runtime factory and stores reverse-mode/caster/source metadata.
- Runtime visibility remains on the actor sheet active spell list.

## Reversible Spell UX
- Cleric reversible spells ask at cast time: normal/reversed.
- Cast chat output uses resolved display name and includes reversed status where applicable.
- No silent reversal conversion.

## Chat Card Behavior
Cards now include:
- spell + cast form,
- caster label,
- range,
- duration,
- save summary,
- effect/area summary,
- manual resolution checklist notes,
- active runtime tracking status.

## Manual-First Non-Automations (Intentional)
- Save resolution remains manual.
- Damage/healing application remains manual.
- Targeting remains manual.
- Condition application remains manual.

## GM Override Tools
Sheet active runtime controls include explicit:
- Suppress,
- Restore (from suppression),
- Expire,
- Dismiss.

Plus explicit spell-slot restore for memorized/prepared bookkeeping correction.

## Known Limitations
- Recent cast history timeline is not yet persisted beyond chat log and active runtime records.
- Runtime duration adjustment UI is not yet exposed as direct numeric editor in this pass.
- MU/Elf reverse-form distinction relies on distinct prepared entries and spell keys supplied by data.

## Future Candidates
- Dedicated cast-history panel with filterable states (active/expired/suppressed/dispelled).
- Structured runtime notes editor and remaining-duration adjuster.
- Optional GM-only macro hooks for faster manual adjudication workflows.
