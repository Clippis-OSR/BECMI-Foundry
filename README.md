# BECMI Foundry

Custom Foundry VTT v14 system for Frank Mentzer BECMI / Classic Dungeons & Dragons.

## Current features

- Custom character actor sheet
- Tabs: Main, Combat, Equipment, Skills, Magic, Cleric
- Editable BECMI character data
- Saving throw rolls
- Ability checks
- Thief skill rolls
- THAC0 attack rolls
- Weapon attack rows with damage

## Foundry version

Tested with Foundry VTT v14 build 361.

## Design goals

- BECMI-native
- Descending AC
- THAC0
- Exploration-first design
- Dungeon turns, hexcrawl, morale and reaction rolls later

## Documentation map

For contributor and Codex work, start with these canonical docs:

- Architecture source of truth: `docs/architecture/canonical-architecture.md`
- Current audit context: `docs/audits/current-system-audit.md`
- Documentation governance and authority rules: `docs/documentation-policy.md`

Historical audits remain available under `docs/audits/archive/` and `docs/archive/` for reference only.

## Local-only spell extraction workflow

This project includes a local-only spell extraction pipeline for legally owned rulebook PDFs stored under `private/rules/`.

- `npm run extract:spells`
- `npm run review:spells`
- `npm run build:spells`
- `npm run validate:spells`

`private/` is gitignored so PDFs, raw extraction text, and review artifacts stay local.
