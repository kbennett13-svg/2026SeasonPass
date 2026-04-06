export const STORAGE_KEY = "sixFlagsPrestigePassTracker";
export const GITHUB_CONFIG_STORAGE_KEY = "sixFlagsPrestigePassGithubConfig";

export const PARK_OPTIONS = [
  "Kings Dominion",
  "Dorney",
  "Cedar Point",
  "Kings Island",
  "Carowinds",
  "Kennywood",
];

export const DEFAULT_STATE = {
  metadata: {
    trackerName: "Six Flags Prestige Pass Tracker",
    homePark: "Kings Dominion",
    passYear: "2025",
    notes:
      "Recreated from the Cedar Fair Season Passes workbook. Data saves locally in this browser unless you export it.",
  },
  purchases: [
    {
      id: "purchase-1",
      park: "Kings Dominion",
      date: "2025-08-29",
      prestigePass: 796,
      diningPass: 620,
      notes: "Imported from workbook",
    },
  ],
  visits: [
    {
      id: "visit-1",
      park: "Kings Dominion",
      date: "2025-09-07",
      admissionValue: 196,
      diningValue: 72,
      parkingValue: 80,
      bonusTicketValue: 147,
      bringAFriendValue: 0,
      mealsUsed: 1,
      notes: "Imported from workbook",
    },
  ],
};

export function createEmptyPurchase() {
  return {
    id: cryptoSafeId("purchase"),
    park: "Kings Dominion",
    date: "",
    prestigePass: 0,
    diningPass: 0,
    notes: "",
  };
}

export function createEmptyVisit() {
  return {
    id: cryptoSafeId("visit"),
    park: "Kings Dominion",
    date: "",
    admissionValue: 0,
    diningValue: 0,
    parkingValue: 0,
    bonusTicketValue: 0,
    bringAFriendValue: 0,
    mealsUsed: 0,
    notes: "",
  };
}

export function calculateTotals(state) {
  const purchases = Array.isArray(state?.purchases) ? state.purchases : [];
  const visits = Array.isArray(state?.visits) ? state.visits : [];

  const purchaseTotals = purchases.reduce(
    (totals, purchase) => {
      totals.prestigePass += toNumber(purchase.prestigePass);
      totals.diningPass += toNumber(purchase.diningPass);
      return totals;
    },
    { prestigePass: 0, diningPass: 0 },
  );

  const usageTotals = visits.reduce(
    (totals, visit) => {
      totals.admissionValue += toNumber(visit.admissionValue);
      totals.diningValue += toNumber(visit.diningValue);
      totals.parkingValue += toNumber(visit.parkingValue);
      totals.bonusTicketValue += toNumber(visit.bonusTicketValue);
      totals.bringAFriendValue += toNumber(visit.bringAFriendValue);
      totals.mealsUsed += toNumber(visit.mealsUsed);
      return totals;
    },
    {
      admissionValue: 0,
      diningValue: 0,
      parkingValue: 0,
      bonusTicketValue: 0,
      bringAFriendValue: 0,
      mealsUsed: 0,
    },
  );

  const totalSpent = purchaseTotals.prestigePass + purchaseTotals.diningPass;
  const totalValueUsed =
    usageTotals.admissionValue +
    usageTotals.diningValue +
    usageTotals.parkingValue +
    usageTotals.bonusTicketValue +
    usageTotals.bringAFriendValue;

  const remainingValue = totalSpent - totalValueUsed;
  const visitCount = visits.filter(hasVisitContent).length;
  const breakEvenPercent = totalSpent > 0 ? (totalValueUsed / totalSpent) * 100 : 0;

  const parkBreakdown = PARK_OPTIONS.map((park) => {
    const purchaseSpent = purchases
      .filter((purchase) => purchase.park === park)
      .reduce((sum, purchase) => {
        return sum + toNumber(purchase.prestigePass) + toNumber(purchase.diningPass);
      }, 0);

    const valueUsed = visits
      .filter((visit) => visit.park === park)
      .reduce((sum, visit) => {
        return (
          sum +
          toNumber(visit.admissionValue) +
          toNumber(visit.diningValue) +
          toNumber(visit.parkingValue) +
          toNumber(visit.bonusTicketValue) +
          toNumber(visit.bringAFriendValue)
        );
      }, 0);

    const visitsAtPark = visits.filter(
      (visit) => visit.park === park && hasVisitContent(visit),
    ).length;

    return {
      park,
      purchaseSpent,
      valueUsed,
      visitsAtPark,
    };
  }).filter((row) => row.purchaseSpent > 0 || row.valueUsed > 0 || row.visitsAtPark > 0);

  return {
    purchaseTotals,
    usageTotals,
    totalSpent,
    totalValueUsed,
    remainingValue,
    visitCount,
    breakEvenPercent,
    parkBreakdown,
  };
}

export function hydrateState(rawState) {
  const metadata = {
    ...DEFAULT_STATE.metadata,
    ...(rawState?.metadata || {}),
  };

  const purchases = Array.isArray(rawState?.purchases) && rawState.purchases.length
    ? rawState.purchases.map((purchase) => ({
        ...createEmptyPurchase(),
        ...purchase,
      }))
    : DEFAULT_STATE.purchases.map((purchase) => ({ ...purchase }));

  const visits = Array.isArray(rawState?.visits) && rawState.visits.length
    ? rawState.visits.map((visit) => ({
        ...createEmptyVisit(),
        ...visit,
      }))
    : DEFAULT_STATE.visits.map((visit) => ({ ...visit }));

  return { metadata, purchases, visits };
}

export function formatCurrency(value) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(toNumber(value));
}

export function formatPercent(value) {
  return `${toNumber(value).toFixed(1)}%`;
}

export function toNumber(value) {
  if (typeof value === "number" && Number.isFinite(value)) {
    return value;
  }

  if (typeof value === "string") {
    const normalized = value.trim().replace(/[$,]/g, "");
    if (!normalized) {
      return 0;
    }

    const parsed = Number(normalized);
    return Number.isFinite(parsed) ? parsed : 0;
  }

  return 0;
}

export function hasVisitContent(visit) {
  return Boolean(
    visit?.date ||
      visit?.park ||
      toNumber(visit?.admissionValue) ||
      toNumber(visit?.diningValue) ||
      toNumber(visit?.parkingValue) ||
      toNumber(visit?.bonusTicketValue) ||
      toNumber(visit?.bringAFriendValue) ||
      toNumber(visit?.mealsUsed) ||
      visit?.notes,
  );
}

function cryptoSafeId(prefix) {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return `${prefix}-${crypto.randomUUID()}`;
  }

  return `${prefix}-${Math.random().toString(36).slice(2, 10)}`;
}
