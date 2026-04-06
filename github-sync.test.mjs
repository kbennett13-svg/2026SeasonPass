import test from "node:test";
import assert from "node:assert/strict";

import {
  buildContentsUrl,
  buildPutPayload,
  createDefaultGitHubConfig,
  decodeContent,
  encodeContent,
  validateConfig,
} from "./github-sync.mjs";

globalThis.btoa ??= (value) => Buffer.from(value, "binary").toString("base64");
globalThis.atob ??= (value) => Buffer.from(value, "base64").toString("binary");

test("buildContentsUrl creates the GitHub contents endpoint", () => {
  const url = buildContentsUrl({
    owner: "karenbennett",
    repo: "six-flags-tracker-data",
    branch: "main",
    path: "data/six-flags-pass-tracker.json",
  });

  assert.equal(
    url,
    "https://api.github.com/repos/karenbennett/six-flags-tracker-data/contents/data/six-flags-pass-tracker.json?ref=main",
  );
});

test("encodeContent and decodeContent round-trip tracker state", () => {
  const state = { visits: [{ park: "Kings Dominion", mealsUsed: 1 }] };
  const encoded = encodeContent(state);

  assert.deepEqual(decodeContent(encoded), state);
});

test("buildPutPayload includes sha only when present", () => {
  const withoutSha = buildPutPayload({
    state: { visits: [] },
    message: "Update",
  });
  const withSha = buildPutPayload({
    state: { visits: [] },
    message: "Update",
    sha: "abc123",
  });

  assert.equal(withoutSha.sha, undefined);
  assert.equal(withSha.sha, "abc123");
});

test("validateConfig identifies missing GitHub settings", () => {
  const missing = validateConfig(createDefaultGitHubConfig());
  assert.deepEqual(missing, ["owner", "repo", "token"]);
});
