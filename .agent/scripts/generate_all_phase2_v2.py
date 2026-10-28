import os
import sys

sys.path.append(os.path.dirname(__file__))
from phase2_builder_v2 import (
    build_sequence_diagram_v2,
    build_activity_diagram_swimlanes,
    build_statechart_diagram_v2
)

BASE_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", ".."))
SEQ_DIR = os.path.join(BASE_DIR, "01_Diagram", "02_Sequence_Diagram")
ACT_DIR = os.path.join(BASE_DIR, "01_Diagram", "03_Activity_Diagram")
STA_DIR = os.path.join(BASE_DIR, "01_Diagram", "04_Statechart_Diagram")

os.makedirs(SEQ_DIR, exist_ok=True)
os.makedirs(ACT_DIR, exist_ok=True)
os.makedirs(STA_DIR, exist_ok=True)

print("Starting generation of Phase 2 diagrams according to Slide CO3001 rules...")

# ==============================================================================
# 1. SEQUENCE DIAGRAMS (SQ01 to SQ07) - Chuẩn Slide Ch6 p.21-26, 40, 50
# ==============================================================================

# SQ01: Reserve Vehicle (UC03)
build_sequence_diagram_v2(
    filepath=os.path.join(SEQ_DIR, "SQ01-Reserve_Vehicle.drawio.svg"),
    title="Sequence Diagram: SQ01 - Reserve Vehicle (UC03)",
    participants=[
        {'name': ':Student', 'type': 'actor'},
        {'name': ':MobileApp', 'type': 'boundary'},
        {'name': ':ReservationController', 'type': 'controller'},
        {'name': ':VehicleService', 'type': 'service'},
        {'name': '<<datastore>>\n:Database', 'type': 'datastore'},
    ],
    messages=[
        {'src': 0, 'dst': 1, 'num': '1:', 'text': 'selectVehicle(vehicleId)', 'is_resp': False},
        {'src': 1, 'dst': 2, 'num': '1.1:', 'text': 'requestReservation(userId, vehicleId)', 'is_resp': False},
        {'src': 2, 'dst': 3, 'num': '1.1.1:', 'text': 'checkAvailabilityAndLock(vehicleId)', 'is_resp': False},
        {'src': 3, 'dst': 3, 'num': '1.1.2:', 'text': 'validateBatteryLevel()', 'is_self': True},
        {'src': 3, 'dst': 4, 'num': '1.1.3:', 'text': 'saveReservation(userId, vehicleId, 15_MIN)', 'guard': '[Available & Pin >= 20%]', 'is_resp': False},
        {'src': 4, 'dst': 3, 'num': '1.1.4:', 'text': 'reservationSaved(resId, qrCode)', 'is_resp': True},
        {'src': 3, 'dst': 2, 'num': '1.1.5:', 'text': 'return reservationSuccess(ticket)', 'is_resp': True},
        {'src': 2, 'dst': 1, 'num': '1.2:', 'text': 'displayReservationTicket(timer 15:00)', 'is_resp': True},
        {'src': 1, 'dst': 0, 'num': '1.3:', 'text': 'showActiveTicketScreen()', 'is_resp': True},
    ],
    alt_boxes=[
        {
            'y': 280, 'h': 240,
            'cond_true': "Xe còn trống & Mức pin >= 20%",
            'cond_false': "Xe đã được giữ / Hết xe / Pin < 20%",
            'mid_y': 440
        }
    ]
)

# SQ02: Pick Up Vehicle (UC04)
build_sequence_diagram_v2(
    filepath=os.path.join(SEQ_DIR, "SQ02-Pick_Up_Vehicle.drawio.svg"),
    title="Sequence Diagram: SQ02 - Pick Up Vehicle (UC04)",
    participants=[
        {'name': ':Student', 'type': 'actor'},
        {'name': ':MobileApp', 'type': 'boundary'},
        {'name': ':PickupController', 'type': 'controller'},
        {'name': ':IoTStation', 'type': 'service'},
        {'name': '<<datastore>>\n:Database', 'type': 'datastore'},
    ],
    messages=[
        {'src': 0, 'dst': 1, 'num': '1:', 'text': 'scanQRCode(qrData) / enterCode()', 'is_resp': False},
        {'src': 1, 'dst': 2, 'num': '1.1:', 'text': 'validatePickup(userId, vehicleId)', 'is_resp': False},
        {'src': 2, 'dst': 4, 'num': '1.1.1:', 'text': 'verifyReservationTicket(userId, vehicleId)', 'is_resp': False},
        {'src': 4, 'dst': 2, 'num': '1.1.2:', 'text': 'ticketStatus(VALID, within 15 mins)', 'is_resp': True},
        {'src': 2, 'dst': 3, 'num': '1.1.3:', 'text': 'sendUnlockCommand(slotId, vehicleId)', 'guard': '[Hợp lệ]', 'is_resp': False},
        {'src': 3, 'dst': 2, 'num': '1.1.4:', 'text': 'unlockConfirmed(electronicPinReleased)', 'is_resp': True},
        {'src': 2, 'dst': 4, 'num': '1.1.5:', 'text': 'updateVehicleStatus(IN_USE) & startTrip()', 'is_resp': False},
        {'src': 4, 'dst': 2, 'num': '1.1.6:', 'text': 'tripStarted(tripId, startTime)', 'is_resp': True},
        {'src': 2, 'dst': 1, 'num': '1.2:', 'text': 'return pickupSuccess(tripId)', 'is_resp': True},
        {'src': 1, 'dst': 0, 'num': '1.3:', 'text': 'displayActiveTripScreen(liveTimer)', 'is_resp': True},
    ],
    alt_boxes=[
        {
            'y': 310, 'h': 270,
            'cond_true': "Phiếu hợp lệ & Khớp vị trí trạm Hub",
            'cond_false': "Sai mã PIN hoặc Quá hạn 15 phút (Expired)",
            'mid_y': 490
        }
    ]
)

# SQ03: Return Vehicle (UC05)
build_sequence_diagram_v2(
    filepath=os.path.join(SEQ_DIR, "SQ03-Return_Vehicle.drawio.svg"),
    title="Sequence Diagram: SQ03 - Return Vehicle (UC05)",
    participants=[
        {'name': ':Student', 'type': 'actor'},
        {'name': ':MobileApp', 'type': 'boundary'},
        {'name': ':ReturnController', 'type': 'controller'},
        {'name': ':TripService', 'type': 'service'},
        {'name': ':IoTStation', 'type': 'service'},
        {'name': '<<datastore>>\n:Database', 'type': 'datastore'},
    ],
    messages=[
        {'src': 0, 'dst': 4, 'num': '1:', 'text': 'dockVehicleIntoSlot(slotId)', 'is_resp': False},
        {'src': 4, 'dst': 3, 'num': '1.1:', 'text': 'notifyPhysicalDocked(slotId, vehicleId, batteryLevel)', 'is_resp': False},
        {'src': 0, 'dst': 1, 'num': '2:', 'text': 'confirmReturnClicked()', 'is_resp': False},
        {'src': 1, 'dst': 2, 'num': '2.1:', 'text': 'processReturn(tripId, destHubId, slotId)', 'is_resp': False},
        {'src': 2, 'dst': 4, 'num': '2.1.1:', 'text': 'verifyLockerStatus(slotId)', 'is_resp': False},
        {'src': 4, 'dst': 2, 'num': '2.1.2:', 'text': 'lockConfirmed(pinLocked = TRUE)', 'is_resp': True},
        {'src': 2, 'dst': 3, 'num': '2.1.3:', 'text': 'calculateFareAndSettle(tripId, finalBattery)', 'is_resp': False},
        {'src': 3, 'dst': 5, 'num': '2.1.4:', 'text': 'closeTripRecord(endTime, fare, finalBattery)', 'is_resp': False},
        {'src': 5, 'dst': 3, 'num': '2.1.5:', 'text': 'tripClosedSuccess()', 'is_resp': True},
        {'src': 3, 'dst': 5, 'num': '2.1.6:', 'text': 'updateVehicleStatus(Available / Needs_Charging)', 'is_resp': False},
        {'src': 3, 'dst': 2, 'num': '2.1.7:', 'text': 'return receiptData(fare, duration, distance)', 'is_resp': True},
        {'src': 2, 'dst': 1, 'num': '2.2:', 'text': 'return returnSummary(receiptData)', 'is_resp': True},
        {'src': 1, 'dst': 0, 'num': '2.3:', 'text': 'displayInvoiceAndCompleteTrip()', 'is_resp': True},
    ]
)

# SQ04: Request Charging (UC07)
build_sequence_diagram_v2(
    filepath=os.path.join(SEQ_DIR, "SQ04-Request_Charging.drawio.svg"),
    title="Sequence Diagram: SQ04 - Request Charging (UC07)",
    participants=[
        {'name': ':Student', 'type': 'actor'},
        {'name': ':MobileApp', 'type': 'boundary'},
        {'name': ':ChargingController', 'type': 'controller'},
        {'name': ':ChargingService', 'type': 'service'},
        {'name': ':PowerHubIoT', 'type': 'service'},
        {'name': '<<datastore>>\n:Database', 'type': 'datastore'},
    ],
    messages=[
        {'src': 0, 'dst': 1, 'num': '1:', 'text': 'submitChargingRequest(hubId, currBattery, targetBattery, pickupTime)', 'is_resp': False},
        {'src': 1, 'dst': 2, 'num': '1.1:', 'text': 'scheduleChargingSession(userId, hubId, params)', 'is_resp': False},
        {'src': 2, 'dst': 3, 'num': '1.1.1:', 'text': 'evaluatePortAvailability(hubId)', 'is_resp': False},
        {'src': 3, 'dst': 2, 'num': '1.1.2:', 'text': 'portAssigned(portId, maxKW = 7.4)', 'is_resp': True},
        {'src': 2, 'dst': 5, 'num': '1.1.3:', 'text': 'createChargingSessionRecord(userId, portId, params)', 'is_resp': False},
        {'src': 5, 'dst': 2, 'num': '1.1.4:', 'text': 'sessionSaved(sessionId)', 'is_resp': True},
        {'src': 2, 'dst': 4, 'num': '1.1.5:', 'text': 'activatePowerRelay(portId)', 'is_resp': False},
        {'src': 4, 'dst': 2, 'num': '1.1.6:', 'text': 'relayActive(currentFlowing = TRUE)', 'is_resp': True},
        {'src': 2, 'dst': 1, 'num': '1.2:', 'text': 'return chargingConfirmed(portId, sessionId)', 'is_resp': True},
        {'src': 1, 'dst': 0, 'num': '1.3:', 'text': 'displayPlugInInstructions(portId, estimatedFull)', 'is_resp': True},
    ]
)

# SQ05: Redistribute Vehicles (UC10)
build_sequence_diagram_v2(
    filepath=os.path.join(SEQ_DIR, "SQ05-Redistribute_Vehicles.drawio.svg"),
    title="Sequence Diagram: SQ05 - Redistribute Vehicles (UC10)",
    participants=[
        {'name': ':Operator', 'type': 'actor'},
        {'name': ':WebDashboard', 'type': 'boundary'},
        {'name': ':DispatchController', 'type': 'controller'},
        {'name': ':RebalanceService', 'type': 'service'},
        {'name': '<<datastore>>\n:Database', 'type': 'datastore'},
        {'name': ':FieldDriverApp', 'type': 'boundary'},
    ],
    messages=[
        {'src': 0, 'dst': 1, 'num': '1:', 'text': 'createTransferOrder(srcHub, dstHub, qty=20)', 'is_resp': False},
        {'src': 1, 'dst': 2, 'num': '1.1:', 'text': 'validateAndPlanTransfer(srcHub, dstHub, qty)', 'is_resp': False},
        {'src': 2, 'dst': 3, 'num': '1.1.1:', 'text': 'queryEligibleVehicles(srcHub, minBattery=80%)', 'is_resp': False},
        {'src': 3, 'dst': 4, 'num': '1.1.2:', 'text': 'getAvailableVehicles(srcHub, battery >= 80%)', 'is_resp': False},
        {'src': 4, 'dst': 3, 'num': '1.1.3:', 'text': 'return vehicleList(qty = 20)', 'is_resp': True},
        {'src': 3, 'dst': 4, 'num': '1.1.4:', 'text': 'checkDestinationCapacity(dstHub)', 'is_resp': False},
        {'src': 4, 'dst': 3, 'num': '1.1.5:', 'text': 'return freeDocks(docks >= 20)', 'is_resp': True},
        {'src': 3, 'dst': 4, 'num': '1.1.6:', 'text': 'lockVehiclesToStatus(IN_TRANSIT, vehicleIds)', 'is_resp': False},
        {'src': 4, 'dst': 3, 'num': '1.1.7:', 'text': 'lockedSuccess()', 'is_resp': True},
        {'src': 3, 'dst': 5, 'num': '1.1.8:', 'text': 'dispatchOrderToDriver(orderId, route, vehicleIds)', 'is_resp': False},
        {'src': 5, 'dst': 3, 'num': '1.1.9:', 'text': 'driverAcknowledge(accepted = TRUE)', 'is_resp': True},
        {'src': 3, 'dst': 2, 'num': '1.1.10:', 'text': 'orderCreatedSuccess(orderId)', 'is_resp': True},
        {'src': 2, 'dst': 1, 'num': '1.2:', 'text': 'return transferManifest(orderId, ETA)', 'is_resp': True},
        {'src': 1, 'dst': 0, 'num': '1.3:', 'text': 'displayLiveTransferTracking()', 'is_resp': True},
    ]
)

# SQ06: Handle Operational Incident (UC11)
build_sequence_diagram_v2(
    filepath=os.path.join(SEQ_DIR, "SQ06-Handle_Operational_Incident.drawio.svg"),
    title="Sequence Diagram: SQ06 - Handle Operational Incident (UC11)",
    participants=[
        {'name': ':Operator', 'type': 'actor'},
        {'name': ':WebDashboard', 'type': 'boundary'},
        {'name': ':IncidentController', 'type': 'controller'},
        {'name': ':IoTStation', 'type': 'service'},
        {'name': '<<datastore>>\n:Database', 'type': 'datastore'},
    ],
    messages=[
        {'src': 0, 'dst': 1, 'num': '1:', 'text': 'selectIncident(incidentId)', 'is_resp': False},
        {'src': 1, 'dst': 2, 'num': '1.1:', 'text': 'getIncidentDetails(incidentId)', 'is_resp': False},
        {'src': 2, 'dst': 4, 'num': '1.1.1:', 'text': 'queryTelemetryLog(incidentId)', 'is_resp': False},
        {'src': 4, 'dst': 2, 'num': '1.1.2:', 'text': 'incidentData(faultyPortId, severity=CRITICAL)', 'is_resp': True},
        {'src': 2, 'dst': 1, 'num': '1.2:', 'text': 'displayImpactReport(nearbyHubs, affectedUsers)', 'is_resp': True},
        {'src': 0, 'dst': 1, 'num': '2:', 'text': 'confirmIsolateAndMaintenance()', 'is_resp': False},
        {'src': 1, 'dst': 2, 'num': '2.1:', 'text': 'executeIsolation(faultyPortId)', 'is_resp': False},
        {'src': 2, 'dst': 3, 'num': '2.1.1:', 'text': 'sendEmergencyPowerCut(faultyPortId)', 'is_resp': False},
        {'src': 3, 'dst': 2, 'num': '2.1.2:', 'text': 'powerCutConfirmed(relayOpened = TRUE)', 'is_resp': True},
        {'src': 2, 'dst': 4, 'num': '2.1.3:', 'text': 'updateStatus(OUT_OF_ORDER) & createTicket()', 'is_resp': False},
        {'src': 4, 'dst': 2, 'num': '2.1.4:', 'text': 'ticketCreated(ticketId, techAssigned)', 'is_resp': True},
        {'src': 2, 'dst': 1, 'num': '2.2:', 'text': 'return isolationSuccess(ticketId)', 'is_resp': True},
        {'src': 1, 'dst': 0, 'num': '2.3:', 'text': 'displayIncidentResolvedNotification()', 'is_resp': True},
    ]
)

# SQ07: Run What-if Simulation (UC13 & UC14)
build_sequence_diagram_v2(
    filepath=os.path.join(SEQ_DIR, "SQ07-Run_What_if_Simulation.drawio.svg"),
    title="Sequence Diagram: SQ07 - Run What-if Simulation (UC13 & UC14)",
    participants=[
        {'name': ':Operator', 'type': 'actor'},
        {'name': ':WebDashboard', 'type': 'boundary'},
        {'name': ':SimulationController', 'type': 'controller'},
        {'name': ':WhatIfEngine', 'type': 'service'},
        {'name': '<<datastore>>\n:NetworkCache', 'type': 'datastore'},
    ],
    messages=[
        {'src': 0, 'dst': 1, 'num': '1:', 'text': 'selectScenario(PEAK_METRO_SURGE, +300%)', 'is_resp': False},
        {'src': 1, 'dst': 2, 'num': '1.1:', 'text': 'runSimulation(scenarioId, params, duration=120m)', 'is_resp': False},
        {'src': 2, 'dst': 3, 'num': '1.1.1:', 'text': 'initializeSandbox(params)', 'is_resp': False},
        {'src': 3, 'dst': 4, 'num': '1.1.2:', 'text': 'getNetworkTopologySnapshot()', 'is_resp': False},
        {'src': 4, 'dst': 3, 'num': '1.1.3:', 'text': 'snapshotData(10_Hubs, 1000_Vehicles, 200_Ports)', 'is_resp': True},
        {'src': 3, 'dst': 3, 'num': '1.1.4:', 'text': 'executeDiscreteEventLoop(timeline)', 'is_self': True},
        {'src': 3, 'dst': 3, 'num': '1.1.5:', 'text': 'evaluateBottlenecksAndWaitTimes()', 'is_self': True},
        {'src': 3, 'dst': 2, 'num': '1.1.6:', 'text': 'return simulationResults(kpis, recommendations)', 'is_resp': True},
        {'src': 2, 'dst': 1, 'num': '1.2:', 'text': 'return simulationResults(kpis, recommendations)', 'is_resp': True},
        {'src': 1, 'dst': 0, 'num': '1.3:', 'text': 'displayComparativeDashboard(UC14)', 'is_resp': True},
        {'src': 0, 'dst': 1, 'num': '2:', 'text': 'applyRecommendationClicked(rebalanceOrder)', 'is_resp': False},
        {'src': 1, 'dst': 2, 'num': '2.1:', 'text': 'dispatchAutomatedRebalance(rebalanceOrder)', 'is_resp': False},
        {'src': 2, 'dst': 1, 'num': '2.2:', 'text': 'return dispatchSuccess()', 'is_resp': True},
        {'src': 1, 'dst': 0, 'num': '2.3:', 'text': 'showExecutionConfirmation()', 'is_resp': True},
    ]
)

print("All 7 Sequence diagrams generated successfully.")


# ==============================================================================
# 2. ACTIVITY DIAGRAMS (AD01 to AD07) - Chuẩn Slide Ch6 p.12-13, 39, 51, 52 (Swimlanes & Object Flow)
# ==============================================================================

# AD01: Reserve Vehicle Workflow
build_activity_diagram_swimlanes(
    filepath=os.path.join(ACT_DIR, "AD01-Reserve_Vehicle.drawio.svg"),
    title="Activity Diagram: AD01 - Reserve Vehicle Workflow (Swimlanes)",
    swimlanes=["Sinh viên (Student)", "Mobile App", "Backend Service", "Database"],
    nodes=[
        {'id': 'start', 'lane': 0, 'type': 'start', 'y': 80, 'w': 28, 'h': 28},
        {'id': 'act1', 'lane': 0, 'type': 'action', 'text': 'Mở ứng dụng &\nChọn Hub đến', 'y': 140, 'w': 140, 'h': 50},
        {'id': 'act2', 'lane': 1, 'type': 'action', 'text': 'Hiển thị danh sách\nxe & mức pin %', 'y': 140, 'w': 140, 'h': 50},
        {'id': 'act3', 'lane': 0, 'type': 'action', 'text': 'Chọn xe & Bấm\nĐặt giữ xe (15p)', 'y': 220, 'w': 140, 'h': 50},
        {'id': 'act4', 'lane': 2, 'type': 'action', 'text': 'Kiểm tra trạng thái\nxe & dung lượng pin', 'y': 220, 'w': 140, 'h': 50},
        {'id': 'dec1', 'lane': 2, 'type': 'decision', 'text': 'Còn trống &\nPin >= 20%?', 'y': 300, 'w': 130, 'h': 65},
        {'id': 'act5', 'lane': 2, 'type': 'action', 'text': 'Khóa xe Reserved &\nTạo mã giữ xe', 'y': 390, 'w': 140, 'h': 50},
        {'id': 'obj1', 'lane': 3, 'type': 'object', 'text': ':ReservationTicket\n[Status = ACTIVE]', 'y': 390, 'w': 130, 'h': 50},
        {'id': 'act6', 'lane': 1, 'type': 'action', 'text': 'Hiển thị vé điện tử\nkèm đếm ngược 15:00', 'y': 470, 'w': 140, 'h': 50},
        {'id': 'end1', 'lane': 1, 'type': 'end', 'y': 550, 'w': 28, 'h': 28},
        {'id': 'act_err', 'lane': 1, 'type': 'action', 'text': 'Báo lỗi & Gợi ý\nphương tiện khác', 'y': 305, 'w': 140, 'h': 50},
    ],
    edges=[
        {'src': 'start', 'dst': 'act1'},
        {'src': 'act1', 'dst': 'act2'},
        {'src': 'act2', 'dst': 'act3'},
        {'src': 'act3', 'dst': 'act4'},
        {'src': 'act4', 'dst': 'dec1'},
        {'src': 'dec1', 'dst': 'act5', 'label': '[Hợp lệ]'},
        {'src': 'dec1', 'dst': 'act_err', 'label': '[Hết / Pin yếu]'},
        {'src': 'act_err', 'dst': 'act1'},
        {'src': 'act5', 'dst': 'obj1', 'is_object_flow': True},
        {'src': 'act5', 'dst': 'act6'},
        {'src': 'act6', 'dst': 'end1'},
    ]
)

# AD02: Pick Up Vehicle Workflow
build_activity_diagram_swimlanes(
    filepath=os.path.join(ACT_DIR, "AD02-Pick_Up_Vehicle.drawio.svg"),
    title="Activity Diagram: AD02 - Pick Up Vehicle Workflow (Swimlanes)",
    swimlanes=["Sinh viên (Student)", "Mobile App", "Backend Service", "Trạm IoT (Station)"],
    nodes=[
        {'id': 'start', 'lane': 0, 'type': 'start', 'y': 80, 'w': 28, 'h': 28},
        {'id': 'act1', 'lane': 0, 'type': 'action', 'text': 'Đến Hub & Mở màn\nhình Nhận xe', 'y': 140, 'w': 140, 'h': 50},
        {'id': 'act2', 'lane': 0, 'type': 'action', 'text': 'Quét QR trên thân\nhoặc nhập mã PIN', 'y': 220, 'w': 140, 'h': 50},
        {'id': 'act3', 'lane': 2, 'type': 'action', 'text': 'Xác thực phiếu giữ &\nKiểm tra hạn 15 phút', 'y': 220, 'w': 140, 'h': 50},
        {'id': 'dec1', 'lane': 2, 'type': 'decision', 'text': 'Mã hợp lệ &\nCòn hạn?', 'y': 300, 'w': 130, 'h': 65},
        {'id': 'fork1', 'lane': 2, 'type': 'fork', 'y': 390, 'w': 140, 'h': 6},
        {'id': 'act_iot', 'lane': 3, 'type': 'action', 'text': 'Phát lệnh mở chốt\nkhóa điện tử', 'y': 420, 'w': 140, 'h': 50},
        {'id': 'act_trip', 'lane': 2, 'type': 'action', 'text': 'Kích hoạt In-Use &\nBắt đầu tính giờ', 'y': 420, 'w': 140, 'h': 50},
        {'id': 'join1', 'lane': 2, 'type': 'join', 'y': 495, 'w': 140, 'h': 6},
        {'id': 'act_ui', 'lane': 1, 'type': 'action', 'text': 'Hiển thị màn hình\nhành trình đang chạy', 'y': 525, 'w': 140, 'h': 50},
        {'id': 'end1', 'lane': 1, 'type': 'end', 'y': 600, 'w': 28, 'h': 28},
        {'id': 'act_fail', 'lane': 1, 'type': 'action', 'text': 'Báo lỗi & Tăng\nbộ đếm lần sai', 'y': 305, 'w': 140, 'h': 50},
        {'id': 'dec2', 'lane': 1, 'type': 'decision', 'text': 'Sai >= 3 lần?', 'y': 375, 'w': 120, 'h': 55},
        {'id': 'end_fail', 'lane': 1, 'type': 'end', 'y': 455, 'w': 28, 'h': 28},
    ],
    edges=[
        {'src': 'start', 'dst': 'act1'},
        {'src': 'act1', 'dst': 'act2'},
        {'src': 'act2', 'dst': 'act3'},
        {'src': 'act3', 'dst': 'dec1'},
        {'src': 'dec1', 'dst': 'fork1', 'label': '[Hợp lệ]'},
        {'src': 'dec1', 'dst': 'act_fail', 'label': '[Sai / Hết hạn]'},
        {'src': 'act_fail', 'dst': 'dec2'},
        {'src': 'dec2', 'dst': 'act2', 'label': '[< 3 lần]'},
        {'src': 'dec2', 'dst': 'end_fail', 'label': '[>= 3 lần - Khóa]'},
        {'src': 'fork1', 'dst': 'act_iot'},
        {'src': 'fork1', 'dst': 'act_trip'},
        {'src': 'act_iot', 'dst': 'join1'},
        {'src': 'act_trip', 'dst': 'join1'},
        {'src': 'join1', 'dst': 'act_ui'},
        {'src': 'act_ui', 'dst': 'end1'},
    ]
)

# AD03: Return Vehicle Workflow
build_activity_diagram_swimlanes(
    filepath=os.path.join(ACT_DIR, "AD03-Return_Vehicle.drawio.svg"),
    title="Activity Diagram: AD03 - Return Vehicle Workflow (Swimlanes)",
    swimlanes=["Sinh viên (Student)", "Trạm IoT (Station)", "Backend Service", "Mobile App"],
    nodes=[
        {'id': 'start', 'lane': 0, 'type': 'start', 'y': 80, 'w': 28, 'h': 28},
        {'id': 'act1', 'lane': 0, 'type': 'action', 'text': 'Đưa xe vào khe đỗ\nvà đẩy chặt chốt', 'y': 140, 'w': 140, 'h': 50},
        {'id': 'act2', 'lane': 1, 'type': 'action', 'text': 'Cảm biến chốt khóa\nđóng điện & đọc pin', 'y': 140, 'w': 140, 'h': 50},
        {'id': 'dec1', 'lane': 1, 'type': 'decision', 'text': 'Chốt khớp &\nĐã khóa an toàn?', 'y': 220, 'w': 130, 'h': 65},
        {'id': 'act_warn', 'lane': 0, 'type': 'action', 'text': 'Cảnh báo đẩy chặt lại\nchốt khóa vật lý', 'y': 225, 'w': 140, 'h': 50},
        {'id': 'act3', 'lane': 2, 'type': 'action', 'text': 'Chốt giờ kết thúc &\nTính toán cước phí', 'y': 310, 'w': 140, 'h': 50},
        {'id': 'obj_rec', 'lane': 2, 'type': 'object', 'text': ':TripInvoice\n[Status = SETTLED]', 'y': 390, 'w': 140, 'h': 50},
        {'id': 'act4', 'lane': 2, 'type': 'action', 'text': 'Cập nhật trạng thái\nxe (Available / Sạc)', 'y': 470, 'w': 140, 'h': 50},
        {'id': 'act5', 'lane': 3, 'type': 'action', 'text': 'Hiển thị biên lai &\nXác nhận hoàn tất', 'y': 470, 'w': 140, 'h': 50},
        {'id': 'end1', 'lane': 3, 'type': 'end', 'y': 550, 'w': 28, 'h': 28},
    ],
    edges=[
        {'src': 'start', 'dst': 'act1'},
        {'src': 'act1', 'dst': 'act2'},
        {'src': 'act2', 'dst': 'dec1'},
        {'src': 'dec1', 'dst': 'act3', 'label': '[Đã khóa]'},
        {'src': 'dec1', 'dst': 'act_warn', 'label': '[Chưa khớp]'},
        {'src': 'act_warn', 'dst': 'act1'},
        {'src': 'act3', 'dst': 'obj_rec', 'is_object_flow': True},
        {'src': 'obj_rec', 'dst': 'act4'},
        {'src': 'act4', 'dst': 'act5'},
        {'src': 'act5', 'dst': 'end1'},
    ]
)

# AD04: Reserve Parking and Charging Workflow
build_activity_diagram_swimlanes(
    filepath=os.path.join(ACT_DIR, "AD04-Reserve_Parking_and_Charging.drawio.svg"),
    title="Activity Diagram: AD04 - Parking & Charging Workflow (Swimlanes)",
    swimlanes=["Sinh viên (Student)", "Mobile App", "Hệ thống Quản lý Hub", "Trụ sạc IoT (PowerHub)"],
    nodes=[
        {'id': 'start', 'lane': 0, 'type': 'start', 'y': 80, 'w': 28, 'h': 28},
        {'id': 'act1', 'lane': 0, 'type': 'action', 'text': 'Chọn Hub & Khung giờ\ngửi xe cá nhân', 'y': 140, 'w': 140, 'h': 50},
        {'id': 'act2', 'lane': 2, 'type': 'action', 'text': 'Kiểm tra sức chứa\nslot đỗ trống', 'y': 140, 'w': 140, 'h': 50},
        {'id': 'dec1', 'lane': 2, 'type': 'decision', 'text': 'Còn slot đỗ trống?', 'y': 220, 'w': 130, 'h': 60},
        {'id': 'act_err', 'lane': 1, 'type': 'action', 'text': 'Báo hết chỗ &\nGợi ý khung giờ khác', 'y': 225, 'w': 140, 'h': 50},
        {'id': 'act3', 'lane': 2, 'type': 'action', 'text': 'Khóa giữ ô đỗ &\nSinh mã QR vào bãi', 'y': 310, 'w': 140, 'h': 50},
        {'id': 'dec2', 'lane': 0, 'type': 'decision', 'text': 'Có nhu cầu sạc pin\nxe cá nhân?', 'y': 380, 'w': 130, 'h': 65},
        {'id': 'act4', 'lane': 0, 'type': 'action', 'text': 'Nhập % pin hiện tại\n& giờ lấy xe dự kiến', 'y': 470, 'w': 140, 'h': 50},
        {'id': 'act5', 'lane': 2, 'type': 'action', 'text': 'Phân bổ cổng sạc &\nXếp lịch cấp điện', 'y': 470, 'w': 140, 'h': 50},
        {'id': 'act_iot', 'lane': 3, 'type': 'action', 'text': 'Kích hoạt relay sạc\ntại vị trí cổng đỗ', 'y': 470, 'w': 140, 'h': 50},
        {'id': 'act6', 'lane': 1, 'type': 'action', 'text': 'Hiển thị thẻ đặt chỗ\n& Hướng dẫn cắm sạc', 'y': 550, 'w': 140, 'h': 50},
        {'id': 'end1', 'lane': 1, 'type': 'end', 'y': 630, 'w': 28, 'h': 28},
    ],
    edges=[
        {'src': 'start', 'dst': 'act1'},
        {'src': 'act1', 'dst': 'act2'},
        {'src': 'act2', 'dst': 'dec1'},
        {'src': 'dec1', 'dst': 'act3', 'label': '[Còn slot]'},
        {'src': 'dec1', 'dst': 'act_err', 'label': '[Hết chỗ]'},
        {'src': 'act3', 'dst': 'dec2'},
        {'src': 'dec2', 'dst': 'act4', 'label': '[Có sạc pin]'},
        {'src': 'dec2', 'dst': 'act6', 'label': '[Không sạc]'},
        {'src': 'act4', 'dst': 'act5'},
        {'src': 'act5', 'dst': 'act_iot'},
        {'src': 'act_iot', 'dst': 'act6'},
        {'src': 'act6', 'dst': 'end1'},
    ]
)

# AD05: Vehicle Redistribution Workflow
build_activity_diagram_swimlanes(
    filepath=os.path.join(ACT_DIR, "AD05-Redistribute_Vehicles.drawio.svg"),
    title="Activity Diagram: AD05 - Vehicle Redistribution (Swimlanes)",
    swimlanes=["Điều hành viên (Operator)", "Web Dashboard", "Rebalance Service", "Tài xế trung chuyển (Fleet)"],
    nodes=[
        {'id': 'start', 'lane': 1, 'type': 'start', 'y': 80, 'w': 28, 'h': 28},
        {'id': 'act1', 'lane': 1, 'type': 'action', 'text': 'Cảnh báo mất cân bằng\ncung cầu giữa các Hub', 'y': 140, 'w': 140, 'h': 50},
        {'id': 'act2', 'lane': 0, 'type': 'action', 'text': 'Chọn Hub nguồn, Hub đích\n& Số lượng xe điều phối', 'y': 140, 'w': 140, 'h': 50},
        {'id': 'act3', 'lane': 2, 'type': 'action', 'text': 'Kiểm tra xe pin >= 80%\nvà slot trống trạm đích', 'y': 220, 'w': 140, 'h': 50},
        {'id': 'dec1', 'lane': 2, 'type': 'decision', 'text': 'Đủ điều kiện\nđiều chuyển?', 'y': 300, 'w': 130, 'h': 65},
        {'id': 'act_alt', 'lane': 1, 'type': 'action', 'text': 'Đề xuất đổi Hub đích\nhoặc giảm số lượng xe', 'y': 305, 'w': 140, 'h': 50},
        {'id': 'act4', 'lane': 2, 'type': 'action', 'text': 'Khóa xe In-Transit &\nXuất lệnh điều phối', 'y': 390, 'w': 140, 'h': 50},
        {'id': 'obj_order', 'lane': 2, 'type': 'object', 'text': ':TransferManifest\n[Qty = 20, Pin >= 80%]', 'y': 470, 'w': 140, 'h': 50},
        {'id': 'act5', 'lane': 3, 'type': 'action', 'text': 'Nhận lệnh, bốc xếp xe\n& vận chuyển theo lộ trình', 'y': 470, 'w': 140, 'h': 50},
        {'id': 'act6', 'lane': 3, 'type': 'action', 'text': 'Quét mã nhập bãi đích\n& Khôi phục Available', 'y': 550, 'w': 140, 'h': 50},
        {'id': 'end1', 'lane': 3, 'type': 'end', 'y': 630, 'w': 28, 'h': 28},
    ],
    edges=[
        {'src': 'start', 'dst': 'act1'},
        {'src': 'act1', 'dst': 'act2'},
        {'src': 'act2', 'dst': 'act3'},
        {'src': 'act3', 'dst': 'dec1'},
        {'src': 'dec1', 'dst': 'act4', 'label': '[Đủ điều kiện]'},
        {'src': 'dec1', 'dst': 'act_alt', 'label': '[Thiếu xe/slot]'},
        {'src': 'act_alt', 'dst': 'act2'},
        {'src': 'act4', 'dst': 'obj_order', 'is_object_flow': True},
        {'src': 'obj_order', 'dst': 'act5'},
        {'src': 'act5', 'dst': 'act6'},
        {'src': 'act6', 'dst': 'end1'},
    ]
)

# AD06: Handle Operational Incident Workflow
build_activity_diagram_swimlanes(
    filepath=os.path.join(ACT_DIR, "AD06-Handle_Operational_Incident.drawio.svg"),
    title="Activity Diagram: AD06 - Operational Incident Workflow (Swimlanes)",
    swimlanes=["Hệ thống Telemetry / User", "Web Dashboard", "Incident Engine", "Kỹ thuật viên (Technician)"],
    nodes=[
        {'id': 'start', 'lane': 0, 'type': 'start', 'y': 80, 'w': 28, 'h': 28},
        {'id': 'act1', 'lane': 0, 'type': 'action', 'text': 'Phát hiện sự cố cổng sạc\nhoặc nhận báo hỏng từ App', 'y': 140, 'w': 140, 'h': 50},
        {'id': 'act2', 'lane': 2, 'type': 'action', 'text': 'Phân tích mức độ sự cố\n(Nghiêm trọng / Nhẹ)', 'y': 140, 'w': 140, 'h': 50},
        {'id': 'dec1', 'lane': 2, 'type': 'decision', 'text': 'Mức độ sự cố?', 'y': 220, 'w': 130, 'h': 65},
        {'id': 'act_iso', 'lane': 2, 'type': 'action', 'text': 'Ngắt điện tức thời &\nKhóa cổng từ xa (Out of Order)', 'y': 310, 'w': 140, 'h': 50},
        {'id': 'act_tick', 'lane': 2, 'type': 'action', 'text': 'Tạo phiếu sửa chữa &\nĐiều phối kỹ thuật viên', 'y': 390, 'w': 140, 'h': 50},
        {'id': 'act_fix', 'lane': 3, 'type': 'action', 'text': 'Kiểm tra hiện trường,\nsửa chữa & thay linh kiện', 'y': 390, 'w': 140, 'h': 50},
        {'id': 'act_test', 'lane': 3, 'type': 'action', 'text': 'Chạy kiểm thử an toàn điện\n& Xác nhận nghiệm thu trên App', 'y': 470, 'w': 140, 'h': 50},
        {'id': 'act_react', 'lane': 2, 'type': 'action', 'text': 'Tái kích hoạt cổng sạc\nsang trạng thái Sẵn sàng', 'y': 550, 'w': 140, 'h': 50},
        {'id': 'end1', 'lane': 2, 'type': 'end', 'y': 630, 'w': 28, 'h': 28},
    ],
    edges=[
        {'src': 'start', 'dst': 'act1'},
        {'src': 'act1', 'dst': 'act2'},
        {'src': 'act2', 'dst': 'dec1'},
        {'src': 'dec1', 'dst': 'act_iso', 'label': '[Khẩn cấp / Đoản mạch]'},
        {'src': 'dec1', 'dst': 'act_tick', 'label': '[Lỗi nhẹ / Sơn xe]'},
        {'src': 'act_iso', 'dst': 'act_tick'},
        {'src': 'act_tick', 'dst': 'act_fix'},
        {'src': 'act_fix', 'dst': 'act_test'},
        {'src': 'act_test', 'dst': 'act_react'},
        {'src': 'act_react', 'dst': 'end1'},
    ]
)

# AD07: What-if Simulation Workflow
build_activity_diagram_swimlanes(
    filepath=os.path.join(ACT_DIR, "AD07-Run_What_if_Simulation.drawio.svg"),
    title="Activity Diagram: AD07 - What-if Simulation Workflow (Swimlanes)",
    swimlanes=["Điều hành viên (Operator)", "Web Dashboard", "What-if Engine (Sandbox)", "Hệ thống Thực tế (Production)"],
    nodes=[
        {'id': 'start', 'lane': 0, 'type': 'start', 'y': 80, 'w': 28, 'h': 28},
        {'id': 'act1', 'lane': 0, 'type': 'action', 'text': 'Chọn 1 trong 5 kịch bản\n(VD: Giờ cao điểm Metro)', 'y': 140, 'w': 140, 'h': 50},
        {'id': 'act2', 'lane': 0, 'type': 'action', 'text': 'Cấu hình tham số mô phỏng\n(Nhu cầu tăng +300%, 120p)', 'y': 220, 'w': 140, 'h': 50},
        {'id': 'act3', 'lane': 2, 'type': 'action', 'text': 'Chạy mô phỏng biến đổi\nsự kiện rời rạc trên Sandbox', 'y': 220, 'w': 140, 'h': 50},
        {'id': 'act4', 'lane': 1, 'type': 'action', 'text': 'Hiển thị KPI dự báo &\nĐề xuất điều phối xe/sạc', 'y': 300, 'w': 140, 'h': 50},
        {'id': 'dec1', 'lane': 0, 'type': 'decision', 'text': 'Chấp thuận\nkhuyến nghị?', 'y': 380, 'w': 130, 'h': 65},
        {'id': 'act_tune', 'lane': 0, 'type': 'action', 'text': 'Tinh chỉnh lại tham số\nđầu vào của kịch bản', 'y': 385, 'w': 140, 'h': 50},
        {'id': 'act5', 'lane': 3, 'type': 'action', 'text': 'Phát lệnh điều phối tự động\nvào mạng lưới thực tế', 'y': 470, 'w': 140, 'h': 50},
        {'id': 'end1', 'lane': 3, 'type': 'end', 'y': 550, 'w': 28, 'h': 28},
    ],
    edges=[
        {'src': 'start', 'dst': 'act1'},
        {'src': 'act1', 'dst': 'act2'},
        {'src': 'act2', 'dst': 'act3'},
        {'src': 'act3', 'dst': 'act4'},
        {'src': 'act4', 'dst': 'dec1'},
        {'src': 'dec1', 'dst': 'act5', 'label': '[Đồng ý áp dụng]'},
        {'src': 'dec1', 'dst': 'act_tune', 'label': '[Thử nghiệm lại]'},
        {'src': 'act_tune', 'dst': 'act2'},
        {'src': 'act5', 'dst': 'end1'},
    ]
)

print("All 7 Activity diagrams generated successfully.")


# ==============================================================================
# 3. STATECHART DIAGRAMS (SC01 to SC03) - Chuẩn Slide Ch6 p.41-45 (Superstate & 2 Compartments)
# ==============================================================================

# SC01: Vehicle State Machine (Bonus)
build_statechart_diagram_v2(
    filepath=os.path.join(STA_DIR, "SC01-Vehicle_State_Machine.drawio.svg"),
    title="State Machine: SC01 - Vehicle Lifecycle (Sommerville Ch6)",
    superstates=[
        {'id': 'super_active', 'name': 'Operational Service', 'x': 140, 'y': 70, 'w': 620, 'h': 240}
    ],
    states=[
        {'id': 'init', 'type': 'initial', 'x': 50, 'y': 150, 'w': 24, 'h': 24},
        {
            'id': 's_avail', 'type': 'state', 'name': 'Available',
            'actions': ['entry / turnOnBeacon()', 'do: listenHeartbeat()'],
            'x': 160, 'y': 115, 'w': 160, 'h': 65
        },
        {
            'id': 's_res', 'type': 'state', 'name': 'Reserved',
            'actions': ['entry / start15MinCountdown()', 'exit / stopCountdown()'],
            'x': 370, 'y': 115, 'w': 160, 'h': 65
        },
        {
            'id': 's_inuse', 'type': 'state', 'name': 'In-Use',
            'actions': ['entry / unlockPin()', 'do: streamGPSAndBattery()', 'exit / lockPin()'],
            'x': 580, 'y': 115, 'w': 160, 'h': 65
        },
        {
            'id': 's_need', 'type': 'state', 'name': 'Needs Charging',
            'actions': ['entry / disableBooking()', 'do: alertStaff()'],
            'x': 580, 'y': 225, 'w': 160, 'h': 65
        },
        {
            'id': 's_char', 'type': 'state', 'name': 'Charging',
            'actions': ['entry / connectPlug()', 'do: readChargeCurrent()', 'exit / disconnectPlug()'],
            'x': 370, 'y': 225, 'w': 160, 'h': 65
        },
        {
            'id': 's_maint', 'type': 'state', 'name': 'Under Maintenance',
            'actions': ['entry / createDefectTicket()', 'do: runDiagnostics()', 'exit / signOff()'],
            'x': 160, 'y': 360, 'w': 160, 'h': 65
        },
        {
            'id': 's_trans', 'type': 'state', 'name': 'In-Transit',
            'actions': ['entry / assignTruckManifest()', 'do: trackRouteGPS()', 'exit / dockAtDest()'],
            'x': 450, 'y': 360, 'w': 160, 'h': 65
        },
    ],
    transitions=[
        {'src': 'init', 'dst': 's_avail', 'event': 'registerVehicle'},
        {'src': 's_avail', 'dst': 's_res', 'event': 'reserveVehicle', 'guard': 'battery >= 20%'},
        {'src': 's_res', 'dst': 's_avail', 'event': 'timeout / cancel', 'guard': 'after 15 mins'},
        {'src': 's_res', 'dst': 's_inuse', 'event': 'unlockVehicle', 'guard': 'code matches'},
        {'src': 's_inuse', 'dst': 's_avail', 'event': 'returnVehicle', 'guard': 'battery >= 20%'},
        {'src': 's_inuse', 'dst': 's_need', 'event': 'returnVehicle', 'guard': 'battery < 20%'},
        {'src': 's_need', 'dst': 's_char', 'event': 'plugChargerCable'},
        {'src': 's_char', 'dst': 's_avail', 'event': 'chargeComplete', 'guard': 'battery >= 80%'},
        {'src': 's_avail', 'dst': 's_maint', 'event': 'reportDefect / sensorFault'},
        {'src': 's_maint', 'dst': 's_avail', 'event': 'maintenanceComplete'},
        {'src': 's_avail', 'dst': 's_trans', 'event': 'dispatchRebalance'},
        {'src': 's_trans', 'dst': 's_avail', 'event': 'arrivedAtDestinationHub'},
    ]
)

# SC02: Charging Point State Machine (Bonus)
build_statechart_diagram_v2(
    filepath=os.path.join(STA_DIR, "SC02-Charging_Point_State_Machine.drawio.svg"),
    title="State Machine: SC02 - Charging Point Lifecycle (Sommerville Ch6)",
    superstates=[
        {'id': 'super_power', 'name': 'Power Station Service', 'x': 140, 'y': 70, 'w': 620, 'h': 240}
    ],
    states=[
        {'id': 'init', 'type': 'initial', 'x': 50, 'y': 150, 'w': 24, 'h': 24},
        {
            'id': 's_idle', 'type': 'state', 'name': 'Idle / Available',
            'actions': ['do: displayGreenLED()'],
            'x': 160, 'y': 115, 'w': 160, 'h': 65
        },
        {
            'id': 's_res', 'type': 'state', 'name': 'Reserved',
            'actions': ['entry / lockConnector()', 'do: displayYellowLED()'],
            'x': 370, 'y': 115, 'w': 160, 'h': 65
        },
        {
            'id': 's_char', 'type': 'state', 'name': 'Charging (Active)',
            'actions': ['entry / closePowerRelay()', 'do: deliverElectricityKWh()', 'exit / openPowerRelay()'],
            'x': 580, 'y': 115, 'w': 160, 'h': 65
        },
        {
            'id': 's_comp', 'type': 'state', 'name': 'Charge Complete',
            'actions': ['entry / cutRelay()', 'do: notifyStudent()'],
            'x': 580, 'y': 225, 'w': 160, 'h': 65
        },
        {
            'id': 's_fault', 'type': 'state', 'name': 'Fault / Short Circuit',
            'actions': ['entry / emergencyPowerCut()', 'do: blinkRedLED()'],
            'x': 370, 'y': 360, 'w': 160, 'h': 65
        },
        {
            'id': 's_maint', 'type': 'state', 'name': 'Under Repair',
            'actions': ['do: technicianInspection()', 'exit / runSafetyTest()'],
            'x': 160, 'y': 360, 'w': 160, 'h': 65
        },
    ],
    transitions=[
        {'src': 'init', 'dst': 's_idle', 'event': 'installAndPowerOn'},
        {'src': 's_idle', 'dst': 's_res', 'event': 'reserveChargingSlot'},
        {'src': 's_res', 'dst': 's_char', 'event': 'plugInVehicle'},
        {'src': 's_char', 'dst': 's_comp', 'event': 'batteryFull', 'guard': '>= 80%'},
        {'src': 's_comp', 'dst': 's_idle', 'event': 'unplugVehicle'},
        {'src': 's_char', 'dst': 's_fault', 'event': 'shortCircuit / powerSurge'},
        {'src': 's_fault', 'dst': 's_maint', 'event': 'createIncidentTicket'},
        {'src': 's_maint', 'dst': 's_idle', 'event': 'repairedAndCertified'},
    ]
)

# SC03: Reservation and Trip State Machine (Bonus)
build_statechart_diagram_v2(
    filepath=os.path.join(STA_DIR, "SC03-Reservation_and_Trip_State_Machine.drawio.svg"),
    title="State Machine: SC03 - Reservation & Trip Lifecycle (Sommerville Ch6)",
    superstates=None,
    states=[
        {'id': 'init', 'type': 'initial', 'x': 50, 'y': 150, 'w': 24, 'h': 24},
        {
            'id': 's_res', 'type': 'state', 'name': 'Reserved',
            'actions': ['entry / start15MinCountdown()', 'do: holdVehicleLock()'],
            'x': 140, 'y': 130, 'w': 160, 'h': 65
        },
        {
            'id': 's_trip', 'type': 'state', 'name': 'Active Trip (In-Use)',
            'actions': ['entry / startFareMeter()', 'do: recordTripTelemetry()', 'exit / stopFareMeter()'],
            'x': 370, 'y': 130, 'w': 160, 'h': 65
        },
        {
            'id': 's_comp', 'type': 'state', 'name': 'Completed',
            'actions': ['entry / calculateInvoice()', 'do: processPayment()'],
            'x': 600, 'y': 130, 'w': 160, 'h': 65
        },
        {'id': 'final_done', 'type': 'final', 'x': 800, 'y': 150, 'w': 24, 'h': 24},
        {
            'id': 's_canc', 'type': 'state', 'name': 'Cancelled',
            'actions': ['entry / releaseVehicleLock()'],
            'x': 250, 'y': 250, 'w': 160, 'h': 60
        },
        {
            'id': 's_exp', 'type': 'state', 'name': 'Expired',
            'actions': ['entry / autoCancelDaemon()'],
            'x': 450, 'y': 250, 'w': 160, 'h': 60
        },
    ],
    transitions=[
        {'src': 'init', 'dst': 's_res', 'event': 'createReservation'},
        {'src': 's_res', 'dst': 's_trip', 'event': 'unlockVehicle', 'guard': 'within 15 mins'},
        {'src': 's_trip', 'dst': 's_comp', 'event': 'dockAndLockAtHub'},
        {'src': 's_comp', 'dst': 'final_done', 'event': 'paymentSettled'},
        {'src': 's_res', 'dst': 's_canc', 'event': 'studentCancel'},
        {'src': 's_res', 'dst': 's_exp', 'event': 'autoExpireDaemon', 'guard': 'after 15 mins'},
        {'src': 's_canc', 'dst': 'final_done', 'event': 'cleanupSession'},
        {'src': 's_exp', 'dst': 'final_done', 'event': 'cleanupSession'},
    ]
)

print("All 3 Statechart diagrams generated successfully.")
print("PHASE 2 DIAGRAMS V2 COMPLETED 100% ACCORDING TO COURSE SLIDES!")
