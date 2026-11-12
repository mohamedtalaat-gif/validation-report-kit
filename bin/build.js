#!/usr/bin/env node
// Usage: validation-report-kit <reports.json> <out-dir>
// reports.json is { "site": { "title", "intro", "rules": [{ "name", "text" }] }, "reports": [ ... ] }; a bare array also works.
import { readFileSync, mkdirSync, writeFileSync, copyFileSync } from 'node:fs';
import { join, resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { validateReports } from '../src/schema.js';
import { renderHub, renderReport, sortNewestFirst, CSS } from '../src/render.js';

export function build(inputPath, outDir) {
  const data = JSON.parse(readFileSync(inputPath, 'utf8'));
  const reports = Array.isArray(data) ? data : data.reports;
  const site = Array.isArray(data) ? {} : data.site ?? {};
  const problems = validateReports(reports);
  if (problems.length) throw new Error(`reports.json has problems:\n- ${problems.join('\n- ')}`);
  mkdirSync(join(outDir, 'assets'), { recursive: true });
  const src = join(dirname(fileURLToPath(import.meta.url)), '..', 'src');
  for (const file of ['client.js', 'explore.js', 'charts.js']) copyFileSync(join(src, file), join(outDir, 'assets', file)); // the pages load them as modules
  writeFileSync(join(outDir, 'index.html'), renderHub(reports, site, CSS));
  const list = sortNewestFirst(reports);
  for (const r of reports) {
    mkdirSync(join(outDir, r.slug), { recursive: true });
    writeFileSync(join(outDir, r.slug, 'index.html'), renderReport(r, list, CSS));
  }
  return { pages: reports.length + 1, outDir: resolve(outDir) };
}

if (process.argv[1] && import.meta.url === new URL(`file://${resolve(process.argv[1])}`).href) {
  const [input, out] = process.argv.slice(2);
  if (!input || !out) {
    console.error('usage: validation-report-kit <reports.json> <out-dir>');
    process.exit(2);
  }
  try {
    const { pages, outDir } = build(input, out);
    console.log(`wrote ${pages} pages to ${outDir}`);
  } catch (e) {
    console.error(e.message);
    process.exit(1);
  }
}
