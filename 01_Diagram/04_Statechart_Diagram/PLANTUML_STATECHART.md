# Statechart — PlantUML & Mermaid

Nguồn: `PROJECT_SPECIFICATION.md` §3, `LIFECYCLE_SCENARIOS.md`; slide CO3001 Ch6.
Dữ liệu gốc: `.agent/scripts/generate_process_diagrams.py`. SVG và PNG được render bằng Draw.io thật.

PlantUML/Mermaid là bản xem mã; Draw.io là bản ký hiệu chi tiết. PlantUML dùng stereotype `<<object>>` cho nút dữ liệu; Mermaid mô phỏng thanh fork/join bằng ô đen. Không dùng hai bản preview để kiểm tra hình học UML.

## SC01 — Vehicle Lifecycle

[Draw.io](SC01-Vehicle_State_Machine.drawio) · [SVG editable](SC01-Vehicle_State_Machine.drawio.svg) · [PNG](SC01-Vehicle_State_Machine.png)

```plantuml
@startuml
title Vehicle Lifecycle
state "Operational Service" as Operational {
  state "Available" as Available
  state "Reserved" as Reserved
  state "In-Use" as InUse
  state "Needs Charging" as NeedsCharging
  state "Charging" as Charging
}
Available : entry / enableBookingIfUnheld()
Available : do: receiveTelemetry()
Reserved : entry / holdFor15Minutes()
Reserved : exit / stopExpiryTimer()
InUse : do: streamTripTelemetry()
NeedsCharging : entry / disableBooking()
NeedsCharging : do: waitForScheduler()
Charging : do: monitorSupplyAndBattery()
state "Held for Transfer" as TransferHeld
TransferHeld : entry / excludeFromBooking()
state "In-Transit" as InTransit
InTransit : do: trackTransferManifest()
state "Faulty" as Faulty
Faulty : entry / blockNewAllocations()
Faulty : do: preserveTripAndLocation()
state "Under Maintenance" as Maintenance
Maintenance : do: diagnoseAndRepair()
state "Retired" as Retired
Retired : entry / archiveVehicle()
[*] --> Available
Available --> Reserved : reserveCommitted [battery >=20% and no other hold] / linkReservation()
Reserved --> Available : cancelCommitted [pickupNotClaimed] / releaseOwnHold()
Reserved --> Available : expiryReached [now >= expiresAt and pickupNotClaimed] / releaseOwnHold()
Reserved --> InUse : unlockConfirmed [pickupClaimed and matchingAck] / consumeReservationAndStartTrip()
Reserved --> Faulty : unlockUncertain [threeAttemptsExhausted] / openIncidentAndReconcile()
InUse --> Available : safeReturnConfirmed [noFault and battery >=20%] / closeTripAndOccupySlot()
InUse --> NeedsCharging : safeReturnConfirmed [noFault and battery <20%] / closeTripAndQueueCharge()
NeedsCharging --> Charging : powerOnConfirmed [plugSafe and portAllocated] / startSession()
Charging --> Available : powerOffConfirmed [noFault and battery >=20%] / closeSession()
Charging --> NeedsCharging : powerOffConfirmed [noFault and battery <20%] / closeSessionAndRequeue()
Operational --> Faulty : faultDetected / blockAllocations; cutSupplyIfCharging; neverLockMovingVehicle
Available --> TransferHeld : planCommitted [battery >=80% and capacityHeld] / linkPlannedOrder()
TransferHeld --> Available : cancelCommitted [orderStillPlanned and noFault] / releaseOwnHolds()
TransferHeld --> InTransit : departureConfirmed [battery >=80% and orderStillPlanned] / freeSourceSlot()
TransferHeld --> Faulty : faultDetected / invalidateDeparture()
InTransit --> Available : arrivalCommitted [wholeOrderArrived and noFault and battery >=20%] / occupyTarget()
InTransit --> NeedsCharging : arrivalCommitted [wholeOrderArrived and noFault and battery <20%] / occupyTargetAndQueue()
InTransit --> Faulty : arrivalCommitted [wholeOrderArrived and fault] / occupyTargetAndOpenIncident()
Faulty --> Maintenance : recoveryConfirmed [safeStationaryLocation] / assignRepair()
Maintenance --> Available : repairAccepted [testPassed and noActiveTrip and battery >=20%] / reconcileHolds()
Maintenance --> NeedsCharging : repairAccepted [testPassed and noActiveTrip and battery <20%] / queueCharge()
Maintenance --> Retired : retireApproved [noTripOrTransferOrReservation and supplyOff] / archiveHistory()
Retired --> [*]
@enduml
```

```mermaid
stateDiagram-v2
  state "Operational Service" as Operational {
    state "Available" as Available
    state "Reserved" as Reserved
    state "In-Use" as InUse
    state "Needs Charging" as NeedsCharging
    state "Charging" as Charging
  }
  Available : entry / enableBookingIfUnheld()
  Available : do: receiveTelemetry()
  Reserved : entry / holdFor15Minutes()
  Reserved : exit / stopExpiryTimer()
  InUse : do: streamTripTelemetry()
  NeedsCharging : entry / disableBooking()
  NeedsCharging : do: waitForScheduler()
  Charging : do: monitorSupplyAndBattery()
  state "Held for Transfer" as TransferHeld
  TransferHeld : entry / excludeFromBooking()
  state "In-Transit" as InTransit
  InTransit : do: trackTransferManifest()
  state "Faulty" as Faulty
  Faulty : entry / blockNewAllocations()
  Faulty : do: preserveTripAndLocation()
  state "Under Maintenance" as Maintenance
  Maintenance : do: diagnoseAndRepair()
  state "Retired" as Retired
  Retired : entry / archiveVehicle()
  [*] --> Available
  Available --> Reserved : reserveCommitted [battery >=20% and no other hold] / linkReservation()
  Reserved --> Available : cancelCommitted [pickupNotClaimed] / releaseOwnHold()
  Reserved --> Available : expiryReached [now >= expiresAt and pickupNotClaimed] / releaseOwnHold()
  Reserved --> InUse : unlockConfirmed [pickupClaimed and matchingAck] / consumeReservationAndStartTrip()
  Reserved --> Faulty : unlockUncertain [threeAttemptsExhausted] / openIncidentAndReconcile()
  InUse --> Available : safeReturnConfirmed [noFault and battery >=20%] / closeTripAndOccupySlot()
  InUse --> NeedsCharging : safeReturnConfirmed [noFault and battery <20%] / closeTripAndQueueCharge()
  NeedsCharging --> Charging : powerOnConfirmed [plugSafe and portAllocated] / startSession()
  Charging --> Available : powerOffConfirmed [noFault and battery >=20%] / closeSession()
  Charging --> NeedsCharging : powerOffConfirmed [noFault and battery <20%] / closeSessionAndRequeue()
  Operational --> Faulty : faultDetected / blockAllocations; cutSupplyIfCharging; neverLockMovingVehicle
  Available --> TransferHeld : planCommitted [battery >=80% and capacityHeld] / linkPlannedOrder()
  TransferHeld --> Available : cancelCommitted [orderStillPlanned and noFault] / releaseOwnHolds()
  TransferHeld --> InTransit : departureConfirmed [battery >=80% and orderStillPlanned] / freeSourceSlot()
  TransferHeld --> Faulty : faultDetected / invalidateDeparture()
  InTransit --> Available : arrivalCommitted [wholeOrderArrived and noFault and battery >=20%] / occupyTarget()
  InTransit --> NeedsCharging : arrivalCommitted [wholeOrderArrived and noFault and battery <20%] / occupyTargetAndQueue()
  InTransit --> Faulty : arrivalCommitted [wholeOrderArrived and fault] / occupyTargetAndOpenIncident()
  Faulty --> Maintenance : recoveryConfirmed [safeStationaryLocation] / assignRepair()
  Maintenance --> Available : repairAccepted [testPassed and noActiveTrip and battery >=20%] / reconcileHolds()
  Maintenance --> NeedsCharging : repairAccepted [testPassed and noActiveTrip and battery <20%] / queueCharge()
  Maintenance --> Retired : retireApproved [noTripOrTransferOrReservation and supplyOff] / archiveHistory()
  Retired --> [*]
```

### Bảng đối chiếu nhãn trên hình

Nhãn ngắn chỉ là cách trình bày; dùng điều kiện đầy đủ bên phải khi triển khai hoặc kiểm tra nghiệp vụ. SoC là mức pin; healthy là không có fault; safe trong nhánh repair là testPassed. Mỗi dòng giữ nguyên ID transition trong Draw.io.

| ID | Nhãn trên hình | Hợp đồng đầy đủ |
|---|---|---|
| e0 | completion | `completion` |
| e1 | reserve [eligible]<br>/ hold vehicle | `reserveCommitted [battery >=20% and no other hold] / linkReservation()` |
| e2 | cancel [not claimed]<br>/ release hold | `cancelCommitted [pickupNotClaimed] / releaseOwnHold()` |
| e3 | expire [deadline reached]<br>/ release hold | `expiryReached [now >= expiresAt and pickupNotClaimed] / releaseOwnHold()` |
| e4 | unlock ACK [claimed]<br>/ start trip | `unlockConfirmed [pickupClaimed and matchingAck] / consumeReservationAndStartTrip()` |
| e5 | unlock uncertain [3 tries]<br>/ open incident | `unlockUncertain [threeAttemptsExhausted] / openIncidentAndReconcile()` |
| e6 | safe return [healthy, SoC >=20%]<br>/ close trip | `safeReturnConfirmed [noFault and battery >=20%] / closeTripAndOccupySlot()` |
| e7 | safe return<br>[healthy, SoC <20%]<br>/ queue charge | `safeReturnConfirmed [noFault and battery <20%] / closeTripAndQueueCharge()` |
| e8 | power ON ACK<br>[plug safe, allocated]<br>/ start session | `powerOnConfirmed [plugSafe and portAllocated] / startSession()` |
| e9 | power OFF ACK<br>[healthy, SoC >=20%]<br>/ close session | `powerOffConfirmed [noFault and battery >=20%] / closeSession()` |
| e10 | power OFF ACK<br>[healthy, SoC <20%]<br>/ requeue | `powerOffConfirmed [noFault and battery <20%] / closeSessionAndRequeue()` |
| e11 | fault detected<br>/ isolate safely | `faultDetected / blockAllocations; cutSupplyIfCharging; neverLockMovingVehicle` |
| e12 | plan [SoC >=80%, capacity held]<br>/ hold for transfer | `planCommitted [battery >=80% and capacityHeld] / linkPlannedOrder()` |
| e13 | cancel [still Planned, healthy]<br>/ release order holds | `cancelCommitted [orderStillPlanned and noFault] / releaseOwnHolds()` |
| e14 | depart [SoC >=80%, Planned]<br>/ free source slot | `departureConfirmed [battery >=80% and orderStillPlanned] / freeSourceSlot()` |
| e15 | fault detected<br>/ block departure | `faultDetected / invalidateDeparture()` |
| e16 | arrive [all arrived,<br>healthy, SoC >=20%]<br>/ occupy target | `arrivalCommitted [wholeOrderArrived and noFault and battery >=20%] / occupyTarget()` |
| e17 | arrive [all arrived,<br>healthy, SoC <20%]<br>/ queue charge | `arrivalCommitted [wholeOrderArrived and noFault and battery <20%] / occupyTargetAndQueue()` |
| e18 | arrive [all arrived, fault]<br>/ occupy target; report | `arrivalCommitted [wholeOrderArrived and fault] / occupyTargetAndOpenIncident()` |
| e19 | recover [safe location]<br>/ assign repair | `recoveryConfirmed [safeStationaryLocation] / assignRepair()` |
| e20 | repair accepted [safe,<br>no trip, SoC >=20%]<br>/ reconcile holds | `repairAccepted [testPassed and noActiveTrip and battery >=20%] / reconcileHolds()` |
| e21 | repair accepted [safe,<br>no trip, SoC <20%]<br>/ queue charge | `repairAccepted [testPassed and noActiveTrip and battery <20%] / queueCharge()` |
| e22 | retire [no active obligations,<br>power off] / archive | `retireApproved [noTripOrTransferOrReservation and supplyOff] / archiveHistory()` |
| e23 | completion | `completion` |

## SC02 — Charging Point Lifecycle

[Draw.io](SC02-Charging_Point_State_Machine.drawio) · [SVG editable](SC02-Charging_Point_State_Machine.drawio.svg) · [PNG](SC02-Charging_Point_State_Machine.png)

```plantuml
@startuml
title Charging Point Lifecycle
state "Power Station Service" as Service {
  state "Idle / Available" as Idle
  state "Reserved" as Reserved
  state "Starting" as Starting
  state "Charging" as Charging
  state "Stopping" as Stopping
  state "Stopped / Awaiting Unplug" as Complete
}
Idle : do: awaitAllocation()
Reserved : entry / holdPortAndPower()
Starting : entry / sendPowerOn()
Starting : do: awaitMatchingAck()
Charging : do: monitorEnergyAndSafety()
Stopping : entry / sendPowerOff()
Stopping : do: retrySameIDUpTo3Times()
Complete : entry / closeByReasonAndFreePower()
Complete : do: keepParkingOccupied()
state "Fault / Isolated" as Fault
Fault : entry / emergencyCutAndQuarantine()
Fault : do: reconcileSessionAndAllocation()
state "Under Repair" as Repair
Repair : do: diagnoseAndRepair()
state "Retired" as Retired
Retired : entry / archivePort()
[*] --> Idle
Idle --> Reserved : allocate [compatible and budgetAvailable] / claimPortAndPower()
Reserved --> Idle : cancelOrExpire [notEnergized] / releaseOwnAllocation()
Reserved --> Starting : plugConfirmed [ownerValid and electricalSafe] / sendStartCommand()
Starting --> Charging : powerOnConfirmed [matchingAck] / activateSession()
Starting --> Fault : startTimeout / openIncident()
Charging --> Stopping : stopRequested [ownerValid] / recordUserStopReason()
Charging --> Stopping : targetReached / recordCompletedReason()
Charging --> Stopping : priorityYield [battery >=80% and urgentQueue] / recordSchedulerStopReason()
Stopping --> Complete : powerOffConfirmed [matchingAck] / persistSessionOutcome()
Stopping --> Fault : stopTimeout [threeAttemptsExhausted] / doNotReportSuccess()
Complete --> Idle : unplugConfirmed [noFault] / releaseConnector()
Service --> Fault : electricalFault / cutSupplyAndOpenIncident()
Fault --> Repair : repairAssigned [powerOffConfirmed] / interruptSessionAndRequeueTechnicalFault()
Repair --> Idle : repairAccepted [testPassed and unplugged] / requeueTechnicalInterruptions()
Repair --> Fault : safetyTestFailed / keepQuarantined()
Repair --> Retired : retireApproved [supplyOff and noAllocation] / archiveHistory()
Retired --> [*]
@enduml
```

```mermaid
stateDiagram-v2
  state "Power Station Service" as Service {
    state "Idle / Available" as Idle
    state "Reserved" as Reserved
    state "Starting" as Starting
    state "Charging" as Charging
    state "Stopping" as Stopping
    state "Stopped / Awaiting Unplug" as Complete
  }
  Idle : do: awaitAllocation()
  Reserved : entry / holdPortAndPower()
  Starting : entry / sendPowerOn()
  Starting : do: awaitMatchingAck()
  Charging : do: monitorEnergyAndSafety()
  Stopping : entry / sendPowerOff()
  Stopping : do: retrySameIDUpTo3Times()
  Complete : entry / closeByReasonAndFreePower()
  Complete : do: keepParkingOccupied()
  state "Fault / Isolated" as Fault
  Fault : entry / emergencyCutAndQuarantine()
  Fault : do: reconcileSessionAndAllocation()
  state "Under Repair" as Repair
  Repair : do: diagnoseAndRepair()
  state "Retired" as Retired
  Retired : entry / archivePort()
  [*] --> Idle
  Idle --> Reserved : allocate [compatible and budgetAvailable] / claimPortAndPower()
  Reserved --> Idle : cancelOrExpire [notEnergized] / releaseOwnAllocation()
  Reserved --> Starting : plugConfirmed [ownerValid and electricalSafe] / sendStartCommand()
  Starting --> Charging : powerOnConfirmed [matchingAck] / activateSession()
  Starting --> Fault : startTimeout / openIncident()
  Charging --> Stopping : stopRequested [ownerValid] / recordUserStopReason()
  Charging --> Stopping : targetReached / recordCompletedReason()
  Charging --> Stopping : priorityYield [battery >=80% and urgentQueue] / recordSchedulerStopReason()
  Stopping --> Complete : powerOffConfirmed [matchingAck] / persistSessionOutcome()
  Stopping --> Fault : stopTimeout [threeAttemptsExhausted] / doNotReportSuccess()
  Complete --> Idle : unplugConfirmed [noFault] / releaseConnector()
  Service --> Fault : electricalFault / cutSupplyAndOpenIncident()
  Fault --> Repair : repairAssigned [powerOffConfirmed] / interruptSessionAndRequeueTechnicalFault()
  Repair --> Idle : repairAccepted [testPassed and unplugged] / requeueTechnicalInterruptions()
  Repair --> Fault : safetyTestFailed / keepQuarantined()
  Repair --> Retired : retireApproved [supplyOff and noAllocation] / archiveHistory()
  Retired --> [*]
```

### Bảng đối chiếu nhãn trên hình

Nhãn ngắn chỉ là cách trình bày; dùng điều kiện đầy đủ bên phải khi triển khai hoặc kiểm tra nghiệp vụ. SoC là mức pin; healthy là không có fault; safe trong nhánh repair là testPassed. Mỗi dòng giữ nguyên ID transition trong Draw.io.

| ID | Nhãn trên hình | Hợp đồng đầy đủ |
|---|---|---|
| e0 | completion | `completion` |
| e1 | allocate [compatible, budget]<br>/ reserve port and power | `allocate [compatible and budgetAvailable] / claimPortAndPower()` |
| e2 | cancel or expire [power off]<br>/ release allocation | `cancelOrExpire [notEnergized] / releaseOwnAllocation()` |
| e3 | plug confirmed [authorized, safe]<br>/ send power ON | `plugConfirmed [ownerValid and electricalSafe] / sendStartCommand()` |
| e4 | power ON ACK<br>/ activate session | `powerOnConfirmed [matchingAck] / activateSession()` |
| e5 | start timeout<br>/ open incident | `startTimeout / openIncident()` |
| e6 | stop [authorized]<br>/ record user reason | `stopRequested [ownerValid] / recordUserStopReason()` |
| e7 | target reached<br>/ record completion | `targetReached / recordCompletedReason()` |
| e8 | yield [SoC >=80%, urgent queue]<br>/ record scheduler reason | `priorityYield [battery >=80% and urgentQueue] / recordSchedulerStopReason()` |
| e9 | power OFF ACK<br>/ persist stop outcome | `powerOffConfirmed [matchingAck] / persistSessionOutcome()` |
| e10 | stop timeout [3 tries]<br>/ quarantine; no success | `stopTimeout [threeAttemptsExhausted] / doNotReportSuccess()` |
| e11 | unplug [no fault]<br>/ release connector | `unplugConfirmed [noFault] / releaseConnector()` |
| e12 | electrical fault<br>/ cut supply; isolate | `electricalFault / cutSupplyAndOpenIncident()` |
| e13 | assign repair [power off ACK]<br>/ interrupt and requeue | `repairAssigned [powerOffConfirmed] / interruptSessionAndRequeueTechnicalFault()` |
| e14 | repair accepted<br>[test passed, unplugged]<br>/ requeue interrupted requests | `repairAccepted [testPassed and unplugged] / requeueTechnicalInterruptions()` |
| e15 | safety test failed<br>/ keep isolated | `safetyTestFailed / keepQuarantined()` |
| e16 | retire [power off, no allocation]<br>/ archive | `retireApproved [supplyOff and noAllocation] / archiveHistory()` |
| e17 | completion | `completion` |

## SC03 — Reservation and Trip Lifecycle

[Draw.io](SC03-Reservation_and_Trip_State_Machine.drawio) · [SVG editable](SC03-Reservation_and_Trip_State_Machine.drawio.svg) · [PNG](SC03-Reservation_and_Trip_State_Machine.png)

```plantuml
@startuml
title Reservation and Trip Lifecycle
state "Active Trip" as Active {
  state "In-Use" as Riding
  state "Incident Reported" as Reported
}
state "Reserved" as Reserved
Reserved : entry / holdVehicleUntilExpiresAt()
Reserved : do: awaitPickupOrExpiry()
state "Pickup Claimed" as Unlocking
Unlocking : entry / suspendExpiryRelease()
Unlocking : do: retryUnlockSameIDUpTo3Times()
Riding : do: recordDurationAndDistance()
Reported : entry / notifyOperatorAfterCommit()
Reported : do: preserveActiveTrip()
state "Pickup Uncertain" as Reconciliation
Reconciliation : entry / blockAllocation()
Reconciliation : do: reconcileLockAndLocation()
state "Completed" as Completed
Completed : entry / saveReturnSummary()
Completed : do: retainHistoryWithoutPayment()
state "Cancelled" as Cancelled
Cancelled : entry / releaseOwnVehicleHold()
state "Expired" as Expired
Expired : entry / releaseOwnVehicleHold()
[*] --> Reserved
Reserved --> Unlocking : pickupClaimed [ownerAndHubValid and now < expiresAt] / serializeWithExpiry()
Reserved --> Cancelled : cancelCommitted [notPickupClaimed] / cancelReservation()
Reserved --> Expired : expiryReached [now >= expiresAt and notPickupClaimed] / expireReservation()
Unlocking --> Riding : unlockConfirmed [matchingAck] / consumeReservationAndStartTrip()
Unlocking --> Reconciliation : unlockTimeout [threeAttemptsExhausted] / openIncident()
Reconciliation --> Cancelled : lockedAtSourceConfirmed [noTripStarted] / releaseOnlyAfterReconciliation()
Reconciliation --> Riding : unlockedPickupConfirmed [samePickupAndVehicle] / recoverOriginalTripStart()
Riding --> Reported : incidentSubmitted [ownerValid] / saveIncidentIdempotently()
Active --> Completed : safeReturnConfirmed [vehicleID and usableSlot and lockConfirmed] / closeTripAndOccupySlot()
Completed --> [*]
Cancelled --> [*]
Expired --> [*]
@enduml
```

```mermaid
stateDiagram-v2
  state "Active Trip" as Active {
    state "In-Use" as Riding
    state "Incident Reported" as Reported
  }
  state "Reserved" as Reserved
  Reserved : entry / holdVehicleUntilExpiresAt()
  Reserved : do: awaitPickupOrExpiry()
  state "Pickup Claimed" as Unlocking
  Unlocking : entry / suspendExpiryRelease()
  Unlocking : do: retryUnlockSameIDUpTo3Times()
  Riding : do: recordDurationAndDistance()
  Reported : entry / notifyOperatorAfterCommit()
  Reported : do: preserveActiveTrip()
  state "Pickup Uncertain" as Reconciliation
  Reconciliation : entry / blockAllocation()
  Reconciliation : do: reconcileLockAndLocation()
  state "Completed" as Completed
  Completed : entry / saveReturnSummary()
  Completed : do: retainHistoryWithoutPayment()
  state "Cancelled" as Cancelled
  Cancelled : entry / releaseOwnVehicleHold()
  state "Expired" as Expired
  Expired : entry / releaseOwnVehicleHold()
  [*] --> Reserved
  Reserved --> Unlocking : pickupClaimed [ownerAndHubValid and now < expiresAt] / serializeWithExpiry()
  Reserved --> Cancelled : cancelCommitted [notPickupClaimed] / cancelReservation()
  Reserved --> Expired : expiryReached [now >= expiresAt and notPickupClaimed] / expireReservation()
  Unlocking --> Riding : unlockConfirmed [matchingAck] / consumeReservationAndStartTrip()
  Unlocking --> Reconciliation : unlockTimeout [threeAttemptsExhausted] / openIncident()
  Reconciliation --> Cancelled : lockedAtSourceConfirmed [noTripStarted] / releaseOnlyAfterReconciliation()
  Reconciliation --> Riding : unlockedPickupConfirmed [samePickupAndVehicle] / recoverOriginalTripStart()
  Riding --> Reported : incidentSubmitted [ownerValid] / saveIncidentIdempotently()
  Active --> Completed : safeReturnConfirmed [vehicleID and usableSlot and lockConfirmed] / closeTripAndOccupySlot()
  Completed --> [*]
  Cancelled --> [*]
  Expired --> [*]
```

### Bảng đối chiếu nhãn trên hình

Nhãn ngắn chỉ là cách trình bày; dùng điều kiện đầy đủ bên phải khi triển khai hoặc kiểm tra nghiệp vụ. SoC là mức pin; healthy là không có fault; safe trong nhánh repair là testPassed. Mỗi dòng giữ nguyên ID transition trong Draw.io.

| ID | Nhãn trên hình | Hợp đồng đầy đủ |
|---|---|---|
| e0 | completion | `completion` |
| e1 | claim pickup [owner, Hub, in time]<br>/ serialize with expiry | `pickupClaimed [ownerAndHubValid and now < expiresAt] / serializeWithExpiry()` |
| e2 | cancel [not claimed]<br>/ cancel reservation | `cancelCommitted [notPickupClaimed] / cancelReservation()` |
| e3 | expire [deadline reached, not claimed]<br>/ expire reservation | `expiryReached [now >= expiresAt and notPickupClaimed] / expireReservation()` |
| e4 | unlock ACK<br>/ consume ticket; start trip | `unlockConfirmed [matchingAck] / consumeReservationAndStartTrip()` |
| e5 | unlock timeout [3 tries]<br>/ open incident | `unlockTimeout [threeAttemptsExhausted] / openIncident()` |
| e6 | locked at source [no trip]<br>/ release hold | `lockedAtSourceConfirmed [noTripStarted] / releaseOnlyAfterReconciliation()` |
| e7 | pickup confirmed [same pickup and vehicle]<br>/ recover original start | `unlockedPickupConfirmed [samePickupAndVehicle] / recoverOriginalTripStart()` |
| e8 | report incident [authorized]<br>/ save once; notify | `incidentSubmitted [ownerValid] / saveIncidentIdempotently()` |
| e9 | safe return [vehicle, slot, lock verified]<br>/ close trip; occupy slot | `safeReturnConfirmed [vehicleID and usableSlot and lockConfirmed] / closeTripAndOccupySlot()` |
| e10 | completion | `completion` |
| e11 | completion | `completion` |
| e12 | completion | `completion` |
