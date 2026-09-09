import { createHash } from 'node:crypto';
import { lstat, readFile, realpath } from 'node:fs/promises';
import path from 'node:path';

export const conditions = ['baseline', 'cli-mcp', 'context-contract-review-plan'] as const;
export const tasks = ['customer-journey', 'failure-recovery', 'preserve-customizations', 'upstream-update', 'held-out-transfer'] as const;
export const checks = ['task-completion', 'required-states', 'keyboard', 'mobile-overflow', 'preserved-edits', 'human-design-review'] as const;
type Outcome = 'pass' | 'fail' | 'unknown';
type Metric = number | 'unavailable';
export interface Attempt {
  schemaVersion: 2;
  id: string;
  classification: 'real' | 'synthetic';
  condition: typeof conditions[number];
  taskId: typeof tasks[number];
  fixtureHash: string;
  workspaceId: string;
  host: { name: string; version: string };
  model: { name: string; version: string; versionKind: 'immutable' | 'alias' };
  capabilities: { network: boolean; shell: boolean; mcp: boolean };
  versions: { registry: string; tools: string; schemas: string };
  budget: { seconds: number; tokens: number };
  status: 'completed' | 'failed' | 'timeout' | 'incomplete';
  assistance: 'autonomous' | 'human-assisted';
  humanCorrections: Metric;
  metrics: { elapsedSeconds: Metric; toolCalls: Metric; inputBytes: Metric; outputBytes: Metric; tokens: Metric };
  build: Outcome;
  checks: Record<typeof checks[number], { outcome: Outcome; evidence: string[] }>;
  buildEvidence: string[];
  artifacts: { path: string; sha256: string }[];
}

function record(value: unknown, label: string): Record<string, unknown> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw new Error(`${label}: expected object`);
  return value as Record<string, unknown>;
}
function exact(value: unknown, keys: readonly string[], label: string) {
  const result = record(value, label);
  if (Object.keys(result).sort().join(',') !== [...keys].sort().join(',')) throw new Error(`${label}: unexpected or missing fields`);
  return result;
}
function member(value: unknown, values: readonly unknown[], label: string) {
  if (!values.includes(value)) throw new Error(`${label}: unsupported value`);
}
function boundedText(value: unknown, label: string) {
  if (typeof value !== 'string' || !value.trim() || value.length > 256 || /[\x00-\x1f]/.test(value)) throw new Error(`${label}: expected bounded nonempty text`);
}
function count(value: unknown, label: string, positive = false) {
  if (typeof value !== 'number' || !Number.isSafeInteger(value) || value < (positive ? 1 : 0)) throw new Error(`${label}: expected ${positive ? 'positive' : 'nonnegative'} integer`);
}
function hash(value: unknown) {
  if (typeof value !== 'string' || !/^[a-f0-9]{64}$/.test(value)) throw new Error('Expected SHA-256 hex digest');
}
function safePath(value: unknown): asserts value is string {
  if (typeof value !== 'string' || value.length > 256 || !/^[a-zA-Z0-9_./-]+$/.test(value) || value.split('/').some(p => !p || p === '.' || p === '..') || path.isAbsolute(value)) throw new Error('Unsafe artifact path');
}

/** Submitted source is hashed as bytes, never imported, built or executed. */
export function validateAttempt(value: unknown): Attempt {
  const a = exact(value, ['schemaVersion', 'id', 'classification', 'condition', 'taskId', 'fixtureHash', 'workspaceId', 'host', 'model', 'capabilities', 'versions', 'budget', 'status', 'assistance', 'humanCorrections', 'metrics', 'build', 'checks', 'buildEvidence', 'artifacts'], 'attempt');
  member(a.schemaVersion, [2], 'schemaVersion');
  for (const field of ['id', 'workspaceId']) {
    if (typeof a[field] !== 'string' || !/^[a-zA-Z0-9_-]{1,100}$/.test(a[field] as string)) throw new Error(`${field}: expected opaque id`);
  }
  member(a.classification, ['real', 'synthetic'], 'classification');
  member(a.condition, conditions, 'condition');
  member(a.taskId, tasks, 'taskId');
  hash(a.fixtureHash);
  for (const [field, keys] of Object.entries({ host: ['name', 'version'], model: ['name', 'version', 'versionKind'], versions: ['registry', 'tools', 'schemas'] })) {
    const obj = exact(a[field], keys, field);
    for (const key of keys) boundedText(obj[key], `${field}.${key}`);
  }
  member(record(a.model, 'model').versionKind, ['immutable', 'alias'], 'model.versionKind');
  const capabilities = exact(a.capabilities, ['network', 'shell', 'mcp'], 'capabilities');
  for (const v of Object.values(capabilities)) if (typeof v !== 'boolean') throw new Error('capabilities: expected boolean');
  const budget = exact(a.budget, ['seconds', 'tokens'], 'budget');
  for (const v of Object.values(budget)) count(v, 'budget', true);
  member(a.status, ['completed', 'failed', 'timeout', 'incomplete'], 'status');
  member(a.assistance, ['autonomous', 'human-assisted'], 'assistance');
  const metrics = exact(a.metrics, ['elapsedSeconds', 'toolCalls', 'inputBytes', 'outputBytes', 'tokens'], 'metrics');
  for (const [k, v] of Object.entries({ ...metrics, humanCorrections: a.humanCorrections })) if (v !== 'unavailable') count(v, k);
  if (a.assistance === 'autonomous' && a.humanCorrections !== 0) throw new Error('Autonomous attempts require zero human corrections');
  member(a.build, ['pass', 'fail', 'unknown'], 'build');
  if (!Array.isArray(a.artifacts) || a.artifacts.length > 64) throw new Error('artifacts: expected at most 64 entries');
  const paths = new Set<string>();
  for (const item of a.artifacts) {
    const artifact = exact(item, ['path', 'sha256'], 'artifact');
    safePath(artifact.path);
    hash(artifact.sha256);
    if (paths.has(artifact.path)) throw new Error('Duplicate artifact path');
    paths.add(artifact.path);
  }
  const evidence = (refs: unknown, outcome: unknown) => {
    if (!Array.isArray(refs) || refs.length > 64 || refs.some(r => typeof r !== 'string' || !paths.has(r)) || new Set(refs).size !== refs.length) throw new Error('Invalid evidence references');
    if (outcome !== 'unknown' && refs.length === 0) throw new Error('Observed outcomes require artifact evidence');
  };
  evidence(a.buildEvidence, a.build);
  const results = exact(a.checks, checks, 'checks');
  for (const value of Object.values(results)) {
    const result = exact(value, ['outcome', 'evidence'], 'check');
    member(result.outcome, ['pass', 'fail', 'unknown'], 'check.outcome');
    evidence(result.evidence, result.outcome);
  }
  return a as unknown as Attempt;
}

export async function readBoundedFile(root: string, relative: string, limit = 4 * 1024 * 1024): Promise<Buffer> {
  safePath(relative);
  const base = await realpath(root);
  let current = base;
  for (const segment of relative.split('/')) {
    current = path.join(current, segment);
    if ((await lstat(current)).isSymbolicLink()) throw new Error('Symlink artifacts are not accepted');
  }
  const stat = await lstat(current);
  if (!stat.isFile() || stat.size > limit) throw new Error('Artifact must be a bounded regular file');
  const bytes = await readFile(current);
  if (bytes.length > limit) throw new Error('Artifact exceeds byte budget');
  return bytes;
}

function distribution(values: Metric[]) {
  const known = values.filter((v): v is number => typeof v === 'number').sort((a, b) => a - b);
  const mid = Math.floor(known.length / 2);
  return { available: known.length, unavailable: values.length - known.length, median: known.length ? (known.length % 2 ? known[mid] : (known[mid - 1] + known[mid]) / 2) : null, min: known[0] ?? null, max: known.at(-1) ?? null };
}

function cohort(a: Attempt) {
  // Explicit tuples make grouping independent of submitted JSON key order.
  return JSON.stringify([a.taskId, a.fixtureHash, a.host.name, a.host.version, a.model.name, a.model.version, a.model.versionKind, a.capabilities.network, a.capabilities.shell, a.capabilities.mcp, a.versions.registry, a.versions.tools, a.versions.schemas, a.budget.seconds, a.budget.tokens]);
}

export async function reportAttempts(values: unknown[], artifactRoot: string) {
  if (values.length > 1000) throw new Error('At most 1000 attempts per report');
  const attempts = values.map(validateAttempt).sort((a, b) => a.id.localeCompare(b.id, 'en'));
  const ids = new Set<string>();
  const workspaces = new Set<string>();
  let totalBytes = 0;
  for (const a of attempts) {
    if (ids.has(a.id) || workspaces.has(a.workspaceId)) throw new Error('Duplicate attempt or reused workspace');
    ids.add(a.id); workspaces.add(a.workspaceId);
    for (const artifact of a.artifacts) {
      const bytes = await readBoundedFile(artifactRoot, `${a.id}/${artifact.path}`);
      totalBytes += bytes.length;
      if (totalBytes > 64 * 1024 * 1024) throw new Error('Report artifact budget exceeded');
      if (createHash('sha256').update(bytes).digest('hex') !== artifact.sha256) throw new Error(`Artifact digest mismatch for attempt ${a.id}`);
    }
  }
  const real = attempts.filter(a => a.classification === 'real');
  const keys = [...new Set(real.map(cohort))].sort();
  const groups = keys.map(key => {
    const members = real.filter(a => cohort(a) === key);
    const cells = conditions.flatMap(condition => (['autonomous', 'human-assisted'] as const).map(assistance => {
      const cell = members.filter(a => a.condition === condition && a.assistance === assistance);
      const successful = (a: Attempt) => a.status === 'completed' && a.build === 'pass' && checks.every(c => a.checks[c].outcome === 'pass');
      return {
        condition, assistance, attempts: cell.length, successes: cell.filter(successful).length,
        successRate: cell.length ? cell.filter(successful).length / cell.length : null,
        statuses: Object.fromEntries(['completed', 'failed', 'timeout', 'incomplete'].map(s => [s, cell.filter(a => a.status === s).length])),
        metrics: Object.fromEntries(['elapsedSeconds', 'toolCalls', 'inputBytes', 'outputBytes', 'tokens', 'humanCorrections'].map(k => [k, distribution(cell.map(a => k === 'humanCorrections' ? a.humanCorrections : a.metrics[k as keyof Attempt['metrics']]))])),
        results: cell.map(a => ({ id: a.id, status: a.status, success: successful(a), build: a.build, checks: a.checks, artifacts: a.artifacts })),
      };
    }));
    const first = members[0];
    return { taskId: first.taskId, fixtureHash: first.fixtureHash, host: first.host, model: first.model, capabilities: first.capabilities, versions: first.versions, budget: first.budget,
      sampleStatus: cells.filter(c => c.assistance === 'autonomous').every(c => c.attempts >= 5) ? 'minimum-sample-collected' : 'pending', cells };
  });
  return { schemaVersion: 2, status: groups.length && tasks.every(task => groups.some(g => g.taskId === task && g.sampleStatus === 'minimum-sample-collected')) ? 'minimum-samples-collected' : 'pending',
    interpretation: 'Descriptive evidence only. Artifact hashes prove integrity, not evaluator independence or causal advantage. Audit protocol adherence before comparison.',
    realAttempts: real.length, excludedSyntheticAttempts: attempts.length - real.length, groups };
}

/** Reproducible randomized task/condition order; no model execution. */
export function createSchedule(seed: number, repetitions = 5) {
  count(seed, 'seed'); count(repetitions, 'repetitions', true);
  if (seed > 0xffffffff || repetitions > 100) throw new Error('Schedule limits exceeded');
  let state = seed >>> 0;
  const rows = tasks.flatMap(taskId => conditions.flatMap(condition => Array.from({ length: repetitions }, (_, repetition) => ({ taskId, condition, repetition: repetition + 1 }))));
  for (let i = rows.length - 1; i > 0; i--) {
    state = (Math.imul(state, 1664525) + 1013904223) >>> 0;
    const j = Math.floor(state / 4294967296 * (i + 1));
    [rows[i], rows[j]] = [rows[j], rows[i]];
  }
  return { schemaVersion: 2, seed, repetitions, attempts: rows.map((r, i) => ({ order: i + 1, ...r })) };
}
