// Renders the Playwright JSON report into a GitHub Actions job summary:
// total counts + a per-test table. Writes to $GITHUB_STEP_SUMMARY (or stdout locally).
const fs = require('fs');

const RESULTS = 'test-results/results.json';
const out = process.env.GITHUB_STEP_SUMMARY;
const write = (md) => (out ? fs.appendFileSync(out, md) : process.stdout.write(md));

if (!fs.existsSync(RESULTS)) {
  write(`### 🎭 Playwright Results\n\nNo results file at \`${RESULTS}\`.\n`);
  process.exit(0);
}

const report = JSON.parse(fs.readFileSync(RESULTS, 'utf8'));
const rows = [];

function walk(suite, file) {
  const f = suite.file || file;
  for (const spec of suite.specs || []) {
    const tests = spec.tests || [];
    const project = (tests.find((t) => t.projectName) || {}).projectName || '';
    const allSkipped = tests.length > 0 && tests.every((t) => (t.results || []).every((r) => r.status === 'skipped'));
    const status = allSkipped ? 'skip' : spec.ok ? 'pass' : 'fail';
    rows.push({ file: f, title: spec.title, project, status });
  }
  for (const child of suite.suites || []) walk(child, f);
}

for (const s of report.suites || []) walk(s, s.file);

const icon = { pass: '✅', fail: '❌', skip: '⏭️' };
const count = (s) => rows.filter((r) => r.status === s).length;
const seconds = (((report.stats || {}).duration || 0) / 1000).toFixed(1);

let md = `## 🎭 Playwright Test Results\n\n`;
md += `**${rows.length} tests** — ✅ ${count('pass')} passed · ❌ ${count('fail')} failed · ⏭️ ${count('skip')} skipped — in ${seconds}s\n\n`;
md += `| Result | Project | Test | File |\n|:--:|:--|:--|:--|\n`;
for (const r of rows) {
  md += `| ${icon[r.status]} | ${r.project} | ${r.title} | \`${r.file}\` |\n`;
}

write(md);
