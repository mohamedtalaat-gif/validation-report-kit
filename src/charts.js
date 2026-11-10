// Five chart types for validation reports, drawn as SVG strings. Pure functions: no DOM, no dependencies.
// Colours come from CSS classes, so a page theme can restyle them (see style.css in this package).

export const esc = (s) => String(s ?? '').replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const fmt = (v) => (Math.abs(v) < 0.1 && v !== 0 ? v.toFixed(3) : v.toFixed(2));
const W = 640, L = 190, R = 24;

function bars(c, alt) {
  const x = (v) => L + (v / c.max) * (W - L - R);
  const H = 30 + c.items.length * 40 + 26;
  let g = '';
  for (const f of [0, 0.25, 0.5, 0.75, 1]) g += `<line x1="${x(f * c.max)}" x2="${x(f * c.max)}" y1="10" y2="${H - 26}" class="grid"/><text x="${x(f * c.max)}" y="${H - 8}" text-anchor="middle">${(f * c.max).toFixed(2)}</text>`;
  c.items.forEach((it, i) => {
    g += `<text x="${L - 12}" y="${44 + i * 40}" text-anchor="end" class="lbl">${esc(it.label)}</text><rect x="${L}" y="${28 + i * 40}" width="${Math.max(0, x(it.value) - L)}" height="22" rx="2" class="bar"/><text x="${x(it.value) + 8}" y="${44 + i * 40}" class="val">${fmt(it.value)}</text>`;
  });
  if (c.ref) g += `<line x1="${x(c.ref.value)}" x2="${x(c.ref.value)}" y1="10" y2="${H - 26}" class="refline"/><text x="${x(c.ref.value) + 5}" y="22" class="refl">${esc(c.ref.label)}</text>`;
  return svg(W, H, alt, g);
}

function pairs(c, alt) {
  const x = (v) => L + ((v - c.min) / (c.max - c.min)) * (W - L - R);
  const H = 50 + c.items.length * 52 + 30;
  let g = `<g class="legend"><circle cx="${L}" cy="14" r="6" class="dot-a"/><text x="${L + 12}" y="18">${esc(c.aLabel)}</text><circle cx="${L + 200}" cy="14" r="6" class="dot-b"/><text x="${L + 212}" y="18">${esc(c.bLabel)}</text></g>`;
  for (let i = 0; i <= 5; i++) {
    const t = c.min + (i / 5) * (c.max - c.min);
    g += `<line x1="${x(t)}" x2="${x(t)}" y1="34" y2="${H - 28}" class="grid"/><text x="${x(t)}" y="${H - 10}" text-anchor="middle">${t.toFixed(c.max <= 0.5 ? 2 : 1)}</text>`;
  }
  c.items.forEach((it, i) => {
    const cy = 62 + i * 52;
    g += `<text x="${L - 12}" y="${cy + 4}" text-anchor="end" class="lbl">${esc(it.label)}</text>`;
    if (it.lo !== undefined && it.hi !== undefined) g += `<line x1="${x(it.lo)}" x2="${x(it.hi)}" y1="${cy}" y2="${cy}" class="ci"/>`;
    g += `<line x1="${x(it.a)}" x2="${x(it.b)}" y1="${cy}" y2="${cy}" class="link"/><circle cx="${x(it.a)}" cy="${cy}" r="6.5" class="dot-a"/><circle cx="${x(it.b)}" cy="${cy}" r="6.5" class="dot-b"/><text x="${x(it.a)}" y="${cy - 13}" text-anchor="middle" class="val">${fmt(it.a)}</text><text x="${x(it.b)}" y="${cy - 13}" text-anchor="middle" class="val">${fmt(it.b)}</text>`;
  });
  return svg(W, H, alt, g);
}

function intervals(c, alt) {
  const x = (v) => L + ((v - c.min) / (c.max - c.min)) * (W - L - R);
  const H = 50 + c.items.length * 56 + 30;
  let g = `<g class="legend"><circle cx="${L}" cy="14" r="6" class="dot-a"/><text x="${L + 12}" y="18">estimate with its interval</text><rect x="${L + 230}" y="8" width="3" height="12" class="refmark"/><text x="${L + 242}" y="18">${esc(c.refLabel)}</text></g>`;
  for (let t = c.min; t <= c.max + 1e-9; t += (c.max - c.min) / 6) g += `<line x1="${x(t)}" x2="${x(t)}" y1="34" y2="${H - 28}" class="grid"/><text x="${x(t)}" y="${H - 10}" text-anchor="middle">${t.toFixed(1)}</text>`;
  c.items.forEach((it, i) => {
    const cy = 66 + i * 56;
    g += `<text x="${L - 12}" y="${cy + 4}" text-anchor="end" class="lbl">${esc(it.label)}</text><line x1="${x(it.lo)}" x2="${x(it.hi)}" y1="${cy}" y2="${cy}" class="ci"/><line x1="${x(it.lo)}" x2="${x(it.lo)}" y1="${cy - 7}" y2="${cy + 7}" class="ci"/><line x1="${x(it.hi)}" x2="${x(it.hi)}" y1="${cy - 7}" y2="${cy + 7}" class="ci"/><circle cx="${x(it.est)}" cy="${cy}" r="6.5" class="dot-a"/><rect x="${x(it.ref) - 1.5}" y="${cy - 12}" width="3" height="24" class="refmark"/><text x="${x(it.est)}" y="${cy - 14}" text-anchor="middle" class="val">${fmt(it.est)}</text>`;
  });
  return svg(W, H, alt, g);
}

function diverging(c, alt) {
  const half = (W - L - R) / 2, zero = L + half;
  const x = (v) => zero + (v / 0.5) * half;
  const H = 30 + c.items.length * 44 + 26;
  let g = '';
  for (const t of [-0.4, -0.2, 0, 0.2, 0.4]) g += `<line x1="${x(t)}" x2="${x(t)}" y1="10" y2="${H - 26}" class="${t === 0 ? 'refline' : 'grid'}"/><text x="${x(t)}" y="${H - 8}" text-anchor="middle">${t.toFixed(1)}</text>`;
  c.items.forEach((it, i) => {
    const label = it.label.length > 30 ? `${it.label.slice(0, 29)}…` : it.label;
    g += `<text x="${L - 12}" y="${46 + i * 44}" text-anchor="end" class="lbl">${esc(label)}<title>${esc(it.label)}</title></text><rect x="${Math.min(zero, x(it.value))}" y="${30 + i * 44}" width="${Math.abs(x(it.value) - zero)}" height="22" rx="2" class="${it.value < 0 ? 'bar neg' : 'bar'}"/><text x="${it.value < 0 ? x(it.value) - 8 : x(it.value) + 8}" y="${46 + i * 44}" text-anchor="${it.value < 0 ? 'end' : 'start'}" class="val">${it.value > 0 ? '+' : '−'}${Math.abs(it.value).toFixed(2)}</text>`;
  });
  return svg(W, H, alt, g);
}

function gates(c, alt) {
  let g = '';
  for (let i = 0; i < c.total; i++) g += `<rect x="${(4 + (i % 21) * 33.8).toFixed(1)}" y="${4 + Math.floor(i / 21) * 32}" width="28" height="26" rx="3" class="${i < c.met ? 'gate met' : 'gate'}"/>`;
  return `<svg class="rchart rchart--gates" viewBox="0 0 720 ${8 + Math.ceil(c.total / 21) * 32}" role="img" aria-label="${esc(alt)}">${g}</svg>`;
}

const svg = (w, h, alt, g) => `<svg class="rchart" viewBox="0 0 ${w} ${h}" role="img" aria-label="${esc(alt)}">${g}</svg>`;

export const chartTypes = { bars, pairs, intervals, diverging, gates };

/** Draws a chart object as an SVG string. Throws on an unknown type. */
export function renderChart(chart, alt = '') {
  const f = chartTypes[chart?.type];
  if (!f) throw new Error(`unknown chart type: ${chart?.type}`);
  return f(chart, alt);
}
