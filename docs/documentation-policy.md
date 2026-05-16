# Documentation Policy (Anti-Bloat)

## Purpose

This policy defines where project documentation belongs, what is canonical, and how to avoid duplicate or stale documents becoming implementation authority.

## Canonical Routing and Active Audit Rules

- `docs/documentation-map.md` is the **single canonical documentation map**.
- There must be **only one active current system audit path**: `docs/audits/current-system-audit.md`.
- Additional audit snapshots must be moved to `docs/audits/archive/` when superseded.

## Canonical Documents

The following documents are canonical and should be treated as source of truth for current behavior and implementation intent:

- `README.md`
- `docs/documentation-map.md` (navigation authority)
- `docs/architecture/canonical-architecture.md`
- `docs/architecture/runtime-systems.md`
- `docs/architecture/data-layer.md`
- `docs/architecture/api-surface.md`
- `docs/architecture/deprecated-systems.md`
- `docs/rules/basic-expert-reference.md`
- `docs/rules-data-layer.md`

Codex tasks, implementation plans, and change proposals should reference canonical documents first.

## Document Types and Their Roles

### Architecture Docs

- Describe **current implemented behavior only**.
- Define stable system boundaries, runtime responsibilities, and expected data/control flow.
- Are implementation authority when discussing architecture-level behavior.

### System Docs

- Explain current subsystem behavior, operational contracts, and usage details.
- May include practical examples and subsystem-specific constraints.
- Must align with architecture docs and canonical rules references.

### Audits

- Time-bounded evaluations of current state, risks, gaps, or compliance.
- May include findings and recommended actions.
- Are **not** permanent implementation authority.

### Closeout Reports

- Summaries of completed work (scope delivered, decisions made, and residual risks).
- Confirm closure of a project/task stream.
- Historical record only unless promoted into canonical architecture/system docs.

## Audit Placement and Lifecycle

- Active audits belong in `docs/audits/`.
- Archived audits belong in `docs/audits/archive/`.
- When a new system audit is produced or the active audit is superseded/closed, move the previous active audit into `docs/audits/archive/`.
- Audits should be archived when any of the following occur:
  - A newer audit supersedes the findings.
  - The associated remediation cycle is complete.
  - The audited scope has materially changed and prior findings no longer represent current state.

## Authority Rules

1. Canonical architecture/rules docs describe current behavior only.
2. `docs/documentation-map.md` is the canonical index used for contributor routing.
3. Old audits must not be used as implementation authority.
4. Deprecated systems must be listed in `docs/architecture/deprecated-systems.md`.
5. If a conflict exists:
   - Canonical architecture/rules docs win.
   - Then canonical system docs.
   - Then `docs/audits/current-system-audit.md` for current risk context.
   - Archived audits and closeout reports are historical references only.

## How to Write Future Docs (Short Guide)

1. Decide document type first (architecture, system, audit, closeout).
2. Put the file in the correct directory; do not create parallel duplicates.
3. Reference canonical docs at the top in a “Related Canonical Docs” section.
4. Write in present tense for current-state docs; use explicit dates for audits.
5. If documenting deprecated behavior, add/update `docs/architecture/deprecated-systems.md`.
6. When replacing an audit, archive the prior active audit immediately.
7. Keep scope tight: one document = one purpose.
