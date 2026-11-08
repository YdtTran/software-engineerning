# Activity previews

The editable Draw.io canvases are the source. Separate PlantUML blocks represent independently triggered activities.

## AD01-Reserve_Vehicle

```plantuml
@startuml
|User / App|
start
|User / App|
:Select Hub and confirm vehicle reservation;
|Backend|
:Check user and current vehicle eligibility;
|Backend|
if (Eligible and available?) then ([Available, battery >=20%, no hold])
|Backend|
:Atomically hold vehicle and save reservation, expiresAt = now + 15 min;
|Backend|
::Reservation [Reserved];
|User / App|
:Display ticket and expiry time;
stop
else ([else])
|Backend|
:Show availability conflict Return to vehicle list;
stop
endif
@enduml
```

```mermaid
flowchart TD
    n0((Start))
    n1["User / App · Select Hub and confirm vehicle reservation"]
    n5["Backend · Check user and current vehicle eligibility"]
    n6{"Backend · Eligible and available?"}
    n7["Backend · Atomically hold vehicle and save reservation; expiresAt = now + 15 min"]
    n8["Backend · :Reservation [Reserved]"]
    n10["User / App · Display ticket and expiry time"]
    n13["Backend · Show availability conflict Return to vehicle list"]
    n14((End))
    n15((End))
    n0 --> n1
    n1 --> n5
    n5 --> n6
    n6 -->|"[Available, battery >=20%, no hold]"| n7
    n7 --> n8
    n8 --> n10
    n6 -->|"[else]"| n13
    n13 --> n14
    n10 --> n15
```

## AD02-Pick_Up_Vehicle

```plantuml
@startuml
|User / App|
start
|User / App|
:Select ticket and confirm pickup;
|Backend|
:Check owner, Hub and unexpired reservation;
|Backend|
if (Valid reservation?) then ([valid])
|User / App|
if (Report damage before unlock?) then ([damage reported])
|Backend|
:Report damage and block pickup;
stop
else ([else])
|Backend|
:Claim pickup atomically Serialize with expiry / cancellation;
|IoT / Simulated Station|
:Unlock vehicle and await acknowledgement;
|Backend|
if (Unlock confirmed?) then ([matching acknowledgement])
|Backend|
:Atomically consume reservation Start trip, free source slot, set InUse;
|Backend|
::Trip [Active];
|User / App|
:Display active trip;
stop
else ([else])
|Backend|
:Keep vehicle unavailable and hand off to UC11;
stop
endif
endif
else ([else])
|Backend|
:Reject invalid or expired ticket;
stop
endif
@enduml
```

```mermaid
flowchart TD
    n0((Start))
    n1["User / App · Select ticket and confirm pickup"]
    n5["Backend · Check owner, Hub and unexpired reservation"]
    n6{"Backend · Valid reservation?"}
    n7{"User / App · Report damage before unlock?"}
    n8["Backend · Report damage and block pickup"]
    n10((End))
    n11["Backend · Claim pickup atomically Serialize with expiry / cancellation"]
    n12["IoT / Simulated Station · Unlock vehicle and await acknowledgement"]
    n13{"Backend · Unlock confirmed?"}
    n14["Backend · Atomically consume reservation Start trip; free source slot; set InUse"]
    n15["Backend · :Trip [Active]"]
    n16["User / App · Display active trip"]
    n17["Backend · Keep vehicle unavailable and hand off to UC11"]
    n18((End))
    n19["Backend · Reject invalid or expired ticket"]
    n20((End))
    n21((End))
    n0 --> n1
    n1 --> n5
    n5 --> n6
    n6 -->|"[valid]"| n7
    n7 -->|"[damage reported]"| n8
    n8 --> n10
    n7 -->|"[else]"| n11
    n11 --> n12
    n12 --> n13
    n13 -->|"[matching acknowledgement]"| n14
    n14 --> n15
    n15 --> n16
    n13 -->|"[else]"| n17
    n17 --> n18
    n6 -->|"[else]"| n19
    n19 --> n20
    n16 --> n21
```

## AD03-Return_Vehicle

```plantuml
@startuml
|User / App|
start
|User / App|
:Choose destination and request return;
|Backend|
:Validate active-trip owner Claim usable destination slot;
|Backend|
if (Destination claim succeeded?) then ([claimed])
|User / App|
:Dock vehicle safely;
| |
:Confirm vehicle, Hub and lock, read battery;
|Backend|
if (Safe return confirmed?) then ([matching vehicle and locked])
|User / App|
:Confirm return after lock acknowledgement;
|Backend|
:Close trip and occupy slot atomically Record duration / distance, no payment;
|Backend|
::Trip [Completed];
|Backend|
:Classify vehicle by fault and recorded battery;
|User / App|
:Display return confirmation;
stop
else ([else])
|Backend|
:Keep trip active and hand off to Operator;
stop
endif
else ([else])
|Backend|
:Keep trip active, suggest another slot or Hub;
stop
endif
@enduml
```

```mermaid
flowchart TD
    n0((Start))
    n1["User / App · Choose destination and request return"]
    n5["Backend · Validate active-trip owner Claim usable destination slot"]
    n6{"Backend · Destination claim succeeded?"}
    n7["User / App · Dock vehicle safely"]
    n8["  · Confirm vehicle, Hub and lock; read battery"]
    n9{"Backend · Safe return confirmed?"}
    confirm_return["User / App · Confirm return after lock acknowledgement"]
    n10["Backend · Close trip and occupy slot atomically Record duration / distance; no payment"]
    n11["Backend · :Trip [Completed]"]
    n13["Backend · Classify vehicle by fault and recorded battery"]
    n19["User / App · Display return confirmation"]
    n20["Backend · Keep trip active and hand off to Operator"]
    n21((End))
    n22["Backend · Keep trip active; suggest another slot or Hub"]
    n23((End))
    n24((End))
    n0 --> n1
    n1 --> n5
    n5 --> n6
    n6 -->|"[claimed]"| n7
    n7 --> n8
    n8 --> n9
    n9 -->|"[matching vehicle and locked]"| confirm_return
    n10 --> n11
    n11 --> n13
    n13 --> n19
    n9 -->|"[else]"| n20
    n20 --> n21
    n6 -->|"[else]"| n22
    n22 --> n23
    n19 --> n24
    confirm_return --> n10
```

## AD04-Reserve_Parking_and_Charging

```plantuml
@startuml
|User / App|
start
|User / App|
:Choose Hub, vehicle and pool, confirm parking request;
|Backend / Scheduler|
:Validate vehicle and timing Atomically commit hold or interval;
|Backend / Scheduler|
if (Parking hold committed?) then ([committed])
|Backend / Scheduler|
::ParkingReservation [Reserved];
stop
else ([else])
|Backend / Scheduler|
:Decline hold, suggest another Hub or time;
stop
endif
@enduml
```

```plantuml
@startuml
|User / App|
start
|User / App|
:Request check-in with ticket;
|Backend / Scheduler|
:Check BR08a arrival window and physical availability;
|Backend / Scheduler|
if (Check-in valid and vehicle present?) then ([valid and arrival confirmed])
|Backend / Scheduler|
:Atomically mark Fulfilled Record arrival and occupancy;
stop
else ([else])
|Backend / Scheduler|
:Decline check-in, keep existing occupancy;
stop
endif
@enduml
```

```plantuml
@startuml
|User / App|
start
|User / App|
:Request parking checkout;
|Backend / Scheduler|
:Verify owner and safe disconnection If charging, require UC07A;
|IoT / Simulated Station|
:Confirm vehicle physically departed;
|Backend / Scheduler|
if (Departure safe and confirmed?) then ([confirmed])
|Backend / Scheduler|
:Record checkout and BR08b fee End occupancy once, keep bookings;
stop
else ([else])
|Backend / Scheduler|
:Keep parking occupied;
stop
endif
@enduml
```

```plantuml
@startuml
|User / App|
start
|User / App|
:Submit charging request (UC07);
|Backend / Scheduler|
:Validate ownership, battery, connector and needed-by time;
|Backend / Scheduler|
if (Charging request valid?) then ([valid])
|Backend / Scheduler|
:Save request Queued and acknowledge receipt;
stop
else ([else])
|Backend / Scheduler|
:Reject invalid charging request;
stop
endif
@enduml
```

```plantuml
@startuml
|Backend / Scheduler|
start
|Backend / Scheduler|
:Allocate compatible port, time and power (UC12) Confirm safe connection and power-on before Active;
stop
@enduml
```

```plantuml
@startuml
|Backend / Scheduler|
start
|Backend / Scheduler|
:Stop safely (UC07A) Confirm power-off before release, confirm unplug before freeing port;
stop
@enduml
```

```mermaid
flowchart TD
    n0((Start))
    n1["User / App · Choose Hub, vehicle and pool; confirm parking request"]
    n5["Backend / Scheduler · Validate vehicle and timing Atomically commit hold or interval"]
    n6{"Backend / Scheduler · Parking hold committed?"}
    n7["Backend / Scheduler · :ParkingReservation [Reserved]"]
    check_in_end((End))
    n8["User / App · Request check-in with ticket"]
    n9["Backend / Scheduler · Check BR08a arrival window and physical availability"]
    n10{"Backend / Scheduler · Check-in valid and vehicle present?"}
    n11["Backend / Scheduler · Atomically mark Fulfilled Record arrival and occupancy"]
    n12["User / App · Submit charging request (UC07)"]
    n13["Backend / Scheduler · Validate ownership, battery, connector and needed-by time"]
    n14{"Backend / Scheduler · Charging request valid?"}
    n15["Backend / Scheduler · Save request Queued and acknowledge receipt"]
    n42["Backend / Scheduler · Reject invalid charging request"]
    n43((End))
    n45["User / App · Request parking checkout"]
    n46["Backend / Scheduler · Verify owner and safe disconnection If charging, require UC07A"]
    n47["IoT / Simulated Station · Confirm vehicle physically departed"]
    n48{"Backend / Scheduler · Departure safe and confirmed?"}
    n49["Backend / Scheduler · Record checkout and BR08b fee End occupancy once; keep bookings"]
    n50["Backend / Scheduler · Keep parking occupied"]
    n51((End))
    n52["Backend / Scheduler · Decline check-in; keep existing occupancy"]
    n53((End))
    n54["Backend / Scheduler · Decline hold; suggest another Hub or time"]
    n55((End))
    n56((End))
    check_in_start((Start))
    check_out_start((Start))
    arrival_final((End))
    request_final((End))
    request_start((Start))
    allocation_start((Start))
    n16["Backend / Scheduler · Allocate compatible port, time and power (UC12) Confirm safe connection and power-on before Active"]
    allocation_final((End))
    stop_start((Start))
    n33["Backend / Scheduler · Stop safely (UC07A) Confirm power-off before release; confirm unplug before freeing port"]
    stop_final((End))
    n0 --> n1
    n1 --> n5
    n5 --> n6
    n6 -->|"[committed]"| n7
    n7 --> check_in_end
    n8 --> n9
    n9 --> n10
    n10 -->|"[valid and arrival confirmed]"| n11
    n12 -->|"[yes]"| n13
    n13 --> n14
    n14 -->|"[valid]"| n15
    n14 -->|"[else]"| n42
    n42 --> n43
    n45 --> n46
    n46 --> n47
    n47 --> n48
    n48 -->|"[confirmed]"| n49
    n48 -->|"[else]"| n50
    n50 --> n51
    n10 -->|"[else]"| n52
    n52 --> n53
    n6 -->|"[else]"| n54
    n54 --> n55
    n49 --> n56
    check_in_start --> n8
    check_out_start --> n45
    n11 --> arrival_final
    n15 --> request_final
    request_start --> n12
    allocation_start --> n16
    n16 --> allocation_final
    stop_start --> n33
    n33 --> stop_final
```

## AD05-Redistribute_Vehicles

```plantuml
@startuml
|Operator|
start
|Operator|
:Choose source, destination and vehicles, submit plan;
|Backend / Rebalance|
:Validate Operator, check battery >=80% Available vehicles and destination capacity;
|Backend / Rebalance|
if (Atomic resource claim succeeded?) then ([claimed])
|Backend / Rebalance|
:Create Planned order Hold vehicles and destination slots;
|Backend / Rebalance|
::TransferOrder [Planned];
stop
else ([else])
|Backend / Rebalance|
:Show conflict, suggest fewer vehicles Return to source / target selection;
stop
endif
@enduml
```

```plantuml
@startuml
|Operator|
start
|Operator|
:Confirm departure for Planned order;
|Backend / Rebalance|
:Recheck eligibility and commit departure if still Planned;
|Backend / Rebalance|
if (Departure commit succeeded?) then ([committed against cancellation])
|Backend / Rebalance|
:Record confirmed departure, set InTransit Release source slots atomically;
|Field / Simulated Telemetry|
:Transport vehicles to destination Report arrival to Operator;
|Operator|
:Reconcile all vehicle IDs and target slots;
|Backend / Rebalance|
if (Entire order safely arrived?) then ([all IDs and usable destination slots])
|Backend / Rebalance|
:Commit Completed and occupy targets Classify Available / NeedsCharging / Faulty;
stop
else ([else])
|Backend / Rebalance|
:Keep InTransit and holds, hand off to Operator;
stop
endif
else ([else])
|Backend / Rebalance|
:Do not dispatch, show current order state;
stop
endif
@enduml
```

```plantuml
@startuml
|Operator|
start
|Operator|
:Request cancellation of Planned order;
|Backend / Rebalance|
:Cancel only if still Planned, release order holds;
stop
@enduml
```

```mermaid
flowchart TD
    n0((Start))
    n1["Operator · Choose source, destination and vehicles; submit plan"]
    n5["Backend / Rebalance · Validate Operator; check battery >=80% Available vehicles and destination capacity"]
    n6{"Backend / Rebalance · Atomic resource claim succeeded?"}
    n7["Backend / Rebalance · Create Planned order Hold vehicles and destination slots"]
    n8["Backend / Rebalance · :TransferOrder [Planned]"]
    n9["Operator · Confirm departure for Planned order"]
    n10["Backend / Rebalance · Recheck eligibility and commit departure if still Planned"]
    n11{"Backend / Rebalance · Departure commit succeeded?"}
    n12["Backend / Rebalance · Record confirmed departure; set InTransit Release source slots atomically"]
    n13["Field / Simulated Telemetry · Transport vehicles to destination Report arrival to Operator"]
    n14["Operator · Reconcile all vehicle IDs and target slots"]
    n15{"Backend / Rebalance · Entire order safely arrived?"}
    n16["Backend / Rebalance · Commit Completed and occupy targets Classify Available / NeedsCharging / Faulty"]
    n17["Backend / Rebalance · Keep InTransit and holds; hand off to Operator"]
    n18((End))
    n19["Backend / Rebalance · Do not dispatch; show current order state"]
    n20((End))
    n21["Operator · Request cancellation of Planned order"]
    n22["Backend / Rebalance · Cancel only if still Planned; release order holds"]
    n25{"Merge"}
    n26["Backend / Rebalance · Show conflict; suggest fewer vehicles Return to source / target selection"]
    n27((End))
    n28((End))
    plan_final((End))
    start_n9((Start))
    start_n21((Start))
    cancel_final((End))
    n0 --> n1
    n1 --> n5
    n5 --> n6
    n6 -->|"[claimed]"| n7
    n7 --> n8
    n9 --> n10
    n10 --> n11
    n11 -->|"[committed against cancellation]"| n12
    n12 --> n13
    n13 --> n14
    n14 --> n15
    n15 -->|"[all IDs and usable destination slots]"| n16
    n15 -->|"[else]"| n17
    n17 --> n18
    n11 -->|"[else]"| n19
    n19 --> n20
    n21 --> n22
    n16 --> n25
    n6 -->|"[else]"| n26
    n26 --> n27
    n25 --> n28
    n8 --> plan_final
    start_n9 --> n9
    start_n21 --> n21
    n22 --> cancel_final
```

## AD06-Handle_Operational_Incident

```plantuml
@startuml
|User|
start
|User|
:Submit incident report;
| |
:Validate report or trusted telemetry alert;
| |
if (Incident input authorized?) then ([authorized report or trusted alert])
| |
:Open incident and block new allocations;
| |
if (Electrical hazard?) then ([hazard])
|Field / IoT / Simulated Telemetry|
:Request and verify emergency power-off;
| |
if (Electrical isolation confirmed?) then ([else])
| |
:Keep resource quarantined and incident open;
stop
else ([matching power-off or verified local
isolation])
| |
:Notify Operator, keep any active trip open;
stop
endif
else ([else])
endif
| |
:Notify Operator, keep any active trip open;
stop
else ([else])
| |
:Reject invalid incident input;
stop
endif
@enduml
```

```plantuml
@startuml
|Operator|
start
|Operator|
:Assign recovery after required isolation;
|Field / IoT / Simulated Telemetry|
:Recover safely and repair resource Record electrical / mechanical test result;
| |
if (Safety test passed?) then ([passed and safe location confirmed])
|Operator|
if (Accept repair as authorized Operator?) then ([accepted])
| |
:Reconcile resources, close trips only through UC05;
| |
:Restore only eligible resources Close resolved incident, keep audit Requeue technical charging interruptions;
stop
else ([else])
| |
:Keep isolated until Operator acceptance;
stop
endif
else ([else])
| |
:Keep isolated when safety test fails;
stop
endif
@enduml
```

```mermaid
flowchart TD
    n0((Start))
    n1["User · Submit incident report"]
    n5["  · Validate report or trusted telemetry alert"]
    n6{"  · Incident input authorized?"}
    n7["  · Open incident and block new allocations"]
    n8{"  · Electrical hazard?"}
    n9["Field / IoT / Simulated Telemetry · Request and verify emergency power-off"]
    n10{"  · Electrical isolation confirmed?"}
    n11["  · Keep resource quarantined and incident open"]
    n12((End))
    n13{"Merge"}
    n14["  · Notify Operator; keep any active trip open"]
    n15["Operator · Assign recovery after required isolation"]
    n16["Field / IoT / Simulated Telemetry · Recover safely and repair resource Record electrical / mechanical test result"]
    n17{"  · Safety test passed?"}
    n18{"Operator · Accept repair as authorized Operator?"}
    n19["  · Reconcile resources; close trips only through UC05"]
    n20["  · Restore only eligible resources Close resolved incident; keep audit Requeue technical charging interruptions"]
    n21["  · Keep isolated until Operator acceptance"]
    n22((End))
    n23["  · Keep isolated when safety test fails"]
    n24((End))
    n25["  · Reject invalid incident input"]
    n26((End))
    n27((End))
    isolation_final((End))
    recovery_start((Start))
    n0 --> n1
    n1 --> n5
    n5 --> n6
    n6 -->|"[authorized report or trusted alert]"| n7
    n7 --> n8
    n8 -->|"[hazard]"| n9
    n9 --> n10
    n10 -->|"[else]"| n11
    n11 --> n12
    n10 -->|"[matching power-off or verified local
isolation]"| n13
    n8 -->|"[else]"| n13
    n13 --> n14
    n15 --> n16
    n16 --> n17
    n17 -->|"[passed and safe location confirmed]"| n18
    n18 -->|"[accepted]"| n19
    n19 --> n20
    n18 -->|"[else]"| n21
    n21 --> n22
    n17 -->|"[else]"| n23
    n23 --> n24
    n6 -->|"[else]"| n25
    n25 --> n26
    n20 --> n27
    n14 --> isolation_final
    recovery_start --> n15
```

## AD07-Run_What_if_Simulation

```plantuml
@startuml
|Operator|
start
|Operator|
:Configure and run what-if scenario;
|Backend / Sandbox|
:Validate ranges, snapshot network Run simulation on isolated copy;
|Backend / Sandbox|
if (Run completed within deadline?) then ([completed])
|Backend / Sandbox|
::SimulationResult [Completed];
|Operator|
:Review KPIs and recommendations;
|Operator|
if (Apply recommendation?) then ([apply])
|Backend / Sandbox|
:Revalidate role and current live resources;
|Backend / Sandbox|
if (Recommendation still feasible?) then ([valid])
|Operational Services|
:Submit explicit UC10 Planned order or UC12 schedule change Do not copy sandbox state to live;
stop
else ([else])
|Backend / Sandbox|
:Report stale recommendation, keep live state;
stop
endif
else ([else])
|Operator|
:Review or export results without applying;
endif
stop
else ([else])
|Backend / Sandbox|
:Report unsuccessful run;
stop
endif
@enduml
```

```mermaid
flowchart TD
    n0((Start))
    n1["Operator · Configure and run what-if scenario"]
    n5["Backend / Sandbox · Validate ranges; snapshot network Run simulation on isolated copy"]
    n6{"Backend / Sandbox · Run completed within deadline?"}
    n7["Backend / Sandbox · :SimulationResult [Completed]"]
    n8["Operator · Review KPIs and recommendations"]
    n9{"Operator · Apply recommendation?"}
    n10["Backend / Sandbox · Revalidate role and current live resources"]
    n11{"Backend / Sandbox · Recommendation still feasible?"}
    n12["Operational Services · Submit explicit UC10 Planned order or UC12 schedule change Do not copy sandbox state to live"]
    n13["Backend / Sandbox · Report stale recommendation; keep live state"]
    n14((End))
    n15["Operator · Review or export results without applying"]
    n16{"Merge"}
    n17["Backend / Sandbox · Report unsuccessful run"]
    n18((End))
    n19((End))
    n0 --> n1
    n1 --> n5
    n5 --> n6
    n6 -->|"[completed]"| n7
    n7 --> n8
    n8 --> n9
    n9 -->|"[apply]"| n10
    n10 --> n11
    n11 -->|"[valid]"| n12
    n11 -->|"[else]"| n13
    n13 --> n14
    n9 -->|"[else]"| n15
    n12 --> n16
    n15 --> n16
    n6 -->|"[else]"| n17
    n17 --> n18
    n16 --> n19
```
