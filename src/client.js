// The browser side of a validation report (copied to assets/ by the build, next to explore.js and charts.js): the tooltips of the charts, the controls of an interactive report (they draw the chart and the table again with src/lib/explore.js), the sorting of a
// table by its header, and the download of the rows as CSV. Without this script the page shows its first view and every value in its table.
import { chartOf, chartSvg, csvOf, initialValues, rowsOf, summaryOf, tableHtml } from './explore.js';

// ---- tooltips: one box for the page, fed by the `data-tip` of the mark that is pointed at or focused ----
let box = null;
const show = (target, x, y) => {
  if (!box) {
    box = document.createElement('div');
    box.className = 'rtip';
    box.setAttribute('role', 'tooltip');
    document.body.append(box);
  }
  box.textContent = target.getAttribute('data-tip');
  box.hidden = false;
  const w = box.offsetWidth;
  const h = box.offsetHeight;
  box.style.left = `${Math.max(8, Math.min(x + 14, innerWidth - w - 8))}px`;
  box.style.top = `${y + h + 22 > innerHeight ? Math.max(8, y - h - 14) : y + 18}px`;
};
const hide = () => { if (box) box.hidden = true; };
const mark = (event) => event.target.closest?.('.rchart [data-tip]');
document.addEventListener('pointermove', (event) => {
  const t = mark(event);
  if (t) show(t, event.clientX, event.clientY); else hide();
});
document.addEventListener('pointerleave', hide, true);
document.addEventListener('focusin', (event) => {
  const t = mark(event);
  if (t) { const r = t.getBoundingClientRect(); show(t, r.left + r.width / 2, r.top + r.height / 2); }
});
document.addEventListener('focusout', hide);
document.addEventListener('keydown', (event) => { if (event.key === 'Escape') hide(); });

// ---- sorting of any table of a report by its header ----
function sortTable(th) {
  const table = th.closest('table');
  const index = Array.prototype.indexOf.call(th.parentElement.children, th);
  const number = th.dataset.kind === 'number';
  const asc = th.getAttribute('aria-sort') !== 'ascending';
  const rows = Array.from(table.tBodies[0].rows);
  rows.sort((a, b) => {
    const x = a.cells[index].dataset.v ?? '';
    const y = b.cells[index].dataset.v ?? '';
    if (x === y) return 0;
    if (x === '') return 1;
    if (y === '') return -1;
    const c = number ? Number(x) - Number(y) : x.localeCompare(y, 'en', { numeric: true });
    return asc ? c : -c;
  });
  table.tBodies[0].append(...rows);
  table.querySelectorAll('th').forEach((h) => h.removeAttribute('aria-sort'));
  th.setAttribute('aria-sort', asc ? 'ascending' : 'descending');
}
document.addEventListener('click', (event) => { const th = event.target.closest?.('.rx-table th'); if (th) sortTable(th); });
document.addEventListener('keydown', (event) => { if ((event.key === 'Enter' || event.key === ' ') && event.target.matches?.('.rx-table th')) { event.preventDefault(); sortTable(event.target); } });

// ---- an interactive report ----
function setup(root) {
  const explore = JSON.parse(root.querySelector('script.rx-json').textContent);
  const values = initialValues(explore);
  const chartBox = root.querySelector('.rx-chart');
  const tableBox = root.querySelector('.rx-tablewrap');
  const summary = root.querySelector('.rx-summary');
  let rows = rowsOf(explore, values);
  const update = () => {
    rows = rowsOf(explore, values);
    if (chartBox) chartBox.innerHTML = chartSvg(chartOf(explore, values, rows), explore.alt);
    tableBox.innerHTML = tableHtml(explore, rows);
    if (summary) summary.textContent = summaryOf(explore, rows);
  };
  root.querySelectorAll('select[data-control]').forEach((select) => {
    select.addEventListener('change', () => { values[select.dataset.control] = select.value; update(); });
  });
  root.querySelector('.rx-csv')?.addEventListener('click', () => {
    const url = URL.createObjectURL(new Blob([csvOf(explore, rows)], { type: 'text/csv;charset=utf-8' }));
    const a = document.createElement('a');
    a.href = url;
    a.download = `${(root.closest('main')?.querySelector('h1')?.textContent ?? 'report').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 60)}.csv`;
    document.body.append(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  });
}
document.querySelectorAll('[data-rx]').forEach(setup);
