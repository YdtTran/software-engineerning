/**
 * Idempotency Store & Middleware Helper
 * Module: Operations (API)
 * 
 * Conforms to API_CONTRACTS.md:
 * - Scope key to actor, path, and operation.
 * - Bind key to hash of original request payload.
 * - If key is reused with different payload -> 409 IDEMPOTENCY_KEY_REUSED.
 * - If key is retried with same payload -> return cached outcome and original status code.
 */

const crypto = require('node:crypto');

class IdempotencyStore {
  constructor(ttlMs = 24 * 60 * 60 * 1000) {
    this.store = new Map(); // key -> { payloadHash, statusCode, responseBody, timestamp }
    this.ttlMs = ttlMs;
  }

  hashPayload(payload) {
    const serialized = typeof payload === 'string' ? payload : JSON.stringify(payload || {});
    return crypto.createHash('sha256').update(serialized).digest('hex');
  }

  getScopedKey(key, actorId, method, path) {
    return `${actorId || 'anon'}:${method}:${path}:${key}`;
  }

  /**
   * Check if a key was previously processed
   * @returns {{ status: 'HIT' | 'CONFLICT' | 'MISS', cachedResponse?: object, statusCode?: number }}
   */
  check(key, actorId, method, path, payload) {
    if (!key) return { status: 'MISS' };

    const scopedKey = this.getScopedKey(key, actorId, method, path);
    const entry = this.store.get(scopedKey);

    if (!entry) {
      return { status: 'MISS' };
    }

    // Check expiry
    if (Date.now() - entry.timestamp > this.ttlMs) {
      this.store.delete(scopedKey);
      return { status: 'MISS' };
    }

    const currentHash = this.hashPayload(payload);
    if (entry.payloadHash !== currentHash) {
      return {
        status: 'CONFLICT',
        error: {
          code: 'IDEMPOTENCY_KEY_REUSED',
          message: 'Idempotency key was previously used with a different request payload.',
          details: { key }
        }
      };
    }

    return {
      status: 'HIT',
      statusCode: entry.statusCode,
      cachedResponse: entry.responseBody
    };
  }

  save(key, actorId, method, path, payload, statusCode, responseBody) {
    if (!key) return;
    const scopedKey = this.getScopedKey(key, actorId, method, path);
    this.store.set(scopedKey, {
      payloadHash: this.hashPayload(payload),
      statusCode,
      responseBody,
      timestamp: Date.now()
    });
  }

  clear() {
    this.store.clear();
  }
}

const defaultIdempotencyStore = new IdempotencyStore();

module.exports = {
  IdempotencyStore,
  defaultIdempotencyStore
};
