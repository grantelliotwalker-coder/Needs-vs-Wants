/*
 * Shared storage so every tool reads and writes the same budget data.
 * Keys are unchanged from the original pages, so existing saved budgets keep working.
 */
(function (root) {
  "use strict";
  const KEYS = {
    items: "budgetNeedsWantsItems",
    income: "budgetNeedsWantsIncome",
    surplus: "budgetNeedsWantsSurplus",
    mortgage: "budgetMortgageCalcState",
    duty: "budgetStampDutyState",
    tax: "budgetTaxCalcState",
  };

  function get(key, fallback = null) {
    try {
      const raw = localStorage.getItem(key);
      return raw == null ? fallback : JSON.parse(raw);
    } catch (e) {
      return fallback;
    }
  }
  function set(key, value) {
    try {
      localStorage.setItem(key, JSON.stringify(value));
      return true;
    } catch (e) {
      return false;
    }
  }

  /** Planner income: { amount, frequency, visible } */
  function getIncome() {
    const v = get(KEYS.income, {});
    return v && typeof v === "object" ? v : {};
  }
  function setIncome({ amount, frequency }) {
    const cur = getIncome();
    return set(KEYS.income, {
      amount,
      frequency: frequency || cur.frequency || "fortnightly",
      visible: cur.visible !== false,
    });
  }
  function getItems() {
    const v = get(KEYS.items, []);
    return Array.isArray(v) ? v : [];
  }

  root.NVWStore = { KEYS, get, set, getIncome, setIncome, getItems };
})(typeof self !== "undefined" ? self : this);
