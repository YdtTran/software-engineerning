# UML Diagram Standards Review — Agent Note

The project owner has flagged the current Development View diagrams as potentially not following standard UML notation. Before the next command that changes or evaluates the Component Diagram or Package Diagram, read both references below and compare their guidance with the current diagrams:

1. [What is a Package Diagram?](https://www.visual-paradigm.com/guide/uml-unified-modeling-language/what-is-package-diagram/)
2. [What is a Component Diagram?](https://www.visual-paradigm.com/guide/uml-unified-modeling-language/what-is-component-diagram/)

Use the references to identify concrete notation or modeling gaps, not just layout concerns. Check the PlantUML, Mermaid, Draw.io, and SVG deliverables for consistency when changes are later requested. Do not treat the previous wiring cleanup or its geometry checks as proof of UML-standard compliance.

Continue to follow the workspace's source-precedence rules in `AGENTS.md` and the Development View constraints in `02_Rules/06_Development_Implementation_view.md`; document any conflict between a reference and the higher-priority project sources instead of silently overriding them.

## Read status

- Read both references on 2026-11-04 before the next diagram review or modification.
- Package diagram guidance: model logically related UML elements as packages (folder notation); use directed dependencies between packages, with `<<import>>` and `<<access>>` as defined dependency variants. A package diagram can show hierarchical grouping and layered organization.
- Component diagram guidance: components represent modular units with clear responsibilities; UML 2 component notation can use a labeled rectangle, component icon, and/or `<<component>>` stereotype. Show provided interfaces as lollipops and required interfaces as sockets; use square ports on component/boundary edges when exposing those interfaces. Components may be shown at a higher abstraction level using dependencies without explicit interfaces.
- During the next review, assess whether the current drawings use component and package symbols and relationships consistently with these concepts. Record specific discrepancies and keep all representations synchronized if edits are authorized.
