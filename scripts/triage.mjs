#!/usr/bin/env node
// Failure triage collector for the AI self-healing debug loop.
//
// Reads the Playwright JSON report, extracts every failed spec (error message,
// stack, and trace/screenshot attachment paths), probes whether the SUT is
// actually up, captures a little environment context, and emits a single
// structured bundle the AI debugger consumes:
//
//   test-results/triage.json   — machine-readable, fed to `claude -p` in CI
//   test-results/triage.md     — human-readable summary (also -> job summary)
//
// It also writes a first-pass *heuristic* classification (SUT-DOWN / TEST or
// SUT defect / FLAKY) so a human skimming CI gets an instant read. The AI
// debugger refines this; the heuristic never auto-applies anything.
//
// Usage: node scripts/triage.mjs
import fs from 'node:fs';
import { execSync } from 'node:child_process';

const RESULTS = 'test-results/results.json';
const OUT_JSON = 'test-results/triage.json';
const OUT_MD = 'test-results/triage.md';

const API_BASE_URL = process.env.API_BASE_URL ?? 'http://localhost:3001/api';
const UI_BASE_URL = process.env.UI_BASE_URL ?? 'http://localhost:3000';

const safe = (fn, fallback = null) => {
  try {
    return fn();
  } catch {
    return fallback;
  }
};

// ---- 1. Collect failed specs from the Playwright JSON report -----------------
function collectFailures() {
  if (!fs.existsSync(RESULTS)) return { failures: [], stats: null, missing: true };
  const report = JSON.parse(fs.readFileSync(RESULTS, 'utf8'));
  const failures = [];

  const walk = (suite, file) => {
    const f = suite.file || file;
    for (const spec of suite.specs || []) {
      for (const t of spec.tests || []) {
        for (const r of t.results || []) {
          if (r.status === 'failed' || r.status === 'timedOut') {
            failures.push({
              title: spec.title,
              file: f,
              line: spec.line,
              project: t.projectName || '',
              status: r.status,
              retry: r.retry,
              durationMs: r.duration,
              error: (r.error?.message || '').replace(/\[\d+m/g, '').trim(),
              snippet: (r.error?.snippet || '').replace(/\[\d+m/g, '').trim(),
              stack: (r.error?.stack || '').replace(/\[\d+m/g, '').split('\n').slice(0, 12).join('\n'),
              attachments: (r.attachments || []).map((a) => ({ name: a.name, path: a.path, contentType: a.contentType })),
            });
          }
        }
      }
    }
    for (const child of suite.suites || []) walk(child, f);
  };
  for (const s of report.suites || []) walk(s, s.file);

  // De-dupe to the last (highest) retry per title+project so we report the
  // final outcome, not every intermediate retry.
  const byKey = new Map();
  for (const f of failures) {
    const k = `${f.project}::${f.file}::${f.title}`;
    const prev = byKey.get(k);
    if (!prev || f.retry >= prev.retry) byKey.set(k, f);
  }
  return { failures: [...byKey.values()], stats: report.stats || null, missing: false };
}

// ---- 2. Probe the SUT so we can tell "app down" from "real failure" ----------
async function probe(url) {
  const started = Date.now();
  try {
    const res = await fetch(url, { signal: AbortSignal.timeout(5000) });
    return { url, ok: res.ok, status: res.status, ms: Date.now() - started };
  } catch (e) {
    return { url, ok: false, status: null, error: String(e?.message || e), ms: Date.now() - started };
  }
}

async function probeSut() {
  const [api, ui] = await Promise.all([probe(`${API_BASE_URL}/tags`), probe(UI_BASE_URL)]);
  return { api, ui, healthy: api.ok && ui.ok };
}

// ---- 3. Environment context --------------------------------------------------
function envContext() {
  return {
    ci: !!process.env.CI,
    node: process.version,
    apiBaseUrl: API_BASE_URL,
    uiBaseUrl: UI_BASE_URL,
    gitSha: safe(() => execSync('git rev-parse --short HEAD', { stdio: ['ignore', 'pipe', 'ignore'] }).toString().trim()),
    gitBranch: safe(() => execSync('git rev-parse --abbrev-ref HEAD', { stdio: ['ignore', 'pipe', 'ignore'] }).toString().trim()),
  };
}

// ---- 4. First-pass heuristic classification ----------------------------------
function classify(failures, sut) {
  if (failures.length === 0) return { verdict: 'GREEN', confidence: 'high', reason: 'No failed specs in the report.' };
  if (!sut.healthy) {
    return {
      verdict: 'SUT-DOWN',
      confidence: 'high',
      reason: `SUT did not respond to health probes (API ok=${sut.api.ok}, UI ok=${sut.ui.ok}). Failures are almost certainly environmental, not test or app-logic defects. Fix the environment and re-run before deeper triage.`,
    };
  }
  // App is up but tests failed -> needs the AI to decide TEST-DEFECT vs SUT-DEFECT.
  const allTimeouts = failures.every((f) => f.status === 'timedOut');
  return {
    verdict: 'NEEDS-TRIAGE',
    confidence: allTimeouts ? 'low' : 'medium',
    reason: allTimeouts
      ? 'All failures are timeouts while the SUT is up — possible flake/race (missing await) or a slow SUT path. Reproduce with --repeat-each before classifying.'
      : 'SUT is healthy but specs failed — classify each as TEST-DEFECT (fix the test) or SUT-DEFECT (file a bug). See known quirks in the debug prompt.',
  };
}

// ---- 5. Render -------------------------------------------------------------
function renderMd({ failures, sut, env, cls, stats }) {
  const L = [];
  L.push(`# 🔧 Failure Triage Bundle`);
  L.push('');
  L.push(`**Heuristic verdict:** \`${cls.verdict}\` (confidence: ${cls.confidence})`);
  L.push('');
  L.push(`> ${cls.reason}`);
  L.push('');
  L.push(`**SUT health:** API \`${sut.api.url}\` → ${sut.api.ok ? `✅ ${sut.api.status}` : `❌ ${sut.api.error || sut.api.status}`} · UI \`${sut.ui.url}\` → ${sut.ui.ok ? `✅ ${sut.ui.status}` : `❌ ${sut.ui.error || sut.ui.status}`}`);
  L.push('');
  L.push(`**Env:** node ${env.node} · CI=${env.ci} · ${env.gitBranch || '?'}@${env.gitSha || '?'}`);
  if (stats) L.push(`**Run:** ${((stats.duration || 0) / 1000).toFixed(1)}s · ${stats.expected ?? '?'} passed · ${failures.length} failed`);
  L.push('');
  if (failures.length === 0) {
    L.push('✅ No failures to triage.');
    return L.join('\n');
  }
  L.push(`## ${failures.length} failing spec(s)`);
  for (const [i, f] of failures.entries()) {
    L.push('');
    L.push(`### ${i + 1}. ${f.title}`);
    L.push(`- **File:** \`${f.file}:${f.line}\` · **Project:** ${f.project} · **Status:** ${f.status}${f.retry ? ` (retry ${f.retry})` : ''}`);
    if (f.error) {
      L.push('- **Error:**');
      L.push('```');
      L.push(f.error.split('\n').slice(0, 8).join('\n'));
      L.push('```');
    }
    if (f.snippet) {
      L.push('- **At:**');
      L.push('```');
      L.push(f.snippet.split('\n').slice(0, 10).join('\n'));
      L.push('```');
    }
    const trace = f.attachments.find((a) => a.name === 'trace');
    if (trace) L.push(`- **Trace:** \`${trace.path}\` → \`npx playwright show-trace ${trace.path}\``);
  }
  return L.join('\n');
}

// ---- main --------------------------------------------------------------------
const { failures, stats, missing } = collectFailures();
const sut = await probeSut();
const env = envContext();
const cls = classify(failures, sut);

const bundle = { generatedAt: new Date().toISOString(), verdict: cls, sut, env, stats, failures, resultsMissing: missing };
fs.mkdirSync('test-results', { recursive: true });
fs.writeFileSync(OUT_JSON, JSON.stringify(bundle, null, 2));

const md = renderMd({ failures, sut, env, cls, stats });
fs.writeFileSync(OUT_MD, md);
if (process.env.GITHUB_STEP_SUMMARY) fs.appendFileSync(process.env.GITHUB_STEP_SUMMARY, `\n${md}\n`);

process.stdout.write(`\nTriage written to ${OUT_JSON} and ${OUT_MD}\nVerdict: ${cls.verdict} — ${failures.length} failing spec(s)\n`);
