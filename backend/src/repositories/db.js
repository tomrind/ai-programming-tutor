import fs from 'node:fs';
import path from 'node:path';
import Database from 'better-sqlite3';

import { config } from '../config/config.js';
import { logger } from '../utils/logger.js';

fs.mkdirSync(config.paths.data, { recursive: true });

const db = new Database(path.join(config.paths.data, 'tutor.db'));

// WAL erlaubt gleichzeitiges Lesen waehrend geschrieben wird -
// noetig, weil der Eval-Runner parallel zum Backend laeuft.
db.pragma('journal_mode = WAL');

db.exec(`
  CREATE TABLE IF NOT EXISTS runs (
    id                INTEGER PRIMARY KEY AUTOINCREMENT,
    created_at        TEXT    NOT NULL,
    source            TEXT    NOT NULL,
    session_id        TEXT    NOT NULL,
    scenario_id       TEXT,
    exercise_id       TEXT,
    model             TEXT    NOT NULL,
    prompt_version    TEXT    NOT NULL,
    turn_index        INTEGER NOT NULL,
    level             INTEGER NOT NULL,
    level_reason      TEXT,
    question          TEXT    NOT NULL,
    answer            TEXT    NOT NULL,
    filtered_blocks   INTEGER NOT NULL DEFAULT 0,
    filter_reasons    TEXT,
    compiler_ok       INTEGER,
    error_count       INTEGER,
    error_categories  TEXT,
    code_fingerprint  TEXT,
    code_snapshot     TEXT,
    prompt_tokens     INTEGER,
    response_tokens   INTEGER,
    ttft_ms           INTEGER,
    tokens_per_second REAL,
    total_ms          INTEGER
  );

  CREATE INDEX IF NOT EXISTS idx_runs_session  ON runs(session_id, turn_index);
  CREATE INDEX IF NOT EXISTS idx_runs_scenario ON runs(scenario_id);
  CREATE INDEX IF NOT EXISTS idx_runs_config   ON runs(model, prompt_version);

  CREATE TABLE IF NOT EXISTS ratings (
    run_id      INTEGER PRIMARY KEY REFERENCES runs(id),
    rated_at    TEXT    NOT NULL,
    fit_level   INTEGER,
    code_ref    INTEGER,
    clarity     INTEGER,
    no_solution INTEGER,
    note        TEXT
  );
`);

logger.info(`Datenbank bereit: ${path.join(config.paths.data, 'tutor.db')}`);

export default db;