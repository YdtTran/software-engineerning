# Proposal

## Why

The Class Diagram convention rejects representations used by the lecture slides: classes with two displayed compartments and operations without explicit return types. Shared SVG instructions also impose Use Case geometry on Class Diagrams, despite the slides being the project's highest authority.

## What Changes

- Make the local lecture slides the highest authority for Class Diagram notation; cite the PDF and page for slide-derived rules and distinguish supplementary project/tool guidance.
- Describe three compartments as the full form while accepting the abbreviated forms shown on Ch6 pages 30 and 34. Do not invent members or types to satisfy a visual checklist.
- Separate abbreviated presentation from submission completeness: preserve the assignment/master specification's detailed class design and descriptions of every modeled method.
- Replace absolute checklist rules with checks appropriate to the diagram's stated level of detail. Preserve relationship meaning, abstract notation, and explicit multiplicities where business constraints are modeled.
- Restrict system-boundary, Actor, and Use Case bounding-box rules to Use Case diagrams. Keep Class Diagram labels and connectors readable without introducing a Use Case boundary.
- Align AGENTS.md, the central Class Diagram convention, and the active UML skill/references so the same request produces consistent guidance.

## Capabilities

### New Capabilities

- `class-diagram-conventions`: Slide-grounded requirements for authoring and reviewing Class Diagrams, including presentation detail, evidence, and diagram-specific export rules.

### Modified Capabilities

None. The project currently has no main OpenSpec capabilities.

## Impact

Affected documents: `AGENTS.md`, `02_Rules/03_Class_diagram.md`, `.agents/skills/uml-designer/SKILL.md`, and the Class Diagram sections of its PlantUML and Mermaid references. `PROJECT_SPECIFICATION.md` and `README.md` provide submission constraints to preserve; clarify them only if wording must distinguish submission detail from notation. `.agent/rules/uml-designer.md` already delegates to the central documents and does not need duplicated rules.

No application code, generator changes, new dependencies, or diagram regeneration are proposed. Other diagram conventions and existing submission deliverables remain outside scope.
