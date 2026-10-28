import os
import sys

# Ensure current dir is in path
sys.path.append(os.path.dirname(__file__))
from phase2_builder import build_sequence_diagram, build_activity_diagram, build_statechart_diagram

BASE_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", ".."))
SEQ_DIR = os.path.join(BASE_DIR, "01_Diagram", "02_Sequence_Diagram")
ACT_DIR = os.path.join(BASE_DIR, "01_Diagram", "03_Activity_Diagram")
STA_DIR = os.path.join(BASE_DIR, "01_Diagram", "04_Statechart_Diagram")

os.makedirs(SEQ_DIR, exist_ok=True)
os.makedirs(ACT_DIR, exist_ok=True)
os.makedirs(STA_DIR, exist_ok=True)

print("Starting generation of Phase 2 diagrams...")

# ==============================================================================
# 1. SEQUENCE DIAGRAMS (SQ01 to SQ07)
# ==============================================================================

# SQ01: Reserve Vehicle (UC03)
build_sequence_diagram(
    filepath=os.path.join(SEQ_DIR, "SQ01-Reserve_Vehicle.drawio.svg"),
    title="Sequence Diagram: SQ01 - Reserve Vehicle (UC03)",
    actor_name="Student",
    lifelines=[":MobileApp", ":ReservationController", ":VehicleService", ":Database"],
    messages=[
        (0, 1, "1: selectVehicle(vehicleId)", False),
        (1, 2, "2: requestReservation(userId, vehicleId)", False),
        (2, 3, "3: checkAvailabilityAndLock(vehicleId)", False),
        (3, 2, "4: vehicleLocked [Available & Battery >= 20%]", True),
        (2, 4, "5: saveReservation(userId, vehicleId, 15_MIN)", False),
        (4, 2, "6: reservationSaved(resId, qrCode)", True),
        (2, 1, "7: return reservationSuccess(ticket)", True),
        (1, 0, "8: displayReservationTicket(timer 15:00)", True),
    ],
    alt_boxes=[
        {
            'y': 220, 'h': 210,
            'condition_true': "Vehicle is Available & Battery >= 20%",
            'condition_false': "Vehicle Already Reserved / Battery < 20%",
            'mid_y': 360
        }
    ]
)

# SQ02: Pick Up Vehicle (UC04)
build_sequence_diagram(
    filepath=os.path.join(SEQ_DIR, "SQ02-Pick_Up_Vehicle.drawio.svg"),
    title="Sequence Diagram: SQ02 - Pick Up Vehicle (UC04)",
    actor_name="Student",
    lifelines=[":MobileApp", ":PickupController", ":TripService", ":IoTStation", ":Database"],
    messages=[
        (0, 1, "1: scanQR / inputCode(vehicleId)", False),
        (1, 2, "2: validatePickup(userId, vehicleId)", False),
        (2, 4, "3: verifyReservation(userId, vehicleId)", False),
        (4, 2, "4: status Valid [Within 15 mins]", True),
        (2, 3, "5: sendUnlockCommand(slotId, vehicleId)", False),
        (3, 2, "6: unlockConfirmed [Pin Released]", True),
        (2, 4, "7: updateVehicleStatus(IN_USE) & startTrip()", False),
        (4, 2, "8: tripStarted(tripId, startTime)", True),
        (2, 1, "9: return pickupSuccess()", True),
        (1, 0, "10: displayActiveTripScreen()", True),
    ],
    alt_boxes=[
        {
            'y': 240, 'h': 290,
            'condition_true': "Valid Reservation & Correct Vehicle",
            'condition_false': "Invalid Code / Expired (> 15 mins)",
            'mid_y': 440
        }
    ]
)

# SQ03: Return Vehicle (UC05)
build_sequence_diagram(
    filepath=os.path.join(SEQ_DIR, "SQ03-Return_Vehicle.drawio.svg"),
    title="Sequence Diagram: SQ03 - Return Vehicle (UC05)",
    actor_name="Student",
    lifelines=[":MobileApp", ":ReturnController", ":TripService", ":IoTStation", ":Database"],
    messages=[
        (0, 3, "1: dockVehicleIntoSlot(slotId)", False),
        (3, 2, "2: notifyDocked(slotId, vehicleId, batteryLevel)", False),
        (0, 1, "3: confirmReturnClicked()", False),
        (1, 2, "4: processReturn(tripId, destHubId, slotId)", False),
        (2, 3, "5: verifyPhysicalLock(slotId)", False),
        (3, 2, "6: lockConfirmed [Locker Closed]", True),
        (2, 4, "7: closeTrip(tripId, endTime, finalBattery)", False),
        (4, 2, "8: tripClosed(fare, duration)", True),
        (2, 4, "9: updateVehicleStatus(Available / Needs_Charging)", False),
        (4, 2, "10: statusUpdated()", True),
        (2, 1, "11: return returnSummary(fare, duration)", True),
        (1, 0, "12: displayInvoiceAndCompleteTrip()", True),
    ]
)

# SQ04: Request Charging (UC07)
build_sequence_diagram(
    filepath=os.path.join(SEQ_DIR, "SQ04-Request_Charging.drawio.svg"),
    title="Sequence Diagram: SQ04 - Request Charging (UC07)",
    actor_name="Student",
    lifelines=[":MobileApp", ":ChargingController", ":ChargingService", ":PowerHub", ":Database"],
    messages=[
        (0, 1, "1: submitChargingRequest(hubId, currBattery, targetBattery)", False),
        (1, 2, "2: scheduleCharging(userId, hubId, params)", False),
        (2, 3, "3: checkAvailablePorts(hubId)", False),
        (3, 2, "4: portAvailable(portId, maxPower)", True),
        (2, 4, "5: createChargingSession(userId, portId)", False),
        (4, 2, "6: sessionCreated(sessionId)", True),
        (2, 3, "7: activatePortPower(portId)", False),
        (3, 2, "8: powerActive()", True),
        (2, 1, "9: return chargingStarted(portId)", True),
        (1, 0, "10: displayPlugInInstructions()", True),
    ]
)

# SQ05: Redistribute Vehicles (UC10)
build_sequence_diagram(
    filepath=os.path.join(SEQ_DIR, "SQ05-Redistribute_Vehicles.drawio.svg"),
    title="Sequence Diagram: SQ05 - Redistribute Vehicles (UC10)",
    actor_name="Operator",
    lifelines=[":WebDashboard", ":DispatchController", ":RebalanceService", ":Database", ":FieldApp"],
    messages=[
        (0, 1, "1: createTransferOrder(sourceHub, destHub, qty=20)", False),
        (1, 2, "2: validateAndPlan(srcHub, dstHub, qty)", False),
        (2, 3, "3: getEligibleVehicles(srcHub, minBattery=80%)", False),
        (3, 2, "4: return vehicleList [qty >= 20]", True),
        (2, 3, "5: checkCapacity(dstHub)", False),
        (3, 2, "6: return freeSlots [slots >= 20]", True),
        (2, 3, "7: lockVehiclesForTransit(vehicleIds)", False),
        (3, 2, "8: lockedSuccess()", True),
        (2, 4, "9: notifyFieldDriver(orderId, route, vehicleIds)", False),
        (4, 2, "10: driverAccepted()", True),
        (2, 1, "11: return orderCreatedSuccess(orderId)", True),
        (1, 0, "12: displayTransferManifest()", True),
    ]
)

# SQ06: Handle Operational Incident (UC11)
build_sequence_diagram(
    filepath=os.path.join(SEQ_DIR, "SQ06-Handle_Operational_Incident.drawio.svg"),
    title="Sequence Diagram: SQ06 - Handle Operational Incident (UC11)",
    actor_name="Operator",
    lifelines=[":WebDashboard", ":IncidentController", ":IncidentService", ":IoTStation", ":Database"],
    messages=[
        (0, 1, "1: selectIncident(incidentId)", False),
        (1, 2, "2: getIncidentDetails(incidentId)", False),
        (2, 4, "3: queryIncidentLog(incidentId)", False),
        (4, 2, "4: return incidentData(faultyPortId, severity=CRITICAL)", True),
        (2, 1, "5: displayDetails(impactReport)", True),
        (0, 1, "6: confirmIsolateAndMaintenance()", False),
        (1, 2, "7: executeIsolation(faultyPortId)", False),
        (2, 3, "8: sendEmergencyPowerCut(faultyPortId)", False),
        (3, 2, "9: powerCutConfirmed()", True),
        (2, 4, "10: updateStatus(OUT_OF_ORDER) & createTicket()", False),
        (4, 2, "11: ticketCreated(ticketId, technicianId)", True),
        (2, 1, "12: return isolationSuccess()", True),
        (1, 0, "13: displayIncidentResolved()", True),
    ]
)

# SQ07: Run What-if Simulation (UC13 & UC14)
build_sequence_diagram(
    filepath=os.path.join(SEQ_DIR, "SQ07-Run_What_if_Simulation.drawio.svg"),
    title="Sequence Diagram: SQ07 - Run What-if Simulation (UC13 & UC14)",
    actor_name="Operator",
    lifelines=[":WebDashboard", ":SimulationController", ":WhatIfEngine", ":NetworkCache"],
    messages=[
        (0, 1, "1: selectScenario(PEAK_METRO_SURGE, +300%)", False),
        (1, 2, "2: runSimulation(scenarioId, params, duration=120m)", False),
        (2, 3, "3: initializeSandboxState(NetworkCache.getSnapShot())", False),
        (3, 2, "4: snapshotReady(10_Hubs, 1000_Vehicles)", True),
        (2, 2, "5: executeDiscreteEventLoop(timeline)", False),
        (2, 2, "6: calculateServiceImpact(waitTimes, bottlenecks)", False),
        (2, 2, "7: generateRecommendations(rebalance, reroute)", False),
        (2, 1, "8: return simulationResults(metrics, recommendations)", True),
        (1, 0, "9: displayComparativeDashboard(UC14)", True),
        (0, 1, "10: applyRecommendationsClicked()", False),
        (1, 2, "11: dispatchRecommendedActions()", False),
        (2, 1, "12: return actionAppliedStatus()", True),
    ]
)

print("Sequence diagrams generated.")


# ==============================================================================
# 2. ACTIVITY DIAGRAMS (AD01 to AD07)
# ==============================================================================

# AD01: Reserve Vehicle Workflow
build_activity_diagram(
    filepath=os.path.join(ACT_DIR, "AD01-Reserve_Vehicle.drawio.svg"),
    title="Activity Diagram: AD01 - Reserve Vehicle Workflow",
    nodes=[
        {'id': 'start', 'type': 'start', 'x': 250, 'y': 60, 'w': 30, 'h': 30},
        {'id': 'act1', 'type': 'action', 'text': 'Chọn Hub & Xem\nDanh sách xe', 'x': 195, 'y': 120, 'w': 140, 'h': 50},
        {'id': 'act2', 'type': 'action', 'text': 'Bấm Đặt giữ xe\n(Chọn mã xe)', 'x': 195, 'y': 200, 'w': 140, 'h': 50},
        {'id': 'dec1', 'type': 'decision', 'text': 'Xe còn trống & \nPin >= 20%?', 'x': 200, 'y': 280, 'w': 130, 'h': 70},
        {'id': 'act3', 'type': 'action', 'text': 'Khóa giữ xe\n(Reserved 15 phút)', 'x': 195, 'y': 380, 'w': 140, 'h': 50},
        {'id': 'act4', 'type': 'action', 'text': 'Xuất Phiếu giữ xe\n(Bộ đếm 15:00)', 'x': 195, 'y': 460, 'w': 140, 'h': 50},
        {'id': 'end1', 'type': 'end', 'x': 250, 'y': 540, 'w': 30, 'h': 30},
        {'id': 'act_err', 'type': 'action', 'text': 'Báo lỗi & Gợi ý\nphương tiện khác', 'x': 400, 'y': 290, 'w': 140, 'h': 50},
    ],
    edges=[
        {'src': 'start', 'dst': 'act1'},
        {'src': 'act1', 'dst': 'act2'},
        {'src': 'act2', 'dst': 'dec1'},
        {'src': 'dec1', 'dst': 'act3', 'label': '[Hợp lệ]'},
        {'src': 'act3', 'dst': 'act4'},
        {'src': 'act4', 'dst': 'end1'},
        {'src': 'dec1', 'dst': 'act_err', 'label': '[Hết xe / Pin yếu]'},
        {'src': 'act_err', 'dst': 'act1', 'x1': 470, 'y1': 290, 'x2': 335, 'y2': 145},
    ]
)

# AD02: Pick Up Vehicle Workflow
build_activity_diagram(
    filepath=os.path.join(ACT_DIR, "AD02-Pick_Up_Vehicle.drawio.svg"),
    title="Activity Diagram: AD02 - Pick Up Vehicle Workflow",
    nodes=[
        {'id': 'start', 'type': 'start', 'x': 250, 'y': 60, 'w': 30, 'h': 30},
        {'id': 'act1', 'type': 'action', 'text': 'Đến Hub & Mở màn\nhình Nhận xe', 'x': 195, 'y': 120, 'w': 140, 'h': 50},
        {'id': 'act2', 'type': 'action', 'text': 'Quét QR / Nhập\nmã xe trên thân', 'x': 195, 'y': 200, 'w': 140, 'h': 50},
        {'id': 'dec1', 'type': 'decision', 'text': 'Mã hợp lệ & \nCòn hạn giữ?', 'x': 200, 'y': 280, 'w': 130, 'h': 70},
        {'id': 'act3', 'type': 'action', 'text': 'Phát lệnh mở khóa\nchốt điện tử', 'x': 195, 'y': 380, 'w': 140, 'h': 50},
        {'id': 'act4', 'type': 'action', 'text': 'Chuyển In-Use &\nBắt đầu tính giờ', 'x': 195, 'y': 460, 'w': 140, 'h': 50},
        {'id': 'end1', 'type': 'end', 'x': 250, 'y': 540, 'w': 30, 'h': 30},
        {'id': 'act_fail', 'type': 'action', 'text': 'Hiển thị lỗi mã &\nĐếm số lần sai', 'x': 400, 'y': 290, 'w': 140, 'h': 50},
        {'id': 'dec2', 'type': 'decision', 'text': 'Sai >= 3 lần?', 'x': 405, 'y': 370, 'w': 130, 'h': 60},
        {'id': 'end_fail', 'type': 'end', 'x': 590, 'y': 385, 'w': 30, 'h': 30},
    ],
    edges=[
        {'src': 'start', 'dst': 'act1'},
        {'src': 'act1', 'dst': 'act2'},
        {'src': 'act2', 'dst': 'dec1'},
        {'src': 'dec1', 'dst': 'act3', 'label': '[Khớp phiếu]'},
        {'src': 'act3', 'dst': 'act4'},
        {'src': 'act4', 'dst': 'end1'},
        {'src': 'dec1', 'dst': 'act_fail', 'label': '[Sai mã / Hết hạn]'},
        {'src': 'act_fail', 'dst': 'dec2'},
        {'src': 'dec2', 'dst': 'act2', 'label': '[< 3 lần]', 'x1': 405, 'y1': 400, 'x2': 335, 'y2': 225},
        {'src': 'dec2', 'dst': 'end_fail', 'label': '[>= 3 lần - Khóa]'},
    ]
)

# AD03: Return Vehicle Workflow
build_activity_diagram(
    filepath=os.path.join(ACT_DIR, "AD03-Return_Vehicle.drawio.svg"),
    title="Activity Diagram: AD03 - Return Vehicle Workflow",
    nodes=[
        {'id': 'start', 'type': 'start', 'x': 250, 'y': 60, 'w': 30, 'h': 30},
        {'id': 'act1', 'type': 'action', 'text': 'Đến Hub đích &\nKiểm tra chỗ đỗ', 'x': 195, 'y': 120, 'w': 140, 'h': 50},
        {'id': 'dec1', 'type': 'decision', 'text': 'Hub còn slot đỗ?', 'x': 200, 'y': 200, 'w': 130, 'h': 60},
        {'id': 'act2', 'type': 'action', 'text': 'Đưa xe vào khe đỗ\nvà đẩy khóa chốt', 'x': 195, 'y': 290, 'w': 140, 'h': 50},
        {'id': 'dec2', 'type': 'decision', 'text': 'Cảm biến xác nhận\nđã khóa chặt?', 'x': 195, 'y': 370, 'w': 140, 'h': 70},
        {'id': 'act3', 'type': 'action', 'text': 'Đọc mức pin thực tế\n& Chốt hành trình', 'x': 195, 'y': 470, 'w': 140, 'h': 50},
        {'id': 'act4', 'type': 'action', 'text': 'Tính phí & Gửi hóa đơn\ncho sinh viên', 'x': 195, 'y': 550, 'w': 140, 'h': 50},
        {'id': 'end1', 'type': 'end', 'x': 250, 'y': 630, 'w': 30, 'h': 30},
        {'id': 'act_reroute', 'type': 'action', 'text': 'Điều hướng sinh viên\nsang Hub phụ', 'x': 390, 'y': 205, 'w': 140, 'h': 50},
        {'id': 'act_warn', 'type': 'action', 'text': 'Cảnh báo đẩy chặt\nchốt khóa vật lý', 'x': 390, 'y': 380, 'w': 140, 'h': 50},
    ],
    edges=[
        {'src': 'start', 'dst': 'act1'},
        {'src': 'act1', 'dst': 'dec1'},
        {'src': 'dec1', 'dst': 'act2', 'label': '[Còn chỗ]'},
        {'src': 'dec1', 'dst': 'act_reroute', 'label': '[Đầy bãi]'},
        {'src': 'act2', 'dst': 'dec2'},
        {'src': 'dec2', 'dst': 'act3', 'label': '[Đã khóa]'},
        {'src': 'dec2', 'dst': 'act_warn', 'label': '[Chưa khớp]'},
        {'src': 'act_warn', 'dst': 'act2', 'x1': 460, 'y1': 380, 'x2': 335, 'y2': 315},
        {'src': 'act3', 'dst': 'act4'},
        {'src': 'act4', 'dst': 'end1'},
    ]
)

# AD04: Reserve Parking & Charging Workflow
build_activity_diagram(
    filepath=os.path.join(ACT_DIR, "AD04-Reserve_Parking_and_Charging.drawio.svg"),
    title="Activity Diagram: AD04 - Reserve Parking & Charging Workflow",
    nodes=[
        {'id': 'start', 'type': 'start', 'x': 250, 'y': 60, 'w': 30, 'h': 30},
        {'id': 'act1', 'type': 'action', 'text': 'Chọn Hub & Khung\ngiờ gửi xe', 'x': 195, 'y': 120, 'w': 140, 'h': 50},
        {'id': 'dec1', 'type': 'decision', 'text': 'Còn slot đỗ trống?', 'x': 200, 'y': 200, 'w': 130, 'h': 60},
        {'id': 'act2', 'type': 'action', 'text': 'Khóa giữ ô đỗ &\nCấp mã QR bãi', 'x': 195, 'y': 290, 'w': 140, 'h': 50},
        {'id': 'dec2', 'type': 'decision', 'text': 'Có nhu cầu sạc pin\nxe cá nhân?', 'x': 195, 'y': 370, 'w': 140, 'h': 70},
        {'id': 'act3', 'type': 'action', 'text': 'Nhập % pin & Giờ\ncần lấy xe', 'x': 195, 'y': 470, 'w': 140, 'h': 50},
        {'id': 'act4', 'type': 'action', 'text': 'Phân bổ trụ sạc /\nXếp hàng đợi sạc', 'x': 195, 'y': 550, 'w': 140, 'h': 50},
        {'id': 'end1', 'type': 'end', 'x': 250, 'y': 630, 'w': 30, 'h': 30},
        {'id': 'act_err', 'type': 'action', 'text': 'Báo hết chỗ & Gợi\ný khung giờ khác', 'x': 390, 'y': 205, 'w': 140, 'h': 50},
    ],
    edges=[
        {'src': 'start', 'dst': 'act1'},
        {'src': 'act1', 'dst': 'dec1'},
        {'src': 'dec1', 'dst': 'act2', 'label': '[Còn slot]'},
        {'src': 'dec1', 'dst': 'act_err', 'label': '[Hết slot]'},
        {'src': 'act2', 'dst': 'dec2'},
        {'src': 'dec2', 'dst': 'act3', 'label': '[Có sạc]'},
        {'src': 'dec2', 'dst': 'end1', 'label': '[Không sạc]', 'x1': 200, 'y1': 405, 'x2': 250, 'y2': 630},
        {'src': 'act3', 'dst': 'act4'},
        {'src': 'act4', 'dst': 'end1'},
    ]
)

# AD05: Vehicle Redistribution Workflow
build_activity_diagram(
    filepath=os.path.join(ACT_DIR, "AD05-Redistribute_Vehicles.drawio.svg"),
    title="Activity Diagram: AD05 - Vehicle Redistribution Workflow",
    nodes=[
        {'id': 'start', 'type': 'start', 'x': 250, 'y': 60, 'w': 30, 'h': 30},
        {'id': 'act1', 'type': 'action', 'text': 'Dashboard cảnh báo\nlệch tải cung cầu', 'x': 195, 'y': 120, 'w': 140, 'h': 50},
        {'id': 'act2', 'type': 'action', 'text': 'Chọn Hub nguồn,\nHub đích & số xe', 'x': 195, 'y': 200, 'w': 140, 'h': 50},
        {'id': 'dec1', 'type': 'decision', 'text': 'Hub nguồn đủ xe\nPin >= 80%?', 'x': 195, 'y': 280, 'w': 140, 'h': 70},
        {'id': 'dec2', 'type': 'decision', 'text': 'Hub đích đủ\nslot đỗ tiếp nhận?', 'x': 195, 'y': 380, 'w': 140, 'h': 70},
        {'id': 'act3', 'type': 'action', 'text': 'Khóa xe In-Transit\n& Tạo lệnh vận chuyển', 'x': 195, 'y': 480, 'w': 140, 'h': 50},
        {'id': 'act4', 'type': 'action', 'text': 'Giao lệnh tài xế &\nTheo dõi lộ trình', 'x': 195, 'y': 560, 'w': 140, 'h': 50},
        {'id': 'end1', 'type': 'end', 'x': 250, 'y': 640, 'w': 30, 'h': 30},
        {'id': 'act_alt', 'type': 'action', 'text': 'Gợi ý Hub đích\nthay thế lân cận', 'x': 390, 'y': 390, 'w': 140, 'h': 50},
    ],
    edges=[
        {'src': 'start', 'dst': 'act1'},
        {'src': 'act1', 'dst': 'act2'},
        {'src': 'act2', 'dst': 'dec1'},
        {'src': 'dec1', 'dst': 'dec2', 'label': '[Đủ xe pin đầy]'},
        {'src': 'dec2', 'dst': 'act3', 'label': '[Đủ chỗ trống]'},
        {'src': 'dec2', 'dst': 'act_alt', 'label': '[Thiếu chỗ đỗ]'},
        {'src': 'act_alt', 'dst': 'act2', 'x1': 460, 'y1': 390, 'x2': 335, 'y2': 225},
        {'src': 'act3', 'dst': 'act4'},
        {'src': 'act4', 'dst': 'end1'},
    ]
)

# AD06: Handle Operational Incident Workflow
build_activity_diagram(
    filepath=os.path.join(ACT_DIR, "AD06-Handle_Operational_Incident.drawio.svg"),
    title="Activity Diagram: AD06 - Handle Operational Incident Workflow",
    nodes=[
        {'id': 'start', 'type': 'start', 'x': 250, 'y': 60, 'w': 30, 'h': 30},
        {'id': 'act1', 'type': 'action', 'text': 'Tiếp nhận báo cáo /\nCảnh báo telemetry', 'x': 195, 'y': 120, 'w': 140, 'h': 50},
        {'id': 'dec1', 'type': 'decision', 'text': 'Mức độ sự cố?', 'x': 200, 'y': 200, 'w': 130, 'h': 60},
        {'id': 'act2', 'type': 'action', 'text': 'Ngắt điện tức thời &\nKhóa thiết bị từ xa', 'x': 195, 'y': 290, 'w': 140, 'h': 50},
        {'id': 'act3', 'type': 'action', 'text': 'Tạo phiếu bảo trì &\nPhân công kỹ thuật', 'x': 195, 'y': 370, 'w': 140, 'h': 50},
        {'id': 'act4', 'type': 'action', 'text': 'Kỹ thuật viên sửa chữa\nvà nghiệm thu app', 'x': 195, 'y': 450, 'w': 140, 'h': 50},
        {'id': 'act5', 'type': 'action', 'text': 'Tái kích hoạt tài\nnguyên (Available)', 'x': 195, 'y': 530, 'w': 140, 'h': 50},
        {'id': 'end1', 'type': 'end', 'x': 250, 'y': 610, 'w': 30, 'h': 30},
    ],
    edges=[
        {'src': 'start', 'dst': 'act1'},
        {'src': 'act1', 'dst': 'dec1'},
        {'src': 'dec1', 'dst': 'act2', 'label': '[Khẩn cấp / Lỗi nặng]'},
        {'src': 'dec1', 'dst': 'act3', 'label': '[Lỗi nhẹ / Sơn xe]', 'x1': 200, 'y1': 230, 'x2': 195, 'y2': 395},
        {'src': 'act2', 'dst': 'act3'},
        {'src': 'act3', 'dst': 'act4'},
        {'src': 'act4', 'dst': 'act5'},
        {'src': 'act5', 'dst': 'end1'},
    ]
)

# AD07: What-if Simulation Workflow
build_activity_diagram(
    filepath=os.path.join(ACT_DIR, "AD07-Run_What_if_Simulation.drawio.svg"),
    title="Activity Diagram: AD07 - What-if Simulation Workflow",
    nodes=[
        {'id': 'start', 'type': 'start', 'x': 250, 'y': 60, 'w': 30, 'h': 30},
        {'id': 'act1', 'type': 'action', 'text': 'Chọn 1 trong 5\nkịch bản giả định', 'x': 195, 'y': 120, 'w': 140, 'h': 50},
        {'id': 'act2', 'type': 'action', 'text': 'Cấu hình tham số\n(Khách tăng, Trụ hỏng)', 'x': 195, 'y': 200, 'w': 140, 'h': 50},
        {'id': 'act3', 'type': 'action', 'text': 'Thực thi mô phỏng\nbiến đổi trạng thái', 'x': 195, 'y': 280, 'w': 140, 'h': 50},
        {'id': 'act4', 'type': 'action', 'text': 'Hiển thị chỉ số KPI\n& Đề xuất điều phối', 'x': 195, 'y': 360, 'w': 140, 'h': 50},
        {'id': 'dec1', 'type': 'decision', 'text': 'Chấp thuận\nkhuyến nghị?', 'x': 200, 'y': 440, 'w': 130, 'h': 60},
        {'id': 'act5', 'type': 'action', 'text': 'Phát lệnh điều phối\ntự động vào thực tế', 'x': 195, 'y': 530, 'w': 140, 'h': 50},
        {'id': 'end1', 'type': 'end', 'x': 250, 'y': 610, 'w': 30, 'h': 30},
        {'id': 'act_tune', 'type': 'action', 'text': 'Tinh chỉnh lại\ntham số kịch bản', 'x': 390, 'y': 445, 'w': 140, 'h': 50},
    ],
    edges=[
        {'src': 'start', 'dst': 'act1'},
        {'src': 'act1', 'dst': 'act2'},
        {'src': 'act2', 'dst': 'act3'},
        {'src': 'act3', 'dst': 'act4'},
        {'src': 'act4', 'dst': 'dec1'},
        {'src': 'dec1', 'dst': 'act5', 'label': '[Đồng ý áp dụng]'},
        {'src': 'dec1', 'dst': 'act_tune', 'label': '[Thử nghiệm lại]'},
        {'src': 'act_tune', 'dst': 'act2', 'x1': 460, 'y1': 445, 'x2': 335, 'y2': 225},
        {'src': 'act5', 'dst': 'end1'},
    ]
)

print("Activity diagrams generated.")


# ==============================================================================
# 3. STATE-CHART DIAGRAMS (SC01 to SC03)
# ==============================================================================

# SC01: Vehicle State Machine
build_statechart_diagram(
    filepath=os.path.join(STA_DIR, "SC01-Vehicle_State_Machine.drawio.svg"),
    title="State Machine: SC01 - Vehicle Lifecycle (Bonus)",
    states=[
        {'id': 'init', 'type': 'initial', 'x': 60, 'y': 140, 'w': 24, 'h': 24},
        {'id': 's_avail', 'type': 'state', 'name': 'Available\n(Sẵn sàng)', 'x': 150, 'y': 120, 'w': 130, 'h': 60},
        {'id': 's_res', 'type': 'state', 'name': 'Reserved\n(Đang giữ 15p)', 'x': 360, 'y': 120, 'w': 130, 'h': 60},
        {'id': 's_inuse', 'type': 'state', 'name': 'In-Use\n(Đang di chuyển)', 'x': 570, 'y': 120, 'w': 130, 'h': 60},
        {'id': 's_need', 'type': 'state', 'name': 'Needs Charging\n(Chờ sạc pin)', 'x': 570, 'y': 260, 'w': 130, 'h': 60},
        {'id': 's_char', 'type': 'state', 'name': 'Charging\n(Đang sạc)', 'x': 360, 'y': 260, 'w': 130, 'h': 60},
        {'id': 's_maint', 'type': 'state', 'name': 'Under Maintenance\n(Đang bảo trì)', 'x': 150, 'y': 260, 'w': 130, 'h': 60},
        {'id': 's_trans', 'type': 'state', 'name': 'In-Transit\n(Đang điều chuyển)', 'x': 150, 'y': 380, 'w': 130, 'h': 60},
    ],
    transitions=[
        {'src': 'init', 'dst': 's_avail', 'event': 'register'},
        {'src': 's_avail', 'dst': 's_res', 'event': 'reserveVehicle', 'guard': 'battery >= 20%'},
        {'src': 's_res', 'dst': 's_avail', 'event': 'timeout / cancel', 'guard': 'after 15 mins'},
        {'src': 's_res', 'dst': 's_inuse', 'event': 'unlockVehicle', 'guard': 'code matches'},
        {'src': 's_inuse', 'dst': 's_avail', 'event': 'returnVehicle', 'guard': 'battery >= 20%'},
        {'src': 's_inuse', 'dst': 's_need', 'event': 'returnVehicle', 'guard': 'battery < 20%'},
        {'src': 's_need', 'dst': 's_char', 'event': 'plugCharger'},
        {'src': 's_char', 'dst': 's_avail', 'event': 'chargeComplete', 'guard': 'battery >= 80%'},
        {'src': 's_avail', 'dst': 's_maint', 'event': 'reportDamage / fault'},
        {'src': 's_maint', 'dst': 's_avail', 'event': 'maintenanceComplete'},
        {'src': 's_avail', 'dst': 's_trans', 'event': 'dispatchTransfer'},
        {'src': 's_trans', 'dst': 's_avail', 'event': 'deliveredAtDestHub'},
    ]
)

# SC02: Charging Point State Machine
build_statechart_diagram(
    filepath=os.path.join(STA_DIR, "SC02-Charging_Point_State_Machine.drawio.svg"),
    title="State Machine: SC02 - Charging Point Lifecycle (Bonus)",
    states=[
        {'id': 'init', 'type': 'initial', 'x': 60, 'y': 140, 'w': 24, 'h': 24},
        {'id': 's_idle', 'type': 'state', 'name': 'Idle / Available\n(Cổng sẵn sàng)', 'x': 150, 'y': 120, 'w': 130, 'h': 60},
        {'id': 's_res', 'type': 'state', 'name': 'Reserved\n(Đã xếp lịch)', 'x': 360, 'y': 120, 'w': 130, 'h': 60},
        {'id': 's_char', 'type': 'state', 'name': 'Charging (Active)\n(Đang cấp điện)', 'x': 570, 'y': 120, 'w': 130, 'h': 60},
        {'id': 's_comp', 'type': 'state', 'name': 'Charge Complete\n(Sạc hoàn tất)', 'x': 570, 'y': 260, 'w': 130, 'h': 60},
        {'id': 's_fault', 'type': 'state', 'name': 'Fault / Out of Order\n(Sự cố mất điện)', 'x': 360, 'y': 260, 'w': 130, 'h': 60},
        {'id': 's_maint', 'type': 'state', 'name': 'Under Maintenance\n(Đang sửa chữa)', 'x': 150, 'y': 260, 'w': 130, 'h': 60},
    ],
    transitions=[
        {'src': 'init', 'dst': 's_idle', 'event': 'installPort'},
        {'src': 's_idle', 'dst': 's_res', 'event': 'assignSchedule'},
        {'src': 's_res', 'dst': 's_char', 'event': 'plugInVehicle'},
        {'src': 's_char', 'dst': 's_comp', 'event': 'batteryFull', 'guard': '>= 80%'},
        {'src': 's_comp', 'dst': 's_idle', 'event': 'unplugVehicle'},
        {'src': 's_char', 'dst': 's_fault', 'event': 'shortCircuit / surge'},
        {'src': 's_fault', 'dst': 's_maint', 'event': 'createIncidentTicket'},
        {'src': 's_maint', 'dst': 's_idle', 'event': 'testAndReactivate'},
    ]
)

# SC03: Reservation and Trip State Machine
build_statechart_diagram(
    filepath=os.path.join(STA_DIR, "SC03-Reservation_and_Trip_State_Machine.drawio.svg"),
    title="State Machine: SC03 - Reservation & Trip Lifecycle (Bonus)",
    states=[
        {'id': 'init', 'type': 'initial', 'x': 60, 'y': 140, 'w': 24, 'h': 24},
        {'id': 's_pend', 'type': 'state', 'name': 'Reserved\n(Đang giữ chỗ 15p)', 'x': 150, 'y': 120, 'w': 130, 'h': 60},
        {'id': 's_active', 'type': 'state', 'name': 'Active (In-Trip)\n(Hành trình)', 'x': 360, 'y': 120, 'w': 130, 'h': 60},
        {'id': 's_done', 'type': 'state', 'name': 'Completed\n(Đã hoàn thành)', 'x': 570, 'y': 120, 'w': 130, 'h': 60},
        {'id': 'final_done', 'type': 'final', 'x': 750, 'y': 138, 'w': 24, 'h': 24},
        {'id': 's_canc', 'type': 'state', 'name': 'Cancelled\n(Người dùng hủy)', 'x': 250, 'y': 250, 'w': 130, 'h': 60},
        {'id': 's_exp', 'type': 'state', 'name': 'Expired\n(Tự hủy quá 15p)', 'x': 430, 'y': 250, 'w': 130, 'h': 60},
    ],
    transitions=[
        {'src': 'init', 'dst': 's_pend', 'event': 'createReservation'},
        {'src': 's_pend', 'dst': 's_active', 'event': 'unlockVehicle', 'guard': 'within 15 mins'},
        {'src': 's_active', 'dst': 's_done', 'event': 'returnAndLockVehicle'},
        {'src': 's_done', 'dst': 'final_done', 'event': 'paymentSettled'},
        {'src': 's_pend', 'dst': 's_canc', 'event': 'userCancel'},
        {'src': 's_pend', 'dst': 's_exp', 'event': 'autoExpireDaemon', 'guard': 'after 15 mins'},
    ]
)

print("State-chart diagrams generated.")
print("ALL PHASE 2 DIAGRAMS SUCCESSFULLY GENERATED!")
