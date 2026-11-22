// @ts-check
import assert from "node:assert/strict";
import { test } from "node:test";
import { edgeLabel, toMermaid } from "../lib/mermaid.mjs";
import { docsExample } from "./helpers.mjs";

test("draws the docs example", () => {
  assert.equal(
    toMermaid(docsExample()),
    `flowchart TD
  s0("Find out why they're calling<br/>(Talk)")
  s1[/"Get the job details<br/>(Collect info)"/]
  s2["Book the visit<br/>(Book appointment)"]
  s3["Flag the emergency<br/>(Flag urgent)"]
  s4["Take a message<br/>(Take message)"]
  s5(["Say goodbye<br/>(End call)"])
  start(("Call starts")) --> s0
  s0 -->|"wants a plumber to come out"| s1
  s0 -->|"otherwise"| s4
  s1 --> s2
  s2 --> s5
  s2 -.->|"if it fails"| s4
  s3 --> s4
  s4 --> s5
  anytime{{"Anytime the caller…"}}
  anytime -.->|"describes a burst pipe, flooding or a gas smell"| s3`,
  );
});

test("labels each kind of branch", () => {
  assert.equal(edgeLabel({ to: "x", when: { field: "is_homeowner", equals: false } }), "is_homeowner = false");
  assert.equal(edgeLabel({ to: "x", when: { variable: "plan", in: ["gold", "silver"] } }), "plan in gold, silver");
  assert.equal(edgeLabel({ to: "x", when: { field: "email", exists: true, not: true } }), "email not given");
  assert.equal(edgeLabel({ to: "x", when: { booking_hours: true, not: true } }), "outside booking hours");
  assert.equal(
    edgeLabel({ to: "x", when: { time_window: { days: ["mon", "tue"], start: "08:00", end: "17:00" } } }),
    "during mon, tue 08:00–17:00",
  );
  assert.equal(edgeLabel({ to: "x", when: { else: true }, label: "Renter" }), "Renter");
  assert.equal(
    edgeLabel({
      to: "x",
      when: { intent: "describes an emergency: an active leak or flooding, no heat in freezing weather" },
    }),
    "describes an emergency: an active leak or…",
  );
});

test("escapes quotes in names", () => {
  const wf = docsExample();
  wf.graph.nodes[0].name = 'Say "hi"';
  assert.match(toMermaid(wf), /Say #quot;hi#quot;/);
});
