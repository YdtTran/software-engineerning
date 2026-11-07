#!/usr/bin/env python3
"""Verify Submission #3 Test Cases specification and execute reference domain unit tests."""

from __future__ import annotations

import abc
from dataclasses import dataclass, field
from datetime import datetime, timedelta, timezone
from enum import Enum
from pathlib import Path
import re
import unittest

HERE = Path(__file__).resolve().parent
TEST_CASES_MD = HERE / "TEST_CASES.md"
METHOD_DESC_MD = HERE / "METHOD_DESCRIPTIONS.md"
if not METHOD_DESC_MD.exists():
    METHOD_DESC_MD = HERE.parents[1] / ".agent" / "class-diagram" / "CLASS_CATALOG.md"
CLASS_CATALOG_MD = HERE / "CLASS_CATALOG.md"
if not CLASS_CATALOG_MD.exists():
    CLASS_CATALOG_MD = HERE.parents[1] / ".agent" / "class-diagram" / "CLASS_CATALOG.md"


# ---------------------------------------------------------------------------
# Reference Domain Model implementing the 18 operations in METHOD_DESCRIPTIONS
# ---------------------------------------------------------------------------
class DomainError(Exception):
    pass


class InvalidRole(DomainError):
    pass


class InvalidBattery(DomainError):
    pass


class InconsistentState(DomainError):
    pass


class InvalidVehicle(DomainError):
    pass


class InvalidTime(DomainError):
    pass


class InvalidTransition(DomainError):
    pass


class AllocationConflict(DomainError):
    pass


class CapacityConflict(DomainError):
    pass


class ReturnNotConfirmed(DomainError):
    pass


class StopNotConfirmed(DomainError):
    pass


class ArrivalNotConfirmed(DomainError):
    pass


class RecoveryNotVerified(DomainError):
    pass


class InvalidTarget(DomainError):
    pass


class MissingSnapshotContext(DomainError):
    pass


class InvalidResult(DomainError):
    pass


class ResultAlreadyOwned(DomainError):
    pass


class UserRole(Enum):
    Student = "Student"
    Operator = "Operator"


class VehicleOwnership(Enum):
    Shared = "Shared"
    Private = "Private"


class VehicleStatus(Enum):
    Available = "Available"
    Reserved = "Reserved"
    InUse = "InUse"
    Charging = "Charging"
    InTransfer = "InTransfer"
    Faulty = "Faulty"
    Maintenance = "Maintenance"


class ParkingStatus(Enum):
    Available = "Available"
    Held = "Held"
    Occupied = "Occupied"
    Suspended = "Suspended"


class ChargingPointStatus(Enum):
    Available = "Available"
    InUse = "InUse"
    Faulty = "Faulty"
    Maintenance = "Maintenance"


class ReservationStatus(Enum):
    Pending = "Pending"
    Reserved = "Reserved"
    Fulfilled = "Fulfilled"
    Cancelled = "Cancelled"
    Expired = "Expired"


class TripStatus(Enum):
    Active = "Active"
    Completed = "Completed"


class ChargingRequestStatus(Enum):
    Queued = "Queued"
    Charging = "Charging"
    Completed = "Completed"
    Cancelled = "Cancelled"


class ChargingSessionStatus(Enum):
    Active = "Active"
    Completed = "Completed"
    Interrupted = "Interrupted"


class TransferStatus(Enum):
    Planned = "Planned"
    InTransit = "InTransit"
    Completed = "Completed"
    Cancelled = "Cancelled"


class IncidentStatus(Enum):
    Open = "Open"
    Investigating = "Investigating"
    Resolved = "Resolved"


class ScenarioType(Enum):
    MetroSurge = "MetroSurge"
    FullParking = "FullParking"
    ChargingDemandSurge = "ChargingDemandSurge"
    PartialChargerFailure = "PartialChargerFailure"
    VehicleClustering = "VehicleClustering"


class SimulationRunStatus(Enum):
    Pending = "Pending"
    Running = "Running"
    Completed = "Completed"
    Failed = "Failed"


@dataclass
class UserAccount:
    accountId: str
    roles: set[UserRole]

    def hasRole(self, role: UserRole) -> bool:
        if not isinstance(role, UserRole):
            raise InvalidRole(f"Undeclared role: {role!r}")
        if not self.roles:
            raise InconsistentState("Account must have a non-empty valid roles set")
        return role in self.roles


@dataclass
class ElectricVehicle(abc.ABC):
    vehicleId: str
    batteryPercent: int
    status: VehicleStatus = VehicleStatus.Available
    ownership: VehicleOwnership = VehicleOwnership.Shared
    connector: str = "TYPE2"
    currentHub: MobilityHub | None = None
    currentSlot: ParkingSlot | None = None
    activeHold: bool = False
    activeTrip: bool = False
    activeSession: bool = False
    activeTransfer: bool = False
    unresolvedIncidents: int = 0

    @abc.abstractmethod
    def _vehicleKind(self) -> str:
        raise NotImplementedError

    def updateBattery(self, percent: int) -> None:
        if isinstance(percent, bool) or not isinstance(percent, int) or percent < 0 or percent > 100:
            raise InvalidBattery(f"Battery percent must be integer in [0, 100], got {percent!r}")
        self.batteryPercent = percent

    def isRentable(self) -> bool:
        if self.status == VehicleStatus.Available and self.currentHub is None:
            raise InconsistentState("Available vehicle must have a currentHub")
        return (
            self.ownership == VehicleOwnership.Shared
            and self.status == VehicleStatus.Available
            and self.batteryPercent >= 20
            and self.currentHub is not None
            and not self.activeHold
            and not self.activeTrip
            and not self.activeSession
            and not self.activeTransfer
            and self.unresolvedIncidents == 0
        )


class ElectricBicycle(ElectricVehicle):
    def _vehicleKind(self) -> str:
        return "ElectricBicycle"


class ElectricMotorcycle(ElectricVehicle):
    def _vehicleKind(self) -> str:
        return "ElectricMotorcycle"


@dataclass
class ParkingSlot:
    slotId: str
    status: ParkingStatus = ParkingStatus.Available
    hub: MobilityHub | None = None
    occupant: ElectricVehicle | None = None
    activeHold: bool = False

    def canAccept(self, vehicle: ElectricVehicle) -> bool:
        if not isinstance(vehicle, ElectricVehicle):
            raise InvalidVehicle("Expected ElectricVehicle")
        if self.status == ParkingStatus.Available and self.occupant is not None:
            raise InconsistentState("Available slot cannot have an occupant")
        if self.status != ParkingStatus.Available or self.occupant is not None or self.activeHold:
            return False
        if vehicle.currentSlot is not None and vehicle.currentSlot is not self:
            return False
        return True


@dataclass
class ChargingPoint:
    pointId: str
    status: ChargingPointStatus = ChargingPointStatus.Available
    connector: str = "TYPE2"
    ratedPowerKW: float = 7.0
    hub: MobilityHub | None = None
    unresolvedIncidents: int = 0

    def canServe(self, vehicle: ElectricVehicle) -> bool:
        if not isinstance(vehicle, ElectricVehicle):
            raise InvalidVehicle("Expected ElectricVehicle")
        if self.hub is None:
            raise InconsistentState("ChargingPoint must belong to a hub")
        return (
            self.status == ChargingPointStatus.Available
            and self.unresolvedIncidents == 0
            and self.connector == vehicle.connector
            and vehicle.currentHub is self.hub
            and vehicle.status not in {VehicleStatus.InUse, VehicleStatus.InTransfer, VehicleStatus.Faulty, VehicleStatus.Maintenance}
            and not vehicle.activeTrip
            and not vehicle.activeTransfer
            and not vehicle.activeSession
            and vehicle.unresolvedIncidents == 0
        )


@dataclass
class MobilityHub:
    hubId: str
    name: str
    powerLimitKW: float = 34.0
    slots: list[ParkingSlot] = field(default_factory=list)
    points: list[ChargingPoint] = field(default_factory=list)

    def availableParkingCount(self) -> int:
        count = 0
        for s in self.slots:
            if s.status == ParkingStatus.Available and s.occupant is not None:
                raise InconsistentState("Available slot cannot have an occupant")
            if s.status == ParkingStatus.Available and s.occupant is None and not s.activeHold:
                count += 1
        return count


class Reservation(abc.ABC):
    def __init__(self, reservationId: str, status: ReservationStatus = ReservationStatus.Reserved) -> None:
        if type(self) is Reservation:
            raise TypeError("Reservation is abstract and cannot be instantiated directly")
        self.reservationId = reservationId
        self.status = status
        self.expiresAt: datetime = self.calculateExpiry()

    @abc.abstractmethod
    def calculateExpiry(self) -> datetime:
        raise NotImplementedError

    @abc.abstractmethod
    def _releaseHold(self) -> None:
        raise NotImplementedError

    def cancel(self) -> None:
        if self.status == ReservationStatus.Cancelled:
            return
        if self.status not in {ReservationStatus.Pending, ReservationStatus.Reserved}:
            raise InvalidTransition(f"Cannot cancel reservation in status {self.status}")
        self._releaseHold()
        self.status = ReservationStatus.Cancelled

    def expire(self, now: datetime) -> bool:
        if not isinstance(now, datetime):
            raise InvalidTime("now must be a valid datetime")
        if self.status not in {ReservationStatus.Pending, ReservationStatus.Reserved}:
            return False
        if now < self.expiresAt:
            return False
        self._releaseHold()
        self.status = ReservationStatus.Expired
        return True


class VehicleReservation(Reservation):
    def __init__(
        self,
        reservationId: str,
        reservedAt: datetime,
        reservedVehicle: ElectricVehicle,
        status: ReservationStatus = ReservationStatus.Reserved,
    ) -> None:
        self.reservedAt = reservedAt
        self.reservedVehicle = reservedVehicle
        super().__init__(reservationId, status)
        if status in {ReservationStatus.Pending, ReservationStatus.Reserved}:
            reservedVehicle.activeHold = True
            if reservedVehicle.status == VehicleStatus.Available:
                reservedVehicle.status = VehicleStatus.Reserved

    def calculateExpiry(self) -> datetime:
        if not isinstance(self.reservedAt, datetime):
            raise InvalidTime("reservedAt must be a valid datetime")
        return self.reservedAt + timedelta(minutes=15)

    def _releaseHold(self) -> None:
        self.reservedVehicle.activeHold = False
        if (
            self.reservedVehicle.status == VehicleStatus.Reserved
            and self.reservedVehicle.unresolvedIncidents == 0
            and not self.reservedVehicle.activeTrip
        ):
            self.reservedVehicle.status = VehicleStatus.Available


class ParkingReservation(Reservation):
    def __init__(
        self,
        reservationId: str,
        scheduledArrivalAt: datetime,
        reservedSlot: ParkingSlot,
        status: ReservationStatus = ReservationStatus.Reserved,
    ) -> None:
        self.scheduledArrivalAt = scheduledArrivalAt
        self.reservedSlot = reservedSlot
        super().__init__(reservationId, status)
        if status in {ReservationStatus.Pending, ReservationStatus.Reserved}:
            reservedSlot.activeHold = True
            if reservedSlot.status == ParkingStatus.Available:
                reservedSlot.status = ParkingStatus.Held

    def calculateExpiry(self) -> datetime:
        if not isinstance(self.scheduledArrivalAt, datetime):
            raise InvalidTime("scheduledArrivalAt must be a valid datetime")
        return self.scheduledArrivalAt + timedelta(minutes=30)

    def _releaseHold(self) -> None:
        self.reservedSlot.activeHold = False
        if self.reservedSlot.status == ParkingStatus.Held and self.reservedSlot.occupant is None:
            self.reservedSlot.status = ParkingStatus.Available


@dataclass
class Trip:
    tripId: str
    vehicle: ElectricVehicle
    pickupHub: MobilityHub
    pickedUpAt: datetime
    status: TripStatus = TripStatus.Active
    returnHub: MobilityHub | None = None
    returnedAt: datetime | None = None
    targetSlot: ParkingSlot | None = None
    returnConfirmed: bool = True

    def complete(self, at: datetime) -> None:
        if not isinstance(at, datetime) or at < self.pickedUpAt:
            raise InvalidTime("Return instant must be >= pickedUpAt")
        if self.status != TripStatus.Active:
            raise InvalidTransition("Trip is not Active")
        if not self.returnConfirmed:
            raise ReturnNotConfirmed("Physical/simulated return not confirmed")
        if self.targetSlot is None or not self.targetSlot.canAccept(self.vehicle):
            raise CapacityConflict("Destination parking slot unavailable")
        self.status = TripStatus.Completed
        self.returnedAt = at
        self.returnHub = self.targetSlot.hub
        self.targetSlot.status = ParkingStatus.Occupied
        self.targetSlot.occupant = self.vehicle
        self.vehicle.currentSlot = self.targetSlot
        self.vehicle.currentHub = self.targetSlot.hub
        self.vehicle.activeTrip = False
        if self.vehicle.unresolvedIncidents > 0:
            self.vehicle.status = VehicleStatus.Faulty
        else:
            self.vehicle.status = VehicleStatus.Available


@dataclass
class ChargingRequest:
    requestId: str
    batteryAtRequest: int
    neededBy: datetime
    status: ChargingRequestStatus = ChargingRequestStatus.Queued

    def isUrgent(self) -> bool:
        if (
            isinstance(self.batteryAtRequest, bool)
            or not isinstance(self.batteryAtRequest, int)
            or self.batteryAtRequest < 0
            or self.batteryAtRequest > 100
        ):
            raise InvalidBattery("Corrupt batteryAtRequest")
        return self.batteryAtRequest < 10


@dataclass
class ChargingSession:
    sessionId: str
    request: ChargingRequest
    point: ChargingPoint
    startedAt: datetime
    allocatedPowerKW: float = 7.0
    status: ChargingSessionStatus = ChargingSessionStatus.Active
    stoppedAt: datetime | None = None
    stopConfirmed: bool = True
    stopReason: str = "Satisfied"  # "Satisfied" | "UserCancelled" | "TechnicalFault"

    def stop(self, at: datetime) -> None:
        if not isinstance(at, datetime) or at < self.startedAt:
            raise InvalidTime("Stop instant must be >= startedAt")
        if self.status != ChargingSessionStatus.Active:
            raise InvalidTransition("ChargingSession is not Active")
        if not self.stopConfirmed:
            raise StopNotConfirmed("Charger de-energization not confirmed")
        self.stoppedAt = at
        if self.stopReason == "Satisfied":
            self.status = ChargingSessionStatus.Completed
            self.request.status = ChargingRequestStatus.Completed
            if self.point.status == ChargingPointStatus.InUse and self.point.unresolvedIncidents == 0:
                self.point.status = ChargingPointStatus.Available
        elif self.stopReason == "UserCancelled":
            self.status = ChargingSessionStatus.Interrupted
            self.request.status = ChargingRequestStatus.Cancelled
            if self.point.status == ChargingPointStatus.InUse and self.point.unresolvedIncidents == 0:
                self.point.status = ChargingPointStatus.Available
        else:
            self.status = ChargingSessionStatus.Interrupted
            self.request.status = ChargingRequestStatus.Queued
            self.point.status = ChargingPointStatus.Faulty


@dataclass
class TransferOrder:
    orderId: str
    sourceHub: MobilityHub
    destinationHub: MobilityHub
    vehicles: list[ElectricVehicle]
    destinationSlots: list[ParkingSlot]
    status: TransferStatus = TransferStatus.InTransit
    dispatchedAt: datetime | None = None
    completedAt: datetime | None = None
    arrivalConfirmed: bool = True

    def complete(self, at: datetime) -> None:
        if self.status != TransferStatus.InTransit or self.dispatchedAt is None:
            raise InvalidTransition("TransferOrder must be InTransit with dispatchedAt")
        if not isinstance(at, datetime) or at < self.dispatchedAt:
            raise InvalidTime("Arrival instant must be >= dispatchedAt")
        if not self.arrivalConfirmed:
            raise ArrivalNotConfirmed("Vehicle arrival not confirmed")
        if (
            self.sourceHub is self.destinationHub
            or not self.vehicles
            or len(self.destinationSlots) < len(self.vehicles)
        ):
            raise CapacityConflict("Invalid destination capacity or hub assignment")
        for v, slot in zip(self.vehicles, self.destinationSlots):
            slot.activeHold = False
            slot.status = ParkingStatus.Occupied
            slot.occupant = v
            v.currentHub = self.destinationHub
            v.currentSlot = slot
            v.activeTransfer = False
            v.status = VehicleStatus.Faulty if v.unresolvedIncidents > 0 else VehicleStatus.Available
        self.completedAt = at
        self.status = TransferStatus.Completed


@dataclass
class OperationalIncident:
    incidentId: str
    reportedAt: datetime
    status: IncidentStatus = IncidentStatus.Investigating
    affectedVehicle: ElectricVehicle | None = None
    affectedPoint: ChargingPoint | None = None
    resolvedAt: datetime | None = None
    recoveryVerified: bool = True

    def resolve(self, at: datetime) -> None:
        if (self.affectedVehicle is None) == (self.affectedPoint is None):
            raise InvalidTarget("Incident XOR violated: exactly one target required")
        if self.status not in {IncidentStatus.Open, IncidentStatus.Investigating}:
            raise InvalidTransition("Incident is already resolved")
        if not isinstance(at, datetime) or at < self.reportedAt:
            raise InvalidTime("Resolution instant must be >= reportedAt")
        if not self.recoveryVerified:
            raise RecoveryNotVerified("Maintenance recovery has not been verified")
        self.status = IncidentStatus.Resolved
        self.resolvedAt = at
        if self.affectedVehicle is not None:
            self.affectedVehicle.unresolvedIncidents = max(0, self.affectedVehicle.unresolvedIncidents - 1)
            if self.affectedVehicle.unresolvedIncidents == 0 and self.affectedVehicle.status == VehicleStatus.Faulty:
                self.affectedVehicle.status = VehicleStatus.Available
        if self.affectedPoint is not None:
            self.affectedPoint.unresolvedIncidents = max(0, self.affectedPoint.unresolvedIncidents - 1)
            if self.affectedPoint.unresolvedIncidents == 0 and self.affectedPoint.status == ChargingPointStatus.Faulty:
                self.affectedPoint.status = ChargingPointStatus.Available


@dataclass(frozen=True)
class NetworkSnapshot:
    capturedAt: datetime
    hubPointIds: dict[str, set[str]]
    fleetSize: int


@dataclass
class SimulationScenario:
    scenarioId: str
    type: ScenarioType
    parameters: dict[str, object]
    snapshot: NetworkSnapshot | None = None

    def validate(self) -> bool:
        if self.snapshot is None:
            raise MissingSnapshotContext("Snapshot context is required to validate scenario")
        if not isinstance(self.type, ScenarioType):
            return False
        hub_id = self.parameters.get("targetHubId")
        duration = self.parameters.get("durationMinutes")
        if not isinstance(hub_id, str) or hub_id not in self.snapshot.hubPointIds:
            return False
        if isinstance(duration, bool) or not isinstance(duration, int) or duration <= 0:
            return False

        if self.type == ScenarioType.MetroSurge:
            val = self.parameters.get("arrivalsPerHour")
            return not isinstance(val, bool) and isinstance(val, int) and val >= 0
        if self.type == ScenarioType.FullParking:
            val = self.parameters.get("occupancyPercent")
            return not isinstance(val, bool) and isinstance(val, int) and val == 100
        if self.type == ScenarioType.ChargingDemandSurge:
            val = self.parameters.get("chargingRequestsPerHour")
            return not isinstance(val, bool) and isinstance(val, int) and val >= 0
        if self.type == ScenarioType.PartialChargerFailure:
            pts = self.parameters.get("failedPointIds")
            hub_pts = self.snapshot.hubPointIds[hub_id]
            return (
                isinstance(pts, set)
                and 0 < len(pts) < len(hub_pts)
                and pts.issubset(hub_pts)
            )
        if self.type == ScenarioType.VehicleClustering:
            val = self.parameters.get("clusteredVehicleCount")
            return (
                not isinstance(val, bool)
                and isinstance(val, int)
                and 0 <= val <= self.snapshot.fleetSize
            )
        return False


@dataclass
class SimulationResult:
    resultId: str
    serviceSuccessRate: float
    averageWaitMinutes: float
    rejectedTripCount: int
    recommendations: list[str] = field(default_factory=list)
    ownerRunId: str | None = None


@dataclass
class SimulationRun:
    runId: str
    scenario: SimulationScenario
    snapshot: NetworkSnapshot
    status: SimulationRunStatus = SimulationRunStatus.Running
    result: SimulationResult | None = None

    def complete(self, result: SimulationResult) -> None:
        if self.status != SimulationRunStatus.Running or self.result is not None:
            raise InvalidTransition("SimulationRun must be Running without an existing result")
        if not isinstance(result, SimulationResult):
            raise InvalidResult("Expected SimulationResult")
        if result.ownerRunId is not None and result.ownerRunId != self.runId:
            raise ResultAlreadyOwned("SimulationResult already belongs to another run")
        if (
            not (0.0 <= result.serviceSuccessRate <= 1.0)
            or result.averageWaitMinutes < 0.0
            or result.rejectedTripCount < 0
        ):
            raise InvalidResult("SimulationResult metrics out of bounds")
        result.ownerRunId = self.runId
        self.result = result
        self.status = SimulationRunStatus.Completed


# ---------------------------------------------------------------------------
# Unit Tests for all 18 Domain Methods (UT-01 .. UT-54) & Document Traceability
# ---------------------------------------------------------------------------
TZ = timezone(timedelta(hours=7))
T0 = datetime(2026, 11, 4, 10, 0, 0, tzinfo=TZ)


class Submission3TestCasesVerification(unittest.TestCase):
    def test_document_structure_and_traceability(self) -> None:
        text = TEST_CASES_MD.read_text(encoding="utf-8")
        method_text = METHOD_DESC_MD.read_text(encoding="utf-8")

        # 1. Verify all 18 methods from METHOD_DESCRIPTIONS.md are covered in TEST_CASES.md
        methods = re.findall(r"^## ([A-Za-z]+\.[A-Za-z]+)$", method_text, flags=re.M)
        self.assertEqual(len(methods), 18, f"Expected 18 methods in METHOD_DESCRIPTIONS.md, found {len(methods)}")
        for m in methods:
            self.assertIn(f"`{m}`", text, f"Missing method {m} in TEST_CASES.md")

        # 2. Verify all 54 Unit Test IDs (UT-01 .. UT-54), 24 System UC Test IDs (SUC-01 .. SUC-24), 10 NFR IDs (NFR-01 .. NFR-10)
        for i in range(1, 55):
            self.assertIn(f"**UT-{i:02d}**", text, f"Missing UT-{i:02d}")
        for i in range(1, 25):
            self.assertIn(f"`SUC-{i:02d}`", text, f"Missing SUC-{i:02d}")
        for i in range(1, 11):
            self.assertIn(f"**NFR-{i:02d}**", text, f"Missing NFR-{i:02d}")

        # 3. Verify all 8 Slide Ch9 p.53 fields appear in every SUC table
        slide_p53_fields = [
            "| **Test case** |",
            "| **Test description** |",
            "| **Related screens** |",
            "| **Pre-conditions** |",
            "| **Actions** |",
            "| **Inputs** |",
            "| **Expected Outputs** |",
            "| **Testing environment** |",
        ]
        for field_marker in slide_p53_fields:
            occurrences = text.count(field_marker)
            self.assertEqual(occurrences, 24, f"Expected 24 occurrences of {field_marker}, got {occurrences}")

        # 4. Verify all UC01..UC14, lifecycle sub-cases, FR-NI01..FR-NI04, and 5 ScenarioTypes
        for uc_num in range(1, 15):
            self.assertIn(f"UC{uc_num:02d}", text)
        for sub_uc in ["UC06A", "UC06B", "UC07A", "UC10A", "UC10B", "UC11A"]:
            self.assertIn(sub_uc, text)
        for fr_ni in ["FR-NI01", "FR-NI02", "FR-NI03", "FR-NI04"]:
            self.assertIn(fr_ni, text)
        for st in ScenarioType:
            self.assertIn(st.value, text)

    # 1. UserAccount.hasRole (UT-01 .. UT-03)
    def test_user_account_has_role(self) -> None:
        acc1 = UserAccount("ACC-01", {UserRole.Student})
        acc3 = UserAccount("ACC-03", {UserRole.Student, UserRole.Operator})
        self.assertTrue(acc1.hasRole(UserRole.Student))
        self.assertFalse(acc1.hasRole(UserRole.Operator))
        self.assertTrue(acc3.hasRole(UserRole.Student) and acc3.hasRole(UserRole.Operator))
        with self.assertRaises(InvalidRole):
            acc1.hasRole("Admin")  # type: ignore[arg-type]

    # 2. ElectricVehicle.updateBattery (UT-04 .. UT-06)
    def test_electric_vehicle_update_battery(self) -> None:
        v = ElectricBicycle("EV-01", batteryPercent=50)
        v.updateBattery(85)
        self.assertEqual(v.batteryPercent, 85)
        v.updateBattery(0)
        self.assertEqual(v.batteryPercent, 0)
        v.updateBattery(100)
        self.assertEqual(v.batteryPercent, 100)
        v.updateBattery(50)
        for bad in (-1, 101, 55.5, True):
            with self.assertRaises(InvalidBattery):
                v.updateBattery(bad)  # type: ignore[arg-type]
        self.assertEqual(v.batteryPercent, 50)

    # 3. ElectricVehicle.isRentable (UT-07 .. UT-09)
    def test_electric_vehicle_is_rentable(self) -> None:
        hub = MobilityHub("HUB-METRO", "Metro Hub")
        v = ElectricBicycle("EV-01", batteryPercent=20, currentHub=hub)
        self.assertTrue(v.isRentable())
        v.updateBattery(19)
        self.assertFalse(v.isRentable())

        pm = ElectricMotorcycle("PM-01", batteryPercent=100, ownership=VehicleOwnership.Private, currentHub=hub)
        self.assertFalse(pm.isRentable())

        broken_context = ElectricBicycle("EV-03", batteryPercent=80, status=VehicleStatus.Available, currentHub=None)
        with self.assertRaises(InconsistentState):
            broken_context.isRentable()

    # 4. MobilityHub.availableParkingCount (UT-10 .. UT-12)
    def test_mobility_hub_available_parking_count(self) -> None:
        hub = MobilityHub("HUB-METRO", "Metro Hub")
        v = ElectricBicycle("EV-01", 80, currentHub=hub)
        hub.slots = [
            ParkingSlot("S-1", ParkingStatus.Available, hub=hub),
            ParkingSlot("S-2", ParkingStatus.Available, hub=hub),
            ParkingSlot("S-3", ParkingStatus.Occupied, hub=hub, occupant=v),
            ParkingSlot("S-4", ParkingStatus.Held, hub=hub, activeHold=True),
            ParkingSlot("S-5", ParkingStatus.Suspended, hub=hub),
        ]
        self.assertEqual(hub.availableParkingCount(), 2)
        hub.slots[0].status = ParkingStatus.Held
        hub.slots[1].status = ParkingStatus.Occupied
        hub.slots[1].occupant = v
        self.assertEqual(hub.availableParkingCount(), 0)
        hub.slots[0].status = ParkingStatus.Available
        hub.slots[0].occupant = v
        with self.assertRaises(InconsistentState):
            hub.availableParkingCount()

    # 5. ParkingSlot.canAccept (UT-13 .. UT-15)
    def test_parking_slot_can_accept(self) -> None:
        hub = MobilityHub("HUB-BK", "BK Hub")
        s1 = ParkingSlot("S-01", ParkingStatus.Available, hub=hub)
        s2 = ParkingSlot("S-02", ParkingStatus.Held, hub=hub, activeHold=True)
        v = ElectricBicycle("EV-01", 80)
        self.assertTrue(s1.canAccept(v))
        self.assertFalse(s2.canAccept(v))
        v.currentSlot = s2
        self.assertFalse(s1.canAccept(v))
        with self.assertRaises(InvalidVehicle):
            s1.canAccept(None)  # type: ignore[arg-type]

    # 6. ChargingPoint.canServe (UT-16 .. UT-18)
    def test_charging_point_can_serve(self) -> None:
        hub = MobilityHub("HUB-BK", "BK Hub")
        cp = ChargingPoint("CP-01", ChargingPointStatus.Available, connector="TYPE2", hub=hub)
        pm = ElectricMotorcycle("PM-01", 30, ownership=VehicleOwnership.Private, connector="TYPE2", currentHub=hub)
        self.assertTrue(cp.canServe(pm))
        pm.connector = "CCS"
        self.assertFalse(cp.canServe(pm))
        pm.connector = "TYPE2"
        cp.status = ChargingPointStatus.Faulty
        self.assertFalse(cp.canServe(pm))
        with self.assertRaises(InvalidVehicle):
            cp.canServe(None)  # type: ignore[arg-type]

    # 7-11. Reservation.cancel, expire, calculateExpiry & overrides (UT-19 .. UT-33)
    def test_reservations_lifecycle_and_expiry(self) -> None:
        hub = MobilityHub("HUB-METRO", "Metro Hub")
        v = ElectricBicycle("EV-01", 85, currentHub=hub)
        slot = ParkingSlot("S-01", ParkingStatus.Available, hub=hub)

        with self.assertRaises(TypeError):
            Reservation("R-ABS")  # type: ignore[abstract]

        vr = VehicleReservation("VR-01", T0, v)
        pr = ParkingReservation("PR-01", T0, slot)

        # Polymorphic dispatch & exact +15m vs +30m deadlines (UT-25 .. UT-33)
        poly: list[Reservation] = [vr, pr]
        self.assertEqual(poly[0].calculateExpiry(), T0 + timedelta(minutes=15))
        self.assertEqual(poly[1].calculateExpiry(), T0 + timedelta(minutes=30))
        self.assertEqual(vr.calculateExpiry(), vr.expiresAt)

        # expire boundary (UT-22 .. UT-24)
        self.assertFalse(vr.expire(T0 + timedelta(minutes=14, seconds=59)))
        self.assertFalse(pr.expire(T0 + timedelta(minutes=15)))
        self.assertTrue(vr.expire(T0 + timedelta(minutes=15)))
        self.assertEqual(vr.status, ReservationStatus.Expired)
        self.assertEqual(v.status, VehicleStatus.Available)
        with self.assertRaises(InvalidTime):
            pr.expire(None)  # type: ignore[arg-type]

        # cancel idempotence and InvalidTransition on Expired/Fulfilled (UT-19 .. UT-21)
        pr.cancel()
        self.assertEqual(pr.status, ReservationStatus.Cancelled)
        self.assertEqual(slot.status, ParkingStatus.Available)
        pr.cancel()  # idempotent repeat cancel
        self.assertEqual(pr.status, ReservationStatus.Cancelled)
        with self.assertRaises(InvalidTransition):
            vr.cancel()  # already Expired

    # 12. Trip.complete (UT-34 .. UT-36)
    def test_trip_complete(self) -> None:
        hub_a = MobilityHub("HUB-METRO", "Metro Hub")
        hub_b = MobilityHub("HUB-KTXA", "KTX A Hub")
        slot_b = ParkingSlot("S-05", ParkingStatus.Available, hub=hub_b)
        v = ElectricBicycle("EV-01", 70, status=VehicleStatus.InUse, activeTrip=True)
        trip = Trip("TR-01", vehicle=v, pickupHub=hub_a, pickedUpAt=T0, targetSlot=slot_b)

        with self.assertRaises(InvalidTime):
            trip.complete(T0 - timedelta(minutes=1))
        trip.returnConfirmed = False
        with self.assertRaises(ReturnNotConfirmed):
            trip.complete(T0 + timedelta(minutes=20))
        trip.returnConfirmed = True
        trip.complete(T0 + timedelta(minutes=20))
        self.assertEqual(trip.status, TripStatus.Completed)
        self.assertEqual(v.status, VehicleStatus.Available)
        self.assertIs(v.currentHub, hub_b)
        self.assertEqual(slot_b.status, ParkingStatus.Occupied)

        # Trip with unresolved mid-trip incident (UT-35 / UC11A)
        slot_b2 = ParkingSlot("S-06", ParkingStatus.Available, hub=hub_b)
        v2 = ElectricBicycle("EV-02", 60, status=VehicleStatus.InUse, activeTrip=True, unresolvedIncidents=1)
        trip2 = Trip("TR-02", vehicle=v2, pickupHub=hub_a, pickedUpAt=T0, targetSlot=slot_b2)
        trip2.complete(T0)
        self.assertEqual(v2.status, VehicleStatus.Faulty)

    # 13-14. ChargingRequest.isUrgent & ChargingSession.stop (UT-37 .. UT-42)
    def test_charging_request_and_session(self) -> None:
        self.assertTrue(ChargingRequest("CR-0", 0, T0).isUrgent())
        self.assertTrue(ChargingRequest("CR-9", 9, T0).isUrgent())
        self.assertFalse(ChargingRequest("CR-10", 10, T0).isUrgent())
        self.assertFalse(ChargingRequest("CR-100", 100, T0).isUrgent())
        with self.assertRaises(InvalidBattery):
            ChargingRequest("CR-BAD", -1, T0).isUrgent()

        hub = MobilityHub("HUB-BK", "BK Hub")
        cp = ChargingPoint("CP-01", ChargingPointStatus.InUse, hub=hub)
        req = ChargingRequest("CR-1", 20, T0 + timedelta(hours=2), status=ChargingRequestStatus.Charging)
        sess = ChargingSession("CS-1", request=req, point=cp, startedAt=T0, stopReason="Satisfied")
        with self.assertRaises(InvalidTime):
            sess.stop(T0 - timedelta(seconds=1))
        sess.stop(T0 + timedelta(minutes=40))
        self.assertEqual(sess.status, ChargingSessionStatus.Completed)
        self.assertEqual(req.status, ChargingRequestStatus.Completed)
        self.assertEqual(cp.status, ChargingPointStatus.Available)

        # User early cancellation vs Technical fault interruption (UT-41)
        req_user = ChargingRequest("CR-2", 30, T0 + timedelta(hours=2), status=ChargingRequestStatus.Charging)
        cp.status = ChargingPointStatus.InUse
        sess_user = ChargingSession("CS-2", request=req_user, point=cp, startedAt=T0, stopReason="UserCancelled")
        sess_user.stop(T0 + timedelta(minutes=15))
        self.assertEqual(sess_user.status, ChargingSessionStatus.Interrupted)
        self.assertEqual(req_user.status, ChargingRequestStatus.Cancelled)

        req_fault = ChargingRequest("CR-3", 30, T0 + timedelta(hours=2), status=ChargingRequestStatus.Charging)
        cp.status = ChargingPointStatus.InUse
        sess_fault = ChargingSession("CS-3", request=req_fault, point=cp, startedAt=T0, stopReason="TechnicalFault")
        sess_fault.stop(T0 + timedelta(minutes=15))
        self.assertEqual(sess_fault.status, ChargingSessionStatus.Interrupted)
        self.assertEqual(req_fault.status, ChargingRequestStatus.Queued)
        self.assertEqual(cp.status, ChargingPointStatus.Faulty)

    # 15. TransferOrder.complete (UT-43 .. UT-45)
    def test_transfer_order_complete(self) -> None:
        hub_src = MobilityHub("HUB-KTXA", "KTX A")
        hub_dst = MobilityHub("HUB-METRO", "Metro")
        v1 = ElectricBicycle("EV-1", 78, status=VehicleStatus.InTransfer, activeTransfer=True)
        s_dst = ParkingSlot("S-D1", ParkingStatus.Held, hub=hub_dst, activeHold=True)
        order = TransferOrder("TO-1", hub_src, hub_dst, [v1], [s_dst], status=TransferStatus.InTransit, dispatchedAt=T0)
        with self.assertRaises(InvalidTime):
            order.complete(T0 - timedelta(seconds=1))
        order.complete(T0 + timedelta(minutes=20))
        self.assertEqual(order.status, TransferStatus.Completed)
        self.assertEqual(v1.status, VehicleStatus.Available)
        self.assertIs(v1.currentHub, hub_dst)

    # 16. OperationalIncident.resolve (UT-46 .. UT-48)
    def test_operational_incident_resolve(self) -> None:
        v = ElectricBicycle("EV-1", 80, status=VehicleStatus.Faulty, unresolvedIncidents=2)
        inc1 = OperationalIncident("INC-1", reportedAt=T0, affectedVehicle=v)
        inc2 = OperationalIncident("INC-2", reportedAt=T0, affectedVehicle=v)
        inc1.resolve(T0)
        self.assertEqual(inc1.status, IncidentStatus.Resolved)
        self.assertEqual(v.status, VehicleStatus.Faulty)  # inc2 still open (UT-47)
        inc2.resolve(T0 + timedelta(hours=1))
        self.assertEqual(v.status, VehicleStatus.Available)

        bad_xor = OperationalIncident("INC-BAD", reportedAt=T0, affectedVehicle=v, affectedPoint=ChargingPoint("CP-1"))
        with self.assertRaises(InvalidTarget):
            bad_xor.resolve(T0)

    # 17-18. SimulationScenario.validate & SimulationRun.complete (UT-49 .. UT-54)
    def test_simulation_scenario_and_run(self) -> None:
        snap = NetworkSnapshot(
            capturedAt=T0,
            hubPointIds={"HUB-METRO": {"CP-1", "CP-2", "CP-3", "CP-4"}},
            fleetSize=100,
        )
        valid_cases = [
            (ScenarioType.MetroSurge, {"targetHubId": "HUB-METRO", "durationMinutes": 60, "arrivalsPerHour": 120}),
            (ScenarioType.FullParking, {"targetHubId": "HUB-METRO", "durationMinutes": 60, "occupancyPercent": 100}),
            (ScenarioType.ChargingDemandSurge, {"targetHubId": "HUB-METRO", "durationMinutes": 60, "chargingRequestsPerHour": 40}),
            (ScenarioType.PartialChargerFailure, {"targetHubId": "HUB-METRO", "durationMinutes": 60, "failedPointIds": {"CP-1", "CP-2"}}),
            (ScenarioType.VehicleClustering, {"targetHubId": "HUB-METRO", "durationMinutes": 60, "clusteredVehicleCount": 60}),
        ]
        for idx, (stype, params) in enumerate(valid_cases, 1):
            sc = SimulationScenario(f"SC-{idx}", stype, params, snapshot=snap)
            self.assertTrue(sc.validate(), f"Expected valid scenario for {stype}")

        # Boundary checks (UT-50 & UT-51)
        self.assertFalse(
            SimulationScenario(
                "SC-ALL-FAIL",
                ScenarioType.PartialChargerFailure,
                {"targetHubId": "HUB-METRO", "durationMinutes": 60, "failedPointIds": {"CP-1", "CP-2", "CP-3", "CP-4"}},
                snapshot=snap,
            ).validate()
        )
        self.assertFalse(
            SimulationScenario(
                "SC-99",
                ScenarioType.FullParking,
                {"targetHubId": "HUB-METRO", "durationMinutes": 60, "occupancyPercent": 99},
                snapshot=snap,
            ).validate()
        )
        with self.assertRaises(MissingSnapshotContext):
            SimulationScenario("SC-NO-SNAP", ScenarioType.MetroSurge, {}, snapshot=None).validate()

        # SimulationRun.complete (UT-52 .. UT-54)
        sc0 = SimulationScenario("SC-1", *valid_cases[0], snapshot=snap)
        run = SimulationRun("RUN-1", sc0, snap)
        res = SimulationResult("RES-1", serviceSuccessRate=0.82, averageWaitMinutes=4.5, rejectedTripCount=12)
        run.complete(res)
        self.assertEqual(run.status, SimulationRunStatus.Completed)
        self.assertIs(run.result, res)

        run2 = SimulationRun("RUN-2", sc0, snap)
        with self.assertRaises(ResultAlreadyOwned):
            run2.complete(res)
        with self.assertRaises(InvalidResult):
            run2.complete(SimulationResult("RES-BAD", serviceSuccessRate=1.05, averageWaitMinutes=0.0, rejectedTripCount=0))


if __name__ == "__main__":
    suite = unittest.defaultTestLoader.loadTestsFromTestCase(Submission3TestCasesVerification)
    runner = unittest.TextTestRunner(verbosity=2)
    result = runner.run(suite)
    if not result.wasSuccessful():
        raise SystemExit(1)
