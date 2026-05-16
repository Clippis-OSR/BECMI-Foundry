# Campaign Readiness Audit (Basic/Expert Long-Play)

**Date:** 2026-05-16  
**Campaign horizon audited:** 6–12 months (weekly/biweekly sessions)  
**Canonical rules source-of-truth:** `docs/rules/basic-expert-reference.md`  
**Scope assumptions:** Basic/Expert levels 1–14, no Companion/Master runtime expansion

---

## 1. Executive summary

The system is **ready for real multi-session Basic/Expert play** with strong deterministic runtime behavior, solid migration scaffolding, and broad subsystem test coverage. For long campaigns, the largest risks are not immediate rules correctness failures; they are **operator friction and maintenance drift** (legacy compatibility paths, duplicate test formats, and remaining UI/bookkeeping overhead).

**Campaign readiness rating:** **Good (8/10) for immediate table use**, with targeted hardening recommended before “set-and-forget” year-long operation.

**Most important practical takeaway:**
- Core runtime correctness is strong enough for live play.
- GM and content workflows still impose more manual effort than ideal.
- This manual effort is often **acceptable OSR procedure** when it reflects intentional B/E play style, but some parts are true UX friction and should be reduced.

---

## 2. GM usability assessment

### What is working well
- Deterministic schema-driven behavior makes adjudication predictable across sessions.
- Exploration-first structure aligns with canonical turn/time movement model.
- Dual initiative support exists intentionally and should remain unchanged.
- Monster/spell compendium architecture supports repeatable prep.

### GM pain points (real-play perspective)
1. **Legacy compatibility pathways increase cognitive load**
   - During campaign maintenance, GMs can encounter mixed-shape data from migrated content/worlds and must reason about whether odd results are legacy or current-canonical.
2. **Content ingestion still needs careful operator oversight**
   - Parser/import tolerance is practical, but can require manual verification for malformed source rows/stat expressions.
3. **Tooling/documentation spread**
   - Multiple audit/state docs can make it hard to quickly identify “current operational guidance” during live prep.
4. **Some prep workflows remain multi-step**
   - Building and validating compendium content is robust, but not yet frictionless for non-technical GMs.

### Verdict
- **Live GM usage is viable today**, but campaign continuity improves if one GM/maintainer takes explicit ownership of content hygiene and migration checks.

---

## 3. Player usability assessment

### Strengths
- Canonical class and progression constraints are clear and predictable.
- Core combat/saves/THAC0 interactions align with Basic/Expert expectations.
- Spellcasting structure is more stable than earlier states due to schema normalization.

### Friction seen by players
1. **Spell list and reference handling can feel technical**
   - Under-the-hood reliability is strong, but user-facing preparation/known spell management still benefits from clearer “player-simple” affordances.
2. **Inventory state clarity can degrade with long-term accumulation**
   - As campaigns mature, players need fast visibility into what counts for encumbrance vs stored holdings.
3. **OSR-manual procedures are expected but sometimes opaque**
   - Players new to B/E can confuse intentional manual tracking (torches, turns, ammo discipline) with system friction.

### Verdict
- **Usable for experienced OSR players now**; newer players may need onboarding to separate intentional old-school procedure from UI limitations.

---

## 4. Runtime stability assessment

### Determinism verification
- Runtime behavior is largely deterministic and schema/normalization-led.
- Exploration movement/time derivations and event emissions are explicit and predictable.
- Resolver and compendium flows are structured to reduce hidden state drift.

### Long-term actor stability verification
- Actor migration, normalization, and validation layers materially improve multi-session resilience.
- Residual risk remains in hybrid legacy/canonical worlds where edge payloads may require cleanup.

### Migration safety verification
- Migration safety is **good but not “fire-and-forget perfect.”**
- Legacy safeguards are useful now, but should be retired gradually to prevent permanent branch complexity.

### Runtime stability concerns
- Deprecated compatibility paths still visible in test/runtime surfaces are a medium-term reliability risk.
- Duplicate test format coverage (`.js` and `.mjs`) risks future drift and false confidence.

---

## 5. Exploration/wilderness usability

### Strengths
- Canonical exploration-time-first model is preserved.
- Movement and time units map cleanly to B/E expectations.
- Wilderness cadence and conversions are represented in a deterministic way.

### Friction
- Practical wilderness session flow still depends on disciplined manual GM procedure for pace/weather/supply adjudication.
- This is partly intentional OSR behavior, but supporting UI summaries/checklists can reduce live-session load.

### Verdict
- **Strong mechanical base; moderate operator burden.**

---

## 6. Combat usability

### Strengths
- Core attack/damage/save/initiative pathways are stable.
- Dual initiative support is intentional and should remain intact.
- Regression coverage around combat runtime is broad.

### Friction
- Some combat bookkeeping (ammo, effects, situational modifiers) remains manual-by-design.
- That is acceptable in B/E to a point; usability issues arise when manual steps are hard to audit quickly mid-round.

### Verdict
- **Table-usable and stable**, with room for better round-by-round visibility tooling.

---

## 7. Monster workflow usability

### Strengths
- Monster parser/runtime/schema/import/compendium pipeline is substantially hardened.
- Supports repeatable prep and reuse over long campaigns.

### Friction
- Edge-case stat expression handling can still require operator review.
- Import tolerance is pragmatic but may mask data issues unless strict audit mode is used.

### Verdict
- **Good for campaign play**, with recommended stronger “strict ingest” options for maintainers.

---

## 8. Inventory/spellcasting usability

### Inventory reliability
- Reliability is good for canonical carried/worn vs stored expectations.
- Long-campaign risk area is edge-case container/migration interactions and user misunderstanding of what contributes to encumbrance.

### Spellcasting usability
- Schema and validation architecture is now strong and deterministic.
- Day-to-day player UX remains somewhat technical in parts of known/prepared spell handling.

### Bookkeeping load
- Encumbrance, supply, and spell preparation are naturally manual-heavy in OSR play.
- Current system supports this but can still produce avoidable friction when summaries/feedback are not immediately clear.

---

## 9. Remaining friction points

1. Legacy compatibility/deprecation pathways still active.
2. Duplicate spell test format surfaces (`.js` + `.mjs`).
3. Documentation sprawl for operators seeking “current truth.”
4. Import workflows still need stronger strict-mode defaults.
5. Inventory/encumbrance visibility could be clearer during late-campaign gear bloat.
6. Spellcasting interactions are stable but can feel implementation-first rather than player-first.

---

## 10. Recommended next priorities

1. **Retire deprecated runtime helper paths** after one planned compatibility window.
2. **Unify test format strategy** (remove `.js`/`.mjs` duplication where redundant).
3. **Add strict import/audit mode default for maintainers** with explicit fail thresholds.
4. **Expand migration regression fixtures** for mixed legacy/canonical long-lived worlds.
5. **Improve inventory and spellcasting UI summaries** to reduce mid-session bookkeeping drag.
6. **Publish a single “campaign operator runbook”** for session prep/checks/migration hygiene.

---

## 11. Companion readiness assessment

Companion-domain mechanics remain intentionally out of current implementation scope per canonical boundary. The present architecture is a **reasonable foundation** for future expansion, but Companion work should not begin until remaining B/E operational debt above is reduced.

**Readiness for Companion extension now:** **Partial (architecture yes, product scope no).**

---

## Explicit distinction: acceptable manual OSR behavior vs actual UX/runtime problems

### Acceptable manual OSR behavior (intended)
- Turn/time tracking discipline.
- Resource tracking burden (torches, rations, ammo, coin weight).
- Tactical adjudication that depends on GM judgment.
- Some procedural overhead in wilderness and dungeon pacing.

### Actual UX/runtime problems (should be improved)
- Legacy/deprecation path complexity persisting too long.
- Data-import tolerance without strong strict-mode defaults.
- Test duplication creating maintenance drift risk.
- Player-facing inventory/spell state visibility not always fast/clear enough for long campaigns.
- Documentation fragmentation for maintainers.

---

## Campaign readiness assessment (final)

For a real 6–12 month Basic/Expert campaign, the system is **ready to run now** with a competent GM/maintainer and routine hygiene checks. It is not “zero-friction,” but major remaining issues are mostly workflow/maintenance ergonomics rather than core runtime correctness.

**Final rating:** **Ready with targeted hardening recommended (Good / 8 of 10).**
