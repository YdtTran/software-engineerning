# Proposal

## Why

Smart E-Mobility Hub has requirements, interaction diagrams, and a UI prototype, but no class-design folder or consolidated class catalog. The team needs justified abstract and concrete classes to prepare Submission #3, which requires a class diagram and descriptions of every modeled method.

## What Changes

- Document a focused domain class catalog covering UC01–UC14: users, vehicles, hubs, reservations, trips, charging, incidents, redistribution, and simulation.
- Distinguish abstract classes from concrete classes, explain shared behavior and specialization, and keep vehicle ownership separate from vehicle type.
- Define attributes, operations, relationships, multiplicities, and resource-allocation invariants, with traceability to the assignment and master specification.
- Produce an editable class diagram, matching PlantUML and Mermaid sources, method descriptions, a slide-based checklist, and the project's three editing/import instructions during apply.

## Capabilities

### New Capabilities

None. This change documents the design of already specified behavior; it introduces no new runtime behavior. `skip_specs: true` explicitly marks this documentation-only change.

### Modified Capabilities

None. The main OpenSpec capability inventory is empty, and existing business requirements remain unchanged.

## Impact

Planned deliverables live in `docs/diagrams/05_Class_Diagram/`: `CLASS_CATALOG.md`, `METHOD_DESCRIPTIONS.md`, `PLANTUML_CLASS.md`, `smart_emobility_class_diagram.drawio.svg`, and `README.md`. Add a link from `docs/requirements/PROJECT_SPECIFICATION.md` to make them discoverable.

Reuse terminology from existing sequence diagrams and the central Class Diagram convention. Coordinate notation with the existing `align-class-diagram-requirements-with-slides` proposal without changing or applying it here. No backend classes, UI changes, database schema, infrastructure, dependencies, or physical IoT integration are included.
