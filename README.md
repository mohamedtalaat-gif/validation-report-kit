# validation-report-kit

Turns one JSON file of validation reports into a static site: a hub page with counters and the reports newest first, and one page per report with headline figures, an SVG chart, the prose and a block that names the endpoint, the data, the methods and the source. It has no dependencies and writes plain HTML.

I wrote it for the validation section of my own site, where each model I release gets a report that states what was tested, against what, and how it did. The reports are meant to be read next to one another, so the hub counts the distinct studies, methods, endpoints and datasets, and every report names them the same way.

```bash
npx github:mohamedtalaat-gif/validation-report-kit#1.1.0 examples/reports.json dist
# or, from a clone
npm run example        # writes dist/ from examples/reports.json
```

## The input

```json
{
  "site": { "title": "Model validation", "intro": "...", "rules": [{ "name": "...", "text": "..." }] },
  "reports": [
    {
      "slug": "calibration", "date": "2026-11-05", "title": "...", "project": "CYPMode",
      "summary": "One sentence.",
      "endpoints": ["..."], "datasets": ["..."], "methods": ["..."],
      "headline": [{ "value": "0.0189", "label": "ECE, CYP3A4" }],
      "body": ["Paragraph.", "Paragraph."],
      "chart": { "type": "pairs", "min": 0, "max": 0.4, "aLabel": "raw", "bLabel": "calibrated", "items": [{ "label": "CYP3A4", "a": 0.0431, "b": 0.0189 }] },
      "caption": "What the chart shows.",
      "source": { "label": "Method report", "href": "https://..." },
      "related": { "label": "Optional link", "href": "https://..." }
    }
  ]
}
```

A bare array of reports also works. `slug` becomes the folder name, so it may contain only `a-z`, `0-9` and hyphens. `examples/reports.json` holds nine real reports from my own projects.

The file is checked before anything is written, and the problems are named (duplicate slug, missing field, unknown chart type, a column that the rows do not have, a control without options).

## Counters

The hub counts distinct names across all reports:

| Counter | Counts |
|---|---|
| reports | the entries in `reports` |
| studies | distinct `project` values |
| methods | distinct names in `methods`. Use validation methods only (nested cross-validation, permuted-label control), not modelling techniques, and spell a method the same way every time |
| endpoints | distinct names in `endpoints` |
| datasets | distinct names in `datasets` |

## Chart types

| `type` | Shows | Fields |
|---|---|---|
| `bars` | values from zero, optional reference line | `max`, `items: [{ label, value }]`, `ref: { value, label }` |
| `pairs` | two values per row joined by a line, optional interval | `min`, `max`, `aLabel`, `bLabel`, `items: [{ label, a, b, lo, hi }]` |
| `intervals` | estimate with interval against a reference value | `min`, `max`, `refLabel`, `items: [{ label, est, lo, hi, ref }]` |
| `diverging` | positive and negative values around zero, for correlations | `items: [{ label, value }]` |
| `gates` | one square per verdict, the met ones filled | `total`, `met`, or `items: [{ met, tip }]` for a tooltip on each square |
| `curve` | a line through points, with marked points | `xLabel`, `yLabel`, `xmin`, `xmax`, `ymin`, `ymax`, `points: [[x, y]]`, `marks: [{ x, y, label, tip }]` |

`diverging` takes an optional `span` (the half width of the axis, 0.5 by default) and `ref: { value, label }`; `bars` takes `groupBy` and `agg` only inside an explorer (see below). Every mark that a reader may point at carries a tooltip (`tip` in an item, or a text made from its values) and can be reached with the keyboard.

Charts are SVG strings from `src/charts.js` (`renderChart(chart, altText)`), coloured through CSS classes, so a page theme can restyle them. The default style follows the visitor's light or dark setting.

## Tables that can be explored

A report may carry `explore`: the rows of a table, controls that filter and sort them, and the way that the rows that remain are drawn. Every report gets its chart values as a data table with sorting and a download as CSV, with or without `explore`.

```json
"explore": {
  "title": "Explore the calibration", "lede": "One sentence above the controls.", "noun": "methods",
  "source": "path/of/the/log", "position": "after",
  "columns": [{ "key": "method", "label": "Method" }, { "key": "ece", "label": "ECE", "digits": 4 }],
  "rows": [{ "isoform": "CYP3A4", "method": "raw", "ece": 0.0431 }],
  "controls": [
    { "id": "isoform", "type": "filter", "key": "isoform", "label": "Enzyme", "options": [{ "value": "CYP3A4", "label": "CYP3A4" }] },
    { "id": "metric", "type": "view", "label": "Show", "options": [{ "value": "ECE", "label": "Expected calibration error" }] },
    { "id": "sort", "type": "sort", "label": "Order", "options": [{ "value": "order", "label": "As written" }, { "value": "-ece", "label": "Highest first" }] }
  ],
  "charts": [{ "when": { "metric": "ECE" }, "type": "bars", "label": "{method}", "value": "ece", "max": 0.4, "tip": "{method}: {ece:4}" }]
}
```

- A `filter` control keeps the rows whose `key` equals the chosen value (`"*"` keeps all). A `sort` control orders the rows by a column (`-column` for descending, `order` for the order of the file). A `view` control keeps every row and only chooses the chart variant.
- `charts` holds one specification for each variant. The first whose `when` fits the values of the controls is drawn from the rows that remain: `bars` (also `groupBy` and `agg` for one bar for each value of a column), `pairs`, `intervals`, `diverging`, `gates` (`flag` and `flagValue` choose the filled squares), and `curve` (`x`, `y`, `curveWhere`, `marks`). `limit` draws only the first rows of a long table, and the table below keeps them all. Templates such as `{method}` or `{ece:4}` (four decimals) are filled with the values of a row.
- `position: "after"` keeps the chart of the report first and shows the explorer after the text.
- The build copies `client.js`, `explore.js`, and `charts.js` to `assets/`, and the pages load them as modules, so open the pages from a web server and not from `file://` (the first view and the tables are in the page and read without the script, but the controls need it).

## Use as a library



```js
import { renderHub, renderReport, counters } from 'validation-report-kit';
import { renderChart } from 'validation-report-kit/charts';
import { chartOf, rowsOf, initialValues } from 'validation-report-kit/explore';
```

## Limits

- The kit draws what the file says. It does not check that a number in a report is right, so keep each figure tied to the source that produced it.
- The pages are plain and self-contained. To place them in an existing site, take the SVG strings or the HTML fragments from the library and wrap them in your own layout.
- Dates are sorted as text, so use `YYYY-MM-DD` or `YYYY-MM`.

## Development

```bash
npm test
```

## Licence

MIT. See `LICENSE`. The example reports quote results from my own repositories (CYPMode, CEREBRO-X and PharmAMP), where each figure can be checked.
