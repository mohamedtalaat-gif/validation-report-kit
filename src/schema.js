const CHARTS = ['bars', 'pairs', 'intervals', 'diverging', 'gates'];
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
  }
  return errs;
}
