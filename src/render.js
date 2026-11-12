import { renderChart, chartSvg, chartTable, esc } from './charts.js';
import { chartOf, exploreFromChart, initialValues, rowsOf, summaryOf, tableHtml } from './explore.js';

export const CSS = `
:root { --bg:#0e131c; --bg-deep:#0a0f17; --panel:#151c28; --text:#e1e8f2; --muted:#93a3ba; --rule:#2a3547; --n:#5b8dff; --fe:#f08a4b; }
@media (prefers-color-scheme: light) { :root { --bg:#f4f6fa; --bg-deep:#e8ecf3; --panel:#ffffff; --text:#18243b; --muted:#566581; --rule:#d3dae6; --n:#2f5fd0; --fe:#d9622a; } }
body { margin:0; background:var(--bg); color:var(--text); font:17px/1.6 system-ui,sans-serif; }
main { max-width:46rem; margin:0 auto; padding:2.5rem 1.2rem 4rem; }
a { color:var(--n); }
h1 { font-size:clamp(1.9rem,4.5vw,2.8rem); line-height:1.12; margin:.2rem 0 .6rem; }
h2 { font-size:1.35rem; margin:2.4rem 0 .6rem; }
h3 { font-size:1.15rem; margin:0 0 .2rem; }
.lede { color:var(--muted); font-size:1.15rem; }
.meta { color:var(--muted); font-size:.92rem; }
.counters { display:flex; flex-wrap:wrap; gap:.6rem 2.6rem; list-style:none; padding:0; margin:1.8rem 0 .6rem; }
.counters li { display:grid; }
.counters strong { font-size:2.6rem; line-height:1; font-variant-numeric:tabular-nums; }
.counters span { color:var(--muted); }
.rows { list-style:none; padding:0; margin:0; }
.row { display:grid; grid-template-columns:7rem 1fr; gap:.3rem 1.2rem; padding:1rem 0; border-top:1px solid var(--rule); }
.row.plain { grid-template-columns:1fr; }
.row p { margin:.2rem 0; }
.facts { display:grid; grid-template-columns:repeat(auto-fit,minmax(11rem,1fr)); gap:1.2rem 2rem; list-style:none; padding:0; margin:1.6rem 0; }
.facts li { border-left:2px solid var(--rule); padding-left:.9rem; }
.facts strong { display:block; font-size:2rem; line-height:1; font-variant-numeric:tabular-nums; }
.facts span { color:var(--muted); font-size:.95rem; }
dl.report-meta { margin:2rem 0 0; border-top:1px solid var(--rule); }
dl.report-meta div { display:grid; grid-template-columns:8rem 1fr; gap:1rem; padding:.7rem 0; border-bottom:1px solid var(--rule); }
dl.report-meta dt { color:var(--muted); } dl.report-meta dd { margin:0; }
nav.pager { display:flex; justify-content:space-between; gap:2rem; margin-top:2.5rem; }
figure { margin:2rem 0; } figcaption { color:var(--muted); font-size:.92rem; margin-top:.5rem; max-width:56ch; }
.rchart { width:100%; max-width:44rem; height:auto; display:block; overflow:visible; }
.rchart text { font-size:13px; fill:var(--muted); } .rchart .lbl { fill:var(--text); font-size:14px; } .rchart .val { fill:var(--text); }
.rchart .grid { stroke:var(--rule); } .rchart .refline { stroke:var(--muted); stroke-dasharray:4 4; } .rchart .refl { font-size:12px; }
.rchart .bar { fill:var(--n); } .rchart .bar.neg { fill:var(--fe); } .rchart .dot-a { fill:var(--n); } .rchart .dot-b { fill:var(--fe); }
.rchart .link { stroke:var(--muted); stroke-width:1.5; stroke-dasharray:3 3; } .rchart .ci { stroke:var(--n); stroke-width:2; opacity:.55; }
.rchart .refmark { fill:var(--fe); } .rchart .gate { fill:none; stroke:var(--rule); stroke-width:1.5; } .rchart .gate.met { fill:var(--fe); stroke:var(--fe); }
.rchart .gate.dim { opacity:.3; } .rchart .gate[data-tip]:hover, .rchart .gate[data-tip]:focus { stroke:var(--text); outline:none; }
.rchart .hit { fill:transparent; } .rchart g[data-tip]:hover .hit, .rchart g[data-tip]:focus .hit { fill:color-mix(in srgb, var(--n) 10%, transparent); } .rchart g[data-tip]:focus { outline:none; }
.rchart .curve { fill:none; stroke:var(--n); stroke-width:2.2; } .rchart .hitdot { fill:transparent; } .rchart .hitdot:hover, .rchart .hitdot:focus { fill:color-mix(in srgb, var(--n) 35%, transparent); outline:none; }
.rchart .refl { paint-order:stroke; stroke:var(--bg); stroke-width:3px; stroke-linejoin:round; }
.rtip { position:fixed; z-index:50; max-width:min(22rem,90vw); padding:.45rem .7rem; color:var(--text); font-size:.9rem; line-height:1.35; background:var(--panel); border:1px solid var(--rule); border-radius:6px; box-shadow:0 6px 20px rgba(0,0,0,.25); pointer-events:none; }
.rx { margin:2.4rem 0 0; } .rx-title { font-size:1.35rem; margin:0 0 .4rem; } .rx-lede { margin:0 0 1rem; max-width:56ch; }
.rx-controls { display:flex; flex-wrap:wrap; align-items:center; gap:.6rem 1.4rem; margin:1rem 0 1.2rem; padding:.8rem 0; border-top:1px solid var(--rule); border-bottom:1px solid var(--rule); }
.rx-control { display:flex; align-items:center; gap:.6rem; color:var(--muted); }
.rx-control select { font:inherit; color:var(--text); background:none; border:1px solid var(--rule); border-radius:99px; padding:.25rem .9rem; cursor:pointer; max-width:100%; }
.rx-control select:hover { border-color:var(--muted); } .rx-control option { color:var(--text); background:var(--panel); }
.rx-control select:focus-visible, .rx-csv:focus-visible { outline:2px solid var(--n); outline-offset:2px; }
.rx-summary { margin:.3rem 0 .4rem; } .rx-caption { margin:0 0 1rem; max-width:56ch; }
.rx-data { margin:1rem 0 0; } .rx-data > summary { cursor:pointer; color:var(--muted); }
.rx-tablewrap { margin:.8rem 0 0; overflow-x:auto; }
.rx-table { border-collapse:collapse; width:100%; min-width:28rem; font-size:.95rem; }
.rx-table th, .rx-table td { text-align:left; padding:.6rem 1.2rem .6rem 0; border-bottom:1px solid var(--rule); vertical-align:top; white-space:nowrap; }
.rx-table td { max-width:26rem; overflow:hidden; text-overflow:ellipsis; } .rx-table td.num { text-align:right; font-variant-numeric:tabular-nums; }
.rx-table th { color:var(--muted); cursor:pointer; user-select:none; } .rx-table th:hover { color:var(--text); }
.rx-table th[aria-sort="ascending"]::after { content:' \\25B2'; font-size:.75em; } .rx-table th[aria-sort="descending"]::after { content:' \\25BC'; font-size:.75em; }
.rx-foot { margin:.6rem 0 0; }
.rx-csv { font:inherit; color:var(--muted); background:none; border:1px solid var(--rule); border-radius:99px; padding:.25rem .9rem; cursor:pointer; } .rx-csv:hover { color:var(--text); border-color:var(--muted); }
`;

/** Number of distinct values of `pick(report)` across all reports (a pick may return one value or a list). */
export const countDistinct = (reports, pick) => new Set(reports.flatMap((r) => [pick(r)].flat())).size;

export function counters(reports) {
  return [
    { n: reports.length, label: 'reports', hint: 'Reports in this collection.' },
    { n: countDistinct(reports, (r) => r.project), label: 'studies', hint: 'Distinct projects the reports come from.' },
    { n: countDistinct(reports, (r) => r.methods), label: 'methods', hint: 'Distinct validation methods named in the reports.' },
    { n: countDistinct(reports, (r) => r.endpoints), label: 'endpoints', hint: 'Distinct quantities that a model predicts or a report evaluates.' },
    { n: countDistinct(reports, (r) => r.datasets), label: 'datasets', hint: 'Distinct data sources the reports test against.' },
  ];
}

export const sortNewestFirst = (reports) => [...reports].sort((a, b) => (a.date < b.date ? 1 : a.date > b.date ? -1 : a.title.localeCompare(b.title)));

const page = (title, body, css, script = '') => `<!doctype html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>${esc(title)}</title><style>${css}</style></head>
<body><main>${body}</main>${script}</body></html>
`;

/** The index page: counters, the reports newest first and an optional list of shared rules. */
export function renderHub(reports, site = {}, css = CSS) {
  const list = sortNewestFirst(reports);
  const rules = (site.rules ?? []).map((r) => `<li class="row plain"><div><h3>${esc(r.name)}</h3><p>${esc(r.text)}</p></div></li>`).join('');
  const body = `<h1>${esc(site.title ?? 'Validation reports')}</h1>${site.intro ? `<p class="lede">${esc(site.intro)}</p>` : ''}
<ul class="counters">${counters(reports).map((c) => `<li title="${esc(c.hint)}"><strong>${c.n}</strong><span>${c.label}</span></li>`).join('')}</ul>
<h2>Reports</h2><ul class="rows">${list.map((r) => `<li class="row"><span class="meta">${esc(r.date)}</span><div><h3><a href="${esc(r.slug)}/">${esc(r.title)}</a></h3><p>${esc(r.summary)}</p><p class="meta">${esc(r.project)}. ${esc(r.endpoints.join('; '))}.</p></div></li>`).join('')}</ul>
${rules ? `<h2>${esc(site.rulesTitle ?? 'What makes these comparable')}</h2><ul class="rows">${rules}</ul>` : ''}`;
  return page(site.title ?? 'Validation reports', body, css);
}

/** The interactive part of a report as HTML: the controls, the chart of the first view, the summary, and the table of its rows. The script of the page (assets/client.js) draws the chart and the table again when a control changes. */
export function renderExplore(explore, alt, { title = 'Explore the data', source = '', caption = '' } = {}) {
  const controls = explore.controls ?? [];
  const values = initialValues(explore);
  const rows = rowsOf(explore, values);
  const chart = controls.length ? chartOf(explore, values, rows) : null;
  const json = JSON.stringify({ ...explore, alt }).replace(/</g, '\\u003c');
  const select = (c) => `<label class="rx-control"><span>${esc(c.label)}</span><select data-control="${esc(c.id)}">${c.options.map((o) => `<option value="${esc(o.value)}"${o.value === values[c.id] ? ' selected' : ''}>${esc(o.label)}</option>`).join('')}</select></label>`;
  return `<section class="rx" data-rx aria-label="${esc(title)}">${controls.length ? `<h2 class="rx-title">${esc(title)}</h2>` : ''}${explore.lede && controls.length ? `<p class="meta rx-lede">${esc(explore.lede)}</p>` : ''}
${controls.length ? `<div class="rx-controls">${controls.map(select).join('')}</div><div class="rx-chart">${chartSvg(chart, alt)}</div><p class="meta rx-summary" aria-live="polite">${esc(summaryOf(explore, rows))}</p>${caption ? `<p class="meta rx-caption">${esc(caption)}</p>` : ''}` : ''}
<details class="rx-data"${controls.length && rows.length <= 25 ? ' open' : ''}><summary>${controls.length ? 'Data table of this view' : 'Data table'}</summary><div class="rx-tablewrap">${tableHtml(explore, rows)}</div><p class="meta rx-foot"><button type="button" class="rx-csv">Download as CSV</button>${source ? ` Read from <code>${esc(source)}</code>.` : ''}</p></details>
<script type="application/json" class="rx-json">${json}</script></section>`;
}

/** One report page. `list` is the sorted list, used for the newer/older links. */
export function renderReport(report, list, css = CSS) {
  const i = list.findIndex((r) => r.slug === report.slug);
  const newer = list[i - 1], older = list[i + 1];
  const ex = report.explore;
  const interactive = Boolean(ex?.controls?.length);
  const replaces = interactive && ex.position !== 'after'; // some reports keep their own figure and show the explorer after the text
  const body = `<p class="meta"><a href="../">All reports</a> / ${esc(report.project)}, ${esc(report.date)}</p>
<h1>${esc(report.title)}</h1><p class="lede">${esc(report.summary)}</p>
<ul class="facts">${report.headline.map((h) => `<li><strong>${esc(h.value)}</strong><span>${esc(h.label)}</span></li>`).join('')}</ul>
${replaces ? `<figure>${renderExplore(ex, report.caption, { title: ex.title, source: ex.source, caption: report.caption })}</figure>` : `<figure>${renderChart(report.chart, report.caption)}<figcaption>${esc(report.caption)}</figcaption></figure>`}
${report.body.map((p) => `<p>${esc(p)}</p>`).join('')}
${interactive && !replaces ? renderExplore(ex, report.caption, { title: ex.title, source: ex.source }) : ''}${!interactive ? renderExplore(ex ?? exploreFromChart(report.chart, chartTable), report.caption, { title: 'Data', source: ex?.source }) : ''}
<dl class="report-meta"><div><dt>Endpoint</dt><dd>${esc(report.endpoints.join('; '))}</dd></div><div><dt>Data</dt><dd>${esc(report.datasets.join('; '))}</dd></div><div><dt>Methods</dt><dd>${esc(report.methods.join('; '))}</dd></div><div><dt>Source</dt><dd><a href="${esc(report.source.href)}">${esc(report.source.label)}</a>${report.related ? ` &middot; <a href="${esc(report.related.href)}">${esc(report.related.label)}</a>` : ''}</dd></div></dl>
<nav class="pager">${newer ? `<a href="../${esc(newer.slug)}/">Newer: ${esc(newer.title)}</a>` : '<span></span>'}${older ? `<a href="../${esc(older.slug)}/">Older: ${esc(older.title)}</a>` : '<span></span>'}</nav>`;
  return page(report.title, body, css, '<script type="module" src="../assets/client.js"></script>');
}
