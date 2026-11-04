# Proposal

## Why

The current class diagram repeats complete class members across eight views, making a simple assignment harder to read and explain. The user selected presentation simplification while retaining essential classes; the class model should also remain traceable to the newly simplified sequence diagrams.

## What Changes

- Preserve all 19 domain classes, two abstract roots, 18 declared operations in the full catalog, four generalizations and 26 associations, including roles and multiplicities.
- Show a small, explicit selection of at most three attributes and two operations per class in the default diagram views; preserve three compartments, leaving unused compartments empty.
- Keep the eight existing focused scopes, improve their compact layout and overview navigation, and avoid adding implementation classes merely to match sequence lifeline names.
- Retain the complete class catalog and all method descriptions as the detailed submission reference; distinguish hidden presentation members from deleted model members.
- Update the lifeline mapping and checker to the current seven simplified sequences, removing the obsolete fixed count of 23 names.
- Regenerate matching compact PlantUML/Mermaid, editable Draw.io/SVG and PNG views, with a documented hidden-member policy and slide checklist.

## Capabilities

### New Capabilities

None. This is a documentation/presentation change to already specified behavior, consistent with `define-domain-class-model`. The change explicitly sets `skip_specs: true`; acceptance criteria are in design.md and tasks.md.

### Modified Capabilities

None. No runtime requirements, domain invariants or main specs change. The main spec inventory is currently empty.

## Impact

Changes during apply are confined to `01_Diagram/05_Class_Diagram/`: generator, renderer, README, class/sequence mapping notes, notation catalog and generated assets. Preserve full member blocks and method contracts. Coordinate with the unimplemented `align-class-diagram-requirements-with-slides` change without editing its artifacts, AGENTS.md or shared UML rules. No sequence regeneration, application edits, dependency installation or domain-model reduction is included.
