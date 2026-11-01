# Tasks

## 1. Repair message geometry at its source

- [x] 1.1 Add a focused sequence regression check under `.agent/scripts/` that parses SVG and embedded XML; verify it fails on the current omitted `y2` values and identifies all seven affected diagrams (70 ordinary message lines in the reviewed baseline).
- [x] 1.2 Remove the unused `fitz` import and add explicit destination Y coordinates for request and response SVG lines in `generate_slide_style_sequence.py`; verify generation runs with standard-library Python and ordinary endpoints are horizontal in temporary outputs.
- [x] 1.3 Document the supported sequence regeneration command in a sequence README and identify legacy phase-2 writers; verify the documented command targets only SQ01–SQ07 and replace any directly relevant stale command recommendations.

## 2. Make labels and editable geometry consistent

- [x] 2.1 Add only the layout calculations needed for wrapping, targeted column gaps, variable row spacing, and complete canvas extents; verify fixtures for a long ordinary label and SQ06's rightmost self-call fit without clipping.
- [x] 2.2 Reuse calculated coordinates in SVG and mxGraph and explicitly place ordinary/self-call labels; add editable title and timing cells, retaining stable IDs where possible; verify both models contain matching diagram content and valid relative edge geometry.
- [x] 2.3 Add a sequence-specific Playwright/draw.io renderer check using the existing local viewer discovery pattern; verify negative fixtures fail for stacked message segments, labels crossing activations, and clipping, while an intended message/lifeline crossing passes.
- [x] 2.4 Add documented renderer requirements and verification commands to the sequence README; verify the command fails clearly when the viewer is unavailable and never writes a successful verification record for skipped checks.

## 3. Align UML notation and source catalogs

- [x] 3.1 Add hierarchical numbers and typed object headers; align execution boundaries and self-call nested activations; verify structural assertions and rendered endpoints against the local Ch6 sequence rules and slide examples.
- [x] 3.2 Represent only alternatives already established in the relevant scenario sources with separate guarded fragment operands; verify each included guard and branch has a source reference and no success/failure paths are shown as unconditional sequential execution.
- [x] 3.3 Synchronize all seven PlantUML and Mermaid blocks in `PLANTUML_SEQUENCE.md` with the final diagram data; verify participant order, messages, numbers, guards, and balanced activations agree across representations, using available syntax checks and explicit review where a renderer is unavailable.
- [x] 3.4 Add the slide-standard checklist and three VS Code/draw.io/VP Online instructions to the README; record timing assumptions and observed algorithm/actor source conflicts with provenance; verify no unsupported domain decision or new performance promise is introduced.

## 4. Verify and publish the complete sequence set

- [x] 4.1 Generate SQ01–SQ07 into a temporary directory and run structural validation, including drawio-skill validation of extracted editable XML, plus rendered geometry checks for SVG and decoded draw.io; verify all seven pass with no clipping, stacked ordinary messages, or label collisions.
- [x] 4.2 Export draft PNGs without embedded XML and visually inspect every diagram, including SQ06; verify a draw.io model save/reopen retains title, timing annotations, labels, activations, and message geometry; after at most two automatic visual correction rounds, report any remaining defects instead of declaring success.
- [x] 4.3 Regenerate the seven existing `.drawio.svg` paths, publish their corresponding PNG previews and sequence `verification.json`, and verify all catalog links resolve and the record identifies the renderer and seven passing results.
- [x] 4.4 Run generation a second time and inspect the scoped diff; verify stable diagram content/geometry, permit verification timestamp changes, and confirm no unrelated diagram families or pre-existing local edits were changed.
