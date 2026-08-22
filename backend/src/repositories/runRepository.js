import db from './db.js';
import { config } from '../config/config.js';

const insert = db.prepare(`
  INSERT INTO runs (
    created_at, source, session_id, scenario_id, exercise_id,
    model, prompt_version, turn_index, level, level_reason,
    question, answer, filtered_blocks, filter_reasons,
    compiler_ok, error_count, error_categories,
    code_fingerprint, code_snapshot,
    prompt_tokens, response_tokens, ttft_ms, tokens_per_second, total_ms
  ) VALUES (
    @created_at, @source, @session_id, @scenario_id, @exercise_id,
    @model, @prompt_version, @turn_index, @level, @level_reason,
    @question, @answer, @filtered_blocks, @filter_reasons,
    @compiler_ok, @error_count, @error_categories,
    @code_fingerprint, @code_snapshot,
    @prompt_tokens, @response_tokens, @ttft_ms, @tokens_per_second, @total_ms
  )
`);

/** Schreibt einen Dialogzug. Fehler hier duerfen den Chat nie stoppen. */
export function recordRun(data) {
  const row = {
    created_at: new Date().toISOString(),
    source: data.source ?? 'chat',
    session_id: data.sessionId ?? 'default',
    scenario_id: data.scenarioId ?? null,
    exercise_id: data.exerciseId ?? null,
    model: config.ollama.model,
    prompt_version: config.promptVersion,
    turn_index: data.turnIndex ?? 0,
    level: data.level,
    level_reason: data.levelReason ?? null,
    question: data.question,
    answer: data.answer,
    filtered_blocks: data.filteredBlocks ?? 0,
    filter_reasons: data.filterReasons?.length ? data.filterReasons.join('; ') : null,
    compiler_ok: data.compilerOk == null ? null : (data.compilerOk ? 1 : 0),
    error_count: data.errorCount ?? null,
    error_categories: data.errorCategories?.length ? data.errorCategories.join(',') : null,
    code_fingerprint: data.codeFingerprint ?? null,
    code_snapshot: data.codeSnapshot ?? null,
    prompt_tokens: data.stats?.promptTokens ?? null,
    response_tokens: data.stats?.responseTokens ?? null,
    ttft_ms: data.stats?.timeToFirstTokenMs ?? null,
    tokens_per_second: data.stats?.tokensPerSecond ?? null,
    total_ms: data.stats?.totalMs ?? null,
  };

  return insert.run(row).lastInsertRowid;
}

export function listRuns({ source, scenarioId, limit = 500 } = {}) {
  const where = [];
  const params = {};
  if (source) { where.push('source = @source'); params.source = source; }
  if (scenarioId) { where.push('scenario_id = @scenarioId'); params.scenarioId = scenarioId; }

  return db.prepare(`
    SELECT * FROM runs
    ${where.length ? `WHERE ${where.join(' AND ')}` : ''}
    ORDER BY id DESC LIMIT @limit
  `).all({ ...params, limit });
}

export function getSummary() {
  return db.prepare(`
    SELECT model, prompt_version,
           COUNT(*)                                   AS antworten,
           SUM(filtered_blocks > 0)                   AS gefiltert,
           ROUND(AVG(ttft_ms))                        AS ttft_ms,
           ROUND(AVG(tokens_per_second), 1)           AS tokens_pro_s,
           ROUND(AVG(prompt_tokens))                  AS prompt_tokens
    FROM runs
    GROUP BY model, prompt_version
    ORDER BY model, prompt_version
  `).all();
}

export function saveRating(runId, rating) {
  db.prepare(`
    INSERT INTO ratings (run_id, rated_at, fit_level, code_ref, clarity, no_solution, note)
    VALUES (@run_id, @rated_at, @fit_level, @code_ref, @clarity, @no_solution, @note)
    ON CONFLICT(run_id) DO UPDATE SET
      rated_at = @rated_at, fit_level = @fit_level, code_ref = @code_ref,
      clarity = @clarity, no_solution = @no_solution, note = @note
  `).run({
    run_id: runId,
    rated_at: new Date().toISOString(),
    fit_level: rating.fitLevel ?? null,
    code_ref: rating.codeRef ?? null,
    clarity: rating.clarity ?? null,
    no_solution: rating.noSolution ?? null,
    note: rating.note ?? null,
  });
}