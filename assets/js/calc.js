/*
 * Budget Needs vs Wants — shared calculation engine.
 * Pure functions only (no DOM), so they can be unit-tested in Node.
 *
 * Sources (checked November 2026):
 *  - ATO individual income tax rates (resident / foreign resident), 2025-26 to 2027-28
 *  - ATO Medicare levy low-income thresholds (singles)
 *  - ATO / StudyAssist HELP compulsory repayment thresholds (marginal system from 2025-26)
 *  - Revenue NSW, SRO Victoria, Queensland Revenue Office, RevenueWA, RevenueSA,
 *    SRO Tasmania, ACT Revenue Office, NT Territory Revenue Office transfer duty schedules
 *
 * UPDATE CHECKLIST each July: TAX_YEARS (Medicare + HELP thresholds), NSW duty brackets
 * (indexed every 1 July), and any state first-home-buyer changes announced in budgets.
 */
(function (root, factory) {
  if (typeof module === "object" && module.exports) module.exports = factory();
  else root.NVW = factory();
})(typeof self !== "undefined" ? self : this, function () {
  "use strict";

  // ---------------------------------------------------------------------------
  // Income tax
  // ---------------------------------------------------------------------------

  // Each bracket: income above `from` is taxed at `rate` (marginal).
  const RESIDENT = (lowRate) => [
    { from: 0, rate: 0 },
    { from: 18200, rate: lowRate },
    { from: 45000, rate: 0.3 },
    { from: 135000, rate: 0.37 },
    { from: 190000, rate: 0.45 },
  ];
  const FOREIGN = [
    { from: 0, rate: 0.3 },
    { from: 135000, rate: 0.37 },
    { from: 190000, rate: 0.45 },
  ];

  const TAX_YEARS = {
    "2025-26": {
      label: "2025–26",
      resident: RESIDENT(0.16),
      medicare: { lower: 28011 },
      help: { t1: 67000, t2: 125000, cap: 179286 },
    },
    "2026-27": {
      label: "2026–27",
      resident: RESIDENT(0.15),
      medicare: { lower: 28011 },
      help: { t1: 69528, t2: 129717, cap: 186051 },
    },
    "2027-28": {
      label: "2027–28 (legislated)",
      resident: RESIDENT(0.14),
      // Medicare/HELP thresholds for 2027-28 aren't published yet — 2026-27 values used.
      medicare: { lower: 28011 },
      help: { t1: 69528, t2: 129717, cap: 186051 },
      estimated: true,
    },
  };
  const DEFAULT_TAX_YEAR = "2026-27";
  const SUPER_GUARANTEE = 12; // % from 1 July 2025

  function bracketTax(income, brackets) {
    const rows = [];
    let total = 0;
    for (let i = 0; i < brackets.length; i++) {
      const lo = brackets[i].from;
      const hi = i + 1 < brackets.length ? brackets[i + 1].from : Infinity;
      if (income <= lo) break;
      const inBand = Math.min(income, hi) - lo;
      const tax = inBand * brackets[i].rate;
      total += tax;
      rows.push({ from: lo, to: hi, rate: brackets[i].rate, income: inBand, tax });
    }
    return { total, rows };
  }

  // Low Income Tax Offset (residents), unchanged since 2020-21.
  function lito(taxable) {
    if (taxable <= 37500) return 700;
    if (taxable <= 45000) return 700 - 0.05 * (taxable - 37500);
    if (taxable <= 66667) return Math.max(0, 325 - 0.015 * (taxable - 45000));
    return 0;
  }

  // Medicare levy for a single with no dependants (low-income shade-in at 10c/$).
  function medicareLevy(taxable, lower) {
    if (taxable <= lower) return 0;
    return Math.min(0.1 * (taxable - lower), 0.02 * taxable);
  }

  // Compulsory HELP repayment (marginal system from 2025-26).
  function helpRepayment(income, h) {
    if (income <= h.t1) return 0;
    if (income >= h.cap) return 0.1 * income;
    const first = 0.15 * (Math.min(income, h.t2) - h.t1);
    const second = income > h.t2 ? 0.17 * (income - h.t2) : 0;
    return first + second;
  }

  /**
   * opts: { income (annual taxable), year, resident (bool), help (bool) }
   */
  function incomeTax(opts) {
    const year = TAX_YEARS[opts.year] || TAX_YEARS[DEFAULT_TAX_YEAR];
    const taxable = Math.max(0, +opts.income || 0);
    const resident = opts.resident !== false;
    const { total: gross, rows } = bracketTax(taxable, resident ? year.resident : FOREIGN);
    const offset = resident ? Math.min(lito(taxable), gross) : 0;
    const medicare = resident ? medicareLevy(taxable, year.medicare.lower) : 0;
    const help = opts.help && resident ? helpRepayment(taxable, year.help) : 0;
    const incomeTaxNet = gross - offset;
    const total = incomeTaxNet + medicare + help;
    return {
      taxable,
      grossTax: gross,
      lito: offset,
      incomeTax: incomeTaxNet,
      medicare,
      help,
      total,
      net: taxable - total,
      averageRate: taxable > 0 ? total / taxable : 0,
      rows,
      estimated: !!year.estimated,
    };
  }

  // ---------------------------------------------------------------------------
  // Stamp (transfer) duty
  // ---------------------------------------------------------------------------

  // Marginal schedule. Each row: value above `from` charged at `per100` per $100 on top of `base`.
  // ceil100: the state charges "per $100 or part of $100".
  function schedule(value, rows, ceil100) {
    let row = rows[0];
    for (const r of rows) if (value > r.from) row = r;
    let excess = value - row.from;
    if (excess < 0) excess = 0;
    if (ceil100) excess = Math.ceil(excess / 100) * 100;
    return row.base + (excess / 100) * row.per100;
  }

  const NSW_GENERAL = [
    { from: 0, base: 0, per100: 1.25 },
    { from: 18000, base: 225, per100: 1.5 },
    { from: 38000, base: 525, per100: 1.75 },
    { from: 103000, base: 1662, per100: 3.5 },
    { from: 387000, base: 11602, per100: 4.5 },
    { from: 1290000, base: 52237, per100: 5.5 },
  ];
  const NSW_PREMIUM = { from: 3870000, base: 194137, per100: 7 };

  const VIC_GENERAL = (v) => {
    if (v <= 25000) return v * 0.014;
    if (v <= 130000) return 350 + (v - 25000) * 0.024;
    if (v <= 960000) return 2870 + (v - 130000) * 0.06;
    if (v <= 2000000) return v * 0.055;
    return 110000 + (v - 2000000) * 0.065;
  };
  const VIC_PPR = (v) => {
    if (v <= 130000 || v > 550000) return VIC_GENERAL(v);
    if (v <= 440000) return 2870 + (v - 130000) * 0.05;
    return 18370 + (v - 440000) * 0.06;
  };

  const QLD_GENERAL = [
    { from: 0, base: 0, per100: 0 },
    { from: 5000, base: 0, per100: 1.5 },
    { from: 75000, base: 1050, per100: 3.5 },
    { from: 540000, base: 17325, per100: 4.5 },
    { from: 1000000, base: 38025, per100: 5.75 },
  ];
  const QLD_HOME = [
    { from: 0, base: 0, per100: 1 },
    { from: 350000, base: 3500, per100: 3.5 },
    { from: 540000, base: 10150, per100: 4.5 },
    { from: 1000000, base: 30850, per100: 5.75 },
  ];
  // First home concession (established home), contracts from 9 June 2024: fixed $10k bands.
  function qldFirstHomeConcession(v) {
    if (v < 710000) return 17350;
    if (v >= 800000) return 0;
    return 17350 - 1735 * Math.floor((v - 700000) / 10000);
  }

  const WA_GENERAL = [
    { from: 0, base: 0, per100: 1.9 },
    { from: 120000, base: 2280, per100: 2.85 },
    { from: 150000, base: 3135, per100: 3.8 },
    { from: 360000, base: 11115, per100: 4.75 },
    { from: 725000, base: 28453, per100: 5.15 },
  ];

  const SA_GENERAL = [
    { from: 0, base: 0, per100: 1 },
    { from: 12000, base: 120, per100: 2 },
    { from: 30000, base: 480, per100: 3 },
    { from: 50000, base: 1080, per100: 3.5 },
    { from: 100000, base: 2830, per100: 4 },
    { from: 200000, base: 6830, per100: 4.25 },
    { from: 250000, base: 8955, per100: 4.75 },
    { from: 300000, base: 11330, per100: 5 },
    { from: 500000, base: 21330, per100: 5.5 },
  ];

  const TAS_GENERAL = [
    { from: 0, base: 50, per100: 0 },
    { from: 3000, base: 50, per100: 1.75 },
    { from: 25000, base: 435, per100: 2.25 },
    { from: 75000, base: 1560, per100: 3.5 },
    { from: 200000, base: 5935, per100: 4 },
    { from: 375000, base: 12935, per100: 4.25 },
    { from: 725000, base: 27810, per100: 4.5 },
  ];

  const ACT_OWNER = [
    { from: 0, base: 0, per100: 0.28 },
    { from: 260000, base: 728, per100: 2.2 },
    { from: 300000, base: 1608, per100: 3.4 },
    { from: 500000, base: 8408, per100: 4.32 },
    { from: 750000, base: 19208, per100: 5.9 },
    { from: 1000000, base: 33958, per100: 6.4 },
  ];
  const ACT_INVESTOR = [
    { from: 0, base: 0, per100: 1.2 },
    { from: 200000, base: 2400, per100: 2.2 },
    { from: 300000, base: 4600, per100: 3.4 },
    { from: 500000, base: 11400, per100: 4.32 },
    { from: 750000, base: 22200, per100: 5.9 },
    { from: 1000000, base: 36950, per100: 6.4 },
  ];

  function ntDuty(v) {
    if (v <= 525000) {
      const V = v / 1000;
      return 0.06571441 * V * V + 15 * V;
    }
    if (v < 3000000) return v * 0.0495;
    if (v < 5000000) return v * 0.0575;
    return v * 0.0595;
  }

  const STATES = {
    NSW: { name: "New South Wales", office: "Revenue NSW", url: "https://www.revenue.nsw.gov.au/taxes-duties-levies-royalties/transfer-duty" },
    VIC: { name: "Victoria", office: "State Revenue Office Victoria", url: "https://www.sro.vic.gov.au/land-transfer-duty" },
    QLD: { name: "Queensland", office: "Queensland Revenue Office", url: "https://qro.qld.gov.au/duties/transfer-duty/" },
    WA: { name: "Western Australia", office: "RevenueWA", url: "https://www.wa.gov.au/organisation/department-of-treasury-and-finance/transfer-duty-assessment" },
    SA: { name: "South Australia", office: "RevenueSA", url: "https://www.revenuesa.sa.gov.au/stamp-duty-land/real-property-land" },
    TAS: { name: "Tasmania", office: "SRO Tasmania", url: "https://www.sro.tas.gov.au/property-transfer-duties" },
    ACT: { name: "Australian Capital Territory", office: "ACT Revenue Office", url: "https://www.revenue.act.gov.au/duties/conveyance-duty" },
    NT: { name: "Northern Territory", office: "Territory Revenue Office", url: "https://treasury.nt.gov.au/dtf/territory-revenue-office/stamp-duty" },
  };

  /**
   * opts: { state, value, ownerOccupier (bool), firstHome (bool), propertyType: "established"|"new"|"land" }
   * Returns { duty, standard, saving, concession (label or ""), notes: [] }
   */
  function stampDuty(opts) {
    const v = Math.max(0, +opts.value || 0);
    const state = opts.state;
    const oo = opts.ownerOccupier !== false;
    const fhb = !!opts.firstHome && oo; // FHB relief always requires living in it
    const type = opts.propertyType || "established";
    const notes = [];
    let standard; // what a buyer with no concessions pays
    let duty;
    let concession = "";

    if (v <= 0) return { duty: 0, standard: 0, saving: 0, concession: "", notes };

    switch (state) {
      case "NSW": {
        standard = v > NSW_PREMIUM.from && type !== "land"
          ? schedule(v, [NSW_PREMIUM], true)
          : schedule(v, NSW_GENERAL, true);
        standard = Math.max(standard, 20);
        duty = standard;
        if (fhb) {
          const [nil, cap] = type === "land" ? [350000, 450000] : [800000, 1000000];
          if (v <= nil) {
            duty = 0; concession = "First Home Buyers Assistance Scheme — full exemption";
          } else if (v < cap) {
            const atCap = schedule(cap, NSW_GENERAL, true);
            duty = ((v - nil) * atCap) / (cap - nil);
            concession = "First Home Buyers Assistance Scheme — concessional rate";
          }
        }
        break;
      }
      case "VIC": {
        standard = VIC_GENERAL(v);
        duty = standard;
        if (oo && type !== "land" && v > 130000 && v <= 550000) {
          duty = VIC_PPR(v);
          concession = "Principal place of residence concession";
        }
        if (fhb) {
          if (v <= 600000) {
            duty = 0; concession = "First home buyer duty exemption";
          } else if (v <= 750000) {
            duty = (standard * (v - 600000)) / 150000;
            concession = "First home buyer duty concession";
          }
        }
        break;
      }
      case "QLD": {
        standard = schedule(v, QLD_GENERAL, true);
        duty = standard;
        if (oo && type !== "land") {
          duty = schedule(v, QLD_HOME, true);
          concession = "Home concession rate";
        }
        if (fhb) {
          if (type === "new" || type === "land") {
            duty = 0; concession = "First home (new home / vacant land) concession — no duty";
          } else {
            const home = schedule(v, QLD_HOME, true);
            const c = qldFirstHomeConcession(v);
            if (c > 0) {
              duty = Math.max(0, home - c);
              concession = duty === 0 ? "First home concession — no duty" : "First home concession";
            }
          }
        }
        break;
      }
      case "WA": {
        standard = schedule(v, WA_GENERAL, true);
        duty = standard;
        if (fhb) {
          const [nil, cap, per100] = type === "land" ? [450000, 550000, 20.14] : [600000, 800000, 16.15];
          if (v <= nil) {
            duty = 0; concession = "First home owner rate — no duty";
          } else if (v <= cap) {
            duty = Math.min(standard, (Math.ceil((v - nil) / 100) * per100));
            concession = "First home owner rate of duty";
          }
        }
        break;
      }
      case "SA": {
        standard = schedule(v, SA_GENERAL, true);
        duty = standard;
        if (fhb) {
          if (type === "new" || type === "land") {
            duty = 0; concession = "First home buyer relief (new home or land to build) — no duty";
          } else {
            notes.push("SA has no first home buyer duty relief on established homes.");
          }
        }
        break;
      }
      case "TAS": {
        standard = schedule(v, TAS_GENERAL, true);
        duty = standard;
        if (fhb) notes.push("Tasmania's first home buyer duty exemption ended on 30 June 2026. The $20,000 First Home Owner Grant applies to new homes.");
        break;
      }
      case "ACT": {
        const table = oo ? ACT_OWNER : ACT_INVESTOR;
        standard = v > 1455000 ? Math.ceil(v / 100) * 4.54 : schedule(v, ACT_INVESTOR, true);
        duty = v > 1455000 ? Math.ceil(v / 100) * 4.54 : schedule(v, table, true);
        if (oo && v <= 1455000) concession = "Owner-occupier rates";
        if (fhb) {
          duty = 0; concession = "Home Buyer Concession Scheme — no duty (no price cap from 1 July 2026)";
        }
        break;
      }
      case "NT": {
        standard = ntDuty(v);
        duty = standard;
        if (fhb) notes.push("The NT has no first home buyer duty concession. New house-and-land packages may be exempt, and the HomeGrown Territory Grant applies to new homes.");
        break;
      }
      default:
        throw new Error("Unknown state: " + state);
    }

    duty = Math.max(0, Math.round(duty * 100) / 100);
    standard = Math.round(standard * 100) / 100;
    if (!fhb && opts.firstHome && !oo) notes.push("First home buyer relief only applies if you'll live in the home.");
    notes.push("Excludes foreign purchaser surcharges and registration fees.");
    return { duty, standard, saving: Math.max(0, standard - duty), concession, notes };
  }

  // ---------------------------------------------------------------------------
  // Loans
  // ---------------------------------------------------------------------------

  function annuityPayment(principal, annualRatePct, years, perYear) {
    const n = Math.round(years * perYear);
    if (n <= 0 || principal <= 0) return 0;
    const r = annualRatePct / 100 / perYear;
    if (r === 0) return principal / n;
    const f = Math.pow(1 + r, n);
    return (principal * r * f) / (f - 1);
  }

  /**
   * Simulate a P&I loan with a fixed repayment. Interest is charged on the balance
   * minus the offset (the offset never goes below zero interest).
   * Returns { periods, totalInterest, paidOff }
   */
  function amortise({ principal, annualRatePct, perYear, payment, offset = 0, maxPeriods = 2400 }) {
    const r = annualRatePct / 100 / perYear;
    let bal = principal;
    let interestTotal = 0;
    let n = 0;
    while (bal > 0.005 && n < maxPeriods) {
      const interest = Math.max(bal - offset, 0) * r;
      const toPrincipal = payment - interest;
      if (toPrincipal <= 0) return { periods: Infinity, totalInterest: Infinity, paidOff: false };
      interestTotal += interest;
      bal -= toPrincipal;
      n++;
    }
    return { periods: n, totalInterest: interestTotal, paidOff: bal <= 0.005 };
  }

  // ---------------------------------------------------------------------------
  // Budget helpers
  // ---------------------------------------------------------------------------

  const PER_WEEK = { weekly: 1, fortnightly: 0.5, monthly: 12 / 52, yearly: 1 / 52 };
  function toWeekly(amount, freq) { return amount * (PER_WEEK[freq] ?? 1); }
  function fromWeekly(weekly, freq) { return weekly / (PER_WEEK[freq] ?? 1); }

  /** 50/30/20 split of take-home pay vs actual needs/wants. All weekly. */
  function rule503020(incomeWeekly, needsWeekly, wantsWeekly) {
    const saved = incomeWeekly - needsWeekly - wantsWeekly;
    const pct = (x) => (incomeWeekly > 0 ? x / incomeWeekly : 0);
    return {
      actual: { needs: pct(needsWeekly), wants: pct(wantsWeekly), savings: pct(saved) },
      target: { needs: 0.5, wants: 0.3, savings: 0.2 },
      targetWeekly: { needs: incomeWeekly * 0.5, wants: incomeWeekly * 0.3, savings: incomeWeekly * 0.2 },
    };
  }

  return {
    TAX_YEARS, DEFAULT_TAX_YEAR, SUPER_GUARANTEE,
    incomeTax, lito, medicareLevy, helpRepayment, bracketTax,
    STATES, stampDuty,
    annuityPayment, amortise,
    toWeekly, fromWeekly, rule503020,
  };
});
