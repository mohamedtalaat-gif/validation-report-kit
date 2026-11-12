const CHARTS = ['bars', 'pairs', 'intervals', 'diverging', 'gates', 'curve'];
const need = (r, k, type, errs) => { if (!(k in r) || (type === 'array' ? !Array.isArray(r[k]) : typeof r[k] !== type)) errs.push(`${r.slug ?? '?'}: ${k} must be a ${type}`); };

/** Returns a list of problems with a list of reports; an empty list means it can be rendered. */
export function validateReports(reports) {
  const errs = [];
  if (!Array.isArray(reports) || !reports.length) return ['reports must be a non-empty array'];
  const seen = new Set();
  for (const r of reports) {
    for (const k of ['slug', 'date', 'title', 'project', 'summary', 'caption']) need(r, k, 'string', errs);
    for (const k of ['endpoints', 'datasets', 'methods', 'headline', 'body']) need(r, k, 'array', errs);
    if (r.slug && !/^[a-z0-9][a-z0-9-]*$/.test(r.slug)) errs.push(`${r.slug}: slug may contain only a-z, 0-9 and hyphens`);
    if (seen.has(r.slug)) errs.push(`${r.slug}: duplicate slug`);
    seen.add(r.slug);
    if (!r.chart || !CHARTS.includes(r.chart.type)) errs.push(`${r.slug}: chart.type must be one of ${CHARTS.join(', ')}`);
    if (!r.source?.href || !r.source?.label) errs.push(`${r.slug}: source needs a label and an href`);
    for (const h of r.headline ?? []) if (!h.value || !h.label) errs.push(`${r.slug}: every headline needs a value and a label`);
    if (r.explore !== undefined) validateExplore(r.slug, r.explore, errs);
  }
  return errs;
}

const CONTROLS = ['filter', 'sort', 'view'];

/** The problems of the interactive part of a report: rows, columns that name keys of the rows, controls with options, and chart variants of a known type. */
function validateExplore(slug, ex, errs) {
  const at = (m) => errs.push(`${slug}: explore ${m}`);
  if (!Array.isArray(ex.rows) || !ex.rows.length) return at('needs rows');
  if (!Array.isArray(ex.columns) || !ex.columns.length) return at('needs columns');
  const keys = new Set(ex.rows.flatMap((r) => Object.keys(r)));
  for (const c of ex.columns) if (!c.key || !c.label || !keys.has(c.key)) at(`column ${c.key ?? '?'} needs a label and a key that the rows have`);
  for (const c of ex.controls ?? []) {
    if (!c.id || !CONTROLS.includes(c.type) || !c.label || !Array.isArray(c.options) || !c.options.length) at(`control ${c.id ?? '?'} needs an id, a type (${CONTROLS.join(', ')}), a label, and options`);
    else if (c.type === 'filter' && !keys.has(c.key)) at(`filter ${c.id} names a key that the rows do not have`);
    else if (c.options.some((o) => o.value === undefined || !o.label)) at(`control ${c.id} has an option without a value or a label`);
  }
  if ((ex.controls ?? []).length && !(ex.charts ?? []).length) at('with controls needs at least one chart');
  for (const v of ex.charts ?? []) if (!CHARTS.includes(v.type)) at(`chart type ${v.type} must be one of ${CHARTS.join(', ')}`);
}
