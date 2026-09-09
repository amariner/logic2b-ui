import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { mkdtemp, mkdir, writeFile, readFile, rm, symlink } from 'node:fs/promises';
import { spawnSync } from 'node:child_process';
import os from 'node:os';
import path from 'node:path';
import { test } from 'node:test';
import { checks, conditions, tasks, createSchedule, reportAttempts, validateAttempt, type Attempt } from '../scripts/outcome-v2.mts';

const bytes = 'Evaluator-observed synthetic build/browser/human evidence; never publish as real.\n';
const sha256 = createHash('sha256').update(bytes).digest('hex');
function attempt(id = 'attempt-1'): Attempt {
  return { schemaVersion: 2, id, classification: 'synthetic', condition: 'baseline', taskId: 'customer-journey', fixtureHash: 'a'.repeat(64), workspaceId: `workspace-${id}`,
    host: { name: 'test-host', version: '1' }, model: { name: 'test-model', version: 'moving-alias', versionKind: 'alias' },
    capabilities: { network: false, shell: true, mcp: true }, versions: { registry: '1.0.0-rc.16', tools: 'candidate-commit', schemas: '2' }, budget: { seconds: 600, tokens: 10000 },
    status: 'completed', assistance: 'autonomous', humanCorrections: 0,
    metrics: { elapsedSeconds: 12, toolCalls: 3, inputBytes: 100, outputBytes: 200, tokens: 'unavailable' }, build: 'pass', buildEvidence: ['evidence.txt'],
    checks: Object.fromEntries(checks.map(c => [c, { outcome: 'pass', evidence: ['evidence.txt'] }])) as Attempt['checks'], artifacts: [{ path: 'evidence.txt', sha256 }] };
}
async function fixture(t: { after: (fn: () => Promise<void>) => void }, attempts: Attempt[]) {
  const root = await mkdtemp(path.join(os.tmpdir(), 'logic2b-eval-v2-'));
  t.after(() => rm(root, { recursive: true, force: true }));
  for (const a of attempts) { await mkdir(path.join(root, a.id)); await writeFile(path.join(root, a.id, 'evidence.txt'), bytes); }
  return root;
}

test('versioned contract rejects malformed, unsafe and unsupported evidence', () => {
  assert.equal(validateAttempt(attempt()).schemaVersion, 2);
  const changes = [
    { schemaVersion: 3 }, { id: '../escape' }, { fixtureHash: 'abc' }, { extra: true }, { status: 'success' },
    { humanCorrections: 1 }, { metrics: { ...attempt().metrics, tokens: -1 } },
    { artifacts: [{ path: '../outside', sha256 }] }, { artifacts: [{ path: '/absolute', sha256 }] },
    { artifacts: [{ path: 'C:/file', sha256 }] }, { artifacts: [{ path: 'evidence.txt', sha256 }, { path: 'evidence.txt', sha256 }] },
    { buildEvidence: [] }, { buildEvidence: ['missing.txt'] }, { checks: {} },
  ];
  for (const change of changes) assert.throws(() => validateAttempt({ ...attempt(), ...change }));
});

test('synthetic fixtures never contribute to public sample size', async t => {
  const a = attempt(); const root = await fixture(t, [a]);
  const report = await reportAttempts([a], root);
  assert.equal(report.status, 'pending'); assert.equal(report.realAttempts, 0);
  assert.equal(report.excludedSyntheticAttempts, 1); assert.deepEqual(report.groups, []);
});

test('failures, incomplete and unknown outcomes stay in the denominator; unavailable is not zero', async t => {
  // Classification overrides below exercise publication arithmetic in temporary fixtures only.
  const rows = ['completed', 'failed', 'timeout', 'incomplete'].map((status, i) => ({ ...attempt(`a${i}`), classification: 'real', status }) as Attempt);
  rows[1].metrics.tokens = 0;
  rows[2].metrics.tokens = 10;
  rows[3].checks.keyboard = { outcome: 'unknown', evidence: [] };
  const root = await fixture(t, rows);
  const report = await reportAttempts(rows, root);
  const cell = report.groups[0].cells[0];
  assert.equal(cell.attempts, 4); assert.equal(cell.successes, 1); assert.equal(cell.successRate, 0.25);
  assert.deepEqual(cell.metrics.tokens, { available: 2, unavailable: 2, median: 5, min: 0, max: 10 });
  assert.equal(cell.results.length, 4); assert.equal(report.status, 'pending');
  assert.deepEqual(await reportAttempts([...rows].reverse(), root), report);
});

test('assisted attempts and incompatible cohorts are separated', async t => {
  const rows = Array.from({ length: 5 }, (_, i) => ({ ...attempt(`a${i}`), classification: 'real' }) as Attempt);
  rows[1].assistance = 'human-assisted'; rows[1].humanCorrections = 2;
  rows[2].budget.tokens++;
  rows[3].model.version = 'other';
  rows[4].fixtureHash = 'b'.repeat(64);
  const root = await fixture(t, rows);
  const report = await reportAttempts(rows, root);
  assert.equal(report.groups.length, 4);
  const group = report.groups.find(g => g.cells.some(c => c.assistance === 'human-assisted' && c.attempts))!;
  assert.equal(group.cells[0].attempts, 1); assert.equal(group.cells[1].attempts, 1);
  assert.equal(report.status, 'pending');
});

test('integrity, duplicate attempts, workspace reuse and symlink escapes reject', async t => {
  const a = attempt(); const root = await fixture(t, [a]);
  await assert.rejects(reportAttempts([a, a], root), /Duplicate/);
  await assert.rejects(reportAttempts([a, { ...a, id: 'other' }], root), /reused workspace/);
  await writeFile(path.join(root, a.id, 'evidence.txt'), 'tampered');
  await assert.rejects(reportAttempts([a], root), /digest mismatch/);
  await rm(path.join(root, a.id, 'evidence.txt'));
  await symlink(path.join(root, 'outside'), path.join(root, a.id, 'evidence.txt'));
  await assert.rejects(reportAttempts([a], root), /Symlink/);
});

test('minimum sample requires all conditions and tasks, and does not assert advantage', async t => {
  const rows = tasks.flatMap(taskId => conditions.flatMap(condition => Array.from({ length: 5 }, (_, i) => ({ ...attempt(`${taskId}-${condition}-${i}`), classification: 'real', taskId, condition }) as Attempt)));
  const root = await fixture(t, rows);
  assert.equal((await reportAttempts(rows, root)).status, 'minimum-samples-collected');
  assert.equal((await reportAttempts(rows.slice(1), root)).status, 'pending');
});

test('randomized schedule is reproducible, balanced and bounded', () => {
  const schedule = createSchedule(42);
  assert.deepEqual(createSchedule(42), schedule); assert.notDeepEqual(createSchedule(43), schedule);
  assert.equal(schedule.attempts.length, 75);
  for (const taskId of tasks) for (const condition of conditions) assert.equal(schedule.attempts.filter(r => r.taskId === taskId && r.condition === condition).length, 5);
  assert.throws(() => createSchedule(-1)); assert.throws(() => createSchedule(1, 101));
});

test('protocol metadata matches the executable contract', async () => {
  const protocol = JSON.parse(await readFile(new URL('../protocol-v2.json', import.meta.url), 'utf8'));
  assert.equal(protocol.schemaVersion, 2);
  assert.deepEqual(protocol.conditions.map((c: { id: string }) => c.id), conditions);
  assert.deepEqual(protocol.tasks.map((t: { id: string }) => t.id), tasks);
  assert.deepEqual(protocol.requiredChecks, checks);
  assert.equal(protocol.minimumAttemptsPerConditionPerTask, 5);
});

test('artifact limits and intermediate symlinks reject before aggregation', async t => {
  const a = attempt(); const root = await fixture(t, [a]);
  await writeFile(path.join(root, a.id, 'evidence.txt'), Buffer.alloc(4 * 1024 * 1024 + 1));
  await assert.rejects(reportAttempts([a], root), /bounded regular file/);
  await mkdir(path.join(root, 'elsewhere'));
  await symlink(path.join(root, 'elsewhere'), path.join(root, a.id, 'linked'));
  a.artifacts = [{ path: 'linked/evidence.txt', sha256 }];
  a.build = 'unknown'; a.buildEvidence = [];
  for (const check of checks) a.checks[check] = { outcome: 'unknown', evidence: [] };
  await assert.rejects(reportAttempts([a], root), /Symlink/);
  await assert.rejects(reportAttempts(Array(1001).fill(a), root), /At most 1000/);
});

test('CLI prints pending empty evidence and fails without partial output', async t => {
  const root = await fixture(t, []);
  const input = path.join(root, 'attempts.json');
  const cli = new URL('../scripts/report-outcomes.mts', import.meta.url).pathname;
  await writeFile(input, '[]');
  const run = (...args: string[]) => spawnSync(process.execPath, ['--import', 'tsx', cli, ...args], { encoding: 'utf8' });
  const empty = run('report', input, root);
  assert.equal(empty.status, 0); assert.equal(JSON.parse(empty.stdout).status, 'pending');
  const schedule = run('schedule', '42');
  assert.equal(schedule.status, 0); assert.equal(JSON.parse(schedule.stdout).attempts.length, 75);
  await writeFile(input, '[{"schemaVersion":3}]');
  const bad = run('report', input, root);
  assert.equal(bad.status, 1); assert.equal(bad.stdout, ''); assert.ok(bad.stderr.length);
});
