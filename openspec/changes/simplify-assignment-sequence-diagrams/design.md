# Design

## Context

See proposal.md for motivation. The existing generator `.agent/scripts/generate_slide_style_sequence.py` stores seven DIAGRAMS with 5–6 lifelines and 9–12 messages each; several messages describe hardware, payment, optimization or storage mechanics. `.agent/scripts/check_sequences.py` imports this data, so representation agreement alone does not prove use-case fidelity. The renderer `.agent/scripts/render_sequences.cjs` already protects geometry and save/reopen behavior.

Sources, in priority order: CO3001 slides in `00_Slides/` (Ch6 pp.21–26, 40, 50), the assignment PDF and PROJECT_SPECIFICATION.md, then local sequence rules. Current 11-field scenarios in the use-case README and `.agent/scripts/usecase_model.py` provide traceability. No glossary or ADR directory was found. Previous layout/readability changes preserved scenario content intentionally; this change explicitly allows simplification while preserving their visual protections.

## Goals / Non-Goals

**Goals:** A consistent interaction level that students can explain, with no more than ten messages and three or four total lifelines per diagram. Essential checks are summarized inside the responsible object.

**Non-Goals:** A new generation framework, backend architecture design, additional use-case coverage, comprehensive failure fragments, or edits to application behavior and other UML families.

## Decisions

### 1. Model domain interactions through a small object set

Default to Actor → UI → one domain object. Add a simulated device object only when confirmation is essential. The domain object represents a design-level responsibility, not an assertion that a deployed class exists. Explain its relationship to the domain catalog in README notes without editing the class model.

This gives the modeled module depth: the interface exposes business intent while internal validation and persistence stay in its implementation. Locality comes from placing responsibility together; leverage comes from reusing that responsibility across the exports. A device adapter appears at a seam only when interaction with a real or simulated device matters. Apply the deletion test: an object that only forwards the same message should be absorbed. The interface is the test surface for scenario review. Do not refactor generation modules to enact this vocabulary.

Alternatives considered: actor plus a single opaque system loses too much object interaction for the assignment; keeping every controller/database/device object preserves the current complexity. Adding every alternative would expand the task beyond the user's intent.

### 2. Use the following concrete simplifications

The interactions below are scope decisions, not final diagram source. Message counts include every request and return; choose concise nesting that stays within the limit.

| Sequence / UC | Lifelines | Essential visible story | Absorb or omit |
| --- | --- | --- | --- |
| SQ01 / UC03 | User, :MobileApp, :Reservation | Confirm selected vehicle; check eligibility/availability and create 15-minute hold together; return ticket; display confirmation | Separate vehicle module, database lock acknowledgments and repeated validation |
| SQ02 / UC04 | User, :MobileApp, :Pickup, :SimulatedDock | Present ticket; validate/claim pickup; request unlock; receive confirmed unlock; start trip; display active trip | Lock-mechanism self-call, database round trips, safety-tip detail |
| SQ03 / UC05 | User, :MobileApp, :Return, :SimulatedDock | Request return at selected Hub; check/claim capacity; confirm vehicle locked at destination; complete trip and update occupancy/status; display summary | Telemetry module, fee/payment/receipt, LED commands |
| SQ04 / UC07 | User, :MobileApp, :Charging, :SimulatedCharger | Submit vehicle/battery/needed-by; validate request and available compatible capacity; confirm safe power-on; record session; display started state | Wallet/subscription, power tiers, cable internals and database acknowledgments; show only capacity-available success instance |
| SQ05 / UC10 | Operator, :OperatorDashboard, :Transfer | Select vehicles/destination; check eligibility and capacity; create Planned order and holds; return plan; display confirmation | Optimization engine, route/ETA computation, field app and invented driver acknowledgments; later departure/arrival outside this instance |
| SQ06 / UC11 | Operator, :OperatorDashboard, :Incident | Review incident; assess/isolate failed resource and prevent allocation; assign maintenance and record open incident; show status | Technician as initiator, automatic rerouting, database self-call, device electrical mechanics; repair/reactivation remains later scenario work |
| SQ07 / UC13 | Operator, :SimulationUI, :Simulation | Configure scenario; validate and capture isolated current-state snapshot; run simulation; retrieve completed results (UC14); display metrics/recommendations | Separate database/controller chain, Monte Carlo label, 50,000-trip claim, AI and heatmap details; no live-state changes |

Use short method-style request labels and concise return labels. One meaningful self-call can summarize essential internal work; do not add self-calls solely to teach notation. Preserve the threshold and hold semantics in labels or notes where relevant. Do not convert missing error handling into claims of guaranteed success.

### 3. Keep successful instances and document omissions

Use one normal instance per diagram with preconditions and a concise source-step mapping. Alternatives and lifecycle actions remain in the use-case scenarios. No new fragment engine is necessary. If a conditional interaction is retained, use a proper guarded fragment in every representation rather than drawing both outcomes consecutively. Prefer moving it to coverage notes to keep the agreed scope.

### 4. Modify the supported generator in place

Edit DIAGRAMS and recompute activation intervals. Keep SVG/mxGraph/catalog generation together so the existing four output adapters share content. Do not introduce a new scenario DSL or change the legacy phase-two writers. Preserve SQ IDs and current `svg/` and `png/` paths. Confirm the default/output-dir writer paths during implementation: the current generator joins output-dir directly to basenames while its metadata names `svg/`; explicitly route accepted outputs to the documented locations.

Retain black text/borders, existing role palette, native 16/18/22/14px typography and 24px outer clearance. Sequence diagrams have no use-case ellipses/system frame; those geometry rules do not apply. Retain timing marks where useful, but do not turn inherited illustrative seconds into SLAs. Either remove unsupported timing limits consistently or label them illustrative; preserve sourced business timing such as the reservation hold.

### 5. Verify meaning independently of exports

Add lightweight count and source-mapping checks to the existing structural checker. Review a seven-row essential-outcome checklist against use-case source text independently of generator data. Negative fixtures should detect over-budget lifelines/messages and loss of essential confirmation; do not build a general natural-language requirements parser. Existing renderer self-tests, actual SVG/model bounds, save/reopen and deterministic regeneration remain the visual acceptance checks.

## Risks / Trade-offs

- [Aggregation hides safety or allocation rules] → Keep these named in a domain request or note and review against the source scenario.
- [Smaller model mistaken for complete design] → Label successful-instance scope and link omitted alternatives.
- [Role changes appear to redesign architecture] → Explain that lifelines express responsibility at assignment abstraction; preserve use-case actors and mappings.
- [Previously passing fixtures depend on removed participants] → Update scenario-specific assumptions while retaining general collision and notation checks.
- [Local renderer dependencies unavailable] → Report the precise missing dependency and leave verification unpassed; never reuse an older successful record as current evidence.

## Migration Plan

Generate into a temporary sequence directory first. Run semantic/structural checks and native renderer verification; inspect all seven previews. Promote only the sequence artifacts after successful review, update the catalog/README checklist and three import instructions, and regenerate twice to check determinism. Rollback consists of restoring only files changed by this implementation, preserving pre-existing workspace modifications. No deployment or data migration applies.
