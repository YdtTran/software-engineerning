# Spec Delta

## Purpose

Produce readable, editable sequence diagrams whose exported previews and source representations preserve scenario meaning and consistent visual styling.

## ADDED Requirements

### Requirement: Black sequence text and box borders
All visible text in SQ01–SQ07 SHALL use black (`#000000`), including titles, actor/object captions, messages, timing labels and footnotes. Visible borders of participant boxes, title banners, activation bars and nested activation bars SHALL be black. Invisible text-layout rectangles SHALL remain invisible.

#### Scenario: Inspect native and editable styling
- **WHEN** a sequence SVG is generated and its embedded draw.io model is rendered
- **THEN** every visible text element is black in both representations
- **AND** every visible rectangular box has a black border
- **AND** saving and reopening the editable model retains these styles

### Requirement: Stronger role fills with readable text
The seven diagrams SHALL use the stronger role-fill palette documented in the design, retaining the existing blue, green, rose, violet and amber role families. Black text over each visible fill SHALL have a contrast ratio of at least 4.5:1. The canvas SHALL remain white.

#### Scenario: Compare the revised role palette
- **WHEN** SQ01–SQ07 are regenerated
- **THEN** participant and activation fills use their corresponding stronger colors rather than the previous pale palette
- **AND** title banners use the stronger blue fill
- **AND** fills agree between SVG and the editable model
- **AND** black text remains readable against every chosen fill

### Requirement: Larger native sequence typography
At native SVG/draw.io scale, message labels SHALL use 16px type, actor/object headers 18px, titles 22px and timing/footer annotations 14px. Bold and italic distinctions SHALL be retained where already present. Enlarging a whole image without increasing its authored font sizes SHALL NOT satisfy this requirement.

#### Scenario: Inspect authored text sizes
- **WHEN** a generated SVG and decoded editable model are inspected at scale 1
- **THEN** each text category has its required authored size
- **AND** a regenerated PNG reflects those larger source fonts

### Requirement: Enlarged typography preserves layout and scenario compatibility
The enlarged diagrams SHALL keep all text, boxes, self-call loops and annotations within their canvas, with at least 24px outer clearance. Labels SHALL avoid activation bars, unrelated messages and other labels. Existing filenames, scenario content, participant order, message numbering, activation meaning and timing assumptions SHALL remain intact.

#### Scenario: Long labels and the SQ06 self-call
- **WHEN** the seven diagrams are laid out using the larger fonts
- **THEN** long ordinary labels wrap with sufficient space between rows and participants
- **AND** SQ06's rightmost database self-call and its complete caption fit within the canvas
- **AND** participant captions fit inside their own boxes
- **AND** ordinary messages remain horizontal and expected message/lifeline crossings remain valid

### Requirement: Regenerated artifacts carry verified styling
The sequence set SHALL provide matching SVG/draw.io styling, regenerated PNG previews, a synchronized PlantUML/Mermaid catalog, documented style choices and a renderer verification record. Style failures SHALL fail verification rather than produce a successful result.

#### Scenario: Complete and repeat regeneration
- **WHEN** the revised set is generated and verified
- **THEN** the verification record identifies the renderer and seven passing style/geometry results
- **AND** a second generation produces identical diagram and catalog content, allowing verification timestamps to vary
- **AND** the catalog declares black text/borders, stronger role colors and enlarged type through supported notation settings
- **AND** any catalog engine limitations concerning exact per-category type sizes are documented without claiming pixel-identical geometry

#### Scenario: Detect a styling regression
- **WHEN** a fixture changes a visible text or box-border color away from black, reduces a required native font size or restores an old pale fill
- **THEN** the focused style check fails with the affected diagram and element
- **AND** missing renderer checks cannot certify the set
