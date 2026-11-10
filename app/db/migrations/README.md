# Migrations

Use zero-padded numeric prefixes in ascending order, starting with `0001_description.sql`. Commit migration sources here. Introduce migration tracking with the first schema change, and keep applied migrations immutable.

The portable `../initialize.js` runner uses `PRAGMA user_version` and applies each step atomically. Fetch upstream before allocating a number. During integration, upstream claimed 0008 for incident isolation; the not-yet-merged Minh feature migrations were renamed to 0009 (Mobility) and 0010 (Simulation), keeping SQL contents unchanged. The initializer explicitly upgrades databases from the previous Minh-only 8/9 sequence without data loss. Do not rewrite migrations already merged into main.
