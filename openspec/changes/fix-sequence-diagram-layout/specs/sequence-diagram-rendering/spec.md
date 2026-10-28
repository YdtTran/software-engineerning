# Spec Delta

## Purpose

Provide readable UML sequence diagrams whose previews and editable draw.io content consistently represent the same scenario, with repeatable checks that prevent geometry defects from returning.

## ADDED Requirements

### Requirement: Horizontal messages and ordered interactions
The generated diagram SHALL render each ordinary request or response horizontally at its assigned interaction row, with its arrowhead at the destination. Requests SHALL use solid lines and filled heads; responses SHALL use dashed lines and open heads. Successive interactions SHALL progress downward.

#### Scenario: Regenerate the seven existing scenarios
- **WHEN** SQ01 through SQ07 are regenerated
- **THEN** every ordinary message has equal start and end Y coordinates in the preview and editable model
- **AND** no ordinary message is drawn diagonally toward the canvas origin
- **AND** self-calls remain rectangular loops with downward time progression

### Requirement: Readable labels and complete canvas bounds
All message labels, participant headers, self-call loops, fragment guards, and annotations SHALL fit within the diagram bounds without clipping. Labels SHALL avoid activation bars, unrelated message lines, and other labels. Layout SHALL accommodate wrapped text without overlapping adjacent interaction rows.

#### Scenario: Long ordinary message
- **WHEN** a message label is wider than the gap between its participants
- **THEN** wrapping or additional space keeps the complete label readable
- **AND** the label does not cover either activation bar

#### Scenario: Rightmost self-call in SQ06
- **WHEN** SQ06 displays the database self-call describing reservation rerouting
- **THEN** the entire label and loop are visible within the exported canvas
- **AND** the label remains clear of the loop and activation bar in draw.io

### Requirement: Preview and editable content agree
Each generated `.drawio.svg` SHALL contain valid editable draw.io content matching its preview in participant order, message content and geometry, activation intervals, fragment boundaries, title, and timing annotations. Existing filenames and use-case references SHALL remain usable.

#### Scenario: Open and save in draw.io
- **WHEN** an existing sequence artifact is opened and saved through the draw.io model
- **THEN** all diagram information remains present and editable
- **AND** arrows and label positions remain consistent with the preview, allowing minor font-rendering differences

### Requirement: Slide-compliant sequence notation
Diagrams SHALL show the initiating actor on the left, typed object headers, dashed lifelines, hierarchical message numbers, and activation bars aligned with modeled execution boundaries. A self-call SHALL show an offset nested activation. Alternatives established by the source scenario SHALL use guarded fragments with distinct operands.

#### Scenario: Nested internal call
- **WHEN** a participant calls itself during an active execution
- **THEN** its loop ends on an offset nested activation
- **AND** the nested execution ends before the enclosing execution returns

#### Scenario: Existing documented alternative
- **WHEN** the authoritative scenario documents mutually exclusive success and failure paths included in the sequence
- **THEN** the paths appear in separate guarded operands of an `alt` fragment
- **AND** the diagram does not imply that both paths execute sequentially

### Requirement: Preserve scenario meaning across representations
The diagram set and its PlantUML and Mermaid catalog SHALL describe consistent participants, message order, guards, and activation behavior. Presentation repairs SHALL preserve existing business responsibilities and timing values; unsupported or conflicting business claims SHALL be recorded for separate review rather than silently changed or presented as verified requirements.

#### Scenario: Formatting exposes a source conflict
- **WHEN** generators or project documents disagree about a simulation algorithm, actor role, or timing target
- **THEN** the repair records the conflict and its provenance
- **AND** it does not introduce a new business decision to resolve the disagreement

### Requirement: Reproducible verification and exports
The sequence set SHALL provide PNG previews, a verification record identifying the renderer and per-diagram results, and documented regeneration instructions. Verification SHALL detect invalid message coordinates, stacked message segments, label collisions, clipping, and missing editable content. Expected message intersections with intervening lifelines SHALL NOT count as layout defects.

#### Scenario: Geometry regression
- **WHEN** a generated SVG omits a message endpoint coordinate or contains a clipped label
- **THEN** verification fails and identifies the diagram and affected element
- **AND** it does not report a successful diagram set

#### Scenario: All diagrams pass
- **WHEN** all seven artifacts satisfy structural and rendered geometry checks
- **THEN** the record reports seven passing diagrams with no unresolved layout defects
- **AND** the documentation includes a slide-standard checklist and instructions for VS Code, PlantUML insertion in draw.io, and PlantUML import into VP Online
