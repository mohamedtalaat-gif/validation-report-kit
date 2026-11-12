import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, writeFileSync, mkdtempSync, readdirSync, existsSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { fileURLToPath } from 'node:url';
import { join } from 'node:path';
import { validateReports } from '../src/schema.js';
import { renderChart, chartTypes } from '../src/charts.js';
import { chartOf, csvOf, initialValues, rowsOf } from '../src/explore.js';
import { counters, countDistinct, sortNewestFirst, renderHub, renderReport, renderExplore } from '../src/render.js';
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
  assert.deepEqual([...used].sort(), Object.keys(chartTypes).filter((t) => t !== 'curve').sort());
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
  assert.equal(readdirSync(out).length, 11); // the hub, the nine reports, and assets/
  assert.deepEqual(readdirSync(join(out, 'assets')).sort(), ['charts.js', 'client.js', 'explore.js']);
  const hub = readFileSync(join(out, 'index.html'), 'utf8');
  assert.match(hub, /<strong>9<\/strong><span>reports/);
  const first = sortNewestFirst(reports)[0];
  const page = readFileSync(join(out, first.slug, 'index.html'), 'utf8');
  assert.match(page, /Older: /);
  assert.doesNotMatch(page, /Newer: /);
  assert.match(page, /<svg [^>]*class="rchart/);
});

test('build refuses a file with problems', () => {
  const dir = mkdtempSync(join(tmpdir(), 'vrk-'));
  const bad = join(dir, 'bad.json');
  writeFileSync(bad, JSON.stringify({ reports: [{ slug: 'x' }] }));
  assert.throws(() => build(bad, join(dir, 'out')), /reports.json has problems/);
});

test('a chart carries the tooltip of each mark, and the curve chart draws a line with its marks', () => {
  const svg = renderChart({ type: 'bars', max: 1, items: [{ label: 'a', value: 0.5 }] }, 'x');
  assert.match(svg, /data-tip="a: 0\.50"/);
  const curve = renderChart({ type: 'curve', xLabel: 'x', yLabel: 'y', xmin: 0, xmax: 1, ymin: 0, ymax: 1, points: [[0, 0], [1, 1]], marks: [{ x: 0.5, y: 0.5, label: 'mid', tip: 'the middle' }] }, 'x');
  assert.match(curve, /class="curve"/);
  assert.match(curve, /data-tip="the middle"/);
  assert.doesNotMatch(curve, /NaN/);
});

test('an interactive report: the controls filter and sort the rows, and the page carries the first view, the table, and the script', () => {
  const r = reports.find((x) => x.explore);
  assert.ok(r, 'the examples hold a report with an explorer');
  const values = initialValues(r.explore);
  assert.equal(rowsOf(r.explore, values).length, 3);
  assert.equal(rowsOf(r.explore, { ...values, isoform: 'CYP2D6' }).length, 3);
  assert.equal(chartOf(r.explore, values, rowsOf(r.explore, values)).items.length, 3);
  assert.match(csvOf(r.explore, rowsOf(r.explore, values)), /^Enzyme,Method,Expected calibration error/);
  const html = renderReport(r, [r]);
  assert.match(html, /data-rx/);
  assert.match(html, /<select data-control="isoform">/);
  assert.match(html, /<script type="application\/json" class="rx-json">/);
  assert.match(html, /<script type="module" src="\.\.\/assets\/client\.js">/);
  assert.doesNotMatch(renderExplore(r.explore, 'x'), /<script>alert/);
});

test('a report without an explorer still gets its chart values as a data table', () => {
  const r = reports.find((x) => !x.explore);
  const html = renderReport(r, [r]);
  assert.match(html, /<summary>Data table<\/summary>/);
  assert.match(html, /<table class="rx-table">/);
});

test('the explorer is validated: rows, columns that name keys of the rows, controls, and chart variants', () => {
  const r = structuredClone(reports.find((x) => x.explore));
  assert.deepEqual(validateReports([r]), []);
  assert.match(validateReports([{ ...r, explore: { ...r.explore, rows: [] } }]).join(), /needs rows/);
  assert.match(validateReports([{ ...r, explore: { ...r.explore, columns: [{ key: 'nope', label: 'x' }] } }]).join(), /column nope/);
  assert.match(validateReports([{ ...r, explore: { ...r.explore, controls: [{ id: 'a', type: 'filter', key: 'nope', label: 'A', options: [{ value: 'x', label: 'x' }] }] } }]).join(), /filter a names a key/);
  assert.match(validateReports([{ ...r, explore: { ...r.explore, charts: [{ type: 'pie' }] } }]).join(), /chart type pie/);
});
