# Design

## Context

See `proposal.md` for the motivation. The artifacts currently match `.agent/scripts/generate_slide_style_sequence.py`, which writes SVG graphics and embedded mxGraph XML separately from one `DIAGRAMS` list. Its ordinary SVG lines lack `y2`; the mxGraph messages already have horizontal explicit endpoints. Fixed 180px columns, 48px rows, and header-only canvas sizing do not account for long labels. Activations start 5px before a modeled event and extend 15px beyond their terminal event. Self-calls do not create nested activations. Titles and timing annotations are SVG-only.

The existing use-case renderer demonstrates local draw.io rendering through Playwright and the installed VS Code extension. Its blanket edge-intersection checks cannot be copied directly: sequence messages legitimately cross intervening lifelines. Alternative phase-2 generators write the same sequence paths and also generate unrelated diagram families. The current sequence generator imports `fitz` without using it; the available Python runtimes checked during review lack that module.

There are no existing OpenSpec specs. The new capability captures observable diagram output, not application behavior. The design is included because preview/model consistency and layout checks require explicit decisions across generation, rendering, and documentation.

## Goals / Non-Goals

**Goals:** Keep the current generation model and filenames; make layout decisions once and reuse them in both representations; fail verification on reproducible defects; finish all seven diagrams as one coherent set.

**Non-Goals:** No generic Diagram IR, new layout engine, service changes, dependency installation, redesign of business scenarios, or regeneration of use-case/activity/state diagrams. Do not apply use-case boundary rules to sequence diagrams, which have no use-case ellipses or system boundary.

## Decisions

### 1. Repair the current shared generator

Add explicit `y2=y` to request and return SVG lines before addressing layout. Remove the unused `fitz` import so generation can run with the standard library. Retain the existing participant/message data structure, adding only fields needed for message numbers, wrapped labels, fragments, and activation intervals.

Alternative: replace everything with a new generator or auto-layout package. Rejected because the root defect is local and there are only five or six participants per diagram.

### 2. Fit labels before placing rows and sizing the page

Use a small deterministic layout pass over existing data. Wrap labels at word boundaries to a bounded column width; increase individual column gaps only where headers, self-call loops, or readable label widths require it. Increase row separation based on wrapped label height and self-call height. Reserve clear space above ordinary message lines and beside self-call loops. Compute canvas extents from all headers, labels, loops, fragments, and timing annotations, with an outer margin of at least 24px.

Use conservative text estimates for initial generation and the actual renderer's text bounds as the final gate. A text estimate alone cannot establish that a diagram is unclipped. Avoid reducing font size to hide a spacing defect or scaling every diagram excessively. Any targeted correction must update the generator data or layout calculation, never just an exported picture.

Alternative: increase all column and row spacing to large constants. Rejected because it still does not bound rightmost self-call labels and needlessly widens short scenarios.

### 3. Share coordinates and explicit label placement

Calculate participant centers, event rows, activation rectangles, edge paths, labels, and annotation bounds once, using ordinary Python values rather than a new framework. Both SVG and mxGraph consume those values. Add editable title/timing cells and explicit label cells/offsets, including self-call labels, rather than relying on draw.io's default edge-label centering. Every mxGraph edge keeps relative geometry and stable IDs where existing elements survive.

Keep explicit endpoint geometry for sequence messages; attaching every message to participant header boxes would cause inappropriate routing. Save/reopen verification must cover the editable model. Moving lifelines interactively and automatically rerouting their messages is outside this change's compatibility contract.

Alternative: export every preview exclusively through draw.io. This would remove a rendering path but make basic generation depend on the local browser/extension; retain the existing offline generation behavior and verify parity instead.

### 4. Align notation without inventing business behavior

Add hierarchical message numbers and typed headers consistently to the data and code catalog. Align activation starts and ends with modeled execution events rather than cosmetic padding; self-calls get explicit offset child activations lasting through their modeled execution. Add operand frames only for alternatives already established by the relevant documented scenario; do not fabricate a failure branch for every diagram.

Project sources take precedence in the order established by AGENTS.md. The older phase-2 generator is a reference for notation, not an authoritative source of new business behavior. Existing timing values remain labeled as existing scenario assumptions unless a source supports them. Record disagreements such as the current Monte Carlo label versus other discrete-event simulation descriptions and actor-role naming differences in the sequence README. Resolve layout and representation agreement without claiming these domain questions are settled.

### 5. Keep verification sequence-specific

Add a compact structural regression check and a focused renderer script alongside the existing scripts. Reuse the installed viewer/Playwright discovery pattern from `render_usecases.cjs`, not its entire verifier. No additional dependency is required.

Structural checks cover explicit finite endpoints, horizontal ordinary messages, request/return styles, relative edge geometry, parseable embedded XML, stable artifact count, and presence of annotations. Include fixtures/assertions for omitted Y endpoints, a long wrapped message, a rightmost self-call, and an actual stacked message pair, plus an allowed message/lifeline crossing.

Rendered checks use actual edge segments and text bounding boxes for both preview and decoded model. Reject stacked ordinary messages, labels intersecting activation bars or unrelated messages/labels, and clipping. Exempt intended lifeline crossings, message endpoints meeting their activation, nested activation overlap, and fragment containment. Check timing labels and header captions too. Report source paths, renderer identity, per-diagram outcomes, and failures; a missing renderer is an explicit verification failure, never a pass.

Export draft PNGs without embedded XML and visually inspect all seven. Limit automatic visual correction to two rounds, then report remaining defects. Structural validation with drawio-skill's validator is complementary and does not prove layout correctness; extract embedded XML to temporary `.drawio` files when required by that validator.

### 6. Make regeneration reproducible and narrowly scoped

Document `.agent/scripts/generate_slide_style_sequence.py` as the supported sequence command, followed by the focused verification/rendering command. Identify older phase-2 generators as legacy writers in the README; do not run their broad generation commands during this repair. If repository documentation currently recommends another sequence command, update that reference to the supported command. No generic generator consolidation is needed.

Update `PLANTUML_SEQUENCE.md` to match the final diagram data, including numbers, wrapped labels where appropriate, activation balance, and source-backed guards. Provide the existing PNG links with real outputs and add the required slide checklist and three editing/import instructions.

## Risks / Trade-offs

- Font metrics vary across machines → use conservative layout and actual renderer bounds; allow small rendering differences, not clipping or collisions.
- Both SVG and mxGraph remain supported → use shared geometry plus parity checks to prevent recurrence of divergent annotations and paths.
- Legacy writers can replace repaired files → document the supported command and remove stale recommendations; legacy output is not certified by this change.
- Existing business-source conflicts could expand scope → record them with provenance; preserve scenario behavior and avoid new branches or algorithms.
- The installed VS Code extension is an environment dependency for verification → discover it explicitly and report a missing viewer rather than installing or silently skipping checks.
- Existing uncommitted work is extensive → modify only the scoped sequence generator, checks, sequence artifacts, and directly relevant documentation during apply; inspect diffs before writing or rollback.

## Migration Plan

1. Add the failing geometry and layout regressions against the current outputs.
2. Repair shared generation, editable annotations, layout, and notation; generate into a temporary output directory for checks before replacing the seven existing artifacts.
3. Validate the temporary artifacts structurally and through both renderer paths; inspect all seven PNGs and check save/reopen parity.
4. Regenerate the existing sequence paths, synchronize their code catalog and instructions, and publish only verified PNGs and the verification record.
5. Review the scoped diff and confirm unrelated diagrams and local edits are unchanged. A second generation must preserve diagram content and geometry; verification timestamps are allowed to change.

Rollback restores only the files changed by this implementation from its recorded pre-change state. Do not use a broad repository reset or regenerate unrelated diagram families.
