# Assignment Deliverable Compliance Audit

**Course:** Software Engineering (CO3001) – Semester HK261  
**Institution:** VNU-HCM (ĐHQG-HCM)  
**Authoritative Syllabus:** [`docs/references/04_BTL_SoftwareEngineering_HK261.pdf`](file:///home/ydt/Documents/Workspace/software-engineerning/docs/references/04_BTL_SoftwareEngineering_HK261.pdf)  
**Integration Commit:** [`ac21515`](https://github.com/YdtTran/software-engineerning/commit/ac21515ae299cbb61532faae6b8c2697d0d66e9d)  

---

## 1. Compliance Checklist Overview

The lecturer's assignment defines four deliverable milestones plus a working demonstration. Below is the systematic audit of repository assets against each milestone:

| Milestone | Deliverable Scope | Mandated Items | Repository Status | Evidence File Reference |
|---|---|---|---|---|
| **Submission #1** | Requirements Document | Project context, stakeholders, FRs, NFRs, System Use-case Diagram, Use-case specifications, Non-interactive FRs (Bonus) | **FULLY COMPLIANT** | `docs/reports/SUBMISSION_1_REPORT.md`<br>`docs/requirements/PROJECT_SPECIFICATION.md`<br>`docs/diagrams/01_Usecase_Diagram/` |
| **Submission #2** | Dynamic Models & UI | UI Mockups (group), Sequence Diagrams, Activity Diagrams, State-chart Diagrams (Bonus) | **FULLY COMPLIANT** | `app/prototype/UI-UX.pdf`, `gallery.html`<br>`docs/diagrams/02_Sequence_Diagram/`<br>`docs/diagrams/03_Activity_Diagram/`<br>`docs/diagrams/04_Statechart_Diagram/` |
| **Submission #3** | Design Document | Deployment View, Development/Implementation View, Class Diagram, Method Descriptions, Test Cases (Bonus) | **FULLY COMPLIANT** | `docs/diagrams/deployment/`<br>`docs/reports/DEVELOPMENT_IMPLEMENTATION_VIEW_REPORT.md`<br>`docs/diagrams/05_Class_Diagram/`<br>`.agent/class-diagram/CLASS_CATALOG.md`<br>144 automated tests in `app/src/` |
| **Final Submission** | Final Consolidated PDF & MVP Demo | Single consolidated PDF (#1, #2, #3), Working MVP Demo, Screen Demonstration Sequence, Generative AI Declaration | **PARTIALLY READY** (Consolidation and signed declaration pending) | `app/src/demo-server.js`, `live.html`<br>`app/prototype/gallery.html`<br>`PROJECT_SPECIFICATION.md` §8 |

---

## 2. Milestone-by-Milestone Detailed Audit

### 2.1. Submission #1 — Requirements Engineering

| Required Item | Syllabus Requirement | Repository Evidence | Conformance Assessment |
|---|---|---|---|
| **Project Context & Scope** | Context in VNU-HCM Urban Area, Metro line 1, stakeholders, objectives | Detailed in `PROJECT_SPECIFICATION.md` §1–§2 and `SUBMISSION_1_REPORT.md` §1 | **COMPLIANT** |
| **Stakeholders Analysis** | Primary actors (User, Operator) & Secondary actors (IoT Telemetry, Notification) | Detailed in `PROJECT_SPECIFICATION.md` §3.1 with roles, goals, expectations | **COMPLIANT** |
| **System-wide Use Case Diagram** | Whole system use-case diagram enclosed in system boundary | `docs/diagrams/01_Usecase_Diagram/drawio/general_usecase_diagram.drawio` | **COMPLIANT** (Complies with CO3001 Ch3/Ch6 rules) |
| **Use Case Specifications** | Detailed scenarios/contracts for all core use cases | Standard 11-field specifications for UC01–UC14 in `PROJECT_SPECIFICATION.md` §3.3–§3.4 | **COMPLIANT** |
| **Non-Functional Requirements** | General NFRs for performance, concurrency, reliability, scalability, usability | Formally specified in `PROJECT_SPECIFICATION.md` §4 | **COMPLIANT** |
| **Non-Interactive FRs (Bonus)** | Background automated daemons | Specified in `PROJECT_SPECIFICATION.md` §3.6 (FR-NI01 to FR-NI04) | **COMPLIANT (DOCUMENTED)** |

---

### 2.2. Submission #2 — Dynamic Modeling & UI Design

| Required Item | Syllabus Requirement | Repository Evidence | Conformance Assessment |
|---|---|---|---|
| **UI Design: Mockups** | Screen mockups covering core user journeys | 26 screens across User App, Operator App, and Operator Web in `app/prototype/screens/`, `gallery.html`, and `UI-UX.pdf` | **COMPLIANT** |
| **Sequence Diagrams** | Sequence diagrams covering key interactions | 7 diagrams (SQ01–SQ07) in `docs/diagrams/02_Sequence_Diagram/drawio/` with PlantUML/Mermaid previews in `README.md` | **COMPLIANT** |
| **Activity Diagrams** | Activity diagrams illustrating business processes | 7 diagrams (AD01–AD07) in `docs/diagrams/03_Activity_Diagram/drawio/` with swimlanes and previews in `ACTIVITY_PREVIEWS.md` | **COMPLIANT** |
| **State-Chart Diagrams (Bonus)** | State machine models for complex lifecycles | 3 diagrams (SC01 Vehicle, SC02 Charging Point, SC03 Reservation & Trip) in `docs/diagrams/04_Statechart_Diagram/drawio/` | **COMPLIANT (BONUS SATISFIED)** |

---

### 2.3. Submission #3 — System Architecture & Detailed Design

| Required Item | Syllabus Requirement | Repository Evidence | Conformance Assessment |
|---|---|---|---|
| **Deployment View** | Physical nodes, hardware, runtime environments, and network paths | `docs/diagrams/deployment/DP01-deployment.drawio` and `README-deployment.md` | **COMPLIANT** (4 device nodes, Node.js + SQLite placement) |
| **Development / Implementation View** | Layered architecture, components, package dependencies | `docs/reports/DEVELOPMENT_IMPLEMENTATION_VIEW_REPORT.md`, `DV01-Component_Diagram_New.drawio`, `DV02-Package_Diagram_New.drawio` | **COMPLIANT** (5-layer modular monolith model) |
| **Class Diagram** | Domain classes, associations, generalizations, multiplicities | `docs/diagrams/05_Class_Diagram/drawio/smart_emobility_class_diagram.drawio` (19 classes, 18 ops, 31 associations) | **COMPLIANT** |
| **Method Descriptions** | Detailed contracts for all methods in the class diagram | Complete contracts in `.agent/class-diagram/CLASS_CATALOG.md` (pre/post-conditions, exceptions, algorithms) | **COMPLIANT** |
| **Test Cases (Bonus)** | Formal automated test cases | 144 passing tests across 25 suites in `app/src/` | **COMPLIANT (BONUS SATISFIED)** |

---

### 2.4. Final Submission & Working Demonstration

| Required Item | Syllabus Requirement | Current Status | Audit Evaluation |
|---|---|---|---|
| **Single Consolidated PDF File** | Exactly ONE single .pdf file containing all contents (#1, #2, #3, Demo) | Individual Markdown reports and PDF mockups exist, but the consolidated final document is **NOT YET COMPILED**. | **ACTION REQUIRED:** Must assemble single PDF prior to submission deadline. |
| **Working MVP Demonstration** | Develop MVP. Demonstrate the whole project. Free to choose programming language; DB can be hardcoded or SQLite. | Integrated Express server + SQLite + `live.html` demonstrating complete user mobility flow (UC01–UC05), incident report (UC11A), and 5 What-if simulations (UC13–UC14). | **READY WITH LIMITATIONS:** Core flows demonstrable immediately; Parking/Charging absent from live demo. |
| **Demonstration Screen Sequence** | Step-by-step sequence of screens explaining the demo | Provided in `app/prototype/gallery.html`, `app/prototype/UI-UX.pdf`, and documented in `docs/architecture/MINH_DEMO_GUIDE.md`. | **COMPLIANT** |
| **Generative AI Usage Declaration** | Mandatory transparent statement: tools used, scope, level of contribution, and team verification | Form template and ethical declaration policy provided in `PROJECT_SPECIFICATION.md` §8. | **ACTION REQUIRED:** Team members must sign and insert specific prompts/tools into final PDF. |

---

## 3. Scope Boundary Clarifications (Lecturer vs. Team Policy)

To avoid penalizing the project for missing features that were never required by the lecturer, the audit establishes the following boundaries:

1. **Hardware & Real IoT Sensors:**
   - *Lecturer note in syllabus:* *"The primary focus of the project is not on developing physical hardware or sophisticated 3D map interfaces... The system may use either real IoT data or simulated data."*
   - *Audit finding:* The team's use of `SimulatedDock` and seed SQLite data fully satisfies the lecturer's requirement.
2. **Database Requirement:**
   - *Lecturer note in syllabus:* *"It is not required to implement a database in the backend. Data can be hard coded in code files."*
   - *Audit finding:* The team's implementation of 11 SQLite migrations with ACID transaction support far exceeds the minimum assignment expectations.
3. **Payment, User Registration, and Commercial Features:**
   - *Syllabus:* Focuses on mobility dispatching, reservation, charging scheduling, and What-if simulation.
   - *Team Policy:* Payment gateways, user sign-up, penalty fees, and loyalty rewards were deliberately excluded from the MVP scope in `PROJECT_SPECIFICATION.md` §3.7. This is fully justified.
