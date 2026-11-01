# Design

## Context

See `proposal.md` for motivation. The supported generator is `.agent/scripts/generate_slide_style_sequence.py`; the completed `fix-sequence-diagram-layout` change already provides shared SVG/mxGraph coordinates, explicit editable labels, catalog generation and two focused validators.

Current messages/annotations default to 11px, headers to 12px and titles to 14px. Text colors vary by role and annotation. Borders use role colors; fills are very pale. `layout()` estimates text with a fixed 7px character width, wraps messages at 31 characters, and uses fixed 16px line increments. Header widths, actor/timing positions and footer offsets also assume the small fonts. Merely changing font attributes would invalidate these measurements.

`02_Rules/02_Sequence_diagram.md` recommends pale pastel role fills and red timing captions. The user's explicit request supersedes these cosmetic recommendations: retain recognizable role color families and UML notation while using stronger fills and black captions. No use-case boundary rule applies to this sequence-only change.

The main spec inventory is empty. Reuse `sequence-diagram-rendering`, the path already declared by the completed but unarchived layout change, adding distinctly named style requirements. Preserve the earlier delta and its layout/notation requirements; no archive or spec synchronization is part of this work.

## Goals / Non-Goals

**Goals:** Make authored text larger and black, visible box borders black, fills stronger, and native preview/editable styling identical. Keep generation deterministic and the existing renderer checks meaningful at the new sizes.

**Non-Goals:** No new theme selector, generic styling framework, dependency installation or whole-image scaling as a substitute for typography. No changes to scenario data, other diagram families or domain decisions recorded in the existing README. Connector colors and their solid/dashed/head semantics remain as currently authored; the user's border request concerns boxes.

## Decisions

### 1. Use one fixed palette and size table

Keep small shared style values in the existing generator and consume them in SVG, mxGraph and catalog helpers. Replace effective colors at rendering time, or update the existing role data consistently; avoid introducing another configuration layer. Text-layout rectangles remain transparent and borderless.

| Element/family | Current example | Proposed fill |
| --- | --- | --- |
| UI/App and title banner: blue | `#dbeafe`, `#e0f2fe` | `#93c5fd` |
| Controllers: green | `#dcfce7` | `#86efac` |
| IoT/field app/service: rose | `#ffe4e6` | `#fda4af` |
| Actor/service: violet | `#f3e8ff` | `#d8b4fe` |
| Database: amber | `#fef3c7` | `#fcd34d` |

All text and visible rectangular borders use `#000000`. Preserve the existing border widths. Use 16px messages, 18px actor/object captions, 22px titles and 14px timing/footer text. Preserve current bold/italic distinctions. This fixes the user's request without an unnecessary user-facing theme system. Saturated dark fills with white text were rejected because the request explicitly calls for black text.

### 2. Reflow using the actual chosen typography

Derive conservative character-width estimates and line heights from the relevant font size. Recalculate header widths/heights, minimum participant gaps, message wrapping, row separation, actor-caption clearance, timing gutter and footer extents. Include the title width, timing text and SQ06's rightmost self-call when sizing the canvas, with at least 24px outer clearance.

Reuse the current layout pass and feed its coordinates into both representations. Targeted spacing remains preferable to a blanket page enlargement: larger letters must remain legible and collision-free at scale 1. The renderer's actual text bounds are the acceptance gate; font-size attributes alone cannot prove fit.

### 3. Keep source catalogs visually aligned

Emit black text/border and stronger-fill settings through supported PlantUML and Mermaid sequence styling options, using the same style values where supported. Keep the catalog's scenario content and activation balance checks. Native SVG/mxGraph sizes are exact; alternate engines need not reproduce pixel-identical geometry. If a catalog engine cannot independently control a text category, use its supported enlarged font setting and state the specific limitation in the README instead of inventing unsupported directives.

### 4. Extend the existing checks

Add focused structural checks for effective text color, visible rectangular strokes, role fills and category sizes in SVG and mxGraph; account for invisible label rectangles and renderer-normalized color values. Add small negative fixtures for a colored caption, colored border, old pale fill and undersized message. Check chosen fills against black with the standard relative-luminance contrast calculation.

Extend the existing renderer to verify computed text/box styles, header-label containment and outer clearance as well as its current path/activation/collision checks. Verify styles survive model save/reopen. Generate into a temporary directory, inspect all seven PNGs, then publish the same existing artifact paths and a fresh seven-result verification record. Continue to fail explicitly when the renderer is unavailable.

## Risks / Trade-offs

- Larger fonts increase diagram dimensions → allow content-driven growth and wrapping, while retaining native text sizes and actual-renderer validation.
- A long typed header or SQ06 self-call can escape fixed widths → calculate those extents explicitly and validate rendered text containment.
- SVG and mxGraph inherit/default styles differently → compare effective colors and sizes in both source and renderer output, including save/reopen.
- Alternate catalog engines expose different font controls → use supported settings and document exact limitations; do not promise identical geometry.
- Two changes share a not-yet-published capability path → preserve the earlier delta and add uniquely named style requirements; archive/sync order remains a separate workflow.

## Migration Plan

1. Add style regression checks against the current outputs, then change the shared generator and typography-dependent layout.
2. Update catalog styling and the sequence README; generate and verify all seven artifacts in a temporary directory.
3. Inspect PNGs, validate editable XML and model save/reopen, then regenerate the existing sequence files and verification record.
4. Run generation again and compare content hashes; confirm unrelated local files are unchanged. Roll back only this change's scoped edits from their pre-apply contents if needed.
