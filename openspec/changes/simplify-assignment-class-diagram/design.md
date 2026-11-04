# Design

## Context

See proposal.md for motivation and the user's choice to preserve essential classes. The current catalog defines 19 classes, 18 declared operations, four generalizations and 26 associations. The generator repeats complete members across 35 class occurrences in eight focused views, plus an overview. Its parity checker requires complete members in every occurrence and exactly 23 sequence lifeline names. The newly simplified sequence catalog no longer has that inventory.

`build_class_diagram.py` parses selected-member blocks from CLASS_CATALOG.md, writes PLANTUML_CLASS.md and native Draw.io, and verifies SVG parity. `render_class_diagram.cjs` exports the overview, previews and geometry evidence; its Playwright path is currently fixed to an absent Codex runtime directory. The Draw.io skill path is also fixed in the builder and needs discovery/override support if unavailable on this machine. Existing available dependencies can be supplied explicitly, without adding packages.

Sources: CO3001 Ch6 pp.28–35; assignment Submission #3 requires a class diagram and descriptions of all its methods; PROJECT_SPECIFICATION.md and current use-case scenarios define domain scope. The central class rules distinguish abbreviated examples from detailed submission completeness. The user-supplied workspace instructions require three compartments, typed displayed members, abstract italics, roles and multiplicities; this design preserves them. The separate notation-alignment change remains unapplied and is not a prerequisite.

## Goals / Non-Goals

**Goals:** Reduce repeated visible text and improve explanation at assignment scale while preserving class identity, inheritance, relationship meaning, method contracts and use-case coverage. Keep detailed source completeness independently verifiable.

**Non-Goals:** Reduce 19 classes, merge domain concepts, redesign business operations, add UI/controller/device classes to the domain model, change global rules or regenerate the sequence diagrams.

## Decisions

### 1. Keep one complete model and one explicit compact presentation

Retain full attribute/operation blocks in CLASS_CATALOG.md and all 18 contracts in METHOD_DESCRIPTIONS.md. Introduce a small explicit member-selection table in the catalog; the generator selects only named existing members for the compact exports. Missing classes, unknown members and inconsistent copies fail validation. An omitted member remains part of the model and is never described as deleted.

The projection module has one interface: full model plus member selection yields the displayed model. Its implementation hides member filtering from output adapters, giving locality and leverage across native Draw.io, SVG, PlantUML and Mermaid. These existing output adapters justify a real export seam. Depth here means one presentation choice updates all outputs; the interface is the test surface. Apply the deletion test to any proposed forwarding module and keep this as a small function in the existing generator, without introducing a framework or hypothetical runtime seams.

Alternatives: editing full member blocks would change the model against the user's choice; manually shortening each output would let representations diverge; adding another full set of tabs would increase navigation burden. Preserve the catalog as the complete reference and label default exports compact.

### 2. Use this concrete display selection

Each displayed class has at most three attributes and two operations. Names below select existing typed members verbatim; they do not change signatures. Keep three editable compartments, even where empty. Inherited members remain on their declaring class. All other members remain documented in the full catalog.

| Class | Displayed attributes | Displayed operations |
| --- | --- | --- |
| UserAccount | accountId, roles | hasRole |
| ElectricVehicle (abstract) | batteryPercent, status, ownership | isRentable |
| ElectricBicycle | none | none |
| ElectricMotorcycle | none | none |
| MobilityHub | name, location, powerLimitKW | availableParkingCount |
| ParkingSlot | slotId, status | canAccept |
| ChargingPoint | status, connector, ratedPowerKW | canServe |
| Reservation (abstract) | status, expiresAt | cancel, calculateExpiry (abstract) |
| VehicleReservation | reservedAt | calculateExpiry |
| ParkingReservation | scheduledArrivalAt | calculateExpiry |
| Trip | status, pickedUpAt, returnedAt | complete |
| ChargingRequest | batteryAtRequest, neededBy, status | isUrgent |
| ChargingSession | status, allocatedPowerKW | stop |
| TransferOrder | status | complete |
| OperationalIncident | status | resolve |
| SimulationScenario | type, parameters | validate |
| SimulationRun | status, snapshot | complete |
| SimulationResult | serviceSuccessRate, averageWaitMinutes, rejectedTripCount | none |
| CoordinationRecommendation | type, details, status | none |

This reduces visible members without hiding decision-bearing state, capacity, deadlines or simulation metrics. Identity/timestamp details generally move to the detailed catalog. No getters/setters or filler methods are added. Full method descriptions still cover omitted updateBattery and expire operations as part of the preserved complete model.

### 3. Preserve focused scopes and improve their layout

Keep existing eight scopes: vehicle types, location/ownership, reservations, trips, charging, transfers, incidents and simulation. Keep their existing native tabs and preview paths. Size class boxes from projected members, rerun automatic placement/routing, and retain consistent compact members wherever a class repeats. Keep the overview as a labeled navigation atlas to the readable views; do not promise every label on its thumbnail is legible. Make the numbered views the reading reference in README.

All 19 unique classes and all 30 relationships remain represented across the view union. Do not omit a relationship to reduce crossings. Preserve source/destination Hub roles, optionality, private ownership, request/session distinction and exclusive ownership of recommendations. Keep inheritance triangles pointing child to parent, abstract italics and shared inheritance stems. Use full signature types and visibility for every displayed member. Keep separate editable role and multiplicity labels. No use-case frame or actor nodes belong in this diagram.

Alternatives: a single dense 19-class canvas would reintroduce routing complexity; new grouping scopes would need additional semantic review without a clear benefit for this presentation-only change.

### 4. Reconcile simplified sequences by responsibility

Derive the current lifeline inventory from the current sequence source rather than asserting 23 names. Update catalog mappings for every actual lifeline:

- User/Operator map to UserAccount roles; UI lifelines remain presentation objects outside the domain diagram.
- :Reservation maps to coordination over VehicleReservation, ElectricVehicle and UserAccount. Its sequence name is an aggregate responsibility; it is not an instance of the abstract Reservation domain root.
- :Pickup and :Return coordinate VehicleReservation, Trip, ElectricVehicle, ParkingSlot and MobilityHub.
- :Charging coordinates ChargingRequest, ChargingSession and ChargingPoint with account/vehicle/Hub constraints.
- :Transfer maps to TransferOrder and its shared-vehicle/source/destination relationships.
- :Incident maps to OperationalIncident and resource isolation/maintenance responsibility.
- :Simulation coordinates SimulationScenario, SimulationRun, SimulationResult and CoordinationRecommendation.
- :SimulatedDock and :SimulatedCharger are device adapters outside the domain class set, not aliases for new domain classes.

The mapping describes design responsibilities; do not invent domain operations just to mirror method-style sequence messages. Keep UC01–UC14 and lifecycle-source references valid. User/Student role naming in existing enum documentation is explained rather than renamed in this change.

### 5. Separate semantic preservation from presentation parity

The complete model checker retains assertions for 19 classes, 18 operations, four generalizations, 26 associations and full method contracts. The presentation checker asserts each shown member is a typed, unchanged subset of its full class, within the display budget, identical across copies and exports. Abstract Reservation.calculateExpiry must remain visible and italic; concrete overrides remain regular.

Compare class/relationship identity and semantics independently of visual member selection. Add negative fixtures for unknown selected members, over-budget presentation, inconsistent repeated members, lost relationship multiplicity and unmapped current sequence lifelines. Do not test exact layout coordinates; verify rendered bounds, label collisions, routing, editable content and source parity instead.

Use explicit overrides or normal module discovery for already installed Draw.io skill/Playwright paths. Report missing prerequisites precisely and leave verification unpassed if rendering cannot run. No silent skipped checks or dependency installation.

## Acceptance Criteria

1. All 19 classes, 18 canonical operations and 30 relationships remain in the preserved model; displayed relationships retain kind, direction, roles and multiplicities.
2. Every compact class occurrence has three compartments, at most three attributes/two operations and unchanged typed signatures; repeated copies agree.
3. The eight focused views and overview have consistent compact PlantUML/Mermaid/native sources, SVG and PNG outputs with stable existing paths and explicit links to complete documentation.
4. Every current sequence lifeline has a responsibility mapping, without adding domain classes or changing sequences.
5. Full method-contract checks, source-parity checks, negative fixtures, Draw.io XML validation and native geometry review pass; regenerate twice to establish deterministic model/source output.
6. README clearly distinguishes presentation omission from model deletion and includes slide checklist and the three editor/import instructions.

## Risks / Trade-offs

- [Compact class appears to have lost hidden members] → Label exports compact and link complete member/contract documentation from README and notation catalog.
- [Sequence :Reservation is mistaken for abstract domain Reservation] → Explicitly distinguish aggregate coordination responsibility from a concrete object of the abstract root.
- [Unchanged relationships still make overview dense] → Preserve numbered readable views, reduce box text and recompute routes; inspect every preview at native size.
- [Old full-member parity rejects intended omissions] → Keep canonical validation separate from subset parity and prove both with negative fixtures.
- [Conflicting active changes] → Supersede only full-member display/old lifeline inventory assumptions in define-domain-class-model; preserve detailed deliverables and leave notation-alignment planning untouched.

## Migration Plan

Capture the current generated-file baseline before apply. Implement selection and checks first, generate into isolated temporary output, inspect the eight previews, validate the editable model, then promote only class-diagram artifacts. Preserve existing paths, original full member blocks and method descriptions. Store a fresh verification record with tools, model counts and per-view results. Rollback restores only files changed by this implementation and preserves unrelated local edits. No backend deployment or data migration applies.
