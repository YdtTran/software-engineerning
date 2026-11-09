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

class SQLiteClient {
  /**
   * @param {object} db Driver instance (better-sqlite3, node:sqlite, or mock)
   */
  constructor(db) {
    if (!db) {
      throw new Error('SQLiteClient requires a database connection instance.');
    }
    this.db = db;
  }

  /**
   * Execute an INSERT/UPDATE/DELETE query
   */
  async run(sql, params = []) {
    if (typeof this.db.prepare === 'function') {
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
    if (typeof this.db.prepare === 'function') {
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
    if (typeof this.db.prepare === 'function') {
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
    if (typeof this.db.transaction === 'function') {
      // better-sqlite3 native synchronous transaction wrapper
      const txn = this.db.transaction(fn);
      return txn();
    }
    
    // Manual SQL transaction for async/sqlite3 drivers
    await this.run('BEGIN IMMEDIATE;');
    try {
      const result = await fn(this);
      await this.run('COMMIT;');
      return result;
    } catch (err) {
      try {
        await this.run('ROLLBACK;');
      } catch (rollbackErr) {
        // preserve original error
      }
      throw err;
    }
  }
}

module.exports = {
  SQLiteClient
};
