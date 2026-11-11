/**
 * SQLite Client & Transaction Abstraction
 * Module: Operations (Infrastructure)
 * 
 * Provides a uniform, promise-ready interface for SQLite queries:
 * - `run(sql, params)`
 * - `get(sql, params)`
 * - `all(sql, params)`
 * - `exec(sql)`
 * - `transaction(callback)`: Executes callback within a database transaction (BEGIN IMMEDIATE ... COMMIT/ROLLBACK)
 */

const { AsyncLocalStorage } = require('node:async_hooks');

class SQLiteClient {
  /**
   * @param {object} db Driver instance (better-sqlite3, node:sqlite, or mock)
   */
  constructor(db) {
    if (!db) {
      throw new Error('SQLiteClient requires a database connection instance.');
    }
    this.db = db;
    // node:sqlite also exposes serialize() in newer runtimes; sqlite3's
    // callback driver is distinguished by its run/all methods as well.
    this.callbackDriver = typeof db.serialize === 'function' && typeof db.run === 'function' &&
      typeof db.all === 'function' && typeof db.transaction !== 'function';
    this.context = new AsyncLocalStorage();
    this.pending = Promise.resolve();
    this.savepointId = 0;
    this.ready = (async () => {
      await this.runDirect('PRAGMA foreign_keys = ON;');
      const state = await this.getDirect('PRAGMA foreign_keys;');
      if (!state || state.foreign_keys !== 1) throw new Error('SQLite foreign keys could not be enabled.');
    })();
    this.ready.catch(() => {});
  }

  schedule(fn) {
    const scope = this.context.getStore();
    if (scope && scope.client === this && scope.active) return fn();
    const result = this.pending.then(() => this.ready).then(fn);
    this.pending = result.catch(() => {});
    return result;
  }

  /**
   * Execute an INSERT/UPDATE/DELETE query
   */
  async run(sql, params = []) {
    return this.schedule(() => this.runDirect(sql, params));
  }

  async runDirect(sql, params = []) {
    if (typeof this.db.prepare === 'function' && !this.callbackDriver) {
      const stmt = this.db.prepare(sql);
      const info = stmt.run(...params);
      return { changes: info.changes, lastInsertRowid: info.lastInsertRowid };
    }
    if (typeof this.db.run === 'function') {
      return new Promise((resolve, reject) => {
        this.db.run(sql, params, function (err) {
          if (err) return reject(err);
          resolve({ changes: this.changes, lastInsertRowid: this.lastID });
        });
      });
    }
    throw new Error('Unsupported database driver format.');
  }

  /**
   * Execute a SELECT query returning a single row
   */
  async get(sql, params = []) {
    return this.schedule(() => this.getDirect(sql, params));
  }

  async getDirect(sql, params = []) {
    if (typeof this.db.prepare === 'function' && !this.callbackDriver) {
      const stmt = this.db.prepare(sql);
      return stmt.get(...params);
    }
    if (typeof this.db.get === 'function') {
      return new Promise((resolve, reject) => {
        this.db.get(sql, params, (err, row) => {
          if (err) return reject(err);
          resolve(row);
        });
      });
    }
    throw new Error('Unsupported database driver format.');
  }

  /**
   * Execute a SELECT query returning an array of rows
   */
  async all(sql, params = []) {
    return this.schedule(() => this.allDirect(sql, params));
  }

  async allDirect(sql, params = []) {
    if (typeof this.db.prepare === 'function' && !this.callbackDriver) {
      const stmt = this.db.prepare(sql);
      return stmt.all(...params);
    }
    if (typeof this.db.all === 'function') {
      return new Promise((resolve, reject) => {
        this.db.all(sql, params, (err, rows) => {
          if (err) return reject(err);
          resolve(rows || []);
        });
      });
    }
    throw new Error('Unsupported database driver format.');
  }

  /**
   * Execute multi-statement SQL script (DDL/Pragmas)
   */
  async exec(sql) {
    return this.schedule(() => this.execDirect(sql));
  }

  async execDirect(sql) {
    if (this.callbackDriver) {
      return new Promise((resolve, reject) => this.db.exec(sql, err => err ? reject(err) : resolve()));
    }
    if (typeof this.db.exec === 'function') {
      return this.db.exec(sql);
    }
    throw new Error('Database driver does not support exec.');
  }

  /**
   * Run operations inside a SQLite Transaction
   * Preserves Atomicity (ACID) for resource state transitions and holds
   */
  async transaction(fn) {
    const parent = this.context.getStore();
    if (parent && parent.client === this && parent.active) {
      const nested = parent.childPending.then(async () => {
        if (!parent.active) throw new Error('Parent transaction has ended.');
        const name = `nested_${++this.savepointId}`;
        await this.run(`SAVEPOINT ${name};`);
        const scope = { client: this, active: true, childPending: Promise.resolve() };
        try {
          const result = await this.context.run(scope, () => fn(this));
          await scope.childPending;
          await this.run(`RELEASE SAVEPOINT ${name};`);
          return result;
        } catch (err) {
          await scope.childPending;
          await this.run(`ROLLBACK TO SAVEPOINT ${name};`);
          await this.run(`RELEASE SAVEPOINT ${name};`);
          throw err;
        } finally {
          scope.active = false;
        }
      });
      parent.childPending = nested.catch(() => {});
      return nested;
    }
    const scope = { client: this, active: true, childPending: Promise.resolve() };
    return this.schedule(() => this.context.run(scope, async () => {
      let started = false;
      try {
        await this.run('BEGIN IMMEDIATE;');
        started = true;
        const result = await fn(this);
        await scope.childPending;
        await this.run('COMMIT;');
        return result;
      } catch (err) {
        if (started) {
          try {
            await scope.childPending;
            await this.run('ROLLBACK;');
          } catch (rollbackErr) {
            // Preserve the original error.
          }
        }
        throw err;
      } finally {
        scope.active = false;
      }
    }));
  }
}

module.exports = {
  SQLiteClient
};
