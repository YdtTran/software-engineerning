# Activity — PlantUML & Mermaid

Nguồn: `PROJECT_SPECIFICATION.md` §3, `LIFECYCLE_SCENARIOS.md`; slide CO3001 Ch6.
Dữ liệu gốc: `.agent/scripts/generate_process_diagrams.py`. SVG và PNG được render bằng Draw.io thật.

PlantUML/Mermaid là bản xem mã; Draw.io là bản ký hiệu chi tiết. PlantUML dùng stereotype `<<object>>` cho nút dữ liệu; Mermaid mô phỏng thanh fork/join bằng ô đen. Không dùng hai bản preview để kiểm tra hình học UML.

## AD01 — Reserve Vehicle

[Draw.io](AD01-Reserve_Vehicle.drawio) · [SVG editable](AD01-Reserve_Vehicle.drawio.svg) · [PNG](AD01-Reserve_Vehicle.png)

```plantuml
@startuml
title Reserve Vehicle
skinparam activity {
  BackgroundColor #e0f2fe
  BorderColor black
}
|Student / App|
start
|Student / App|
:Select Hub and vehicle;
|Student / App|
if (Confirm operation?) then ([confirm])
else ([else])
|Student / App|
:Close screen / Back\nKeep current state;
|Student / App|
stop
endif
|Backend|
:Validate identity and request ID\nRead current vehicle state;
|Backend|
if (Eligible and available?) then ([Available, battery >=20%, no hold])
|Backend|
:Atomically hold vehicle and save\nreservation; expiresAt = now + 15 min;
|Backend|
::Reservation [Reserved]; <<object>>
|Backend|
fork
|Student / App|
:Display ticket and expiry time;
fork again
|Notification Service|
:Queue confirmation after commit\nRetry delivery without rollback;
end fork
else ([else])
|Backend|
:Show availability conflict\nReturn to vehicle list;
|Student / App|
stop
endif
stop
@enduml
```

```mermaid
flowchart TD
  subgraph lane0["Student / App"]
    n0(("●"))
    n1("Select Hub and vehicle")
    n2{"Confirm operation?"}
    n3("Close screen / Back<br/>Keep current state")
    n4(("◉"))
    n10("Display ticket and expiry time")
    n14(("◉"))
    n15(("◉"))
  end
  subgraph lane1["Backend"]
    n5("Validate identity and request ID<br/>Read current vehicle state")
    n6{"Eligible and available?"}
    n7("Atomically hold vehicle and save<br/>reservation; expiresAt = now + 15 min")
    n8[":Reservation [Reserved]"]
    n9[" "]
    n12[" "]
    n13("Show availability conflict<br/>Return to vehicle list")
  end
  subgraph lane2["Notification Service"]
    n11("Queue confirmation after commit<br/>Retry delivery without rollback")
  end
  n0 --> n1
  n1 --> n2
  n2 --> |"[else]"| n3
  n3 --> n4
  n2 --> |"[confirm]"| n5
  n5 --> n6
  n6 --> |"[Available, battery >=20%, no hold]"| n7
  n7 -.-> n8
  n8 -.-> n9
  n9 --> n10
  n9 --> n11
  n10 --> n12
  n11 --> n12
  n6 --> |"[else]"| n13
  n13 --> n14
  n12 --> n15
  classDef bar fill:#000,stroke:#000,color:#000;
  class n9,n12 bar;
```

## AD02 — Pick Up Vehicle

[Draw.io](AD02-Pick_Up_Vehicle.drawio) · [SVG editable](AD02-Pick_Up_Vehicle.drawio.svg) · [PNG](AD02-Pick_Up_Vehicle.png)

```plantuml
@startuml
title Pick Up Vehicle
skinparam activity {
  BackgroundColor #e0f2fe
  BorderColor black
}
|Student / App|
start
|Student / App|
:Select ticket and scan QR / PIN;
|Student / App|
if (Confirm operation?) then ([confirm])
else ([else])
|Student / App|
:Close screen / Back\nKeep current state;
|Student / App|
stop
endif
|Backend|
:Validate owner, Hub, reservation\nnow < expiresAt and request ID;
|Backend|
if (Valid reservation?) then ([valid])
|Backend|
:Claim pickup atomically\nSerialize with expiry / cancellation;
|IoT / Simulated Station|
:Unlock with the same command ID\nAwait acknowledgement; max 3 attempts;
|Backend|
if (Unlock confirmed?) then ([matching acknowledgement])
|Backend|
:Atomically consume reservation\nStart trip; free source slot; set InUse;
|Backend|
::Trip [Active]; <<object>>
|Student / App|
:Display active trip;
else ([else])
|Backend|
:Keep vehicle unavailable\nReconcile uncertain unlock via UC11\nDo not start trip or charge time;
|Student / App|
stop
endif
else ([else])
|Backend|
:Show invalid / expired ticket\nRelease only expired reservation hold\nReturn to ticket screen;
|Student / App|
stop
endif
stop
@enduml
```

```mermaid
flowchart TD
  subgraph lane0["Student / App"]
    n0(("●"))
    n1("Select ticket and scan QR / PIN")
    n2{"Confirm operation?"}
    n3("Close screen / Back<br/>Keep current state")
    n4(("◉"))
    n12("Display active trip")
    n14(("◉"))
    n16(("◉"))
    n17(("◉"))
  end
  subgraph lane1["Backend"]
    n5("Validate owner, Hub, reservation<br/>now < expiresAt and request ID")
    n6{"Valid reservation?"}
    n7("Claim pickup atomically<br/>Serialize with expiry / cancellation")
    n9{"Unlock confirmed?"}
    n10("Atomically consume reservation<br/>Start trip; free source slot; set InUse")
    n11[":Trip [Active]"]
    n13("Keep vehicle unavailable<br/>Reconcile uncertain unlock via UC11<br/>Do not start trip or charge time")
    n15("Show invalid / expired ticket<br/>Release only expired reservation hold<br/>Return to ticket screen")
  end
  subgraph lane2["IoT / Simulated Station"]
    n8("Unlock with the same command ID<br/>Await acknowledgement; max 3 attempts")
  end
  n0 --> n1
  n1 --> n2
  n2 --> |"[else]"| n3
  n3 --> n4
  n2 --> |"[confirm]"| n5
  n5 --> n6
  n6 --> |"[valid]"| n7
  n7 --> n8
  n8 --> n9
  n9 --> |"[matching acknowledgement]"| n10
  n10 -.-> n11
  n11 -.-> n12
  n9 --> |"[else]"| n13
  n13 --> n14
  n6 --> |"[else]"| n15
  n15 --> n16
  n12 --> n17
```

## AD03 — Return Vehicle

[Draw.io](AD03-Return_Vehicle.drawio) · [SVG editable](AD03-Return_Vehicle.drawio.svg) · [PNG](AD03-Return_Vehicle.png)

```plantuml
@startuml
title Return Vehicle
skinparam activity {
  BackgroundColor #e0f2fe
  BorderColor black
}
|Student / App|
start
|Student / App|
:Select destination Hub / slot;
|Student / App|
if (Confirm operation?) then ([confirm])
else ([else])
|Student / App|
:Close screen / Back\nKeep current state;
|Student / App|
stop
endif
|Backend|
:Validate active-trip owner\nClaim usable destination slot;
|Backend|
if (Destination claim succeeded?) then ([claimed])
|Student / App|
:Dock vehicle safely;
|IoT / Simulated Station|
:Confirm vehicle identity, Hub and lock\nAwait telemetry; max 3 attempts;
|Backend|
if (Safe return confirmed?) then ([matching vehicle and locked])
|Backend|
:Close trip and occupy slot atomically\nRecord duration / distance; no payment;
|Backend|
::Trip [Completed]; <<object>>
|Backend|
if (Unresolved vehicle fault?) then ([fault])
|Backend|
:Keep vehicle Faulty\nAssign recovery / maintenance;
else ([else])
|Backend|
if (Battery sufficient?) then ([battery >=20%])
|Backend|
:Set vehicle Available;
else ([else])
|Backend|
:Set vehicle NeedsCharging\nQueue charging request;
endif
endif
|Student / App|
:Display return confirmation;
else ([else])
|Backend|
:Keep trip Active; block uncertain slot\nShow return screen / alternate slot\nEscalate to Operator; do not free vehicle;
|Student / App|
stop
endif
else ([else])
|Backend|
:Suggest another slot / Hub\nKeep trip Active; return to Hub selection;
|Student / App|
stop
endif
stop
@enduml
```

```mermaid
flowchart TD
  subgraph lane0["Student / App"]
    n0(("●"))
    n1("Select destination Hub / slot")
    n2{"Confirm operation?"}
    n3("Close screen / Back<br/>Keep current state")
    n4(("◉"))
    n7("Dock vehicle safely")
    n19("Display return confirmation")
    n21(("◉"))
    n23(("◉"))
    n24(("◉"))
  end
  subgraph lane1["Backend"]
    n5("Validate active-trip owner<br/>Claim usable destination slot")
    n6{"Destination claim succeeded?"}
    n9{"Safe return confirmed?"}
    n10("Close trip and occupy slot atomically<br/>Record duration / distance; no payment")
    n11[":Trip [Completed]"]
    n12{"Unresolved vehicle fault?"}
    n13("Keep vehicle Faulty<br/>Assign recovery / maintenance")
    n14{"Battery sufficient?"}
    n15("Set vehicle Available")
    n16("Set vehicle NeedsCharging<br/>Queue charging request")
    n17{" "}
    n18{" "}
    n20("Keep trip Active; block uncertain slot<br/>Show return screen / alternate slot<br/>Escalate to Operator; do not free vehicle")
    n22("Suggest another slot / Hub<br/>Keep trip Active; return to Hub selection")
  end
  subgraph lane2["IoT / Simulated Station"]
    n8("Confirm vehicle identity, Hub and lock<br/>Await telemetry; max 3 attempts")
  end
  n0 --> n1
  n1 --> n2
  n2 --> |"[else]"| n3
  n3 --> n4
  n2 --> |"[confirm]"| n5
  n5 --> n6
  n6 --> |"[claimed]"| n7
  n7 --> n8
  n8 --> n9
  n9 --> |"[matching vehicle and locked]"| n10
  n10 -.-> n11
  n11 -.-> n12
  n12 --> |"[fault]"| n13
  n12 --> |"[else]"| n14
  n14 --> |"[battery >=20%]"| n15
  n14 --> |"[else]"| n16
  n15 --> n17
  n16 --> n17
  n13 --> n18
  n17 --> n18
  n18 --> n19
  n9 --> |"[else]"| n20
  n20 --> n21
  n6 --> |"[else]"| n22
  n22 --> n23
  n19 --> n24
```

## AD04 — Private Parking and Charging

[Draw.io](AD04-Reserve_Parking_and_Charging.drawio) · [SVG editable](AD04-Reserve_Parking_and_Charging.drawio.svg) · [PNG](AD04-Reserve_Parking_and_Charging.png)

```plantuml
@startuml
title Private Parking and Charging
skinparam activity {
  BackgroundColor #e0f2fe
  BorderColor black
}
|Student / App|
start
|Student / App|
:Select Hub, private vehicle and arrival;
|Student / App|
if (Confirm operation?) then ([confirm])
else ([else])
|Student / App|
:Close screen / Back\nKeep current state;
|Student / App|
stop
endif
|Backend / Scheduler|
:Validate owner and arrival time\nAtomically claim a usable slot;
|Backend / Scheduler|
if (Parking hold committed?) then ([committed])
|Backend / Scheduler|
::ParkingReservation [Reserved]; <<object>>
|Student / App|
:Present ticket at scheduled arrival;
|Backend / Scheduler|
:Validate owner, Hub and arrival window\nScheduledArrival <= now < arrival + 30 min;
|Backend / Scheduler|
if (Check-in valid and vehicle present?) then ([valid and arrival confirmed])
|Backend / Scheduler|
:Atomically mark Fulfilled\nChange Held slot to Occupied;
|Student / App|
if (Request charging?) then ([yes])
|Backend / Scheduler|
:Validate ownership, battery and connector\nSave charging request Queued;
|Backend / Scheduler|
if (Compatible port and power ready?) then ([ready; allocated kW <= powerLimitKW])
|IoT / Simulated Station|
:Confirm plug and electrical safety\nStart supply; await acknowledgement;
|Backend / Scheduler|
if (Start acknowledged?) then ([confirmed])
|Backend / Scheduler|
:Mark session Active;
|Student / App|
:Request stop / reach target or\n80% with urgent queue;
|IoT / Simulated Station|
:Cut power with same command ID\nAwait acknowledgement; max 3 attempts;
|Backend / Scheduler|
if (Power off confirmed?) then ([confirmed])
|Backend / Scheduler|
:Close session; release power allocation\nKeep parking Occupied until unplug;
else ([else])
|Backend / Scheduler|
:Quarantine port; open incident\nDo not report stop / checkout success;
|Student / App|
stop
endif
else ([else])
|Backend / Scheduler|
:Block uncertain port; open incident\nKeep request pending reconciliation;
|Student / App|
stop
endif
else ([else])
|Backend / Scheduler|
:Keep request Queued; show queue\nAllow cancel; retain occupied parking;
|Student / App|
stop
endif
else ([else])
endif
|Student / App|
:Request check-out and unplug;
|Backend / Scheduler|
:Validate owner; cancel queued request\nConfirm no active supply or plug;
|IoT / Simulated Station|
:Confirm vehicle physically departed;
|Backend / Scheduler|
if (Departure safe and confirmed?) then ([confirmed])
|Backend / Scheduler|
:Atomically clear occupant\nRelease usable slot once; retain history;
else ([else])
|Backend / Scheduler|
:Keep slot Occupied / quarantined\nShow parking screen; request assistance;
|Student / App|
stop
endif
else ([else])
|Backend / Scheduler|
:Reject check-in; allow Back / rebook\nCancel or expire only unfulfilled hold\nNever free an occupied slot;
|Student / App|
stop
endif
else ([else])
|Backend / Scheduler|
:Show conflict and alternative Hub\nReturn to parking selection;
|Student / App|
stop
endif
stop
@enduml
```

```mermaid
flowchart TD
  subgraph lane0["Student / App"]
    n0(("●"))
    n1("Select Hub, private vehicle and arrival")
    n2{"Confirm operation?"}
    n3("Close screen / Back<br/>Keep current state")
    n4(("◉"))
    n8("Present ticket at scheduled arrival")
    n12{"Request charging?"}
    n18("Request stop / reach target or<br/>80% with urgent queue")
    n23(("◉"))
    n25(("◉"))
    n27(("◉"))
    n28{" "}
    n29("Request check-out and unplug")
    n35(("◉"))
    n37(("◉"))
    n39(("◉"))
    n40(("◉"))
  end
  subgraph lane1["Backend / Scheduler"]
    n5("Validate owner and arrival time<br/>Atomically claim a usable slot")
    n6{"Parking hold committed?"}
    n7[":ParkingReservation [Reserved]"]
    n9("Validate owner, Hub and arrival window<br/>ScheduledArrival <= now < arrival + 30 min")
    n10{"Check-in valid and vehicle present?"}
    n11("Atomically mark Fulfilled<br/>Change Held slot to Occupied")
    n13("Validate ownership, battery and connector<br/>Save charging request Queued")
    n14{"Compatible port and power ready?"}
    n16{"Start acknowledged?"}
    n17("Mark session Active")
    n20{"Power off confirmed?"}
    n21("Close session; release power allocation<br/>Keep parking Occupied until unplug")
    n22("Quarantine port; open incident<br/>Do not report stop / checkout success")
    n24("Block uncertain port; open incident<br/>Keep request pending reconciliation")
    n26("Keep request Queued; show queue<br/>Allow cancel; retain occupied parking")
    n30("Validate owner; cancel queued request<br/>Confirm no active supply or plug")
    n32{"Departure safe and confirmed?"}
    n33("Atomically clear occupant<br/>Release usable slot once; retain history")
    n34("Keep slot Occupied / quarantined<br/>Show parking screen; request assistance")
    n36("Reject check-in; allow Back / rebook<br/>Cancel or expire only unfulfilled hold<br/>Never free an occupied slot")
    n38("Show conflict and alternative Hub<br/>Return to parking selection")
  end
  subgraph lane2["IoT / Simulated Station"]
    n15("Confirm plug and electrical safety<br/>Start supply; await acknowledgement")
    n19("Cut power with same command ID<br/>Await acknowledgement; max 3 attempts")
    n31("Confirm vehicle physically departed")
  end
  n0 --> n1
  n1 --> n2
  n2 --> |"[else]"| n3
  n3 --> n4
  n2 --> |"[confirm]"| n5
  n5 --> n6
  n6 -.-> |"[committed]"| n7
  n7 -.-> n8
  n8 --> n9
  n9 --> n10
  n10 --> |"[valid and arrival confirmed]"| n11
  n11 --> n12
  n12 --> |"[yes]"| n13
  n13 --> n14
  n14 --> |"[ready; allocated kW <= powerLimitKW]"| n15
  n15 --> n16
  n16 --> |"[confirmed]"| n17
  n17 --> n18
  n18 --> n19
  n19 --> n20
  n20 --> |"[confirmed]"| n21
  n20 --> |"[else]"| n22
  n22 --> n23
  n16 --> |"[else]"| n24
  n24 --> n25
  n14 --> |"[else]"| n26
  n26 --> n27
  n21 --> n28
  n12 --> |"[else]"| n28
  n28 --> n29
  n29 --> n30
  n30 --> n31
  n31 --> n32
  n32 --> |"[confirmed]"| n33
  n32 --> |"[else]"| n34
  n34 --> n35
  n10 --> |"[else]"| n36
  n36 --> n37
  n6 --> |"[else]"| n38
  n38 --> n39
  n33 --> n40
```

## AD05 — Redistribute Vehicles

[Draw.io](AD05-Redistribute_Vehicles.drawio) · [SVG editable](AD05-Redistribute_Vehicles.drawio.svg) · [PNG](AD05-Redistribute_Vehicles.png)

```plantuml
@startuml
title Redistribute Vehicles
skinparam activity {
  BackgroundColor #e0f2fe
  BorderColor black
}
|Operator|
start
|Operator|
:Choose source, destination and vehicles;
|Operator|
if (Confirm operation?) then ([confirm])
else ([else])
|Operator|
:Close screen / Back\nKeep current state;
|Operator|
stop
endif
|Backend / Rebalance|
:Validate Operator; check battery >=80%\nAvailable vehicles and destination capacity;
|Backend / Rebalance|
if (Atomic resource claim succeeded?) then ([claimed])
|Backend / Rebalance|
:Create Planned order\nHold vehicles and destination slots;
|Backend / Rebalance|
::TransferOrder [Planned]; <<object>>
|Operator|
if (Confirm departure?) then ([depart])
|Backend / Rebalance|
:Recheck battery >=80% and Planned\nCommit InTransit; release source slots;
|Field / Simulated Telemetry|
:Transport vehicles to destination\nReport arrival to Operator;
|Operator|
:Reconcile all vehicle IDs and target slots;
|Backend / Rebalance|
if (Entire order safely arrived?) then ([all IDs and usable destination slots])
|Backend / Rebalance|
:Commit Completed and occupy targets\nClassify Available / NeedsCharging / Faulty;
else ([else])
|Backend / Rebalance|
:Keep InTransit and required holds\nOpen incident; reassign target atomically\nDo not complete a partial batch;
|Operator|
stop
endif
else ([else])
|Operator|
if (Cancel Planned order?) then ([cancel confirmed])
|Backend / Rebalance|
:Cancel only if still Planned\nRelease only order-owned holds\nIf departure won race: keep InTransit;
else ([else])
|Operator|
:Close order / Back\nKeep Planned and its holds;
endif
endif
else ([else])
|Backend / Rebalance|
:Show conflict; suggest fewer vehicles\nReturn to source / target selection;
|Operator|
stop
endif
stop
@enduml
```

```mermaid
flowchart TD
  subgraph lane0["Operator"]
    n0(("●"))
    n1("Choose source, destination and vehicles")
    n2{"Confirm operation?"}
    n3("Close screen / Back<br/>Keep current state")
    n4(("◉"))
    n9{"Confirm departure?"}
    n12("Reconcile all vehicle IDs and target slots")
    n16(("◉"))
    n17{"Cancel Planned order?"}
    n19("Close order / Back<br/>Keep Planned and its holds")
    n20{" "}
    n21{" "}
    n23(("◉"))
    n24(("◉"))
  end
  subgraph lane1["Backend / Rebalance"]
    n5("Validate Operator; check battery >=80%<br/>Available vehicles and destination capacity")
    n6{"Atomic resource claim succeeded?"}
    n7("Create Planned order<br/>Hold vehicles and destination slots")
    n8[":TransferOrder [Planned]"]
    n10("Recheck battery >=80% and Planned<br/>Commit InTransit; release source slots")
    n13{"Entire order safely arrived?"}
    n14("Commit Completed and occupy targets<br/>Classify Available / NeedsCharging / Faulty")
    n15("Keep InTransit and required holds<br/>Open incident; reassign target atomically<br/>Do not complete a partial batch")
    n18("Cancel only if still Planned<br/>Release only order-owned holds<br/>If departure won race: keep InTransit")
    n22("Show conflict; suggest fewer vehicles<br/>Return to source / target selection")
  end
  subgraph lane2["Field / Simulated Telemetry"]
    n11("Transport vehicles to destination<br/>Report arrival to Operator")
  end
  n0 --> n1
  n1 --> n2
  n2 --> |"[else]"| n3
  n3 --> n4
  n2 --> |"[confirm]"| n5
  n5 --> n6
  n6 --> |"[claimed]"| n7
  n7 -.-> n8
  n8 -.-> n9
  n9 --> |"[depart]"| n10
  n10 --> n11
  n11 --> n12
  n12 --> n13
  n13 --> |"[all IDs and usable destination slots]"| n14
  n13 --> |"[else]"| n15
  n15 --> n16
  n9 --> |"[else]"| n17
  n17 --> |"[cancel confirmed]"| n18
  n17 --> |"[else]"| n19
  n18 --> n20
  n19 --> n20
  n14 --> n21
  n20 --> n21
  n6 --> |"[else]"| n22
  n22 --> n23
  n21 --> n24
```

## AD06 — Handle Operational Incident

[Draw.io](AD06-Handle_Operational_Incident.drawio) · [SVG editable](AD06-Handle_Operational_Incident.drawio.svg) · [PNG](AD06-Handle_Operational_Incident.png)

```plantuml
@startuml
title Handle Operational Incident
skinparam activity {
  BackgroundColor #e0f2fe
  BorderColor black
}
|Operator / Student|
start
|Operator / Student|
:Submit trip report / inspect sensor alert;
|Incident Service|
:Validate report ownership / Operator role\nDeduplicate request and save incident;
|Incident Service|
if (Electrical hazard?) then ([hazard])
|Field / IoT / Simulated Telemetry|
:Cut supply; quarantine affected port;
else ([else])
|Incident Service|
:Block new allocations\nDo not lock a moving vehicle;
endif
|Incident Service|
:Notify Operator after commit\nPreserve active trip until safe recovery;
|Operator / Student|
:Assign recovery / repair and inspect site;
|Field / IoT / Simulated Telemetry|
:Recover safely and repair resource\nRecord electrical / mechanical test result;
|Incident Service|
if (Safety test passed?) then ([passed and safe location confirmed])
|Operator / Student|
:Confirm repair acceptance;
|Incident Service|
:Reconcile trip, reservations and occupancy\nClose trip only via safe UC05 confirmation;
|Incident Service|
:Restore eligible resource state\nRequeue interrupted charging; keep audit;
else ([else])
|Incident Service|
:Keep Faulty / Maintenance\nLeave incident open; assign next repair\nClose screen without restoring resource;
|Operator / Student|
stop
endif
stop
@enduml
```

```mermaid
flowchart TD
  subgraph lane0["Operator / Student"]
    n0(("●"))
    n1("Submit trip report / inspect sensor alert")
    n8("Assign recovery / repair and inspect site")
    n11("Confirm repair acceptance")
    n15(("◉"))
    n16(("◉"))
  end
  subgraph lane1["Incident Service"]
    n2("Validate report ownership / Operator role<br/>Deduplicate request and save incident")
    n3{"Electrical hazard?"}
    n5("Block new allocations<br/>Do not lock a moving vehicle")
    n6{" "}
    n7("Notify Operator after commit<br/>Preserve active trip until safe recovery")
    n10{"Safety test passed?"}
    n12("Reconcile trip, reservations and occupancy<br/>Close trip only via safe UC05 confirmation")
    n13("Restore eligible resource state<br/>Requeue interrupted charging; keep audit")
    n14("Keep Faulty / Maintenance<br/>Leave incident open; assign next repair<br/>Close screen without restoring resource")
  end
  subgraph lane2["Field / IoT / Simulated Telemetry"]
    n4("Cut supply; quarantine affected port")
    n9("Recover safely and repair resource<br/>Record electrical / mechanical test result")
  end
  n0 --> n1
  n1 --> n2
  n2 --> n3
  n3 --> |"[hazard]"| n4
  n3 --> |"[else]"| n5
  n4 --> n6
  n5 --> n6
  n6 --> n7
  n7 --> n8
  n8 --> n9
  n9 --> n10
  n10 --> |"[passed and safe location confirmed]"| n11
  n11 --> n12
  n12 --> n13
  n10 --> |"[else]"| n14
  n14 --> n15
  n13 --> n16
```

## AD07 — Run What-if Simulation

[Draw.io](AD07-Run_What_if_Simulation.drawio) · [SVG editable](AD07-Run_What_if_Simulation.drawio.svg) · [PNG](AD07-Run_What_if_Simulation.png)

```plantuml
@startuml
title Run What-if Simulation
skinparam activity {
  BackgroundColor #e0f2fe
  BorderColor black
}
|Operator|
start
|Operator|
:Select scenario and enter parameters;
|Operator|
if (Confirm operation?) then ([confirm])
else ([else])
|Operator|
:Close screen / Back\nKeep current state;
|Operator|
stop
endif
|Backend / Sandbox|
:Validate ranges; snapshot network\nRun simulation on isolated copy;
|Backend / Sandbox|
if (Run completed within deadline?) then ([completed])
|Backend / Sandbox|
::SimulationResult [Completed]; <<object>>
|Operator|
:Review KPIs and recommendations;
|Operator|
if (Apply recommendation?) then ([apply])
|Backend / Sandbox|
:Revalidate role and current live resources;
|Backend / Sandbox|
if (Recommendation still feasible?) then ([valid])
|Operational Services|
:Submit explicit UC10 Planned order\nor UC12 schedule change\nDo not copy sandbox state to live;
else ([else])
|Backend / Sandbox|
:Show stale-result conflict\nReturn to scenario configuration;
|Operator|
stop
endif
else ([else])
|Operator|
:Export report / close results\nKeep live resources unchanged;
endif
else ([else])
|Backend / Sandbox|
:Show timeout / invalid-input error\nDiscard sandbox; return to configuration;
|Operator|
stop
endif
stop
@enduml
```

```mermaid
flowchart TD
  subgraph lane0["Operator"]
    n0(("●"))
    n1("Select scenario and enter parameters")
    n2{"Confirm operation?"}
    n3("Close screen / Back<br/>Keep current state")
    n4(("◉"))
    n8("Review KPIs and recommendations")
    n9{"Apply recommendation?"}
    n14(("◉"))
    n15("Export report / close results<br/>Keep live resources unchanged")
    n16{" "}
    n18(("◉"))
    n19(("◉"))
  end
  subgraph lane1["Backend / Sandbox"]
    n5("Validate ranges; snapshot network<br/>Run simulation on isolated copy")
    n6{"Run completed within deadline?"}
    n7[":SimulationResult [Completed]"]
    n10("Revalidate role and current live resources")
    n11{"Recommendation still feasible?"}
    n13("Show stale-result conflict<br/>Return to scenario configuration")
    n17("Show timeout / invalid-input error<br/>Discard sandbox; return to configuration")
  end
  subgraph lane2["Operational Services"]
    n12("Submit explicit UC10 Planned order<br/>or UC12 schedule change<br/>Do not copy sandbox state to live")
  end
  n0 --> n1
  n1 --> n2
  n2 --> |"[else]"| n3
  n3 --> n4
  n2 --> |"[confirm]"| n5
  n5 --> n6
  n6 -.-> |"[completed]"| n7
  n7 -.-> n8
  n8 --> n9
  n9 --> |"[apply]"| n10
  n10 --> n11
  n11 --> |"[valid]"| n12
  n11 --> |"[else]"| n13
  n13 --> n14
  n9 --> |"[else]"| n15
  n12 --> n16
  n15 --> n16
  n6 --> |"[else]"| n17
  n17 --> n18
  n16 --> n19
```
