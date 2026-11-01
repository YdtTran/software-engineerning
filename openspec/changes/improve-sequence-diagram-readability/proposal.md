# Proposal

## Why

The repaired SQ01–SQ07 diagrams still use small text, colored captions and very pale fills. The user requests black text, black box borders, stronger colors and larger lettering so the diagrams are easier to read.

## What Changes

- Apply black (`#000000`) to all diagram text and visible box borders in the seven sequence diagrams, including titles, participant headers, activations and timing captions.
- Use more saturated versions of the existing role colors while retaining black-text readability.
- Increase message text to 16px, actor/object headers to 18px, titles to 22px and timing/footer annotations to 14px at native SVG/draw.io scale.
- Recalculate wrapping, header sizes, participant spacing, interaction rows and canvas bounds for the larger text; retain the previous layout repair's guarantees.
- Keep SVG previews, editable draw.io models, PNGs and supported PlantUML/Mermaid catalog styling consistent; update the sequence README and verification record.
- Preserve scenario messages, participant order, numbering, activation meaning, timing assumptions, filenames and existing connector notation. Other diagram families are outside this change.

## Capabilities

### New Capabilities

- `sequence-diagram-rendering`: Extend the existing sequence-rendering capability lineage with explicit readable visual styling and verification across preview/editable outputs. The main spec inventory is currently empty; this path already belongs to the completed, unarchived `fix-sequence-diagram-layout` change and is reused rather than creating a second capability name.

### Modified Capabilities

None registered in `openspec/specs/`. The earlier layout change remains intact; this change adds styling requirements under its same capability path without archiving or rewriting it.

## Impact

- Implementation: `.agent/scripts/generate_slide_style_sequence.py`, its existing `layout`, drawing helpers and catalog generation; reuse `.agent/scripts/check_sequences.py` and `.agent/scripts/render_sequences.cjs` for focused style/geometry checks.
- Outputs: the existing seven `.drawio.svg` paths and their PNGs, `PLANTUML_SEQUENCE.md`, `README.md` and `verification.json` under `01_Diagram/02_Sequence_Diagram/`.
- No new dependencies or application/API changes. Implementation builds on the completed layout repair present in the working tree and must preserve unrelated local edits.
- Interpretation: the requested scope is SQ01–SQ07 from the immediately preceding work. Exact palette/font values are proposed defaults recorded in the design; no diagram exports or project code are changed during proposal creation.
