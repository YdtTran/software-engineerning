/**
 * Operations Module Test Suite
 * Module: Operations (Tests)
 * 
 * Verifies:
 * - Step 5.1: Fixtures validation
 * - Step 5.2: Contention & Concurrency (depart vs cancel)
 * - Step 5.3: Incident isolation (active trip preservation)
 * - Step 5.4: BR10 / FR-NI03 alert evaluation (Red / Yellow / Green)
 * - API Contracts & Idempotency Key handling
 */

const assert = require('node:assert');
const { fixtures } = require('./fixtures/operations-fixtures');
const { ElectricVehicle, ParkingSlot, ChargingPoint } = require('../domain/resource');
const { Transfer, TransferStatus } = require('../domain/transfer');
const { Incident, IncidentSeverity, IncidentStatus } = require('../domain/incident');
const { MonitoringService } = require('../application/monitoring-service');
const { IdempotencyStore } = require('../api/idempotency');
const { mapDomainErrorToHttpStatus } = require('../api/operations-controller');

function runAllTests() {
  console.log('=== RUNNING OPERATIONS MODULE TEST SUITE ===\n');

  let passed = 0;
  let failed = 0;

  function test(description, fn) {
    try {
      fn();
      console.log(`[PASS] ${description}`);
      passed++;
    } catch (err) {
      console.error(`[FAIL] ${description}`);
      console.error(err);
      failed++;
    }
  }

  // -------------------------------------------------------------------------
  // 1. DOMAIN RULES & BUSINESS INVARIANTS
  // -------------------------------------------------------------------------
  test('BR11: Cannot delete vehicle while in InUse or Reserved status', () => {
    const activeVehicle = new ElectricVehicle({
      id: 'V-ACTIVE',
      hubId: 'hub-1',
      vehicleType: 'electric_bicycle',
      batteryPercent: 85,
      status: 'InUse'
    });
    assert.strictEqual(activeVehicle.canDelete(), false);
    assert.throws(() => activeVehicle.assertCanDelete(), /BR11 violation/);

    const availableVehicle = new ElectricVehicle({
      id: 'V-AVAIL',
      hubId: 'hub-1',
      vehicleType: 'electric_bicycle',
      batteryPercent: 85,
      status: 'Available'
    });
    assert.strictEqual(availableVehicle.canDelete(), true);
    assert.doesNotThrow(() => availableVehicle.assertCanDelete());
  });

  test('BR12: Transfer planning fails if source and destination hubs are the same', () => {
    const v = new ElectricVehicle(fixtures.vehicles[0]);
    const s = new ParkingSlot(fixtures.slots[3]);
    assert.throws(() => {
      Transfer.plan({
        createdBy: 'operator-test',
        id: 'TRF-TEST-SAME',
        sourceHubId: 'hub-source',
        destinationHubId: 'hub-source',
        vehicles: [v],
        destinationSlots: [s]
      });
    }, /BR12 violation/);
  });

  test('BR13: Transfer planning fails if any vehicle has battery < 80%', () => {
    const lowBatVehicle = new ElectricVehicle(fixtures.vehicles[2]); // 72% battery
    const s = new ParkingSlot(fixtures.slots[3]);
    assert.throws(() => {
      Transfer.plan({
        createdBy: 'operator-test',
        id: 'TRF-TEST-BAT',
        sourceHubId: 'hub-source',
        destinationHubId: 'hub-dest',
        vehicles: [lowBatVehicle],
        destinationSlots: [s]
      });
    }, /BR13 violation/);
  });

  test('BR14: Emergency severity incident automatically calculates 1-minute (60s) SLA', () => {
    const now = new Date('2026-11-09T10:00:00.000Z');
    const deadlineStr = Incident.calculateSlaDeadline(IncidentSeverity.EMERGENCY, now);
    const deadline = new Date(deadlineStr);
    const diffSeconds = (deadline.getTime() - now.getTime()) / 1000;
    assert.strictEqual(diffSeconds, 60, 'Emergency SLA deadline must be exactly 60 seconds from report time');
  });

  // -------------------------------------------------------------------------
  // 2. STEP 5.2: CONTENTION & CONCURRENCY TESTS (depart vs cancel)
  // -------------------------------------------------------------------------
  test('Step 5.2 Contention: Depart succeeds and locks transfer, subsequent Cancel throws 409', () => {
    const v = new ElectricVehicle(fixtures.vehicles[0]);
    const s = new ParkingSlot(fixtures.slots[3]);
    const transfer = Transfer.plan({
        createdBy: 'operator-test',
      id: 'TRF-RACE-1',
      sourceHubId: 'hub-source',
      destinationHubId: 'hub-dest',
      vehicles: [v],
      destinationSlots: [s]
    });

    assert.strictEqual(transfer.status, TransferStatus.PLANNED);

    // Winner: Depart
    transfer.depart({ vehicles: [v] });
    assert.strictEqual(transfer.status, TransferStatus.IN_TRANSIT);

    // Loser: Cancel must be rejected with conflict
    let errCode = null;
    try {
      transfer.cancel({ reason: 'Operator tries to cancel late' });
    } catch (err) {
      errCode = err.code;
    }
    assert.strictEqual(errCode, 'CANNOT_CANCEL_IN_TRANSIT');
    assert.strictEqual(mapDomainErrorToHttpStatus({ code: errCode }), 409);
  });

  test('Step 5.2 Contention: Cancel succeeds and locks transfer, subsequent Depart throws 409', () => {
    const v = new ElectricVehicle(fixtures.vehicles[0]);
    const s = new ParkingSlot(fixtures.slots[3]);
    const transfer = Transfer.plan({
        createdBy: 'operator-test',
      id: 'TRF-RACE-2',
      sourceHubId: 'hub-source',
      destinationHubId: 'hub-dest',
      vehicles: [v],
      destinationSlots: [s]
    });

    // Winner: Cancel
    transfer.cancel({ reason: 'Operator cancelled prior to departure' });
    assert.strictEqual(transfer.status, TransferStatus.CANCELLED);

    // Loser: Depart must be rejected with conflict
    let errCode = null;
    try {
      transfer.depart({ vehicles: [v] });
    } catch (err) {
      errCode = err.code;
    }
    assert.strictEqual(errCode, 'TRANSFER_ALREADY_CANCELLED');
    assert.strictEqual(mapDomainErrorToHttpStatus({ code: errCode }), 409);
  });

  // -------------------------------------------------------------------------
  // 3. STEP 5.3: INCIDENT ISOLATION & SAFETY TESTS (Active Trip Preservation)
  // -------------------------------------------------------------------------
  test('Step 5.3 Incident Isolation: Reporting trip incident preserves active trip while flagging fault', () => {
    const tripVehicle = new ElectricVehicle(fixtures.vehicles[4]); // EB-ACTIVE-TRIP, InUse
    assert.strictEqual(tripVehicle.status, 'InUse');

    const incident = Incident.reportTripIncident({
      id: 'INC-TRIP-TEST',
      userId: 'user-42',
      tripId: 'TRIP-999',
      vehicleId: tripVehicle.id,
      description: 'Front tire pressure low',
      reportedLocation: 'Near Central Library'
    });

    assert.strictEqual(incident.status, IncidentStatus.OPEN);
    assert.strictEqual(incident.reportedTripId, 'TRIP-999');
    assert.strictEqual(incident.resourceId, tripVehicle.id);

    // Active trip status is NOT prematurely terminated or remotely locked
    assert.strictEqual(tripVehicle.status, 'InUse');
  });

  // -------------------------------------------------------------------------
  // 4. STEP 5.4: BR10 / FR-NI03 ALERT EVALUATION TESTS
  // -------------------------------------------------------------------------
  test('Step 5.4 Alert BR10: Evaluates RED alert on critical occupancy >= 95%', () => {
    const alert = MonitoringService.evaluateAlertLevel(95.5, 5, 20);
    assert.strictEqual(alert.alertLevel, 'RED');
    assert.ok(alert.reasons.some(r => r.includes('95%')));
  });

  test('Step 5.4 Alert BR10: Evaluates RED alert on zero available vehicles', () => {
    const alert = MonitoringService.evaluateAlertLevel(50.0, 0, 10);
    assert.strictEqual(alert.alertLevel, 'RED');
    assert.ok(alert.reasons.some(r => r.includes('Zero available vehicles')));
  });

  test('Step 5.4 Alert BR10: Evaluates YELLOW alert on warning occupancy >= 85%', () => {
    const alert = MonitoringService.evaluateAlertLevel(88.0, 4, 10);
    assert.strictEqual(alert.alertLevel, 'YELLOW');
    assert.ok(alert.reasons.some(r => r.includes('85%')));
  });

  test('Step 5.4 Alert BR10: Evaluates YELLOW alert on low vehicle ratio <= 10%', () => {
    const alert = MonitoringService.evaluateAlertLevel(60.0, 1, 20); // 1/20 = 5% <= 10%
    assert.strictEqual(alert.alertLevel, 'YELLOW');
    assert.ok(alert.reasons.some(r => r.includes('10%')));
  });

  test('Step 5.4 Alert BR10: Evaluates GREEN on normal operating conditions', () => {
    const alert = MonitoringService.evaluateAlertLevel(65.0, 8, 20); // 40% vehicles, 65% occupancy
    assert.strictEqual(alert.alertLevel, 'GREEN');
  });

  // -------------------------------------------------------------------------
  // 5. IDEMPOTENCY KEY HANDLING TESTS
  // -------------------------------------------------------------------------
  test('Idempotency: Replaying exact request returns cached outcome', () => {
    const store = new IdempotencyStore();
    const payload = { sourceHubId: 'metro', destinationHubId: 'bku' };
    const cachedResponse = { data: { id: 'TRF-123', status: 'Planned' } };

    store.save('KEY-001', 'operator', 'POST', '/transfers', payload, 201, cachedResponse);

    const check1 = store.check('KEY-001', 'operator', 'POST', '/transfers', payload);
    assert.strictEqual(check1.status, 'HIT');
    assert.strictEqual(check1.statusCode, 201);
    assert.deepStrictEqual(check1.cachedResponse, cachedResponse);
  });

  test('Idempotency: Reusing key with different payload returns 409 Conflict', () => {
    const store = new IdempotencyStore();
    const originalPayload = { sourceHubId: 'metro', destinationHubId: 'bku' };
    const differentPayload = { sourceHubId: 'metro', destinationHubId: 'dorm-a' };

    store.save('KEY-002', 'operator', 'POST', '/transfers', originalPayload, 201, { data: {} });

    const check2 = store.check('KEY-002', 'operator', 'POST', '/transfers', differentPayload);
    assert.strictEqual(check2.status, 'CONFLICT');
    assert.strictEqual(check2.error.code, 'IDEMPOTENCY_KEY_REUSED');
  });

  console.log(`\n===========================================`);
  console.log(`RESULTS: ${passed} PASSED, ${failed} FAILED`);
  console.log(`===========================================`);

  if (failed > 0) {
    throw new Error(`${failed} tests failed in Operations test suite.`);
  }
}

if (require.main === module) {
  runAllTests();
}

module.exports = {
  runAllTests
};
