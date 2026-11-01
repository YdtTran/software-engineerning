# Tasks

## 1. Class catalog and behavior contracts

- [x] 1.1 Create `01_Diagram/05_Class_Diagram/CLASS_CATALOG.md` with the two abstract roots, their four concrete subclasses, the remaining concrete domain classes, and service responsibilities from `design.md`; verify every entry is marked abstract/concrete, has a purpose and UC/source mapping, and each inheritance relationship has an is-a justification.
- [x] 1.2 Complete the catalog's typed attributes/operations, supporting enums/value types, association roles/multiplicities, and allocation invariants; verify examples cover private motorcycles excluded from rental/transfer, traveling vehicles without a current hub, distinct reservation expiry calculations, historical versus active allocations, interrupted charging, incident isolation, and pending/failed simulations without results.
- [x] 1.3 Map all lifeline names in `01_Diagram/02_Sequence_Diagram/PLANTUML_SEQUENCE.md` to domain, service, UI, external, or storage concepts; verify each name has an explicit mapping and no sequence files or prototype code changed.
- [x] 1.4 Create `METHOD_DESCRIPTIONS.md` with purpose, inputs, output, preconditions, postconditions and error behavior for each operation selected for the diagram, including abstract and overridden operations; verify all catalog operations selected for display have descriptions and that inherited operations link to their base description.

## 2. Diagram sources and editable export

- [x] 2.1 Create `PLANTUML_CLASS.md` containing complete `@startuml`/`@enduml` and Mermaid `classDiagram` blocks for the same domain model; verify both sources match the catalog's names, members, inheritance direction, roles and cardinalities, and every displayed method has a description.
- [x] 2.2 Produce `smart_emobility_class_diagram.drawio.svg`, reusing existing compatible SVG/mxGraph helpers where available; verify SVG and embedded mxGraph XML parse, class compartments and labels remain editable, and graph/visual content agree with both source blocks. If generation needs new non-trivial logic, include a small assert-based structural self-check with it.
- [x] 2.3 Inspect the rendered class diagram alongside lecture pages 30–34; record abstract italics, hollow generalization triangles/shared branches, detailed compartments, relation labels/multiplicities, no clipped text, and no node/connector overlap in the README checklist. State Mermaid preview limitations and any untested imports explicitly.

## 3. Documentation integration

- [x] 3.1 Add `01_Diagram/05_Class_Diagram/README.md` with purpose, artifact links, source citations, the completed quality checklist, and the three VS Code/Draw.io/VP Online instructions; link the folder from `PROJECT_SPECIFICATION.md` and verify every new local link resolves.
- [x] 3.2 Review the completed artifact set together: verify UC01–UC14 traceability, all five simulation scenario types, method-description coverage and name/member/relationship parity across catalog, PlantUML, Mermaid and SVG; run `openspec validate define-domain-class-model --strict` and confirm the diff contains only this change's planned documentation/diagram additions and master-specification link.
