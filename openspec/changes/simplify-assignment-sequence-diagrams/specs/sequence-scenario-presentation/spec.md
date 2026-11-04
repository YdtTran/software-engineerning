# Spec Delta

## Purpose

Present the seven assignment sequence diagrams as concise, understandable use-case instances while retaining essential outcomes and course-standard UML notation.

## ADDED Requirements

### Requirement: Bounded assignment-level complexity
Each SQ01–SQ07 diagram SHALL contain one initiating actor and two or three meaningful object lifelines, with at most ten messages including returns. It SHALL omit independent persistence lifelines and low-level implementation mechanics. Six to ten messages is the target; fewer are acceptable when the essential outcome remains clear.

#### Scenario: Inspect the simplified set
- **WHEN** a reviewer opens any simplified sequence
- **THEN** it contains three or four total lifelines and no more than ten messages
- **AND** every object contributes essential behavior rather than forwarding calls only

### Requirement: Preserve use-case outcomes
SQ01–SQ07 SHALL retain their identifiers and mappings to UC03, UC04, UC05, UC07, UC10, UC11 and UC13. Each SHALL identify a successful instance and trace its essential interactions to the current use-case scenario. Aggregating internal work SHALL NOT imply skipped eligibility, capacity, safety or confirmation requirements.

#### Scenario: Review allocation and physical confirmation
- **WHEN** reservation, pickup, return, charging or transfer sequences are reviewed
- **THEN** resource checks precede allocation and required physical or simulated confirmation precedes success
- **AND** return has no payment and transfer planning does not imply completed arrival

#### Scenario: Review incident and simulation instances
- **WHEN** SQ06 and SQ07 are reviewed
- **THEN** Operator initiates both, incident isolation and maintenance remain explicit, and simulation uses isolated state
- **AND** simulation results are reviewed as UC14 without automatically applying recommendations to live resources

### Requirement: Omit incidental production detail
The diagrams SHALL omit wallet/subscription verification, fee deduction, AI implementation, fixed historical-dataset sizes, optimization algorithms and device-internal mechanics. Required business checks SHALL be summarized in concise domain messages. Numerical timing limits SHALL be sourced or explicitly labeled illustrative assumptions.

#### Scenario: Explain simplified messages
- **WHEN** a student explains the sequence using its source use case
- **THEN** no unexplained production mechanism is needed to justify a message
- **AND** hidden internal work and omitted alternatives are documented in the coverage notes

### Requirement: Retain course notation and consistent exports
Every simplified sequence SHALL retain typed object headings, actor placement, dashed lifelines, balanced activations, filled synchronous request heads, open dashed return heads and hierarchical numbering. SVG, embedded draw.io, PlantUML, Mermaid and PNG SHALL depict the same interaction. Existing native readability and geometry checks SHALL remain effective.

#### Scenario: Regenerate and reopen simplified diagrams
- **WHEN** all seven diagrams are regenerated and their editable models saved and reopened
- **THEN** scenario content agrees across representations and no labels clip or overlap
- **AND** the catalog supplies PlantUML and Mermaid blocks, a slide checklist and the three editor/import instructions

### Requirement: State the coverage limit
The sequence README SHALL state that the seven diagrams show selected successful instances. Alternatives, exceptions and later lifecycle actions SHALL remain linked to their existing use cases rather than being silently deleted or expanded into new diagrams.

#### Scenario: Review an omitted failure path
- **WHEN** a reviewer looks for an invalid ticket, full Hub or failed unlock
- **THEN** the coverage notes identify the source alternative or exception
- **AND** the successful diagram does not claim to cover that failure
