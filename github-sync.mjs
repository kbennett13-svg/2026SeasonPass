const API_ROOT = "https://api.github.com";

export function createDefaultGitHubConfig() {
  return {
    owner: "",
    repo: "",
    branch: "main",
    path: "data/six-flags-pass-tracker.json",
    token: "",
  };
}

export function buildContentsUrl(config) {
  const owner = encodeURIComponent(config.owner.trim());
  const repo = encodeURIComponent(config.repo.trim());
  const path = encodeURIComponent(config.path.trim()).replace(/%2F/g, "/");
  const branch = encodeURIComponent(config.branch.trim() || "main");
  return `${API_ROOT}/repos/${owner}/${repo}/contents/${path}?ref=${branch}`;
}

export function buildHeaders(token) {
  return {
    Accept: "application/vnd.github+json",
    Authorization: `Bearer ${token.trim()}`,
    "Content-Type": "application/json",
    "X-GitHub-Api-Version": "2022-11-28",
  };
}

export function encodeContent(state) {
  return btoa(unescape(encodeURIComponent(JSON.stringify(state, null, 2))));
}

export function decodeContent(encoded) {
  return JSON.parse(decodeURIComponent(escape(atob(encoded.replace(/\n/g, "")))));
}

export function buildPutPayload({ state, message, sha }) {
  const payload = {
    message,
    content: encodeContent(state),
  };

  if (sha) {
    payload.sha = sha;
  }

  return payload;
}

export function validateConfig(config) {
  const missing = [];

  if (!config.owner.trim()) {
    missing.push("owner");
  }
  if (!config.repo.trim()) {
    missing.push("repo");
  }
  if (!config.branch.trim()) {
    missing.push("branch");
  }
  if (!config.path.trim()) {
    missing.push("path");
  }
  if (!config.token.trim()) {
    missing.push("token");
  }

  return missing;
}

export async function loadStateFromGitHub(config) {
  const response = await fetch(buildContentsUrl(config), {
    method: "GET",
    headers: buildHeaders(config.token),
  });

  if (!response.ok) {
    throw new Error(await describeError(response, "load"));
  }

  const payload = await response.json();
  return {
    sha: payload.sha,
    state: decodeContent(payload.content),
  };
}

export async function saveStateToGitHub(config, state, sha) {
  const response = await fetch(buildContentsUrl(config), {
    method: "PUT",
    headers: buildHeaders(config.token),
    body: JSON.stringify(
      buildPutPayload({
        state,
        sha,
        message: `Update pass tracker ${new Date().toISOString()}`,
      }),
    ),
  });

  if (!response.ok) {
    throw new Error(await describeError(response, "save"));
  }

  const payload = await response.json();
  return payload.content?.sha || payload.commit?.sha || "";
}

async function describeError(response, action) {
  try {
    const payload = await response.json();
    if (payload?.message) {
      return `GitHub ${action} failed: ${payload.message}`;
    }
  } catch {
    // Ignore JSON parse errors and fall back to status text.
  }

  return `GitHub ${action} failed: ${response.status} ${response.statusText}`.trim();
}
