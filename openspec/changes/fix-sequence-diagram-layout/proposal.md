# Proposal

## Why

All seven sequence-diagram SVG previews contain diagonal message lines because their generator omits the destination Y coordinate on 70 request/response lines. Long labels also collide with activation bars, SQ06 clips a self-call label, and opening the same artifacts in draw.io loses annotations or changes label placement.

## What Changes

- Repair message geometry once in the shared sequence generator and regenerate SQ01–SQ07 at their existing paths.
- Fit labels within their available space using wrapping, targeted participant spacing, row heights, and canvas bounds that include self-calls and annotations.
- Preserve editable draw.io content and give it the same message geometry, labels, title, and timing annotations as the SVG preview.
- Correct presentation-level UML notation: hierarchical message numbering, typed object headers, activation endpoints, nested self-call activations, and guarded fragments where existing scenario documentation establishes alternatives.
- Add focused structural and renderer-based regression checks, PNG review exports, and a sequence-specific verification record.
- Update the existing PlantUML/Mermaid catalog and add regeneration instructions and a slide-standard checklist.

## Capabilities

### New Capabilities

- `sequence-diagram-rendering`: Generate readable, editable, consistent sequence-diagram artifacts with correct UML message geometry and reproducible layout verification.

### Modified Capabilities

None. There are no existing OpenSpec capability specifications.

## Impact

- Primary implementation: `.agent/scripts/generate_slide_style_sequence.py`; focused sequence validation/rendering scripts under `.agent/scripts/`.
- Outputs: the seven existing `.drawio.svg` files and `PLANTUML_SEQUENCE.md` under `01_Diagram/02_Sequence_Diagram/`, plus corresponding PNG previews, a README, and `verification.json`.
- Reuse the installed draw.io viewer and Playwright pattern in `.agent/scripts/render_usecases.cjs`; do not alter its use-case checks to apply sequence-specific crossing rules.
- Other phase-2 generators can overwrite the same filenames; document the supported sequence regeneration command and handle any sequence entry point retained as supported without regenerating activity/state diagrams.
- Preserve use-case IDs, filenames, participant responsibilities, and intended message order. New business branches, algorithms, performance promises, application changes, other diagram families, and a generic layout framework are outside scope.
