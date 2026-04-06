import test from "node:test";
import assert from "node:assert/strict";

import {
  DEFAULT_STATE,
  calculateTotals,
  formatCurrency,
  formatPercent,
  hydrateState,
  toNumber,
} from "./tracker.mjs";

test("calculateTotals matches the imported workbook totals", () => {
  const totals = calculateTotals(DEFAULT_STATE);

  assert.equal(totals.purchaseTotals.prestigePass, 796);
  assert.equal(totals.purchaseTotals.diningPass, 620);
  assert.equal(totals.totalSpent, 1416);
  assert.equal(totals.usageTotals.admissionValue, 196);
  assert.equal(totals.usageTotals.diningValue, 72);
  assert.equal(totals.usageTotals.parkingValue, 80);
  assert.equal(totals.usageTotals.bonusTicketValue, 147);
  assert.equal(totals.totalValueUsed, 495);
  assert.equal(totals.remainingValue, 921);
  assert.equal(totals.visitCount, 1);
  assert.equal(totals.usageTotals.mealsUsed, 1);
});

test("hydrateState preserves defaults when saved data is partial", () => {
  const state = hydrateState({
    metadata: { homePark: "Carowinds" },
    purchases: [{ park: "Carowinds", prestigePass: "99" }],
    visits: [],
  });

  assert.equal(state.metadata.homePark, "Carowinds");
  assert.equal(state.purchases[0].prestigePass, "99");
  assert.equal(state.purchases[0].diningPass, 0);
  assert.equal(state.visits.length, 1);
});

test("number and display helpers normalize spreadsheet-like values", () => {
  assert.equal(toNumber("$1,416"), 1416);
  assert.equal(formatCurrency(921), "$921");
  assert.equal(formatPercent(34.95762711864407), "35.0%");
});
