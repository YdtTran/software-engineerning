# Spec Delta

## Purpose

Define consistent, lecture-grounded authoring and review requirements for Class Diagrams while preserving the project's detailed submission obligations.

## ADDED Requirements

### Requirement: Lecture slides take precedence
Class Diagram authoring and review SHALL prioritize the local lecture slides over project conventions, external tutorials, and rendering-tool defaults. Slide-derived rules MUST cite the PDF and page; supplementary rules MUST be identified as project or tool guidance without conflicting with the slides.

#### Scenario: A local checklist contradicts a lecture example
- **WHEN** a checklist rejects a representation explicitly shown in `00_Slides/06_Ch6 System Modeling_2025.pdf`
- **THEN** the review accepts the slide-supported notation and identifies the conflicting checklist rule for correction

#### Scenario: Supplementary notation is documented
- **WHEN** the convention describes notation not established by the cited slides, such as composition, dependency, or package visibility
- **THEN** it labels that material as supplementary unless a verified slide citation establishes it
- **AND** it does not attribute the rule to an unrelated slide

### Requirement: Displayed detail follows the modeling purpose
The convention SHALL describe the three-compartment class as the full form and accept abbreviated forms demonstrated on Ch6 pages 30 and 34. Review MUST NOT require invented attributes, operations, types, or return values solely to fill compartments or satisfy a presentation checklist.

#### Scenario: An attributes-only class is shown
- **WHEN** a diagram uses an attributes-only class in the manner of Customer, Payment, or Cash on page 30
- **THEN** review does not report the omitted operations compartment as a notation error

#### Scenario: An operations-only class is shown
- **WHEN** a diagram uses an operations-only class in the manner of Server or Printer on page 34
- **THEN** review does not require an invented attributes compartment

#### Scenario: An abbreviated operation is shown
- **WHEN** an overview shows an operation such as `+printInfo()` without a return type, as on page 34
- **THEN** review accepts the abbreviated notation and does not infer a return type from its omission

### Requirement: Submission detail remains independently assessable
Authoring and review SHALL state whether a Class Diagram is an overview or a detailed submission design. Acceptance of abbreviated notation MUST NOT waive assignment or master-specification obligations for detailed class design and descriptions of every modeled method. Missing required design information SHALL be reported as submission incompleteness, separately from notation errors.

#### Scenario: A submission lacks method descriptions
- **WHEN** a detailed submission uses valid abbreviated notation but omits descriptions required by the assignment or master specification
- **THEN** review accepts the supported notation and separately reports the missing submission detail
- **AND** it does not add speculative methods or signatures to resolve the gap

### Requirement: Relationship and abstract notation preserve slide meaning
Class Diagram guidance SHALL preserve the hollow generalization triangle toward the parent, hollow aggregation diamond at the whole, and abstract class or operation italics shown on Ch6 pages 30–34. Detailed business associations SHALL state their multiplicities; review MUST NOT impose multiplicities or role labels on every connector regardless of its kind or the slide example's purpose.

#### Scenario: An association models a business cardinality
- **WHEN** a detailed design models how many objects participate in an association
- **THEN** its endpoint multiplicities express the intended constraint using the slide notation

#### Scenario: A slide-style inheritance tree is reviewed
- **WHEN** several child classes generalize to a parent as on page 34
- **THEN** review checks the hollow triangle direction and abstract notation
- **AND** it does not require association multiplicities or role labels on inheritance edges

### Requirement: Export rules follow the diagram type
Class Diagram exports SHALL keep class boxes, relationship symbols, multiplicities, and labels legible. Use Case system boundaries, Actor attachment points, and Use Case bounding-box formulas MUST apply only to Use Case diagrams. Class Diagram exports MUST NOT require Use Case elements to satisfy export checks.

#### Scenario: A Class Diagram contains no Use Cases
- **WHEN** a Class Diagram is exported as an editable draw.io SVG
- **THEN** its export checks require no Use Case bounding-box calculation, Actor, or Use Case system boundary
- **AND** they still check for clipped or overlapping classes and unreadable relationship labels

#### Scenario: A Use Case diagram is exported
- **WHEN** the existing Use Case export workflow is used
- **THEN** its system-boundary and Actor geometry requirements remain in force

### Requirement: Active guidance agrees on acceptance criteria
The central Class Diagram convention, workspace instructions, and active UML skill and syntax references SHALL agree on slide precedence, permitted presentation detail, submission obligations, and diagram-specific export scope. Tool previews SHALL identify visual limitations rather than redefine the slide-based notation.

#### Scenario: The same diagram is reviewed through different entry points
- **WHEN** an author follows either workspace instructions or the UML skill
- **THEN** both lead to the same Class Diagram acceptance criteria
- **AND** a Mermaid preview limitation does not override the authoritative notation requirements
