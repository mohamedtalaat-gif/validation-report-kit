import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, writeFileSync, mkdtempSync, readdirSync, existsSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { fileURLToPath } from 'node:url';
import { join } from 'node:path';
import { validateReports } from '../src/schema.js';
import { renderChart, chartTypes } from '../src/charts.js';
import { counters, countDistinct, sortNewestFirst, renderHub, renderReport } from '../src/render.js';
import { build } from '../bin/build.js';

const example = JSON.parse(readFileSync(new URL('../examples/reports.json', import.meta.url), 'utf8'));
const reports = example.reports;

test('the example reports pass validation', () => {
  assert.deepEqual(validateReports(reports), []);
});

test('validation names what is wrong', () => {
  const r = structuredClone(reports[0]);
  assert.match(validateReports([r, r]).join(), /duplicate slug/);
  assert.match(validateReports([{ ...r, slug: 'Bad Slug' }]).join(), /slug may contain only/);
  assert.match(validateReports([{ ...r, chart: { type: 'pie' } }]).join(), /chart.type must be one of/);
  assert.match(validateReports([{ ...r, headline: [{ value: '1' }] }]).join(), /headline needs a value and a label/);
  assert.match(validateReports([{ ...r, source: {} }]).join(), /source needs/);
  assert.deepEqual(validateReports([]), ['reports must be a non-empty array']);
});

test('counters count distinct names and match the published collection', () => {
  const c = Object.fromEntries(counters(reports).map((x) => [x.label, x.n]));
  assert.deepEqual(c, { reports: 9, studies: 3, methods: 10, endpoints: 6, datasets: 4 });
  assert.equal(countDistinct([{ a: ['x', 'y'] }, { a: ['y'] }], (r) => r.a), 2);
  assert.equal(countDistinct([{ a: 'x' }, { a: 'x' }], (r) => r.a), 1);
});

test('every chart type in the examples renders as SVG without NaN', () => {
  const used = new Set();
  for (const r of reports) {
    const svg = renderChart(r.chart, r.caption);
    used.add(r.chart.type);
    assert.match(svg, /^<svg /);
    assert.doesNotMatch(svg, /NaN|undefined/);
  }
  assert.deepEqual([...used].sort(), Object.keys(chartTypes).sort());
  assert.throws(() => renderChart({ type: 'pie' }), /unknown chart type/);
});

test('the gates chart draws one square per verdict and fills the met ones', () => {
  const svg = renderChart({ type: 'gates', total: 187, met: 9 }, 'x');
  assert.equal((svg.match(/<rect /g) ?? []).length, 187);
  assert.equal((svg.match(/class="gate met"/g) ?? []).length, 9);
});

test('text is escaped in the pages', () => {
  const r = { ...structuredClone(reports[0]), title: '<script>alert(1)</script>', summary: 'a & b' };
  const html = renderReport(r, [r]);
  assert.doesNotMatch(html, /<script>alert/);
  assert.match(html, /&lt;script&gt;/);
  assert.match(renderHub([r]), /a &amp; b/);
});

test('reports are listed newest first', () => {
  const sorted = sortNewestFirst(reports);
  for (let i = 1; i < sorted.length; i++) assert.ok(sorted[i - 1].date >= sorted[i].date);
  assert.equal(sorted.at(-1).date, '2026-09');
});

test('build writes the hub and one page per report, with links between them', () => {
  const out = mkdtempSync(join(tmpdir(), 'vrk-'));
  const { pages } = build(fileURLToPath(new URL('../examples/reports.json', import.meta.url)), out);
  assert.equal(pages, 10);
  assert.ok(existsSync(join(out, 'index.html')));
  assert.equal(readdirSync(out).length, 10);
  const hub = readFileSync(join(out, 'index.html'), 'utf8');
  assert.match(hub, /<strong>9<\/strong><span>reports/);
  const first = sortNewestFirst(reports)[0];
  const page = readFileSync(join(out, first.slug, 'index.html'), 'utf8');
  assert.match(page, /Older: /);
  assert.doesNotMatch(page, /Newer: /);
  assert.match(page, /<svg class="rchart/);
});

test('build refuses a file with problems', () => {
  const dir = mkdtempSync(join(tmpdir(), 'vrk-'));
  const bad = join(dir, 'bad.json');
  writeFileSync(bad, JSON.stringify({ reports: [{ slug: 'x' }] }));
  assert.throws(() => build(bad, join(dir, 'out')), /reports.json has problems/);
});
