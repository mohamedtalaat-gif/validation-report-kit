# validation-report-kit

Turns one JSON file of validation reports into a static site: a hub page with counters and the reports newest first, and one page per report with headline figures, an SVG chart, the prose and a block that names the endpoint, the data, the methods and the source. It has no dependencies and writes plain HTML.

I wrote it for the validation section of my own site, where each model I release gets a report that states what was tested, against what, and how it did. The reports are meant to be read next to one another, so the hub counts the distinct studies, methods, endpoints and datasets, and every report names them the same way.

```bash
npx github:mohamedtalaat-gif/validation-report-kit#1.0.0 examples/reports.json dist
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

The file is checked before anything is written, and the problems are named (duplicate slug, missing field, unknown chart type).

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
| `gates` | one square per verdict, the met ones filled | `total`, `met` |

Charts are SVG strings from `src/charts.js` (`renderChart(chart, altText)`), coloured through CSS classes, so a page theme can restyle them. The default style follows the visitor's light or dark setting.

## Use as a library

```js
import { renderHub, renderReport, counters } from 'validation-report-kit';
import { renderChart } from 'validation-report-kit/charts';
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
