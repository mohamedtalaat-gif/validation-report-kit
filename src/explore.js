// The interactive part of a validation report: a table of rows, controls that filter and sort them, and a chart that is drawn from the rows that remain. The page is built with the first view, and
// the script of the page (src/scripts/report-explore.js) calls the same functions again when a reader changes a control, so the chart of the built page and the chart in the browser come from one code.

import { chartSvg, esc } from './charts.js';

const plain = (v) => (typeof v === 'number' ? String(Number(v.toFixed(4))) : String(v));

/** A template such as "{enzyme}, {bin}" filled with the values of a row ("{auc:3}" fixes the decimals of a number). */
export function fill(template, row) {
  return template.replace(/\{(\w+)(?::(\d+))?\}/g, (_, key, digits) => {
    const v = row[key];
    if (v === null || v === undefined) return 'n/a';
    return typeof v === 'number' && digits !== undefined ? v.toFixed(Number(digits)) : plain(v);
  });
}

/** The value that each control starts with: its own `value`, or the first of its options. */
export function initialValues(explore) {
  return Object.fromEntries((explore.controls ?? []).map((c) => [c.id, c.value ?? c.options[0].value]));
}

const matches = (when, values) => Object.entries(when ?? {}).every(([k, v]) => values[k] === v);

/** The rows that the controls leave, in the order that the controls give them. */
export function rowsOf(explore, values) {
  let rows = explore.rows.filter((row) => (explore.controls ?? []).every((c) => c.type !== 'filter' || values[c.id] === '*' || String(row[c.key]) === values[c.id]));
  const sort = (explore.controls ?? []).find((c) => c.type === 'sort');
  const how = sort ? values[sort.id] : null;
  if (how && how !== 'order') {
    const desc = how.startsWith('-');
    const key = desc ? how.slice(1) : how;
    const sign = desc ? -1 : 1;
    rows = [...rows].sort((a, b) => {
      const x = a[key];
      const y = b[key];
      if (x === y) return 0;
      if (x === null || x === undefined) return 1;
      if (y === null || y === undefined) return -1;
      return (x < y ? -1 : 1) * sign;
    });
  }
  return rows;
}

/** The chart specification for these rows: the first variant of `charts` whose `when` fits the values of the controls. */
export function chartOf(explore, values, allRows) {
  const spec = explore.charts.find((v) => matches(v.when, values)) ?? explore.charts[0];
  const rows = spec.limit ? allRows.slice(0, spec.limit) : allRows; // a long table is drawn by its first rows, and the table below keeps them all
  const tipOf = (row) => (spec.tip ? fill(spec.tip, row) : undefined);
  switch (spec.type) {
    case 'intervals':
      return { type: 'intervals', min: spec.min, max: spec.max, refLabel: spec.refLabel, items: rows.map((r) => ({ label: fill(spec.label, r), est: r[spec.est], lo: r[spec.lo], hi: r[spec.hi], ref: spec.ref, tip: tipOf(r) })) };
    case 'pairs':
      return { type: 'pairs', min: spec.min, max: spec.max, aLabel: spec.aLabel, bLabel: spec.bLabel, items: rows.map((r) => ({ label: fill(spec.label, r), a: r[spec.a], b: r[spec.b], lo: spec.lo ? r[spec.lo] : undefined, hi: spec.hi ? r[spec.hi] : undefined, tip: tipOf(r) })) };
    case 'bars': {
      if (spec.groupBy) {
        // one bar for each value of a column, with the largest or the mean of another column over its rows
        const groups = new Map();
        for (const r of rows) groups.set(r[spec.groupBy], [...(groups.get(r[spec.groupBy]) ?? []), r[spec.value]]);
        const items = [...groups].map(([key, values]) => {
          const value = spec.agg === 'mean' ? values.reduce((a, b) => a + b, 0) / values.length : Math.max(...values);
          return { label: fill(spec.label, { key }), value, tip: fill(spec.tip ?? '{key}', { key, value: Number(value.toFixed(3)), n: values.length }) };
        });
        return { type: 'bars', max: spec.max, ref: spec.ref, items };
      }
      return { type: 'bars', max: spec.max, ref: spec.ref, items: rows.map((r) => ({ label: fill(spec.label, r), value: r[spec.value], tip: tipOf(r) })) };
    }
    case 'diverging':
      return { type: 'diverging', span: spec.span, ref: spec.ref, items: rows.map((r) => ({ label: fill(spec.label, r), value: r[spec.value], tip: tipOf(r) })) };
    case 'gates':
      return { type: 'gates', items: rows.map((r) => ({ met: r[spec.flag] === spec.flagValue, tip: tipOf(r) })) };
    case 'curve': {
      const points = rows.filter((r) => matches(spec.curveWhere, r)).map((r) => [r[spec.x], r[spec.y]]);
      const marks = (spec.marks ?? []).flatMap((m) => rows.filter((r) => matches(m.where, r)).map((r) => ({ x: r[spec.x], y: r[spec.y], label: fill(m.label, r), tip: fill(m.tip, r) })));
      return { type: 'curve', xLabel: spec.xLabel, yLabel: spec.yLabel, xmin: spec.xmin, xmax: spec.xmax, ymin: spec.ymin, ymax: spec.ymax, points, marks };
    }
    default:
      throw new Error(`unknown explore chart ${spec.type}`);
  }
}

/** What the reader sees above the table: how many rows remain, and the mean of a column when the report asks for it. */
export function summaryOf(explore, rows) {
  const parts = [`${rows.length} of ${explore.rows.length} ${explore.noun ?? 'rows'}`];
  if (explore.mean) {
    const values = rows.map((r) => r[explore.mean.key]).filter((v) => typeof v === 'number');
    if (values.length) parts.push(`mean ${explore.mean.label} ${(values.reduce((a, b) => a + b, 0) / values.length).toFixed(3).replace('-', '\u2212')}`);
  }
  if (explore.count) {
    const n = rows.filter((r) => r[explore.count.key] === explore.count.value).length;
    parts.push(`${n} ${explore.count.label}`);
  }
  return parts.join('; ');
}

const cell = (column, value) => {
  if (value === null || value === undefined) return 'n/a';
  if (typeof value === 'number') return (column.digits !== undefined ? value.toFixed(column.digits) : plain(value)).replace('-', '\u2212');
  return String(value);
};

/** The table of the rows that remain: the header cells sort it in the browser (the script of the page), and each cell keeps its raw value in `data-v`. */
export function tableHtml(explore, rows) {
  const head = explore.columns.map((c) => `<th scope="col" data-key="${esc(c.key)}" data-kind="${c.digits !== undefined || c.kind === 'number' ? 'number' : 'text'}" tabindex="0">${esc(c.label)}</th>`).join('');
  const body = rows
    .map((r) => `<tr>${explore.columns.map((c) => `<td data-v="${esc(r[c.key] ?? '')}"${typeof r[c.key] === 'number' ? ' class="num"' : ''}>${esc(cell(c, r[c.key]))}</td>`).join('')}</tr>`)
    .join('');
  return `<table class="rx-table"><thead><tr>${head}</tr></thead><tbody>${body}</tbody></table>`;
}

/** The rows that remain as CSV text, with the labels of the columns as its header. */
export function csvOf(explore, rows) {
  const quote = (v) => (/[",\n]/.test(String(v)) ? `"${String(v).replace(/"/g, '""')}"` : String(v));
  const lines = [explore.columns.map((c) => quote(c.label)).join(',')];
  for (const r of rows) lines.push(explore.columns.map((c) => quote(r[c.key] ?? '')).join(','));
  return `${lines.join('\n')}\n`;
}

/** A report with a chart and no table of its own still gets a data table: the values of its chart. */
export function exploreFromChart(chart, chartTable) {
  const { columns, rows } = chartTable(chart);
  return {
    noun: 'rows',
    columns: columns.map((label, i) => ({ key: `c${i}`, label, kind: i ? 'number' : 'text' })),
    rows: rows.map((row) => Object.fromEntries(row.map((v, i) => [`c${i}`, v]))),
    controls: [],
    charts: [],
  };
}

export { chartSvg };
