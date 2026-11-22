// @ts-check
import assert from "node:assert/strict";
import { test } from "node:test";
import { checkWorkflow } from "../lib/check.mjs";
import { docsExample, node } from "./helpers.mjs";

/** @param {any} wf @param {{ template?: boolean }} [options] */
const codes = (wf, options) => checkWorkflow(wf, options).issues.map((i) => `${i.severity}:${i.code}`);

test("the docs example has no issues", () => {
  assert.deepEqual(codes(docsExample()), []);
});

/** @type {[string, string, (wf: any) => void][]} */
const cases = [
  ["error:missing_start", "start points nowhere", (wf) => (wf.graph.start = "hello")],
  ["error:duplicate_id", "two steps share an id", (wf) => (node(wf, "urgent").id = "message")],
  ["error:unknown_target", "a branch points nowhere", (wf) => (node(wf, "greet").edges[0].to = "detail")],
  ["error:unknown_target", "then points nowhere", (wf) => (node(wf, "book").then = "bye")],
  ["error:unknown_target", "a whole-call branch points nowhere", (wf) => (wf.graph.global_edges[0].to = "flag")],
  [
    "error:multiple_else",
    "two else branches",
    (wf) => node(wf, "greet").edges.push({ to: "goodbye", when: { else: true } }),
  ],
  ["error:else_with_then", "else together with then", (wf) => (node(wf, "greet").then = "goodbye")],
  ["error:missing_then", "an action with nowhere to go", (wf) => delete node(wf, "message").then],
  ["error:unreachable", "a step nothing leads to", (wf) => wf.graph.nodes.push({ id: "lonely", type: "end" })],
  [
    "error:dead_end",
    "a loop with no way out",
    (wf) => {
      node(wf, "message").then = "greet";
      node(wf, "book").then = "greet";
      node(wf, "greet").edges = [
        { to: "details", when: { intent: "x" } },
        { to: "message", when: { else: true } },
      ];
    },
  ],
  [
    "error:no_end",
    "no End call step",
    (wf) => {
      wf.graph.nodes = wf.graph.nodes.filter((/** @type {any} */ n) => n.type !== "end");
      node(wf, "message").then = "greet";
      node(wf, "book").then = "greet";
      node(wf, "greet").edges.pop();
    },
  ],
  [
    "error:condition_needs_else",
    "a Condition without else",
    (wf) => {
      wf.graph.nodes.push({
        id: "owner",
        type: "condition",
        edges: [{ to: "book", when: { field: "problem", exists: true } }],
      });
      node(wf, "details").then = "owner";
    },
  ],
  [
    "error:condition_intent",
    "a Condition branching on intent",
    (wf) => {
      wf.graph.nodes.push({
        id: "owner",
        type: "condition",
        edges: [
          { to: "book", when: { intent: "x" } },
          { to: "message", when: { else: true } },
        ],
      });
      node(wf, "details").then = "owner";
    },
  ],
  [
    "error:unknown_field",
    "Collect asks for a field that isn't defined",
    (wf) => node(wf, "details").fields.push("roof_age"),
  ],
  [
    "error:unknown_field",
    "a prompt uses a field that isn't defined",
    (wf) => (node(wf, "book").prompt = "Book for {{fields.name}}."),
  ],
  [
    "error:unknown_field",
    "a branch checks a field that isn't defined",
    (wf) => (node(wf, "greet").edges[0].when = { field: "owner", equals: true }),
  ],
  [
    "error:extract_only_in_collect",
    "Collect asks for an extract_only field",
    (wf) => (wf.fields[1].collect = "extract_only"),
  ],
  [
    "error:optional_not_collected",
    "optional_fields lists a field the step doesn't ask for",
    (wf) => (node(wf, "details").optional_fields = ["missing"]),
  ],
  ["error:duplicate_field", "two fields share a key", (wf) => wf.fields.push({ ...wf.fields[0] })],
  [
    "error:check_type",
    "a boolean compared with a string",
    (wf) => {
      wf.fields.push({ key: "is_owner", label: "Owner", type: "boolean", collect: "optional" });
      node(wf, "greet").edges[0].when = { field: "is_owner", equals: "yes" };
    },
  ],
  [
    "error:check_type",
    "an enum compared with a value it doesn't have",
    (wf) => {
      wf.fields.push({ key: "kind", label: "Kind", type: "enum", options: ["a", "b"], collect: "optional" });
      node(wf, "greet").edges[0].when = { field: "kind", in: ["a", "c"] };
    },
  ],
  [
    "error:transfer_target",
    "a transfer with no number or team",
    (wf) => {
      wf.graph.nodes.push({ id: "t", type: "transfer", to: "", fallback: "message" });
      node(wf, "urgent").then = "t";
    },
  ],
  [
    "error:transfer_both",
    "a transfer with a number and a team",
    (wf) => {
      wf.graph.nodes.push({ id: "t", type: "transfer", to: "+15125550187", team_id: "team_1", fallback: "message" });
      node(wf, "urgent").then = "t";
    },
  ],
  [
    "error:needs_setup_ref",
    "needs_setup names a missing step",
    (wf) =>
      wf.needs_setup.push({
        kind: "phone_number",
        node_id: "t",
        field_key: null,
        message: "Choose who to transfer to.",
      }),
  ],
  [
    "error:reserved_name",
    "code returns a caller_ value",
    (wf) => {
      wf.graph.nodes.push({
        id: "c",
        type: "code",
        code: "return { caller_tier: 1 }",
        outputs: ["caller_tier"],
        then: "book",
        on_error: "book",
      });
      node(wf, "details").then = "c";
    },
  ],
  ["error:global_else", "a whole-call else", (wf) => (wf.graph.global_edges[0].when = { else: true })],
  [
    "warning:missing_on_error",
    "code without on_error",
    (wf) => {
      wf.graph.nodes.push({ id: "c", type: "code", code: "return { fee: 49 }", outputs: ["fee"], then: "book" });
      node(wf, "details").then = "c";
    },
  ],
  [
    "warning:knowledge_ends_call",
    "Answer questions that hangs up after one answer",
    (wf) => {
      wf.graph.nodes.push({ id: "faq", type: "knowledge", edges: [{ to: "goodbye", when: { else: true } }] });
      node(wf, "greet").edges.unshift({ to: "faq", when: { intent: "has a question" } });
    },
  ],
  [
    "warning:time_check_before_booking",
    "a time check in front of booking",
    (wf) => {
      wf.graph.nodes.push({
        id: "open",
        type: "condition",
        edges: [
          { to: "details", when: { booking_hours: true } },
          { to: "message", when: { else: true } },
        ],
      });
      node(wf, "greet").edges[0].to = "open";
    },
  ],
  ["warning:layout_unknown", "a layout position for a missing step", (wf) => (wf.layout.nodes.ghost = { x: 0, y: 0 })],
  [
    "error:unknown_field",
    "a CRM step fills a contact field from a field that isn't defined",
    (wf) => {
      wf.graph.nodes.push({ id: "crm", type: "ghl", contact_fields: { name: "caller_name" }, then: "goodbye" });
      node(wf, "message").then = "crm";
    },
  ],
  ["error:missing_then", "an action with then: null", (wf) => (node(wf, "message").then = null)],
];

for (const [code, name, change] of cases) {
  test(`${code}: ${name}`, () => {
    const wf = docsExample();
    change(wf);
    assert.ok(codes(wf).includes(code), `expected ${code}, got ${JSON.stringify(codes(wf))}`);
  });
}

test("schema errors stop the graph checks and name the step", () => {
  const wf = docsExample();
  node(wf, "book").action = "send_sms";
  const { issues } = checkWorkflow(wf);
  assert.ok(issues.length > 0 && issues.every((i) => i.code === "schema"));
  assert.ok(issues.some((i) => i.node_id === "book"));
});

test("lists the variables a workflow needs, minus the ones its own steps produce", () => {
  const wf = docsExample();
  wf.graph.nodes.push(
    { id: "t", type: "transfer", to: "{{variables.oncall_number}}", fallback: "message" },
    {
      id: "c",
      type: "code",
      code: "return { fee: variables.base_fee + 10 }",
      outputs: ["fee"],
      then: "t",
      on_error: "t",
    },
  );
  node(wf, "urgent").then = "c";
  node(wf, "message").prompt = "Mention the {{variables.fee}} fee for {{business_name}}.";
  const { variables, issues } = checkWorkflow(wf);
  assert.deepEqual(issues, []);
  assert.deepEqual(variables, ["base_fee", "business_name", "oncall_number"]);
});

test("then: null on a knowledge step with branches is fine", () => {
  const wf = docsExample();
  wf.graph.nodes.push({
    id: "faq",
    type: "knowledge",
    then: null,
    edges: [
      { to: "details", when: { intent: "wants a plumber to come out" } },
      { to: "goodbye", when: { intent: "says they're all set" } },
      { to: "greet", when: { else: true } },
    ],
  });
  node(wf, "greet").edges.unshift({ to: "faq", when: { intent: "has a question" } });
  assert.deepEqual(codes(wf), []);
});

test("a CRM step is a known type and its fields count as used", () => {
  const wf = docsExample();
  wf.graph.nodes.push({
    id: "crm",
    type: "ghl",
    note: "{{fields.problem}}",
    add_tags: ["new-lead"],
    contact_fields: { address1: "service_address" },
    then: "goodbye",
    on_error: "goodbye",
  });
  node(wf, "message").then = "crm";
  const result = checkWorkflow(wf);
  assert.deepEqual(result.issues, []);
  assert.ok(result.fieldsUsed.includes("service_address"));
});

test("a whole-call branch makes its target reachable", () => {
  assert.ok(!codes(docsExample()).includes("error:unreachable"));
});

/** @type {[string, (wf: any) => void][]} */
const templateCases = [
  ["error:template_phone_number", (wf) => (node(wf, "message").prompt = "Tell them to call 512-867-5309.")],
  ["error:template_email", (wf) => (node(wf, "message").prompt = "Or email jane@gmail.com.")],
  [
    "error:template_collect_phone",
    (wf) => {
      wf.fields.push({ key: "callback_number", label: "Callback", type: "phone", collect: "required" });
      node(wf, "details").fields.push("callback_number");
    },
  ],
  ["error:template_ai_notice", (wf) => (node(wf, "greet").prompt = "Remind them you're an AI assistant.")],
  ["error:template_greeting", (wf) => (node(wf, "greet").prompt = "Thanks for calling! Find out what they need.")],
  ["error:template_name", (wf) => delete wf.name],
  ["error:template_exported_at", () => {}],
];

for (const [code, change] of templateCases) {
  test(`template rule ${code}`, () => {
    const wf = docsExample();
    change(wf);
    assert.ok(codes(wf, { template: true }).includes(code), JSON.stringify(codes(wf, { template: true })));
  });
}

test("template rules allow 555-01xx numbers and example.com emails", () => {
  const wf = docsExample();
  delete wf.exported_at;
  node(wf, "message").prompt = "Our office is (512) 555-0187, or email office@example.com.";
  assert.deepEqual(codes(wf, { template: true }), []);
});
