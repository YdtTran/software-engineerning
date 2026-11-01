# Tasks

## 1. Correct the central Class Diagram convention

- [ ] 1.1 Update `02_Rules/03_Class_diagram.md` with slide-first precedence and an evidence table tied to the local Ch6 PDF; verify the citations visually against pages 28–35 and label supplementary visibility, composition, dependency, and tool guidance without unsupported slide attribution.
- [ ] 1.2 Replace universal compartment/signature requirements with full and abbreviated presentation rules, then revise the checklist; verify it accepts page-30 attributes-only classes, page-34 operations-only classes, and `+printInfo()` without inventing members or types, while preserving abstract notation and relationship meaning.
- [ ] 1.3 Add a distinct detailed-submission completeness check referencing the existing master specification and README; verify a missing method description is reported as submission incompleteness and that descriptions of every modeled method and detailed business multiplicities remain required. Clarify the master specification or README only if necessary to remove a contradiction; preserve their deliverables.

## 2. Align the active instruction entry points

- [ ] 2.1 Align the Class Diagram summary and SVG-rule scope in `AGENTS.md` and `.agents/skills/uml-designer/SKILL.md` with the central convention; verify a Class Diagram needs no Use Case boundary, Actor attachments, or `uc_x` calculation, while Use Case geometry and existing requested output formats remain intact.
- [ ] 2.2 Align only the Class Diagram sections of the active PlantUML and Mermaid reference guides; verify full examples are not described as compulsory member detail, abbreviated examples have consistent meaning, and any preview limitations are identified without replacing slide requirements.

## 3. Verify the documentation as a whole

- [ ] 3.1 Walk every scenario in `specs/class-diagram-conventions/spec.md` against the revised documents and record evidence in this change's `verification.md`; search the affected files for remaining unconditional three-compartment, full-signature, role-label, and universal SVG geometry rules, and verify the delegating `.agent/rules/uml-designer.md` still points to valid central documents without duplicated requirements.
- [ ] 3.2 Run `openspec validate align-class-diagram-requirements-with-slides --strict` and review the implementation diff; verify no diagram regeneration, generator code, unrelated diagram conventions, submission deliverables, or unrelated local edits were changed.
