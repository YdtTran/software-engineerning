const { randomUUID } = require('node:crypto');
const { validateScenario, validateSnapshot } = require('../domain/simulation');
const { simulate } = require('../domain/simulation-engine');
const { requiredString, commandContext, RentalError } = require('../domain/rental');

class SimulationService {
  constructor({ repository, snapshotProvider }) {
    this.repository = repository;
    this.snapshotProvider = snapshotProvider;
    this.inFlight = new Map();
  }
  async run(actorId, input, key) {
    const config = validateScenario(input);
    const context = commandContext(actorId, 'simulation', key, input);
    const cached = await this.repository.findOutcome(context);
    if (cached) return cached;
    const pending = this.inFlight.get(context.scope);
    if (pending) {
      if (pending.hash !== context.hash) throw new RentalError('IDEMPOTENCY_KEY_REUSED', 'Key was used for a different payload.');
      return pending.promise;
    }
    const promise = this.execute(actorId, config, context).finally(() => this.inFlight.delete(context.scope));
    this.inFlight.set(context.scope, { hash: context.hash, promise });
    return promise;
  }
  async execute(actorId, config, context) {
    if (typeof this.snapshotProvider?.capture !== 'function') throw new RentalError('SNAPSHOT_UNAVAILABLE', 'Snapshot provider is unavailable.');
    const snapshot = structuredClone(await this.snapshotProvider.capture());
    validateSnapshot(snapshot, config);
    const result = { id: randomUUID(), status: 'Completed', inputSnapshotTime: snapshot.capturedAt,
      inputs: config, ...simulate(snapshot, config) };
    return this.repository.once(context, async () => {
      await this.repository.client.run('INSERT INTO simulation_results VALUES (?,?,?,?,?)',
        [result.id, actorId, new Date().toISOString(), JSON.stringify(snapshot), JSON.stringify(result)]);
      return this.repository.saveOutcome(context, 201, result);
    });
  }
  async getResult(actorId, id) {
    requiredString(actorId, 'Actor');
    const row = await this.repository.client.get('SELECT result_json FROM simulation_results WHERE id=?', [id]);
    if (!row) throw new RentalError('SIMULATION_NOT_FOUND', 'Simulation result not found.');
    return JSON.parse(row.result_json);
  }
}

module.exports = { SimulationService };
