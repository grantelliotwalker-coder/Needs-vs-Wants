// Run with: node --test tests/
// Expected figures come from the revenue offices' / ATO's own published examples
// or from hand calculation against the published schedules.
const test = require("node:test");
const assert = require("node:assert/strict");
const C = require("../assets/js/calc.js");

const near = (actual, expected, tol = 1, msg) =>
  assert.ok(Math.abs(actual - expected) <= tol, `${msg || ""} expected ≈${expected}, got ${actual}`);

// ---------------------------------------------------------------- income tax
test("2026-27 resident income tax on $80,000 is $14,520 (before Medicare)", () => {
  const r = C.incomeTax({ income: 80000, year: "2026-27" });
  near(r.grossTax, 14520, 0.01);
  assert.equal(r.lito, 0);
  near(r.medicare, 1600, 0.01);
  near(r.total, 16120, 0.01);
});

test("2025-26 uses the 16% second bracket", () => {
  const r = C.incomeTax({ income: 45000, year: "2025-26" });
  near(r.grossTax, 26800 * 0.16, 0.01);
});

test("2027-28 uses the legislated 14% second bracket", () => {
  const r = C.incomeTax({ income: 45000, year: "2027-28" });
  near(r.grossTax, 26800 * 0.14, 0.01);
  assert.equal(r.estimated, true);
});

test("$100k and $200k match published worked examples (2026-27)", () => {
  near(C.incomeTax({ income: 150000, year: "2026-27" }).grossTax, 36570, 0.01);
  near(C.incomeTax({ income: 200000, year: "2026-27" }).grossTax, 55870, 0.01);
});

test("LITO: $700 to $37,500, $325 at $45,000, nil from $66,667", () => {
  assert.equal(C.lito(30000), 700);
  near(C.lito(45000), 325, 0.001);
  assert.equal(C.lito(70000), 0);
  // LITO can't make tax negative
  const r = C.incomeTax({ income: 20000, year: "2026-27" });
  assert.equal(r.incomeTax, 0);
});

test("Medicare levy shades in above the low-income threshold", () => {
  assert.equal(C.medicareLevy(28011, 28011), 0);
  near(C.medicareLevy(30000, 28011), 198.9, 0.01); // 10% of $1,989
  near(C.medicareLevy(60000, 28011), 1200, 0.01);
});

test("HELP repayments are marginal (2025-26 ATO example: $80k → $1,950)", () => {
  near(C.helpRepayment(80000, C.TAX_YEARS["2025-26"].help), 1950, 0.01);
  near(C.helpRepayment(140000, C.TAX_YEARS["2025-26"].help), 11250, 0.01);
  near(C.helpRepayment(80000, C.TAX_YEARS["2026-27"].help), 1570.8, 0.01);
  near(C.helpRepayment(200000, C.TAX_YEARS["2026-27"].help), 20000, 0.01);
  assert.equal(C.helpRepayment(60000, C.TAX_YEARS["2026-27"].help), 0);
});

test("Foreign residents: 30% from the first dollar, no Medicare, no LITO", () => {
  const r = C.incomeTax({ income: 100000, resident: false });
  near(r.grossTax, 30000, 0.01);
  assert.equal(r.medicare, 0);
  assert.equal(r.lito, 0);
});

// --------------------------------------------------------------- stamp duty
const duty = (state, value, extra = {}) => C.stampDuty({ state, value, ...extra });

test("NSW 2026-27 general rates", () => {
  near(duty("NSW", 750000).duty, 27937, 0.5);
  near(duty("NSW", 800000).duty, 30187, 0.5);
  near(duty("NSW", 1000000).duty, 39187, 0.5);
});

test("NSW first home buyers: nil to $800k, concession to $1m", () => {
  assert.equal(duty("NSW", 800000, { firstHome: true }).duty, 0);
  near(duty("NSW", 950000, { firstHome: true }).duty, 29390.25, 0.5);
  near(duty("NSW", 1000000, { firstHome: true }).duty, 39187, 0.5);
  // investors never get it
  near(duty("NSW", 700000, { firstHome: true, ownerOccupier: false }).duty, 25687, 0.5);
});

test("VIC general, PPR and first home buyer", () => {
  near(duty("VIC", 600000, { ownerOccupier: false }).duty, 31070, 0.01);
  near(duty("VIC", 1000000, { ownerOccupier: false }).duty, 55000, 0.01);
  near(duty("VIC", 500000).duty, 21970, 0.01); // PPR
  assert.equal(duty("VIC", 600000, { firstHome: true }).duty, 0);
  near(duty("VIC", 700000, { firstHome: true }).duty, 24713.33, 0.01);
});

test("QLD general, home concession and first home concession", () => {
  near(duty("QLD", 700000, { ownerOccupier: false }).duty, 24525, 0.01);
  near(duty("QLD", 700000).duty, 17350, 0.01);
  near(duty("QLD", 500000).duty, 8750, 0.01);
  assert.equal(duty("QLD", 700000, { firstHome: true }).duty, 0);
  near(duty("QLD", 730000, { firstHome: true }).duty, 6555, 0.01); // QRO worked example
  near(duty("QLD", 750000, { firstHome: true }).duty, 10925, 0.01);
  assert.equal(duty("QLD", 1500000, { firstHome: true, propertyType: "new" }).duty, 0);
});

test("WA general and first home owner rate (from 7 May 2026)", () => {
  near(duty("WA", 500000).duty, 17765, 0.01);
  near(duty("WA", 700000).duty, 27265, 0.01);
  assert.equal(duty("WA", 600000, { firstHome: true }).duty, 0);
  near(duty("WA", 700000, { firstHome: true }).duty, 16150, 0.01);
});

test("SA general and new-home relief", () => {
  near(duty("SA", 600000).duty, 26830, 0.01);
  near(duty("SA", 650000).duty, 29580, 0.01);
  near(duty("SA", 600000, { firstHome: true }).duty, 26830, 0.01); // established: no relief
  assert.equal(duty("SA", 600000, { firstHome: true, propertyType: "new" }).duty, 0);
});

test("TAS general (first home exemption ended 30 June 2026)", () => {
  near(duty("TAS", 850000).duty, 33435, 0.01);
  near(duty("TAS", 850000, { firstHome: true }).duty, 33435, 0.01);
  assert.equal(duty("TAS", 2000).duty, 50);
});

test("ACT owner-occupier vs investor; first home buyers pay nil", () => {
  near(duty("ACT", 750000).duty, 19208, 0.01);
  near(duty("ACT", 750000, { ownerOccupier: false }).duty, 22200, 0.01);
  assert.equal(duty("ACT", 2000000, { firstHome: true }).duty, 0);
});

test("NT formula below $525k, flat rate above", () => {
  near(duty("NT", 500000).duty, 23928.6, 0.01);
  near(duty("NT", 1000000).duty, 49500, 0.01);
});

// --------------------------------------------------------------------- loans
test("Annuity repayment: $500k, 6%, 30y monthly ≈ $2,997.75", () => {
  near(C.annuityPayment(500000, 6, 30, 12), 2997.75, 0.01);
});

test("Amortising at the annuity payment pays off exactly on term", () => {
  const p = C.annuityPayment(500000, 6, 30, 12);
  const a = C.amortise({ principal: 500000, annualRatePct: 6, perYear: 12, payment: p });
  assert.equal(a.periods, 360);
  near(a.totalInterest, p * 360 - 500000, 2);
});

test("An offset keeps the repayment but shortens the loan and cuts interest", () => {
  const p = C.annuityPayment(500000, 6, 30, 12);
  const none = C.amortise({ principal: 500000, annualRatePct: 6, perYear: 12, payment: p });
  const off = C.amortise({ principal: 500000, annualRatePct: 6, perYear: 12, payment: p, offset: 50000 });
  assert.ok(off.periods < none.periods - 40, "offset should save years");
  assert.ok(off.totalInterest < none.totalInterest - 100000);
});

test("Payment below interest never pays off", () => {
  const a = C.amortise({ principal: 500000, annualRatePct: 6, perYear: 12, payment: 2000 });
  assert.equal(a.paidOff, false);
});

// -------------------------------------------------------------------- budget
test("Frequency conversions round-trip", () => {
  for (const f of ["weekly", "fortnightly", "monthly", "yearly"]) {
    near(C.fromWeekly(C.toWeekly(1234, f), f), 1234, 1e-9, f);
  }
  near(C.toWeekly(5200, "yearly"), 100, 1e-9);
});

test("50/30/20 split", () => {
  const r = C.rule503020(1000, 600, 300);
  near(r.actual.needs, 0.6, 1e-9);
  near(r.actual.savings, 0.1, 1e-9);
  near(r.targetWeekly.savings, 200, 1e-9);
});
