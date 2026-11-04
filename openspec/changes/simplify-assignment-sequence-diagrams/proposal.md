# Proposal

## Why

The seven existing sequence diagrams are useful but expose more technical detail than a simple CO3001 assignment needs. Simplify their presentation around the corresponding use-case goals so students can explain each interaction without defending production-scale design choices.

## What Changes

- Retain SQ01–SQ07 and their UC03, UC04, UC05, UC07, UC10, UC11 and UC13 mappings.
- Reduce each successful instance to an actor and two or three meaningful object lifelines, normally six to ten messages.
- Absorb internal validation, persistence and hardware mechanics into the responsible object; retain interactions necessary to explain the outcome.
- Remove incidental payment/subscription, route-optimization, technician-app and AI/historical-dataset details; preserve required reservation, capacity, safety and simulation behavior at a higher level.
- Keep slide notation, native readability, editable SVG/draw.io models, PlantUML and Mermaid in agreement.
- Document what is omitted from each successful instance and where its source use case covers alternatives.

## Capabilities

### New Capabilities

- `sequence-scenario-presentation`: Assignment-level complexity, use-case traceability and essential interaction coverage for the seven sequence diagrams.

### Modified Capabilities

None. The main spec inventory is empty; existing layout/readability changes remain relevant constraints rather than archived main specs.

## Impact

Update the existing sequence generator, structural checker, renderer inventory expectations where needed, sequence catalog, README and generated sequence exports. No application behavior, other UML families, use-case definitions, additional diagram coverage or architectural refactor is included. Supersede earlier changes’ message-preservation constraints only where simplifying scenario content requires it; retain their rendering and readability protections.
