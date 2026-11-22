// @ts-check
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";
import Ajv2020 from "ajv/dist/2020.js";
import { schema } from "../lib/check.mjs";
import { validateSchema } from "../lib/json-schema.mjs";
import { listTemplates } from "../lib/templates.mjs";
import { docsExample, node } from "./helpers.mjs";

// The zero-install validator uses its own small evaluator; Ajv is the reference.
const ajv = new Ajv2020.default({
  strict: true,
  strictRequired: false,
  allowUnionTypes: true,
  allErrors: true,
  validateFormats: false,
});
const ajvValidate = ajv.compile(schema);

const templates = listTemplates().map((t) => ({
  name: `${t.industry}/${t.slug}`,
  wf: JSON.parse(readFileSync(t.file, "utf8")),
}));

/** Each case changes a valid file so it should fail the schema. @type {[string, (wf: any) => void][]} */
const invalid = [
  ["wrong format", (wf) => (wf.format = "lassi.flow")],
  ["format_version 2", (wf) => (wf.format_version = 2)],
  ["no graph", (wf) => delete wf.graph],
  ["unknown top-level key", (wf) => (wf.extra = true)],
  ["bad step id", (wf) => (node(wf, "greet").id = "greet step")],
  ["unknown action", (wf) => (node(wf, "book").action = "send_sms")],
  ["typo in a step key", (wf) => (node(wf, "book").on_eror = "message")],
  ["when with two shapes", (wf) => (node(wf, "greet").edges[0].when = { intent: "x", else: true })],
  ["else: false", (wf) => (node(wf, "greet").edges[1].when = { else: false })],
  [
    "field check with two operators",
    (wf) => (node(wf, "greet").edges[0].when = { field: "problem", equals: "x", exists: true }),
  ],
  ["field check with no operator", (wf) => (node(wf, "greet").edges[0].when = { field: "problem" })],
  [
    "bad time",
    (wf) => (node(wf, "greet").edges[0].when = { time_window: { days: ["mon"], start: "8am", end: "17:00" } }),
  ],
  [
    "bad day",
    (wf) => (node(wf, "greet").edges[0].when = { time_window: { days: ["monday"], start: "08:00", end: "17:00" } }),
  ],
  ["collect without fields", (wf) => delete node(wf, "details").fields],
  ["bad field key", (wf) => (wf.fields[0].key = "Service Address")],
  ["enum field without options", (wf) => Object.assign(wf.fields[0], { type: "enum", options: [] })],
  ["unknown collect mode", (wf) => (wf.fields[0].collect = "sometimes")],
  ["transfer without fallback", (wf) => wf.graph.nodes.push({ id: "t", type: "transfer", to: "+15125550187" })],
  [
    "transfer to a UK number",
    (wf) => wf.graph.nodes.push({ id: "t", type: "transfer", to: "+442079460000", fallback: "message" }),
  ],
  [
    "webhook over http",
    (wf) =>
      wf.graph.nodes.push({ id: "w", type: "webhook", method: "POST", url: "http://example.com", then: "goodbye" }),
  ],
  [
    "code with 21 outputs",
    (wf) =>
      wf.graph.nodes.push({
        id: "c",
        type: "code",
        code: "return {}",
        outputs: Array.from({ length: 21 }, (_, i) => `v${i}`),
      }),
  ],
  ["end with a then", (wf) => (node(wf, "goodbye").then = "greet")],
  [
    "unknown needs_setup kind",
    (wf) => wf.needs_setup.push({ kind: "api_key", node_id: null, field_key: null, message: "x" }),
  ],
  ["layout position without y", (wf) => (wf.layout.nodes.greet = { x: 0 })],
  [
    "CRM step with a long tag",
    (wf) => wf.graph.nodes.push({ id: "crm", type: "lc", add_tags: ["x".repeat(65)], then: "goodbye" }),
  ],
];

/** Each case should still pass the schema. @type {[string, (wf: any) => void][]} */
const valid = [
  ["as in the docs", () => {}],
  ["field check with not", (wf) => (node(wf, "greet").edges[0].when = { field: "problem", exists: false, not: true })],
  ["variable in", (wf) => (node(wf, "greet").edges[0].when = { variable: "plan", in: ["gold", "silver"] })],
  ["booking hours", (wf) => (node(wf, "greet").edges[0].when = { booking_hours: true, not: true })],
  [
    "transfer to a variable",
    (wf) =>
      wf.graph.nodes.push({
        id: "t",
        type: "transfer",
        to: "{{variables.office_number}}",
        mode: "warm",
        fallback: "message",
      }),
  ],
  [
    "transfer blanked by export",
    (wf) => wf.graph.nodes.push({ id: "t", type: "transfer", to: null, fallback: "message" }),
  ],
  [
    "webhook with headers and save",
    (wf) =>
      wf.graph.nodes.push({
        id: "w",
        type: "webhook",
        method: "POST",
        url: "https://api.example.com/jobs/{{fields.problem}}",
        headers: { Authorization: "Bearer {{secrets.DISPATCH_API_KEY}}" },
        body: { phone: "{caller_phone}" },
        save: [{ name: "job_status", path: "job.status" }],
        say: "One moment.",
        then: "goodbye",
        on_error: "message",
      }),
  ],
  [
    "CRM step with its own type code",
    (wf) => wf.graph.nodes.push({ id: "crm", type: "lc", add_tags: ["new-lead"], note: "Hi", then: "goodbye" }),
  ],
  [
    "$schema key",
    (wf) =>
      (wf.$schema = "https://raw.githubusercontent.com/TryLadoo/workflows/main/schema/lassi-workflow.schema.json"),
  ],
];

test("the schema compiles in Ajv strict mode", () => {
  assert.equal(typeof ajvValidate, "function");
});

test("the schema has a description on every property", () => {
  /** @type {string[]} */
  const missing = [];
  /** @param {any} s @param {string} path */
  const visit = (s, path) => {
    if (!s || typeof s !== "object") return;
    for (const [key, prop] of Object.entries(s.properties ?? {})) {
      const p = /** @type {any} */ (prop);
      const described = p.description || (p.$ref && schema.$defs[p.$ref.split("/").pop()]?.description) || "const" in p;
      if (!described) missing.push(`${path}/${key}`);
      visit(p, `${path}/${key}`);
    }
    for (const [key, sub] of Object.entries(s)) {
      // if/then only narrow properties already described elsewhere.
      if (!["properties", "if", "then", "else"].includes(key) && typeof sub === "object") visit(sub, `${path}/${key}`);
    }
  };
  visit(schema, "");
  assert.deepEqual(missing, []);
});

for (const { name, wf } of [{ name: "docs example", wf: docsExample() }, ...templates]) {
  test(`${name} is valid`, () => {
    assert.equal(ajvValidate(wf), true, JSON.stringify(ajvValidate.errors, null, 2));
    assert.deepEqual(validateSchema(schema, wf), []);
  });
}

for (const [name, change] of invalid) {
  test(`rejects: ${name}`, () => {
    const wf = docsExample();
    change(wf);
    assert.equal(ajvValidate(wf), false, "Ajv accepted it");
    assert.notDeepEqual(validateSchema(schema, wf), [], "the built-in evaluator accepted it");
  });
}

for (const [name, change] of valid) {
  test(`accepts: ${name}`, () => {
    const wf = docsExample();
    change(wf);
    assert.equal(ajvValidate(wf), true, JSON.stringify(ajvValidate.errors, null, 2));
    assert.deepEqual(validateSchema(schema, wf), []);
  });
}
