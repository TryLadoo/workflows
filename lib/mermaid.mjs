// @ts-check
/**
 * Turns a workflow file into a Mermaid flowchart. Output is deterministic, so
 * CI can check the diagrams in each README are current.
 */

/** @typedef {import("./check.mjs").WorkflowFile} WorkflowFile */
/** @typedef {import("./check.mjs").WorkflowNode} WorkflowNode */
/** @typedef {import("./check.mjs").Edge} Edge */

/** Shape brackets for each step type. */
const SHAPES = /** @type {Record<string, [string, string]>} */ ({
  conversation: ["(", ")"],
  collect: ["[/", "/]"],
  knowledge: ["[(", ")]"],
  action: ["[", "]"],
  condition: ["{", "}"],
  transfer: ["[[", "]]"],
  code: ["[", "]"],
  webhook: ["[", "]"],
  end: ["([", "])"],
});

const KIND = /** @type {Record<string, string>} */ ({
  conversation: "Talk",
  collect: "Collect info",
  knowledge: "Answer questions",
  condition: "Condition",
  transfer: "Transfer",
  code: "Custom code",
  webhook: "Webhook",
  end: "End call",
});

const ACTIONS = /** @type {Record<string, string>} */ ({
  book_appointment: "Book appointment",
  take_message: "Take message",
  flag_urgent: "Flag urgent",
  check_availability: "Check availability",
});

const MAX_LABEL = 48;

/**
 * @param {WorkflowFile} wf
 * @returns {string} Mermaid source, without the ``` fence.
 */
export function toMermaid(wf) {
  const ids = new Map(wf.graph.nodes.map((n, i) => [n.id, `s${i}`]));
  const lines = ["flowchart TD"];

  for (const node of wf.graph.nodes) {
    const [open, close] = SHAPES[node.type] ?? ["[", "]"];
    const kind = node.type === "action" ? ACTIONS[node.action] : (KIND[node.type] ?? "LeadConnector");
    const title = node.name || node.id;
    const text = title === kind ? title : `${title}<br/>(${kind})`;
    lines.push(`  ${ids.get(node.id)}${open}"${escape(text)}"${close}`);
  }

  lines.push(`  start(("Call starts")) --> ${ids.get(wf.graph.start)}`);

  for (const node of wf.graph.nodes) {
    const from = ids.get(node.id);
    for (const edge of /** @type {Edge[]} */ (node.edges ?? [])) {
      const to = ids.get(edge.to);
      if (to) lines.push(`  ${from} -->|"${escape(edgeLabel(edge))}"| ${to}`);
    }
    if (node.then && ids.has(node.then)) lines.push(`  ${from} --> ${ids.get(node.then)}`);
    if (node.on_error && ids.has(node.on_error)) lines.push(`  ${from} -.->|"if it fails"| ${ids.get(node.on_error)}`);
    if (node.fallback && ids.has(node.fallback))
      lines.push(`  ${from} -.->|"if nobody answers"| ${ids.get(node.fallback)}`);
  }

  const globals = wf.graph.global_edges ?? [];
  if (globals.length > 0) {
    lines.push(`  anytime{{"Anytime the caller…"}}`);
    for (const edge of globals) {
      const to = ids.get(edge.to);
      if (to) lines.push(`  anytime -.->|"${escape(edgeLabel(edge))}"| ${to}`);
    }
  }

  return lines.join("\n");
}

/** @param {Edge} edge */
export function edgeLabel(edge) {
  if (edge.label) return shorten(edge.label);
  const w = edge.when;
  const not = w.not ? "not " : "";
  if ("intent" in w) return shorten(w.intent);
  if ("else" in w) return "otherwise";
  if ("booking_hours" in w) return `${w.not ? "outside" : "during"} booking hours`;
  if ("time_window" in w) {
    const t = w.time_window;
    return `${w.not ? "outside" : "during"} ${t.days.join(", ")} ${t.start}–${t.end}`;
  }
  const subject = w.field ?? w.variable;
  if ("equals" in w) return `${subject} ${w.not ? "≠" : "="} ${w.equals}`;
  if ("in" in w) return `${subject} ${not}in ${w.in.join(", ")}`;
  if ("exists" in w) return `${subject} ${w.exists !== Boolean(w.not) ? "given" : "not given"}`;
  return "";
}

/** @param {string} text */
function shorten(text) {
  const clean = text.replace(/\s+/g, " ").trim();
  if (clean.length <= MAX_LABEL) return clean;
  const cut = clean.slice(0, MAX_LABEL);
  return `${cut.slice(0, Math.max(cut.lastIndexOf(" "), 24)).replace(/[,:;]$/, "")}…`;
}

/** @param {string} text */
function escape(text) {
  return text.replace(/"/g, "#quot;").replace(/\|/g, "#124;");
}
