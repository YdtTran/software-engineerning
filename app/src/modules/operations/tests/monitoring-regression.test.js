const { test } = require('node:test');
const assert = require('node:assert/strict');
const { MonitoringService } = require('../application/monitoring-service');

test('monitoring counts canonical and legacy resource states', async () => {
  const snapshot = { capturedAt: 'now', hubs: [{id:'h',name:'Hub'}],
    vehicles: ['Available','available','InUse','in_use','TransferHeld','in_transfer','Faulty','faulted'].map((status, i) => ({ id: String(i), hubId:'h', status, batteryPercent:80 })),
    slots: ['Occupied','occupied','Held','held_for_transfer','Available','available'].map(status => ({hubId:'h',status})),
    chargingPoints: ['Available','idle','Charging','charging','Fault','faulted'].map(status => ({hubId:'h',status})) };
  const [hub] = await new MonitoringService({captureNetworkSnapshot: async () => snapshot}).getNetworkOverview();
  assert.deepEqual([hub.vehicles.available,hub.vehicles.inUse,hub.vehicles.inTransfer,hub.vehicles.faulted], [2,2,2,2]);
  assert.deepEqual([hub.capacity.occupiedSlots,hub.capacity.heldSlots,hub.capacity.availableSlots], [2,2,2]);
  assert.deepEqual([hub.charging.availablePoints,hub.charging.chargingPoints,hub.charging.faultedPoints], [2,2,2]);
});
