BECMI Foundry — Canonical Basic/Expert Rules Reference
Purpose

This document is the canonical implementation reference for the BECMI Foundry Basic/Expert engine layer.

It is NOT intended to reproduce TSR copyrighted text. It exists to provide:

deterministic implementation targets
normalized rules tables
canonical terminology
runtime contracts
anti-drift guidance
Codex implementation constraints
Scope Boundary

This reference covers ONLY:

Basic Set (Mentzer)
Expert Set (Mentzer)
character levels 1–14

Explicitly excluded:

Companion systems
Master systems
Immortality
Weapon Mastery
Dominion systems
Siege warfare
War Machine
Master spell lists
Companion/Master optional combat systems
Canonical Engine Principles
1. Deterministic Runtime

All gameplay calculations must derive from:

actor schema
item schema
canonical rules tables

No hidden state. No inferred modern mechanics.

2. Basic/Expert Only

The system MUST NOT:

import AD&D assumptions
import Rules Cyclopedia assumptions unless identical
import BX house variants
import modern D&D mechanics
3. Descending Armor Class

Canonical AC model:

lower AC is better
AC 9 = unarmored baseline
AC can become negative through magic

Ascending AC support may exist as OPTIONAL UI translation only.

4. Race-As-Class

Canonical playable classes:

Human:

Cleric
Fighter
Magic-User
Thief

Demi-human:

Dwarf
Elf
Halfling

No separated race/class system.

5. Exploration-Time First

The world runtime is exploration-driven.

Canonical time units:

Unit	Length
Combat Round	10 seconds
Exploration Turn	10 minutes
Watch	4 hours
Day	24 hours
Character Level Limits
Class	Expert Maximum
Cleric	14
Fighter	14
Magic-User	14
Thief	14
Dwarf	12
Elf	10
Halfling	8
Actor Runtime Contracts

Canonical actor-derived values:

level
XP
hit points
armor class
attack values
saving throws
movement
encumbrance
morale (NPC/monster)
spell slots
thief abilities
turn undead

Derived values MUST NOT be manually editable unless explicitly configured by GM override.

Canonical Inventory Contracts

Inventory location categories:

equipped
worn
carried
stored
treasure

Movement and encumbrance derive ONLY from:

carried equipment
worn equipment
coin carried
container modifiers

Stored items MUST NOT affect movement.

Currency Contracts

Canonical coin units:

cp
sp
ep
gp
pp

Canonical encumbrance:

10 coins = 1 cn

Coin carried contributes to encumbrance. Stored currency does not.

Movement Rules

Canonical movement value:

exploration movement in feet per turn

All other movement derives from this single value.

Dungeon Movement
Movement	Exploration	Combat
120	120 ft/turn	40 ft/round
90	90 ft/turn	30 ft/round
60	60 ft/turn	20 ft/round
30	30 ft/turn	10 ft/round

Combat movement is ALWAYS:

exploration movement / 3

rounded down.

Wilderness Movement

Wilderness uses:

yards for tactical ranges
miles/day for overland travel

Canonical formula:

miles/day = movement / 5

Examples:

Movement	Miles/Day
120	24
90	18
60	12
30	6
Forced March

Canonical rule:

forced march = normal daily travel × 1.5

Terrain Modifiers

Terrain modifies:

daily travel
wilderness progress

Terrain does NOT modify:

dungeon movement
combat movement
Distance Conversion Rules

Canonical distance categories:

Category	Converts in Wilderness
Weapon Range	Yes
Spell Area	No
Spell Range	Contextual
Movement	Yes

IMPORTANT:

Spell AREA measurements remain in FEET.

Even in wilderness context.

Examples:

Fireball radius remains feet
Light radius remains feet
Protection radius remains feet
Exploration Runtime Rules

Canonical exploration authority:

runtime.mjs
time.mjs
movement-contracts.mjs

There must NEVER be parallel exploration runtimes.

Exploration Turn Sequence

Each exploration turn:

movement
actions
encounter checks
light consumption
duration reduction
time advancement
Light Runtime

Light durations tick ONLY on exploration turns.

Combat rounds MUST NOT decrement torch/lantern durations individually.

Party Movement

Party movement uses:

slowest member

Always.

Encumbrance Rules

Encumbrance derives from:

armor
weapons
gear
treasure
carried currency
containers

Movement derives from:

total carried encumbrance only

Stored items do not affect movement.

Container Rules

Containers may:

reduce effective carried weight
organize inventory

Example:

Bag of Holding style multipliers may exist as item-defined container modifiers.

Combat Rules

Canonical combat model:

side initiative
descending AC
attack roll tables
saving throws
morale
missile ranges
ammunition tracking
Initiative

Basic/Expert uses:

side initiative
d6 initiative system

No modern individual initiative systems.

Missile Ammunition

Missile attacks require:

equipped launcher
compatible ammunition

Ammo consumption occurs per attack.

Weapon Restrictions

Two-handed weapons:

cannot use shield simultaneously

Class restrictions derive from:

class weapon permissions

NOT proficiency systems.

Morale

Morale applies primarily to:

monsters
retainers
NPCs

Players do not use morale rules.

Natural Weapons

Monster attacks should use:

canonical natural weapon item references

not raw inline attack strings.

Saving Throw Categories

Canonical saving throw categories:

Death Ray / Poison
Magic Wands
Paralysis / Turn to Stone
Dragon Breath
Rod / Staff / Spell

No Reflex/Fortitude/Will systems.

Spellcasting Rules

Canonical spellcasting model:

memorization/preparation
slot-based casting
Vancian casting

No spell points. No cantrips. No at-will spells.

Cleric
gains spells through divine power
no spellbook
Turn Undead progression required
Magic-User
spellbook-based
spell memorization required
spell known tracked by spell level
Elf
uses Magic-User spell progression
capped by class maximum level
Spell Automation Boundary

The engine currently supports:

spell references
spell slots
preparation
durations
turn ticking hooks

The engine does NOT yet implement:

full spell automation
auto-save resolution
auto-condition application
effect scripting
Thief Rules

Canonical thief abilities:

Open Locks
Find/Remove Traps
Pick Pockets
Move Silently
Climb Walls
Hide in Shadows
Hear Noise

Percentile-based progression.

No skill-point systems.

Monster Rules

Canonical monster data should normalize:

monsterKey
HD
AC
movement
morale
treasure
XP
attacks
damage
save category
alignment
Monster Attacks

Natural attacks should be represented as:

canonical natural weapon items
Morale

Monsters use morale checks.

Treasure

Treasure values and treasure types should remain normalized.

XP Rules

XP derives from:

monster defeat
treasure recovery
adventure completion (optional)

No milestone leveling.

No challenge-rating systems.

Compendium Architecture

Canonical content categories:

monsters
spells
weapons
armor
equipment
treasure

Each category should support:

canonical keys
deterministic serialization
validation
migration
compendium generation
Testing Requirements

Every gameplay runtime must support regression tests.

Minimum required coverage:

movement
encumbrance
combat
saving throws
spell slots
thief abilities
exploration timing
distance conversion
morale
ammo handling
migration
schema validation
Anti-Drift Rules

Codex and contributors MUST NOT:

add AD&D mechanics
add modern D&D mechanics
add proficiency systems
add feats
add skills systems beyond thief abilities
add advantage/disadvantage
add ascending AC as canonical
add action economy systems
add concentration mechanics
add bonus actions/reactions
Implementation Policy

Every new subsystem must include:

canonical schema
validation
migration path
deterministic runtime
regression tests
compendium strategy

No feature should bypass canonical runtime contracts.

Codex Guidance

All future implementation prompts should include:

"Use this document as the canonical Basic/Expert rules reference. Do not import AD&D, Rules Cyclopedia variants, OSR reinterpretations, or modern D&D assumptions unless explicitly requested."

## Spellcasting UX Workflow (Basic/Expert)
- The Character sheet **Magic** tab always renders and shows an explicit empty state for non-casters.
- For enabled casters (Magic-User, Cleric, Elf), the tab presents by spell level: slot usage, known spell references where applicable, and prepared/memorized spells.
- Casting from the sheet validates caster eligibility, prepared entry presence, and available slots before consuming runtime actor spellcasting state.
- Canonical spell records remain immutable runtime references; gameplay casting updates actor system state only.
- Active spell runtime summaries remain visible in the Magic tab when active runtimes are tracked.
- Spell review workspace references should use `data/spells/review`.
