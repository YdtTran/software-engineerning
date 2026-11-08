# Domain class model

The class diagram keeps 19 classes and 18 declared operations. Four generalizations and 31 associations appear across eight focused tabs and an overview. Repeated classes share the same compact members; complete member and method contracts remain in [CLASS_CATALOG.md](CLASS_CATALOG.md).

Deliverables: [editable Draw.io](../../docs/diagrams/05_Class_Diagram/drawio/smart_emobility_class_diagram.drawio) and local PNG exports. Only the editable drawing is tracked. The overview is a navigation thumbnail; use the numbered tabs or focused PNGs to read signatures.

Review corrections: each Trip retains one required booking; ParkingReservation identifies its parkedVehicle; TransferOrder owns explicit current destination-slot holds; ChargingPoint records pre-start power allocation and command ID; VehicleReservation records pickupClaimed; charging stop takes an explicit reason. Status enums, retry uncertainty and release rules follow SC01–SC03 and AD01–AD07. No implemented backend is claimed.

## Reviewed fixes

ChargingRequest now persists targetBatteryPercent. ChargingPoint has a current request owner before session creation and retains it through uncertain outcomes or a held connector. OperationalIncident retains an optional reportedTrip, a distinct optional reporter, description and report-time location; trip reports require matching rider/vehicle, while pre-pickup damage and automatic charger alerts need no Trip. The charging and incident PNGs show these additions.

## Regenerate and check

Use installed Graphviz-compatible `dot`, the Draw.io skill, VS Code Draw.io viewer, Playwright and Microsoft Edge. This machine already provides the following tools:

```bash
export PATH=/tmp/usecase-simplification/bin:$PATH
export DRAWIO_PLAYWRIGHT=/tmp/usecase-simplification/runtime/node_modules/playwright
python3 .agent/class-diagram/build_class_diagram.py
node .agent/class-diagram/render_class_diagram.cjs
python3 .agent/class-diagram/build_class_diagram.py --check
python3 .agent/class-diagram/check_compact_projection.py --output-dir .diagram-exports/class
```

The temporary dependency paths above are machine-specific; use your installed tools elsewhere. DRAWIO_SKILL_ROOT and DRAWIO_VIEWER may override discovery. --output-dir allows isolated generation. Scratch/source previews are stored outside the default deliverable folder at .agent/scratch/class_model; verification is at .agent/verification/class-diagram.json. Source and export fingerprints must match before the checks pass.

| UML check (CO3001 Ch6 pp.28–35) | Verification |
|---|---|
| Three editable compartments and typed visibility | Every class occurrence matches the compact projection |
| Abstract class/method italics and child-to-parent triangles | Native styles and four generalizations checked |
| Both association ends have roles and multiplicities | All 31 associations checked against the model |
| Repeated classes remain consistent | All 38 occurrences checked across nine tabs |
| Ownership, required booking and allocation references | Canonical checks and negative corruption fixtures |
| No clipping, overlaps or crossing/stacked connectors | Native Draw.io geometry checked per view |

Open the .drawio file directly in VS Code or diagrams.net. PlantUML/Mermaid preview code is generated only in scratch/sources.md; it can be pasted into Draw.io (+ → Advanced → PlantUML) or VP Online (File → Import → PlantUML), when supported.
