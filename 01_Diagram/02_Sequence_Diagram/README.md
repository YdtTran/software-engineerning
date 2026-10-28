# Sequence diagrams SQ01–SQ07

Run from the repository root:

```powershell
python .agent/scripts/generate_slide_style_sequence.py
python .agent/scripts/check_sequences.py
node .agent/scripts/render_sequences.cjs
```

The supported generator writes only SQ01–SQ07 and their sequence code catalog.
`generate_all_phase2.py` and `generate_all_phase2_v2.py` are legacy writers
(using `phase2_builder.py` and `phase2_builder_v2.py`); they overwrite the same
sequence filenames and also generate activity/state diagrams. Do not use them
to regenerate this verified sequence set.

Rendering requires the installed `hediet.vscode-drawio` VS Code extension,
Playwright from the Codex runtime, and Microsoft Edge. Set `DRAWIO_VIEWER` to
`viewer-static.min.js` or `DRAWIO_PLAYWRIGHT` to the installed Playwright module
if discovery needs an override. No network access or new package is needed.

`node .agent/scripts/render_sequences.cjs --self-test` tests stacked segments,
label/activation collisions, clipping, and an allowed message/lifeline crossing.
The normal command checks actual SVG text/path bounds and decoded draw.io
geometry, saves/reopens the model, exports PNG previews without embedded XML,
and writes `verification.json`. A missing viewer or any failed check exits
nonzero and leaves `passed: false`; partial/skipped checks never certify the set.

To review before publishing, append `--output-dir <temporary-directory>` to the
generator and pass that directory to both check scripts. Only the sequence
directory is written. Run the generator twice to check deterministic output;
verification timestamps may change.

For complementary XML validation, extract the SVG root's `content` attribute
to a temporary `.drawio` file and run
`python C:/Users/trand/.agents/skills/drawio-skill/scripts/validate.py <file.drawio> --score`.
The general validator reports intentional containment (header text inside its
box, title text inside its banner) and nested activations as overlap warnings;
these are expected UML/layout containment, not label collisions. All seven
editable models pass with zero XML errors. The sequence renderer separately
checks actual text bounds and message paths against activation bars.

## Readable native style

This style applies only to SQ01–SQ07. All text and visible box borders are
black (`#000000`); text-layout rectangles stay transparent and borderless.
The white canvas and existing connector colors/solid-dashed notation remain.

| Role/family | Fill |
| --- | --- |
| UI/App and title banner (blue) | `#93c5fd` |
| Controller (green) | `#86efac` |
| IoT/field app/service (rose) | `#fda4af` |
| Actor/service (violet) | `#d8b4fe` |
| Database (amber) | `#fcd34d` |

The original role family determines the fill (for example, Field Staff App
retains rose). Black text on every chosen fill exceeds 4.5:1 contrast.
Messages are **16px**, actor/object captions **18px**, titles **22px** and
timing/footer annotations **14px** at native SVG/draw.io scale. Existing bold
and italic distinctions are retained. The generator derives text widths, line
heights, participant/header sizes, row spacing and canvas bounds from these
sizes. Both renderers check header containment, label collisions and at least
24px clearance around visible content, including SQ06's rightmost self-call.

The commands above regenerate at native size, without image scaling. The
structural checker exercises colored text/borders, old pale fills and small
fonts in both SVG and mxGraph negative fixtures. The renderer checks computed
styles (including draw.io's HTML text), native sizes and palette agreement,
then repeats these checks after save/reopen. Hidden hit targets are excluded.

PlantUML supports role-specific participant and activation fills, black text
and borders, message/header/title/note sizes of 16/18/22/14. Mermaid's supported
sequence theme settings use a stronger blue participant fill and green
activation fill for all roles: per-participant role fills are not available
through those theme variables. Its sequence options request 16px messages,
18px actors and 14px notes, but host/version CSS can override these; there is
no independent sequence title/footer font control in the emitted block.
Catalog blocks therefore do not promise pixel-identical geometry or exact
native category sizes across alternate engines. The native SVG/mxGraph files
remain the acceptance reference.

Styling syntax follows the official [PlantUML sequence documentation](https://plantuml.com/sequence-diagram),
[Mermaid sequence configuration](https://mermaid.js.org/config/schema-docs/config-defs-sequence-diagram-config.html)
and [Mermaid theme variables](https://mermaid.js.org/config/theming.html).

## Slide checklist

| Check | Reference | Result |
| --- | --- | --- |
| Initiating actor at left; typed objects across the top; dashed lifelines | Ch6 pp.21–26, 40, 50 | Checked |
| Horizontal requests with filled heads; dashed returns with open heads | Ch6 pp.22–26 | Checked in both renderers |
| Hierarchical message numbering (`1`, `1.1`, …) | Ch6 p.50 | Checked against the catalog |
| Execution starts/ends at modeled events; self-calls receive offset nested execution | Ch6 pp.40, 50 and local sequence rules | Checked |
| Timing marks and duration remain editable | Ch6 p.22 | Checked by save/reopen |
| Long labels and rightmost self-calls fit; no label/activation collisions | Layout regression checks | Checked for SQ01–SQ07 |
| Black text/borders, stronger role fills, exact native 16/18/22/14px sizes | Readability style checks | Checked in SVG and draw.io, including save/reopen |
| At least 24px outer clearance and contained object captions | Rendered geometry checks | Checked for SQ01-SQ07 |
| Guarded operands when mutually exclusive paths are included | Local sequence rules §II.7 | Not applicable to these single success-path instances; see coverage below |

Sequence diagrams have no use-case system boundary or ellipses. The boundary
padding and actor/ellipse attachment rules apply to use-case diagrams only.

## Scenario coverage and provenance

The seven diagrams retain their existing messages and participant responsibilities.
They illustrate individual successful use-case instances, rather than every
alternative of the use case. No existing sequence contains both a success and a
failure response to the same call; no new branch/guard is introduced by this repair.
The scenario sources were checked as follows:

| Sequence | Source in `SUBMISSION_1_REPORT.md` | Alternatives outside this instance |
| --- | --- | --- |
| SQ01 / UC03 | lines 320–356, main flow 1–6 | Cancel reservation, concurrent reservation conflict |
| SQ02 / UC04 | lines 362–398, main flow 1–7 | Damage report, mismatched/expired ticket |
| SQ03 / UC05 | lines 405–440, main flow 1–7 | Low battery, full hub, latch not closed |
| SQ04 / UC07 | lines 490–530, main flow 1–8 | Cancellation, charger busy/faulty |
| SQ05 / UC10 | lines 613–648, main flow 1–7 | Destination full, insufficient source vehicles |
| SQ06 / UC11 | lines 654–693, main flow 1–9 | Repair completion, failed remote isolation |
| SQ07 / UC13 | lines 741–782, main flow 1–6 | Apply/export results, invalid simulation parameters |

These are provenance references, not claims that the older technical messages
constitute a complete implementation of each current scenario. In particular:

- SQ07 retains `execute Monte Carlo simulation run` from the original generator
  and catalog. `SUBMISSION_1_REPORT.md` line 74 and UC13 main flow 5 (line 764)
  describe discrete-event simulation. This layout repair does not select an algorithm.
- SQ01–SQ04 retain `User`; SQ06 retains `Technician`; SQ07 retains `Planner`.
  `PROJECT_SPECIFICATION.md` §3.1 and the report's UC11/UC13 actor fields instead
  designate `Student`/`Operator` as primary actors, with maintenance technicians
  supporting UC11. Role reconciliation remains a domain review item.
- Existing wallet/subscription, payment, rerouting, historical-dataset and AI labels
  are preserved from the sequence baseline; the layout checks do not certify those
  domain assumptions or the completeness of the current use-case coverage.
- SQ01–SQ07 retain the original duration values **5, 8, 6, 7, 10, 5, 15 seconds**.
  Their provenance is the original `DIAGRAMS` duration constraints and catalog,
  not a benchmark. They are labeled scenario assumptions in every artifact.
  UC11's BR14 specifies emergency isolation within **60 seconds**, a different
  interval from SQ06's report-to-ticket assumption; this repair creates no new SLA.

The catalog's PlantUML and Mermaid blocks are generated from the same participants,
messages and execution intervals as the editable files. The checker confirms exact
catalog agreement and balanced activations. All seven PlantUML blocks passed the installed PlantUML syntax checker. Mermaid
configuration was checked against the official schema; no local Mermaid engine
is installed. The native verification command does not require either engine.

## Editing and importing

1. **VS Code offline:** double-click a `.drawio.svg` to open the Draw.io canvas.
2. **Draw.io:** choose `+` → `Advanced` → `PlantUML`, then paste a PlantUML block from [the catalog](PLANTUML_SEQUENCE.md).
3. **VP Online:** choose `File` → `Import` → `PlantUML...`, then paste the complete `@startuml` block.
