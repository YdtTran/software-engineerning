# Tasks

## 1. Simplify user sequences

- [x] 1.1 Update SQ01 and SQ02 scenario definitions using the design table; recompute activation ranges and document source-step mappings/omissions in the sequence README. Verify reservation eligibility/hold and confirmed unlock before trip start, with three or four lifelines and at most ten messages each.
- [x] 1.2 Update SQ03 and SQ04 definitions and matching README notes; verify capacity and physical/simulated confirmation precede return/charging success, remove payment/subscription detail, and enforce the same complexity limits.
- [x] 1.3 Extend existing structural checks for simplified user-scenario counts and essential outcomes, with negative fixtures for excess lifelines/messages and missing confirmation. Verify these fixtures fail for the intended reason and valid user scenarios pass.

## 2. Simplify operator sequences

- [x] 2.1 Update SQ05 to Operator/dashboard/transfer planning and SQ06 to Operator/dashboard/incident isolation and maintenance assignment; document their selected successful-instance scope. Verify planned transfer is not arrival, maintenance remains explicit, and each meets count limits.
- [x] 2.2 Update SQ07 to Operator/UI/simulation with isolated snapshot, completed run and UC14 results review; document omitted algorithm and deployment detail. Verify no automatic live-state application, AI claim or fixed historical dataset remains.
- [x] 2.3 Extend the existing checker and source-mapping review checklist for operator outcomes and counts. Verify an invalid actor, missing isolation, or live-state simulation mutation is rejected by a targeted fixture or recorded semantic review.

## 3. Regenerate consistent outputs

- [x] 3.1 Adjust the supported writer routing and any obsolete scenario-specific checker/renderer expectations without weakening geometry tests. Verify a temporary output directory contains exactly the seven intended SVG models and catalog, with documented svg/png destinations upon promotion.
- [x] 3.2 Regenerate PlantUML/Mermaid catalog and temporary SVG/mxGraph files; consistently remove unsupported numeric response limits or label retained ones illustrative. Verify all representations agree on participants, messages, activations, source mapping and timing semantics.
- [x] 3.3 Update README slide checklist, successful-instance coverage notes and the three VS Code/Draw.io/VP Online instructions. Verify all seven source links resolve and the documented generation/check commands target the current directory layout.

## 4. Integrated acceptance

- [x] 4.1 Run `python3 .agent/scripts/check_sequences.py` with the supported temporary-directory option, `node .agent/scripts/render_sequences.cjs --self-test`, and the native renderer on the temporary set. Verify current structural/visual results, save/reopen, native typography and geometry; if dependencies are missing, report them and do not certify passing output.
- [x] 4.2 Inspect all seven previews against the design table and source use cases; regenerate twice and compare diagram/catalog content for determinism. Verify every diagram is explainable as a concise normal instance and no required business outcome was lost.
- [x] 4.3 Promote verified sequence-only artifacts and the fresh verification record to the current svg/png/catalog locations. Verify stable SQ01–SQ07 paths and no edits to application code, other UML families or pre-existing unrelated workspace changes.
