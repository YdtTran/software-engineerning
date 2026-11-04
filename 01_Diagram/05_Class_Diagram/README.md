# Class Diagram

Editable diagrams are in `drawio/`; PNG images are in `png/`.

Open a `.drawio` file in diagrams.net or the Draw.io extension for VS Code to edit it.

| Diagram | Draw.io | PNG |
| --- | --- | --- |
| charging | — | [View](png/charging.png) |
| incidents | — | [View](png/incidents.png) |
| location | — | [View](png/location.png) |
| reservations | — | [View](png/reservations.png) |
| simulation | — | [View](png/simulation.png) |
| smart_emobility_class_diagram | [Edit](drawio/smart_emobility_class_diagram.drawio) | [View](png/smart_emobility_class_diagram.png) |
| transfers | — | [View](png/transfers.png) |
| trips | — | [View](png/trips.png) |
| types | — | [View](png/types.png) |

## Submission #3 Test Specification & Verification (Bonus)

| File | Purpose |
| --- | --- |
| [TEST_CASES.md](TEST_CASES.md) | Submission #3 Bonus Test Plan (Slide Ch9 p.55, p.59), 54 unit test cases (`UT-01`–`UT-54`) for all 18 methods, 24 use-case/system test cases (`SUC-01`–`SUC-24` per Slide Ch9 p.53) and 10 NFR test cases (`NFR-01`–`NFR-10`) |
| [verify_test_cases.py](verify_test_cases.py) | Automated traceability & reference domain unit-test harness (`unittest`) verifying all 18 methods and test tables |

### Run verification

```powershell
python 01_Diagram/05_Class_Diagram/verify_test_cases.py
```
