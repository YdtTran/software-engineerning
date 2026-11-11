// Bounded discrete-event demo. All mutations are to these private model states.
class EventQueue {
  constructor() { this.heap = []; this.sequence = 0; }
  less(a, b) { return a.time < b.time || (a.time === b.time && a.sequence < b.sequence); }
  push(event) {
    event.sequence = this.sequence++;
    const heap = this.heap; heap.push(event);
    let i = heap.length - 1;
    while (i > 0) {
      const parent = (i - 1) >> 1;
      if (!this.less(heap[i], heap[parent])) break;
      [heap[i], heap[parent]] = [heap[parent], heap[i]]; i = parent;
    }
  }
  pop() {
    const first = this.heap[0], last = this.heap.pop();
    if (this.heap.length) {
      this.heap[0] = last;
      let i = 0;
      while (true) {
        const left = i * 2 + 1, right = left + 1;
        let smallest = i;
        if (left < this.heap.length && this.less(this.heap[left], this.heap[smallest])) smallest = left;
        if (right < this.heap.length && this.less(this.heap[right], this.heap[smallest])) smallest = right;
        if (smallest === i) break;
        [this.heap[i], this.heap[smallest]] = [this.heap[smallest], this.heap[i]]; i = smallest;
      }
    }
    return first;
  }
}

function randomSource(seed) {
  let state = seed >>> 0;
  return () => {
    state = (Math.imul(state, 1664525) + 1013904223) >>> 0;
    return (state + 1) / 4294967297;
  };
}
const round = value => Math.round(value * 100) / 100;

function runModel(snapshot, config, projected) {
  const p = config.parameters, events = new EventQueue(), random = randomSource(p.seed);
  const available = new Set(snapshot.availableVehicleIds), usableSlots = new Set(snapshot.availableSlotIds);
  const hubs = config.hubIds.map(id => {
    const slots = snapshot.slots.filter(slot => slot.hubId === id);
    let free = slots.filter(slot => usableSlots.has(slot.id)).length;
    if (projected && config.scenario === 'parking') free = Math.min(free, Math.floor(slots.length * (1 - p.occupiedPercent / 100)));
    let ports = snapshot.chargingPoints.filter(port => port.hubId === id && ['available', 'idle'].includes(port.status.toLowerCase())).length;
    if (projected && config.scenario === 'charging') ports -= p.failedPorts;
    const concurrentLimit = Math.min(ports, p.powerBudgetKw === undefined ? ports : Math.floor(p.powerBudgetKw / p.portPowerKw));
    return { id, capacity: slots.length, free,
      vehicles: snapshot.vehicles.filter(vehicle => vehicle.hubId === id && available.has(vehicle.id)).map(vehicle => ({ id: vehicle.id, battery: vehicle.batteryPercent })),
      waiting: [], chargingQueue: [], charging: 0, concurrentLimit,
      requested: 0, served: 0, wait: 0, completed: 0, rejectedReturns: 0,
      chargeRequested: 0, chargeServed: 0, chargeWait: 0, chargePeak: 0,
      peakOccupancy: slots.length ? 100 * (slots.length - free) / slots.length : 100 };
  });
  const byId = new Map(hubs.map(hub => [hub.id, hub]));
  let activeTrips = 0, fleetCharging = 0, fleetQueuedCharging = 0;
  function scheduleArrivals(hub, kind, rate) {
    if (!rate) return;
    let time = 0;
    while ((time += -Math.log(random()) * 60 / rate) < p.durationMinutes) events.push({ time, kind, hub });
  }
  function dispatch(hub, time) {
    while (hub.waiting.length && hub.vehicles.length) {
      const requestedAt = hub.waiting.shift(), vehicle = hub.vehicles.shift();
      hub.served++; hub.wait += time - requestedAt;
      activeTrips++;
      hub.free = Math.min(hub.capacity, hub.free + 1);
      let destination = hubs[Math.floor(random() * hubs.length)];
      if (projected && config.scenario === 'clustering' && random() < p.returnBias) destination = byId.get(p.targetHubId);
      events.push({ kind: 'return', time: time + p.tripMinutes, hub: destination, vehicle });
    }
  }
  function charge(hub, time) {
    while (hub.chargingQueue.length && hub.charging < hub.concurrentLimit) {
      const request = hub.chargingQueue.shift();
      if (request.vehicle) { fleetQueuedCharging--; fleetCharging++; }
      hub.charging++; hub.chargeServed++; hub.chargeWait += time - request.time;
      hub.chargePeak = Math.max(hub.chargePeak, hub.charging);
      events.push({ kind: 'charge-complete', time: time + p.chargeMinutes, hub, vehicle: request.vehicle });
    }
  }
  for (const hub of hubs) {
    scheduleArrivals(hub, 'rental', p.demandPerHour * (projected && config.scenario === 'metro' ? p.demandMultiplier : 1));
    scheduleArrivals(hub, 'charge-request', (p.chargingRequestsPerHour ?? 0) *
      (projected && config.scenario === 'charging-demand' ? p.chargingMultiplier : 1));
  }
  let processed = 0;
  while (events.heap.length) {
    const event = events.pop();
    if (event.time > p.durationMinutes) break;
    // Hard ceiling supplements the validated expected event budget.
    if (++processed > 250000) throw new Error('Simulation event ceiling exceeded.');
    const hub = event.hub;
    if (event.kind === 'rental') {
      hub.requested++; hub.waiting.push(event.time); dispatch(hub, event.time);
    } else if (event.kind === 'return') {
      if (hub.free === 0) {
        hub.rejectedReturns++;
        const alternative = hubs.filter(other => other.id !== hub.id && other.free > 0).sort((a, b) => b.free - a.free)[0];
        if (alternative) {
          events.push({ kind: 'return', time: event.time + p.tripMinutes, hub: alternative, vehicle: event.vehicle });
        } else {
          events.push({ kind: 'return', time: event.time + p.tripMinutes, hub, vehicle: event.vehicle });
        }
        continue;
      }
      hub.free--; hub.completed++;
      activeTrips--;
      hub.peakOccupancy = Math.max(hub.peakOccupancy, hub.capacity ? 100 * (hub.capacity - hub.free) / hub.capacity : 100);
      event.vehicle.battery = Math.max(0, event.vehicle.battery - p.batteryDrainPerTrip);
      if (event.vehicle.battery >= 20) {
        hub.vehicles.push(event.vehicle);
        dispatch(hub, event.time);
      } else {
        fleetQueuedCharging++;
        hub.chargeRequested++;
        hub.chargingQueue.push({ time: event.time, vehicle: event.vehicle });
        charge(hub, event.time);
      }
    } else if (event.kind === 'charge-request') {
      hub.chargeRequested++; hub.chargingQueue.push({ time: event.time, vehicle: null }); charge(hub, event.time);
    } else {
      hub.charging--;
      if (event.vehicle) {
        fleetCharging--;
        event.vehicle.battery = 100;
        hub.vehicles.push(event.vehicle);
        dispatch(hub, event.time);
      }
      charge(hub, event.time);
    }
  }
  const total = field => hubs.reduce((sum, hub) => sum + hub[field], 0);
  const requested = total('requested'), served = total('served'), charged = total('chargeServed');
  const fleetAvailable = hubs.reduce((sum, hub) => sum + hub.vehicles.length, 0);
  return {
    rentalRequests: requested, servedTrips: served, completedTrips: total('completed'),
    activeTrips, fleetAvailable, fleetCharging, fleetQueuedCharging,
    serviceSuccessRate: requested ? round(served / requested * 100) : 100,
    averageWaitMinutes: served ? round(total('wait') / served) : 0,
    rejectedTrips: hubs.reduce((sum, hub) => sum + hub.waiting.length, 0), rejectedReturns: total('rejectedReturns'),
    chargingRequests: total('chargeRequested'), averageChargingWaitMinutes: charged ? round(total('chargeWait') / charged) : 0,
    unservedChargingRequests: hubs.reduce((sum, hub) => sum + hub.chargingQueue.length, 0),
    hubs: hubs.map(hub => ({ id: hub.id, availableVehicles: hub.vehicles.length, freeSlots: hub.free,
      peakOccupancyPercent: round(hub.peakOccupancy), waitingRentals: hub.waiting.length,
      waitingCharging: hub.chargingQueue.length, rejectedReturns: hub.rejectedReturns,
      peakConcurrentCharging: hub.chargePeak, peakPowerKw: p.portPowerKw === undefined ? null : round(hub.chargePeak * p.portPowerKw) }))
  };
}

function recommendations(metrics, config) {
  const result = [];
  const sorted = [...metrics.hubs].sort((a, b) => b.availableVehicles - a.availableVehicles);
  const source = sorted[0], target = sorted[sorted.length - 1];
  if (source && target && source.id !== target.id && source.availableVehicles > target.availableVehicles + 1) {
    const quantity = Math.min(source.availableVehicles, target.freeSlots,
      Math.ceil((source.availableVehicles - target.availableVehicles) / 2));
    if (quantity > 0) result.push({ kind: 'redistribute', sourceHubId: source.id, destinationHubId: target.id, quantity });
  }
  for (const hub of metrics.hubs) {
    if (hub.rejectedReturns || hub.peakOccupancyPercent >= 95) {
      const alternative = [...metrics.hubs].filter(other => other.id !== hub.id && other.freeSlots > 0).sort((a, b) => b.freeSlots - a.freeSlots)[0];
      if (alternative) result.push({ kind: 'reroute', sourceHubId: hub.id, destinationHubId: alternative.id });
    }
    if (hub.waitingCharging) result.push({ kind: 'reschedule-charging', hubId: hub.id, queuedRequests: hub.waitingCharging });
    if (config.scenario === 'charging' && config.parameters.failedPorts) result.push({ kind: 'inspect-ports', hubId: hub.id, failedPorts: config.parameters.failedPorts });
  }
  return result;
}

function simulate(snapshot, config) {
  const baselineMetrics = runModel(snapshot, config, false);
  const projectedMetrics = runModel(snapshot, config, true);
  return { modelVersion: 'demo-des-v1', baselineMetrics, projectedMetrics,
    recommendations: recommendations(projectedMetrics, config),
    assumptions: [
      'Seeded exponential request arrivals; fixed trip and charging durations.',
      'Uniform trip destinations except the configured clustering bias; no geographic travel-time model.',
      'A rental frees one slot, capped at Hub capacity; the seed inventory has no complete vehicle-slot mapping.',
      'Full destinations reject a return at the targeted hub; the vehicle reroutes or retries and remains accounted for in active trips until capacity becomes available or the simulation horizon ends.',
      'External charging requests use the fixed port/power budget; no electrical or private-parking scheduling forecast.',
      'Only trips started within this run are scheduled; existing active trips and charging-session end times are unknown.',
      'Metrics are demo estimates, not calibrated predictions; recommendations require live operator validation.'
    ] };
}

module.exports = { simulate };
