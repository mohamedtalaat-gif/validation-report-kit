// The charts of the validation reports as SVG text. The same module draws a chart when the page is built and again in the browser when a reader changes a control of an interactive report
// (src/client.js), so the two pictures cannot differ. Every mark that a reader may point at carries `data-tip` (the text of its tooltip) and `tabindex`, so a keyboard reaches it too.

const W = 640;
const L = 190; // label gutter of the charts with one row for each item
const R = 24;

export const esc = (value) => String(value).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
export const fmt = (v) => (Math.abs(v) < 0.1 && v !== 0 ? v.toFixed(3) : v.toFixed(2));
const sign = (v, digits = 2) => `${v < 0 ? '−' : '+'}${Math.abs(v).toFixed(digits)}`;
const tip = (text) => (text ? ` data-tip="${esc(text)}" tabindex="0"` : '');
const shorten = (text, n = 30) => (text.length > n ? `${text.slice(0, n - 1)}…` : text);

/** Axis ticks at round values (1, 2, 2.5, or 5 times a power of ten), about five steps over the range, with the decimals that the step needs. */
export function niceTicks(min, max) {
  const raw = (max - min) / 5;
  const mag = 10 ** Math.floor(Math.log10(raw));
  const step = [1, 2, 2.5, 5, 10].map((m) => m * mag).find((c) => c >= raw - 1e-12) ?? raw;
  let decimals = 0;
  while (decimals < 4 && Math.abs(step * 10 ** decimals - Math.round(step * 10 ** decimals)) > 1e-9) decimals += 1;
  const ticks = [];
  for (let t = Math.ceil(min / step - 1e-9) * step; t <= max + 1e-9; t += step) ticks.push(Math.round(t * 10 ** (decimals + 2)) / 10 ** (decimals + 2) || 0); // `|| 0` turns a negative zero into zero
  return { ticks, decimals };
}

const svgOpen = (H, alt) => `<svg viewBox="0 0 ${W} ${H}" role="img" aria-label="${esc(alt)}" class="rchart">`;

/** Rows of more than ten items are drawn closer together. */
const rowStep = (n, roomy, tight, limit = 10) => (n > limit ? tight : roomy);

function bars(c, alt) {
  const n = c.items.length;
  const step = rowStep(n, 40, 28, 12);
  const x = (v) => L + (v / c.max) * (W - L - R);
  const H = 30 + n * step + 26;
  const ticks = [0, 0.25, 0.5, 0.75, 1].map((f) => f * c.max);
  const grid = ticks.map((t) => `<g><line x1="${x(t)}" x2="${x(t)}" y1="10" y2="${H - 26}" class="grid"/><text x="${x(t)}" y="${H - 8}" text-anchor="middle">${t.toFixed(2)}</text></g>`).join('');
  const rows = c.items
    .map((it, i) => {
      const y = 28 + i * step;
      const text = it.tip ?? `${it.label}: ${fmt(it.value)}`;
      return `<g${tip(text)}><rect x="0" y="${y - 4}" width="${W}" height="${step - 4}" class="hit"/><text x="${L - 12}" y="${y + step / 2 - 6}" text-anchor="end" class="lbl">${esc(shorten(it.label, 34))}</text><rect x="${L}" y="${y}" width="${Math.max(0, x(it.value) - L)}" height="${Math.min(22, step - 6)}" rx="2" class="bar"/><text x="${x(it.value) + 8}" y="${y + step / 2 - 6}" class="val">${fmt(it.value)}</text></g>`;
    })
    .join('');
  const ref = c.ref ? `<g><line x1="${x(c.ref.value)}" x2="${x(c.ref.value)}" y1="10" y2="${H - 26}" class="refline"/><text x="${x(c.ref.value) + 5}" y="22" class="refl">${esc(c.ref.label)}</text></g>` : '';
  return `${svgOpen(H, alt)}${grid}${rows}${ref}</svg>`;
}

function pairs(c, alt) {
  const n = c.items.length;
  const step = rowStep(n, 52, 30);
  const x = (v) => L + ((v - c.min) / (c.max - c.min)) * (W - L - R);
  const H = 50 + n * step + 30;
  const { ticks, decimals } = niceTicks(c.min, c.max);
  const legend = `<g class="legend"><circle cx="${L}" cy="14" r="6" class="dot-a"/><text x="${L + 12}" y="18">${esc(c.aLabel)}</text><circle cx="${L + 200}" cy="14" r="6" class="dot-b"/><text x="${L + 212}" y="18">${esc(c.bLabel)}</text></g>`;
  const grid = ticks.map((t) => `<g><line x1="${x(t)}" x2="${x(t)}" y1="34" y2="${H - 28}" class="grid"/><text x="${x(t)}" y="${H - 10}" text-anchor="middle">${t.toFixed(decimals)}</text></g>`).join('');
  const rows = c.items
    .map((it, i) => {
      const cy = 50 + step / 2 + i * step;
      const close = Math.abs(x(it.a) - x(it.b)) < 34;
      const labels =
        it.a === it.b
          ? `<text x="${x(it.a)}" y="${cy - 13}" text-anchor="middle" class="val">${fmt(it.a)}</text>`
          : close
            ? `<text x="${Math.min(x(it.a), x(it.b)) - 3}" y="${cy - 13}" text-anchor="end" class="val">${fmt(x(it.a) <= x(it.b) ? it.a : it.b)}</text><text x="${Math.max(x(it.a), x(it.b)) + 3}" y="${cy - 13}" text-anchor="start" class="val">${fmt(x(it.a) <= x(it.b) ? it.b : it.a)}</text>`
            : `<text x="${x(it.a)}" y="${cy - 13}" text-anchor="middle" class="val">${fmt(it.a)}</text><text x="${x(it.b)}" y="${cy - 13}" text-anchor="middle" class="val">${fmt(it.b)}</text>`;
      const interval = it.lo !== undefined && it.lo !== null && it.hi !== undefined && it.hi !== null ? `<line x1="${x(it.lo)}" x2="${x(it.hi)}" y1="${cy}" y2="${cy}" class="ci"/>` : '';
      const text = it.tip ?? `${it.label}: ${c.aLabel} ${fmt(it.a)}, ${c.bLabel} ${fmt(it.b)}`;
      return `<g${tip(text)}><rect x="0" y="${cy - step / 2}" width="${W}" height="${step}" class="hit"/><text x="${L - 12}" y="${cy + 4}" text-anchor="end" class="lbl">${esc(shorten(it.label, 34))}</text>${interval}<line x1="${x(it.a)}" x2="${x(it.b)}" y1="${cy}" y2="${cy}" class="link"/><circle cx="${x(it.a)}" cy="${cy}" r="6.5" class="dot-a"/><circle cx="${x(it.b)}" cy="${cy}" r="6.5" class="dot-b"/>${step > 40 ? labels : ''}</g>`;
    })
    .join('');
  return `${svgOpen(H, alt)}${legend}${grid}${rows}</svg>`;
}

function intervals(c, alt) {
  const n = c.items.length;
  const step = rowStep(n, 56, 34, 8);
  const x = (v) => L + ((v - c.min) / (c.max - c.min)) * (W - L - R);
  const H = 50 + n * step + 30;
  const { ticks, decimals } = niceTicks(c.min, c.max);
  const legend = `<g class="legend"><circle cx="${L}" cy="14" r="6" class="dot-a"/><text x="${L + 12}" y="18">estimate with its interval</text><rect x="${L + 230}" y="8" width="3" height="12" class="refmark"/><text x="${L + 242}" y="18">${esc(c.refLabel)}</text></g>`;
  const grid = ticks.map((t) => `<g><line x1="${x(t)}" x2="${x(t)}" y1="34" y2="${H - 28}" class="grid"/><text x="${x(t)}" y="${H - 10}" text-anchor="middle">${t.toFixed(decimals)}</text></g>`).join('');
  const rows = c.items
    .map((it, i) => {
      const cy = 50 + step / 2 + i * step;
      const has = it.est !== null && it.est !== undefined && it.lo !== null && it.lo !== undefined;
      const text = it.tip ?? (has ? `${it.label}: ${fmt(it.est)} (${fmt(it.lo)} to ${fmt(it.hi)})` : `${it.label}: no estimate`);
      const body = has
        ? `<line x1="${x(it.lo)}" x2="${x(it.hi)}" y1="${cy}" y2="${cy}" class="ci"/><line x1="${x(it.lo)}" x2="${x(it.lo)}" y1="${cy - 7}" y2="${cy + 7}" class="ci"/><line x1="${x(it.hi)}" x2="${x(it.hi)}" y1="${cy - 7}" y2="${cy + 7}" class="ci"/><circle cx="${x(it.est)}" cy="${cy}" r="6.5" class="dot-a"/><text x="${x(it.est)}" y="${cy - 14}" text-anchor="middle" class="val">${fmt(it.est)}</text>`
        : `<text x="${x(c.min) + 6}" y="${cy + 4}" class="refl">no AUC (too few held-out compounds)</text>`;
      return `<g${tip(text)}><rect x="0" y="${cy - step / 2}" width="${W}" height="${step}" class="hit"/><text x="${L - 12}" y="${cy + 4}" text-anchor="end" class="lbl">${esc(shorten(it.label, 34))}</text>${body}<rect x="${x(it.ref) - 1.5}" y="${cy - 12}" width="3" height="24" class="refmark"/></g>`;
    })
    .join('');
  return `${svgOpen(H, alt)}${legend}${grid}${rows}</svg>`;
}

function diverging(c, alt) {
  const n = c.items.length;
  const step = rowStep(n, 44, 30);
  const span = c.span ?? 0.5;
  const zero = L + (W - L - R) / 2;
  const half = (W - L - R) / 2;
  const x = (v) => zero + (v / span) * half;
  const H = 30 + n * step + 26;
  const unit = span * 0.4;
  const marks = [-2, -1, 0, 1, 2].map((k) => k * unit);
  const decimals = unit >= 0.1 ? 1 : unit >= 0.01 ? 2 : 3;
  const grid = marks.map((t) => `<g><line x1="${x(t)}" x2="${x(t)}" y1="10" y2="${H - 26}" class="${t === 0 ? 'refline' : 'grid'}"/><text x="${x(t)}" y="${H - 8}" text-anchor="middle">${t.toFixed(decimals).replace('-', '\u2212')}</text></g>`).join('');
  const rows = c.items
    .map((it, i) => {
      const y = 30 + i * step;
      const text = it.tip ?? `${it.label}: ${sign(it.value, 3)}`;
      return `<g${tip(text)}><rect x="0" y="${y - 4}" width="${W}" height="${step - 4}" class="hit"/><text x="${L - 12}" y="${y + step / 2 - 6}" text-anchor="end" class="lbl">${esc(shorten(it.label))}</text><rect x="${Math.min(zero, x(it.value))}" y="${y}" width="${Math.abs(x(it.value) - zero)}" height="${Math.min(22, step - 6)}" rx="2" class="${it.value < 0 ? 'bar neg' : 'bar'}"/><text x="${it.value < 0 ? x(it.value) - 8 : x(it.value) + 8}" y="${y + step / 2 - 6}" text-anchor="${it.value < 0 ? 'end' : 'start'}" class="val">${sign(it.value, span < 0.1 ? 4 : 2)}</text></g>`;
    })
    .join('');
  const ref = c.ref ? `<g><line x1="${x(c.ref.value)}" x2="${x(c.ref.value)}" y1="10" y2="${H - 26}" class="refline refline--bar"/><text x="${x(c.ref.value) + 5}" y="22" class="refl">${esc(c.ref.label)}</text></g>` : '';
  return `${svgOpen(H, alt)}${grid}${rows}${ref}</svg>`;
}

function gates(c, alt) {
  const items = c.items ?? Array.from({ length: c.total }, (_, i) => ({ met: i < c.met }));
  const columns = 21;
  const H = 4 + Math.ceil(items.length / columns) * 32;
  const squares = items
    .map((it, i) => `<rect x="${4 + (i % columns) * 33.8}" y="${4 + Math.floor(i / columns) * 32}" width="28" height="26" rx="3" class="gate${it.met ? ' met' : ''}${it.dim ? ' dim' : ''}"${tip(it.tip)}/>`)
    .join('');
  return `<svg viewBox="0 0 720 ${H}" role="img" aria-label="${esc(alt)}" class="rchart rchart--gates">${squares}</svg>`;
}

function curve(c, alt) {
  const left = 58;
  const top = 26;
  const bottom = 46;
  const H = 330;
  const x = (v) => left + ((v - c.xmin) / (c.xmax - c.xmin)) * (W - left - R);
  const y = (v) => top + (1 - (v - c.ymin) / (c.ymax - c.ymin)) * (H - top - bottom);
  const xt = niceTicks(c.xmin, c.xmax);
  const yt = niceTicks(c.ymin, c.ymax);
  const grid =
    xt.ticks.map((t) => `<g><line x1="${x(t)}" x2="${x(t)}" y1="${top}" y2="${H - bottom}" class="grid"/><text x="${x(t)}" y="${H - bottom + 18}" text-anchor="middle">${t.toFixed(xt.decimals)}</text></g>`).join('') +
    yt.ticks.map((t) => `<g><line x1="${left}" x2="${W - R}" y1="${y(t)}" y2="${y(t)}" class="grid"/><text x="${left - 8}" y="${y(t) + 4}" text-anchor="end">${t.toFixed(yt.decimals)}</text></g>`).join('');
  const lines = c.points.map(([px, py], i) => `${i ? 'L' : 'M'}${x(px).toFixed(1)} ${y(py).toFixed(1)}`).join('');
  const hits = c.points.map(([px, py]) => `<circle cx="${x(px)}" cy="${y(py)}" r="7" class="hitdot"${tip(`${c.xLabel} ${px.toFixed(3)}: ${c.yLabel} ${py.toFixed(3)}`)}/>`).join('');
  const marks = (c.marks ?? [])
    .map((m, i) => `<g${tip(m.tip)}><line x1="${x(m.x)}" x2="${x(m.x)}" y1="${y(m.y)}" y2="${H - bottom}" class="refline"/><circle cx="${x(m.x)}" cy="${y(m.y)}" r="6.5" class="${i % 2 ? 'dot-b' : 'dot-a'}"/><text x="${i % 2 ? x(m.x) - 9 : x(m.x) + 9}" y="${i % 2 ? y(m.y) - 6 : y(m.y) + 4}" text-anchor="${i % 2 ? 'end' : 'start'}" class="refl">${esc(m.label)}</text></g>`)
    .join('');
  const axes = `<text x="${(left + W - R) / 2}" y="${H - 6}" text-anchor="middle">${esc(c.xLabel)}</text><text x="12" y="${(top + H - bottom) / 2}" text-anchor="middle" transform="rotate(-90 12 ${(top + H - bottom) / 2})">${esc(c.yLabel)}</text>`;
  return `${svgOpen(H, alt)}${grid}<path d="${lines}" class="curve"/>${hits}${marks}${axes}</svg>`;
}

export const chartTypes = { bars, pairs, intervals, diverging, gates, curve };
const DRAW = chartTypes;

/** The SVG of a chart specification, with `alt` as its accessible name. */
export function chartSvg(chart, alt = '') {
  const draw = DRAW[chart.type];
  if (!draw) throw new Error(`unknown chart type ${chart.type}`);
  return draw(chart, alt);
}

/** The values of a chart as a table (label and numbers), for the data table that every report carries. */
export function chartTable(chart) {
  const num = (v) => (v === null || v === undefined ? '' : Number(v.toFixed(4)));
  switch (chart.type) {
    case 'bars':
      return { columns: ['Item', 'Value'], rows: chart.items.map((i) => [i.label, num(i.value)]) };
    case 'pairs':
      return { columns: ['Item', chart.aLabel, chart.bLabel, ...(chart.items.some((i) => i.lo !== undefined) ? ['Interval, low', 'Interval, high'] : [])], rows: chart.items.map((i) => [i.label, num(i.a), num(i.b), ...(chart.items.some((j) => j.lo !== undefined) ? [num(i.lo), num(i.hi)] : [])]) };
    case 'intervals':
      return { columns: ['Item', 'Estimate', 'Interval, low', 'Interval, high', chart.refLabel], rows: chart.items.map((i) => [i.label, num(i.est), num(i.lo), num(i.hi), num(i.ref)]) };
    case 'diverging':
      return { columns: ['Item', 'Value'], rows: chart.items.map((i) => [i.label, num(i.value)]) };
    case 'gates':
      return { columns: ['Squares', 'Filled'], rows: [[chart.total ?? chart.items.length, chart.met ?? chart.items.filter((i) => i.met).length]] };
    default:
      return { columns: [], rows: [] };
  }
}

/** The name that the kit has always exported: the SVG of a chart, with `alt` as its accessible name. */
export const renderChart = chartSvg;
