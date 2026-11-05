# Budget Needs vs Wants

Static site at [budgetneedsvswants.com](https://budgetneedsvswants.com), hosted on GitHub Pages.

## Structure

| Path | What it is |
|---|---|
| `index.html` | The main needs vs wants planner |
| `tools.html` | Tool hub |
| `taxCalculator.html` | Income tax, Medicare, HELP and take-home pay |
| `stampDutyCalculator.html` | Stamp duty for every state, with first home buyer concessions |
| `mortgageCalculator.html` | Repayments, offset, extra repayments, affordability |
| `incomeAnalyser.html`, `savings.html`, `taxDeductible.html`, `export.html` | Other tools |
| `assets/js/calc.js` | All tax, duty and loan maths (pure functions, tested) |
| `assets/js/store.js` | Shared browser storage so the tools share one budget |
| `assets/css/base.css` | Styles shared by the app pages |
| `manifest.webmanifest`, `sw.js`, `assets/icons/` | Install to home screen + offline support |
| `tests/` | Unit tests for `calc.js` |

## Tests

```
npm test
```

No install step needed (uses Node's built-in test runner, Node 18+). Tests also run on every push via GitHub Actions.

## Yearly update checklist (each July)

All rates live in `assets/js/calc.js`:

1. **Income tax** — add the new financial year to `TAX_YEARS` and update `DEFAULT_TAX_YEAR`.
2. **Medicare levy** low-income threshold and **HELP** repayment thresholds for the new year.
3. **NSW transfer duty** — brackets are indexed every 1 July.
4. Any **first home buyer** changes announced in state budgets (they change often).
5. Run `npm test`, update the expected figures, and bump `CACHE` in `sw.js` so installed apps refresh.
