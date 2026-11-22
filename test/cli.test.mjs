// @ts-check
import assert from "node:assert/strict";
import { execFileSync, spawnSync } from "node:child_process";
import { mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { test } from "node:test";
import { fileURLToPath } from "node:url";
import { checkWorkflow } from "../lib/check.mjs";
import { docsExample, node } from "./helpers.mjs";

const root = fileURLToPath(new URL("..", import.meta.url));
const validate = join(root, "scripts/validate.mjs");
const dir = mkdtempSync(join(tmpdir(), "lassi-workflow-"));

/** @param {string[]} args */
const run = (args) => spawnSync(process.execPath, [validate, ...args], { encoding: "utf8" });

test("passes a valid file", () => {
  const file = join(dir, "good.lassi-workflow.json");
  writeFileSync(file, JSON.stringify(docsExample()));
  const result = run([file]);
  assert.equal(result.status, 0, result.stdout);
  assert.match(result.stdout, /1 file\(s\), 0 error\(s\)/);
});

test("fails a broken file and explains why", () => {
  const wf = docsExample();
  node(wf, "book").then = "bye";
  const file = join(dir, "bad.lassi-workflow.json");
  writeFileSync(file, JSON.stringify(wf));
  const result = run([file]);
  assert.equal(result.status, 1);
  assert.match(result.stdout, /unknown_target \[book\]: then goes to "bye"/);
});

test("--json prints the issues", () => {
  const file = join(dir, "bad.json.lassi-workflow.json");
  writeFileSync(file, "{ not json");
  const result = run(["--json", file]);
  assert.equal(result.status, 1);
  const out = JSON.parse(result.stdout);
  assert.equal(out.valid, false);
  assert.equal(out.files[0].issues[0].code, "invalid_json");
});

test("checks the whole gallery by default", () => {
  const out = execFileSync(process.execPath, [validate], { encoding: "utf8", cwd: root });
  assert.match(out, /file\(s\), 0 error\(s\), 0 warning\(s\)/);
});

test("the README's format example is a valid file", () => {
  const readme = readFileSync(join(root, "README.md"), "utf8");
  const block = [...readme.matchAll(/```json\n([\s\S]*?)```/g)]
    .map((m) => m[1])
    .find((b) => b.includes('"lassi.workflow"'));
  assert.ok(block, "no example in the README");
  assert.deepEqual(checkWorkflow(JSON.parse(block)).issues, []);
});
