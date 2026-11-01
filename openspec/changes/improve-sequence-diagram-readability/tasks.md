# Tasks

## 1. Apply the readable sequence style

- [x] 1.1 Extend `.agent/scripts/check_sequences.py` with focused effective-color, visible-border, role-fill, contrast and native font-size checks for SVG and embedded mxGraph; verify the current outputs fail the new checks and negative fixtures identify colored text, colored borders, old pale fills and undersized messages.
- [x] 1.2 Apply the fixed palette and typography from `design.md` in `generate_slide_style_sequence.py`; verify all seven temporary outputs use black text/visible box borders, the expected stronger fills and 16/18/22/14px category sizes in both representations, while transparent label rectangles remain borderless.
- [x] 1.3 Recalculate typography-dependent wrapping, participant/header sizes, row spacing, timing gutter and canvas extents in the existing layout pass; verify long-label and SQ06 rightmost-self-call fixtures fit, headers contain their captions and existing horizontal-message/nested-activation assertions still pass.
- [x] 1.4 Document the chosen palette, font sizes, scope and native regeneration commands in the sequence README; verify it accurately describes the generated style and preserves the prior source-conflict and timing-assumption notes.

## 2. Synchronize catalog styling and rendered verification

- [x] 2.1 Update generated PlantUML/Mermaid blocks with supported black text/border, stronger-fill and larger-font settings; verify all seven blocks retain participant order, messages, numbering and balanced activations, use available syntax checks, and document any exact per-category font-control limitations in the README.
- [x] 2.2 Extend `render_sequences.cjs` to inspect effective text/box styles, native category sizes, header containment and 24px outer clearance alongside the existing geometry checks; verify style/geometry failures are rejected, intentional lifeline crossings pass, and save/reopen preserves the revised styling.
- [x] 2.3 Run temporary generation, structural checks, draw.io XML validation and rendered checks for all seven diagrams; inspect every PNG without embedded XML, including SQ06, and verify zero clipping/label collisions and seven passing style/geometry results before publishing.

## 3. Publish and verify the complete set

- [x] 3.1 Regenerate the seven existing SVG paths, their PNG previews and catalog, then publish a fresh `verification.json`; verify every catalog link resolves, the record identifies the renderer and seven passing results, and the revised set satisfies the README checklist.
- [x] 3.2 Generate a second time and review the scoped diff against the pre-apply working tree; verify identical diagram/catalog content apart from verification timestamps, unchanged scenario data and filenames, and no changes to unrelated diagrams or pre-existing local edits.

## Workflow follow-up

- Review the generated artifacts before requesting archive. Preserve the earlier `fix-sequence-diagram-layout` capability delta when later synchronizing or archiving these two changes.
