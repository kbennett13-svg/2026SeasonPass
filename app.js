import {
  DEFAULT_STATE,
  GITHUB_CONFIG_STORAGE_KEY,
  PARK_OPTIONS,
  STORAGE_KEY,
  calculateTotals,
  createEmptyPurchase,
  createEmptyVisit,
  formatCurrency,
  formatPercent,
  hydrateState,
} from "./tracker.mjs";
import {
  createDefaultGitHubConfig,
  loadStateFromGitHub,
  saveStateToGitHub,
  validateConfig,
} from "./github-sync.mjs";

let state = loadState();
let githubConfig = loadGitHubConfig();
let currentRemoteSha = "";

const elements = {
  trackerName: document.querySelector("#tracker-name"),
  homePark: document.querySelector("#home-park"),
  passYear: document.querySelector("#pass-year"),
  trackerNotes: document.querySelector("#tracker-notes"),
  summaryGrid: document.querySelector("#summary-grid"),
  purchaseRows: document.querySelector("#purchase-rows"),
  visitRows: document.querySelector("#visit-rows"),
  parkRollup: document.querySelector("#park-rollup"),
  statusBox: document.querySelector("#status-box"),
  addPurchase: document.querySelector("#add-purchase"),
  addVisit: document.querySelector("#add-visit"),
  githubOwner: document.querySelector("#github-owner"),
  githubRepo: document.querySelector("#github-repo"),
  githubBranch: document.querySelector("#github-branch"),
  githubPath: document.querySelector("#github-path"),
  githubToken: document.querySelector("#github-token"),
  saveGitHubConfig: document.querySelector("#save-github-config"),
  loadFromGitHub: document.querySelector("#load-from-github"),
  saveToGitHub: document.querySelector("#save-to-github"),
  resetData: document.querySelector("#reset-data"),
};

wireMetadata();
wireActions();
render();

function render() {
  const totals = calculateTotals(state);

  elements.trackerName.textContent = state.metadata.trackerName;
  elements.homePark.value = state.metadata.homePark;
  elements.passYear.value = state.metadata.passYear;
  elements.trackerNotes.value = state.metadata.notes;
  elements.githubOwner.value = githubConfig.owner;
  elements.githubRepo.value = githubConfig.repo;
  elements.githubBranch.value = githubConfig.branch;
  elements.githubPath.value = githubConfig.path;
  elements.githubToken.value = githubConfig.token;

  elements.summaryGrid.innerHTML = [
    summaryCard("Total Paid", formatCurrency(totals.totalSpent), "Prestige + dining"),
    summaryCard("Value Used", formatCurrency(totals.totalValueUsed), "Visits recouped"),
    summaryCard("Remaining", formatCurrency(totals.remainingValue), "Still to recover"),
    summaryCard("Break-even", formatPercent(totals.breakEvenPercent), "Percent recouped"),
    summaryCard("Visits Logged", String(totals.visitCount), "Any park visits"),
    summaryCard("Meals Logged", String(totals.usageTotals.mealsUsed), "Dining uses tracked"),
  ].join("");

  elements.purchaseRows.innerHTML = state.purchases
    .map(
      (purchase) => `
        <tr data-id="${purchase.id}">
          <td>${parkSelectMarkup(purchase.park, "purchase-park")}</td>
          <td><input class="table-input" data-field="date" type="date" value="${escapeValue(purchase.date)}" /></td>
          <td><input class="table-input" data-field="prestigePass" type="number" min="0" step="1" value="${purchase.prestigePass}" /></td>
          <td><input class="table-input" data-field="diningPass" type="number" min="0" step="1" value="${purchase.diningPass}" /></td>
          <td><input class="table-input" data-field="notes" type="text" value="${escapeValue(purchase.notes)}" /></td>
          <td><button class="icon-button" data-action="delete-purchase" type="button">Delete</button></td>
        </tr>
      `,
    )
    .join("");

  elements.visitRows.innerHTML = state.visits
    .map(
      (visit) => `
        <tr data-id="${visit.id}">
          <td>${parkSelectMarkup(visit.park, "visit-park")}</td>
          <td><input class="table-input" data-field="date" type="date" value="${escapeValue(visit.date)}" /></td>
          <td><input class="table-input" data-field="admissionValue" type="number" min="0" step="1" value="${visit.admissionValue}" /></td>
          <td><input class="table-input" data-field="diningValue" type="number" min="0" step="1" value="${visit.diningValue}" /></td>
          <td><input class="table-input" data-field="parkingValue" type="number" min="0" step="1" value="${visit.parkingValue}" /></td>
          <td><input class="table-input" data-field="bonusTicketValue" type="number" min="0" step="1" value="${visit.bonusTicketValue}" /></td>
          <td><input class="table-input" data-field="bringAFriendValue" type="number" min="0" step="1" value="${visit.bringAFriendValue}" /></td>
          <td><input class="table-input" data-field="mealsUsed" type="number" min="0" step="1" value="${visit.mealsUsed}" /></td>
          <td><input class="table-input" data-field="notes" type="text" value="${escapeValue(visit.notes)}" /></td>
          <td><button class="icon-button" data-action="delete-visit" type="button">Delete</button></td>
        </tr>
      `,
    )
    .join("");

  elements.parkRollup.innerHTML = totals.parkBreakdown
    .map(
      (row) => `
        <tr>
          <td>${row.park}</td>
          <td>${row.visitsAtPark}</td>
          <td>${formatCurrency(row.purchaseSpent)}</td>
          <td>${formatCurrency(row.valueUsed)}</td>
        </tr>
      `,
    )
    .join("");

  bindTableInputs();
}

function wireMetadata() {
  elements.homePark.addEventListener("input", (event) => {
    state.metadata.homePark = event.target.value;
    persist("Updated home park.");
  });

  elements.passYear.addEventListener("input", (event) => {
    state.metadata.passYear = event.target.value;
    persist("Updated pass year.");
  });

  elements.trackerNotes.addEventListener("input", (event) => {
    state.metadata.notes = event.target.value;
    persist("Updated tracker notes.");
  });
}

function wireActions() {
  elements.addPurchase.addEventListener("click", () => {
    state.purchases.push(createEmptyPurchase());
    persist("Added a purchase row.");
  });

  elements.addVisit.addEventListener("click", () => {
    state.visits.push(createEmptyVisit());
    persist("Added a visit row.");
  });

  elements.saveGitHubConfig.addEventListener("click", () => {
    githubConfig = readGitHubConfigFromForm();
    const missing = validateConfig(githubConfig);
    localStorage.setItem(GITHUB_CONFIG_STORAGE_KEY, JSON.stringify(githubConfig));
    setStatus(
      missing.length
        ? `Saved connection settings. Missing: ${missing.join(", ")}`
        : "Saved GitHub connection settings in this browser.",
    );
  });

  elements.loadFromGitHub.addEventListener("click", async () => {
    githubConfig = readGitHubConfigFromForm();
    const missing = validateConfig(githubConfig);
    if (missing.length) {
      setStatus(`Cannot load yet. Missing: ${missing.join(", ")}`);
      return;
    }

    setStatus("Loading tracker data from GitHub...");
    try {
      const result = await loadStateFromGitHub(githubConfig);
      state = hydrateState(result.state);
      currentRemoteSha = result.sha;
      persist("Loaded tracker data from GitHub.");
    } catch (error) {
      setStatus(error.message);
    }
  });

  elements.saveToGitHub.addEventListener("click", async () => {
    githubConfig = readGitHubConfigFromForm();
    const missing = validateConfig(githubConfig);
    if (missing.length) {
      setStatus(`Cannot save yet. Missing: ${missing.join(", ")}`);
      return;
    }

    setStatus("Saving tracker data to GitHub...");
    try {
      const sha = await saveStateToGitHub(githubConfig, state, currentRemoteSha);
      currentRemoteSha = sha;
      localStorage.setItem(GITHUB_CONFIG_STORAGE_KEY, JSON.stringify(githubConfig));
      setStatus("Saved tracker data to GitHub.");
    } catch (error) {
      setStatus(error.message);
    }
  });

  elements.resetData.addEventListener("click", () => {
    state = hydrateState(DEFAULT_STATE);
    persist("Reset tracker to the imported workbook seed.");
  });
}

function bindTableInputs() {
  elements.purchaseRows.querySelectorAll("tr").forEach((row) => {
    const id = row.dataset.id;
    row.querySelectorAll("input, select").forEach((input) => {
      input.addEventListener("input", (event) => {
        const purchase = state.purchases.find((entry) => entry.id === id);
        if (!purchase) {
          return;
        }

        const field = event.target.dataset.field;
        const numericFields = new Set(["prestigePass", "diningPass"]);
        purchase[field] = numericFields.has(field) ? Number(event.target.value || 0) : event.target.value;
        persist("Updated purchase row.");
      });
    });

    row.querySelector('[data-action="delete-purchase"]').addEventListener("click", () => {
      state.purchases = state.purchases.filter((entry) => entry.id !== id);
      persist("Deleted purchase row.");
    });
  });

  elements.visitRows.querySelectorAll("tr").forEach((row) => {
    const id = row.dataset.id;
    row.querySelectorAll("input, select").forEach((input) => {
      input.addEventListener("input", (event) => {
        const visit = state.visits.find((entry) => entry.id === id);
        if (!visit) {
          return;
        }

        const field = event.target.dataset.field;
        const numericFields = new Set([
          "admissionValue",
          "diningValue",
          "parkingValue",
          "bonusTicketValue",
          "bringAFriendValue",
          "mealsUsed",
        ]);
        visit[field] = numericFields.has(field) ? Number(event.target.value || 0) : event.target.value;
        persist("Updated visit row.");
      });
    });

    row.querySelector('[data-action="delete-visit"]').addEventListener("click", () => {
      state.visits = state.visits.filter((entry) => entry.id !== id);
      persist("Deleted visit row.");
    });
  });
}

function persist(message) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  render();
  setStatus(message);
}

function loadState() {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    return saved ? hydrateState(JSON.parse(saved)) : hydrateState(DEFAULT_STATE);
  } catch (error) {
    console.error(error);
    return hydrateState(DEFAULT_STATE);
  }
}

function loadGitHubConfig() {
  try {
    const saved = localStorage.getItem(GITHUB_CONFIG_STORAGE_KEY);
    return saved ? { ...createDefaultGitHubConfig(), ...JSON.parse(saved) } : createDefaultGitHubConfig();
  } catch (error) {
    console.error(error);
    return createDefaultGitHubConfig();
  }
}

function readGitHubConfigFromForm() {
  return {
    owner: elements.githubOwner.value,
    repo: elements.githubRepo.value,
    branch: elements.githubBranch.value || "main",
    path: elements.githubPath.value || "data/six-flags-pass-tracker.json",
    token: elements.githubToken.value,
  };
}

function summaryCard(label, value, detail) {
  return `
    <article class="summary-card">
      <p>${label}</p>
      <strong>${value}</strong>
      <span>${detail}</span>
    </article>
  `;
}

function parkSelectMarkup(selectedPark, field) {
  return `
    <select class="table-input" data-field="${field === "purchase-park" || field === "visit-park" ? "park" : field}">
      ${PARK_OPTIONS.map(
        (park) =>
          `<option value="${park}" ${park === selectedPark ? "selected" : ""}>${park}</option>`,
      ).join("")}
    </select>
  `;
}

function escapeValue(value) {
  return String(value ?? "").replaceAll('"', "&quot;");
}

function setStatus(message) {
  elements.statusBox.textContent = message;
}
