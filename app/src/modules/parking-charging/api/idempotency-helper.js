/**
 * Idempotency helper for Parking & Charging write endpoints.
 * Keeps simulated/hardware device I/O strictly outside SQLite transactions:
 *   TX1/Lookup -> In-flight deduplication -> Execute handler -> Persist outcome in idempotency_outcomes.
 */

const crypto = require('node:crypto');

class IdempotencyHelper {
  constructor(client, { ttlMs = 24 * 60 * 60 * 1000 } = {}) {
    if (!client) throw new Error('IdempotencyHelper requires a SQLiteClient.');
    this.client = client;
    this.ttlMs = ttlMs;
    this.inFlight = new Map();
  }

  _hashPayload(body) {
    return crypto.createHash('sha256').update(JSON.stringify(body || {})).digest('hex');
  }

  _buildScope(actorId, req) {
    return JSON.stringify([actorId, req.method, req.originalUrl ? req.originalUrl.split('?')[0] : req.path, req.headers['idempotency-key']]);
  }

  async execute(req, actorId, action) {
    const rawKey = req.headers && req.headers['idempotency-key'];
    if (typeof rawKey !== 'string' || !rawKey.trim()) {
      return {
        status: 400,
        body: {
          error: {
            code: 'INVALID_INPUT',
            message: 'Idempotency-Key header is required for mutating requests.',
            details: {}
          }
        }
      };
    }

    const scope = this._buildScope(actorId, req);
    const hash = this._hashPayload(req.body);

    const cached = await this._lookupCached(scope, hash);
    if (cached) return cached;

    const pending = this.inFlight.get(scope);
    if (pending) {
      if (pending.hash !== hash) {
        return {
          status: 409,
          body: {
            error: {
              code: 'IDEMPOTENCY_KEY_REUSED',
              message: 'Idempotency key was previously used with a different request payload.',
              details: {}
            }
          }
        };
      }
      return pending.promise;
    }

    const promise = (async () => {
      const response = await action();
      if (response && response.status >= 200 && response.status < 300) {
        const expiresAt = Date.now() + this.ttlMs;
        await this.client.run(
          `INSERT OR IGNORE INTO idempotency_outcomes (scope, payload_hash, status_code, response_body, expires_at)
           VALUES (?, ?, ?, ?, ?);`,
          [scope, hash, response.status, JSON.stringify(response.body), expiresAt]
        );
      }
      return response;
    })();

    this.inFlight.set(scope, { hash, promise });
    try {
      return await promise;
    } finally {
      this.inFlight.delete(scope);
    }
  }

  async _lookupCached(scope, hash) {
    const now = Date.now();
    await this.client.run('DELETE FROM idempotency_outcomes WHERE scope = ? AND expires_at <= ?;', [scope, now]);
    const existing = await this.client.get('SELECT * FROM idempotency_outcomes WHERE scope = ?;', [scope]);
    if (!existing) return null;

    if (existing.payload_hash !== hash) {
      return {
        status: 409,
        body: {
          error: {
            code: 'IDEMPOTENCY_KEY_REUSED',
            message: 'Idempotency key was previously used with a different request payload.',
            details: {}
          }
        }
      };
    }

    return {
      status: existing.status_code,
      body: JSON.parse(existing.response_body)
    };
  }
}

module.exports = {
  IdempotencyHelper
};
