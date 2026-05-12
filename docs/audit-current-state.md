# Foundry VTT Integration Audit (Current State)

Date: 2026-05-12

## Scope Checked
- `system.json` entrypoint wiring
- Main system entry file (`becmi.mjs`) hook usage and bootstrapping
- `CONFIG.BECMI` initialization safety
- `game.becmi` initialization safety
- Actor document class registration
- Actor sheet registration behavior

## Findings

1. **`system.json` points to the expected main script**
   - `esmodules` includes `"becmi.mjs"`, which matches the repository's top-level system entry file.

2. **Main entry file loads expected integration points**
   - `becmi.mjs` imports actor class, sheet classes, rules module, and rules-data loaders/validators.
   - The imports and hook setup are syntactically coherent for Foundry system initialization.

3. **`init` hook is used for CONFIG and document class setup (good)**
   - `Hooks.once("init", async ...)` initializes `CONFIG.BECMI`, sets `CONFIG.Actor.documentClass = BECMIActor`, registers settings, and registers actor sheets.
   - This is the correct lifecycle stage for CONFIG and class wiring.

4. **`ready` hook is used for `game.becmi` exposure; async data loading currently occurs in `init`**
   - `Hooks.once("ready", ...)` sets `game.becmi.rules`.
   - Async rules data loading (`loadClassData`, `loadMonsterProgression`, THAC0/saves loaders) currently runs during `init` rather than `ready`.
   - This is acceptable for boot-time availability, though long-running async fetches in `init` can delay startup.

5. **`CONFIG.BECMI` is initialized safely (good, with caveat)**
   - Uses `CONFIG.BECMI = CONFIG.BECMI || {}` and then assigns expected subkeys.
   - Loaded results are assigned with nullish fallback (`?? {}`), reducing risk of undefined table usage.
   - Caveat: existing `CONFIG.BECMI.*` preloaded content would be replaced during init by fresh empty objects before load completion.

6. **`game.becmi` is not overwritten wholesale (good)**
   - Uses `game.becmi = game.becmi || {}` in `ready`, then sets `game.becmi.rules`.
   - Existing object references survive; only `rules` key is updated.

7. **Actor document class registration exists and is not duplicated in current code path (good)**
   - A single assignment to `CONFIG.Actor.documentClass = BECMIActor` appears in `init`.
   - No duplicate registration found elsewhere in the repository.

8. **Sheet registrations appear functional for v1 sheets (good), with one compatibility caution**
   - Core ActorSheet is unregistered once, then two sheets are registered by type:
     - `character` -> `BECMICharacterSheet`
     - `creature` -> `BECMICreatureSheet`
   - `preCreateActor` also stamps `flags.core.sheetClass` per actor type using matching IDs.
   - Caution: there is also a `BECMICreatureSheetV2` class present in the repo, but it is not registered; this is not a breakage by itself, just an unused alternate sheet implementation.

## Notable Risk/Consistency Observations
- `BECMIActor.prepareDerivedData()` branches monster logic on actor types `"monster"` / `"npc"`, while system document type in `system.json` uses `"creature"` (and character). This may prevent creature actors from receiving monster-derived calculations in current state.
- This is adjacent to integration behavior and may impact sheet data expectations, though it is outside the explicit checklist item of registration duplication.

## Overall Status
- Checklist items are mostly in a good state.
- No missing core entrypoint wiring was found.
- Main follow-up worth tracking: derived-data actor type mismatch (`creature` vs `monster`/`npc`).
