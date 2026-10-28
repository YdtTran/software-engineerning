# Design

## Context

See `proposal.md` for motivation. The central convention is `02_Rules/03_Class_diagram.md`; `AGENTS.md` repeats its core rules, and `.agents/skills/uml-designer/SKILL.md` plus two syntax references guide diagram generation. `.agent/rules/uml-designer.md` is already a delegating entry point.

The prior review visually inspected Ch6 pages 30–34. Page 30 shows attributes-only Customer, Payment, and Cash. Page 34 shows operations-only Server and Printer, and `+printInfo()` without a return type. Page 31 illustrates public/private/protected visibility; it does not itself establish package visibility. Pages 32–33 show both a bare association and an association with multiplicities. Existing wording treats these examples as a universal requirement for full signatures and populated compartments.

`PROJECT_SPECIFICATION.md` Submission #3 and `README.md` separately require detailed class design and descriptions of every modeled method. Those requirements are compatible with permitting abbreviated visual notation.

## Goals / Non-Goals

**Goals:**
- Resolve conflicts at the source while keeping the existing central-document and delegating-entry-point structure.
- Make acceptance decisions traceable to actual slide evidence and the stated modeling purpose.
- Provide a small manual regression checklist for this documentation-only change.

**Non-Goals:**
- No renderer work, automated UML validator, new diagram, or bulk regeneration.
- No weakening of Submission #3 or expansion into other diagram conventions.
- No claim that an abbreviated class proves the class has no other members.

## Decisions

### 1. Separate evidence, project requirements, and tool syntax

Update the central convention with a compact evidence table citing `00_Slides/06_Ch6 System Modeling_2025.pdf`, pages 28–35. Use three categories: slide-supported notation, project submission obligations, and supplementary UML/tool guidance. Slides remain authoritative in a conflict. External tutorial/tool details fill gaps without becoming slide mandates.

The table must distinguish exact slide text/examples from inferred guidance. In particular, do not present added return types on the page-30 operations as literal slide quotations, or claim page 31 establishes all four visibility symbols. Retain useful supplementary concepts such as composition and dependency with honest attribution.

Alternative: replacing the convention with a generic UML guide would lose course-specific evidence and would not solve false attribution.

### 2. Use purpose-aware checks rather than a strict/loose configuration

Describe the three-compartment full form, abbreviated slide forms, and the distinction between omitted and absent information. For an overview, accept the abbreviations demonstrated by the slides. For a detailed submission, separately check required attributes, methods, business cardinalities, and method descriptions. Do not introduce a new mode flag, tool, or configuration.

Retain precise relationship semantics: hollow triangle toward the parent, aggregation diamond at the whole, abstract italics where applicable, and shared-tree layout as shown. Do not force role names or association multiplicities onto every connector. Label naming/layout conventions not established by the slides as project guidance.

Alternative: merely deleting checklist items would remove useful detailed-design checks and obscure submission obligations.

### 3. Scope export geometry explicitly in both instruction entry points

In `AGENTS.md` and the active UML skill, identify Use Case boundary, bounding-box, and Actor-attachment rules as Use Case rules. Preserve the Use Case requirements themselves. Keep general readability and editable-label expectations for Class Diagram exports, with no requirement for Actor or Use Case objects. Preserve the established output formats when a diagram is requested.

Alternative: a blanket Class Diagram exception without correcting the shared headings would leave contradictory instructions in place.

### 4. Keep the central convention authoritative within the local guidance

Align the summary in `AGENTS.md`, the active skill's Class Diagram instructions, and the Class Diagram sections of `04_Mermaid_UML_Guide.md` and `05_PlantUML_Guide.md`. Prefer references to the central convention over new copies of the checklist. Tool examples must distinguish full examples from mandatory detail; a preview limitation cannot redefine slide semantics. Do not alter unrelated sections.

### 5. Verify with concrete documentation scenarios

Record manual checks against the delta-spec scenarios, including attributes-only and operations-only classes, an untyped overview operation, missing submission descriptions, inheritance direction, detailed association multiplicities, Class Diagram export without Use Cases, and unchanged Use Case export rules. Search active documents for remaining contradictory absolutes. No application test suite or new test harness is warranted for prose changes.

## Risks / Trade-offs

- [Abbreviation mistaken for permission to omit required design work] → Keep submission completeness as a separate checklist with the existing master-specification reference.
- [An example mistaken for a universal slide rule] → Cite exact pages, label inference, and compare the visual PDF rather than relying only on extracted text.
- [Instruction drift] → Update the active summaries and syntax references together; leave the delegating legacy entry point thin.
- [Mermaid cannot reproduce every authoritative visual detail] → Document preview limits and assess the editable diagram against the slides; do not relax the source notation to match a preview.

## Migration Plan

Apply the documentation edits together, record scenario results, and validate the OpenSpec change. Do not regenerate existing diagrams. Existing artifacts can be reviewed under the revised convention when next edited. Rollback consists of reverting only this change's documentation edits, preserving unrelated workspace changes.
