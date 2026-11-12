# Migrations

Use zero-padded numeric prefixes in ascending order, starting with `0001_description.sql`. Commit migration sources here. Introduce migration tracking with the first schema change, and keep applied migrations immutable.

The portable `../initialize.js` runner uses `PRAGMA user_version` and applies each step atomically. Fetch upstream before allocating a number. During integration, upstream claimed 0008 for incident isolation and 0009 for transfer slot assignments; the Mobility feature migrations are sequenced as 0010 (Mobility) and 0011 (Simulation), keeping SQL contents unchanged, and Parking & Charging schema + slot pool backfill are sequenced as 0012. The initializer explicitly upgrades databases from the previous Minh-only 8/9 sequence without data loss. Do not rewrite migrations already merged into main.
