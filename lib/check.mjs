// @ts-check
/**
 * Checks a .lassi-workflow.json file: first against the JSON Schema, then
 * against the graph rules in the Ladoo docs (every branch points at a real
 * step, every step is reachable and can reach an End call, Conditions have an
 * Otherwise, and so on).
 *
 * This is an independent reading of the public docs, not Ladoo's own
 * validator. `POST /v1/agents/{id}/workflow/validate` is the final word.
 */
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { validateSchema } from "./json-schema.mjs";

/**
 * @typedef {"error" | "warning"} Severity
 * @typedef {{ severity: Severity, code: string, node_id: string | null, message: string }} Issue
 * @typedef {{ to: string, when: Record<string, any>, label?: string }} Edge
 * @typedef {{ id: string, type: string, name?: string, [key: string]: any }} WorkflowNode
 * @typedef {{ key: string, label: string, type: string, collect: string, options?: string[], [key: string]: any }} WorkflowField
 * @typedef {{ kind: string, node_id?: string | null, field_key?: string | null, message: string }} NeedsSetup
 * @typedef {{
 *   format: string, format_version: number, name?: string, description?: string,
 *   graph: { start: string, nodes: WorkflowNode[], global_edges?: Edge[] },
 *   layout?: { nodes?: Record<string, { x: number, y: number }> },
 *   fields?: WorkflowField[], needs_setup?: NeedsSetup[], exported_at?: string
 * }} WorkflowFile
 * @typedef {{
 *   issues: Issue[],
 *   variables: string[],
 *   fieldsUsed: string[],
 * }} CheckResult
 */

export const schema = JSON.parse(
  readFileSync(fileURLToPath(new URL("../schema/lassi-workflow.schema.json", import.meta.url)), "utf8"),
);

export const STEP_TYPES = /** @type {const} */ ([
  "conversation",
  "collect",
  "action",
  "condition",
  "knowledge",
  "transfer",
  "code",
  "webhook",
  "ghl",
  "end",
]);

/** Variables every agent has, so a template doesn't need to ask for them. */
export const BUILT_IN_VARIABLES = new Set(["business_name", "business_facts", "timezone", "business_hours"]);

/** Steps that talk to the caller, where whole-call branches (global_edges) apply. */
const TALKING = new Set(["conversation", "collect", "knowledge", "action"]);
const TIME_CHECKS = ["time_window", "booking_hours"];

/**
 * @param {unknown} file The parsed JSON.
 * @param {{ template?: boolean }} [options] `template: true` adds the
 *   gallery's own rules (demo numbers only, no phone field in Collect steps…).
 * @returns {CheckResult}
 */
export function checkWorkflow(file, options = {}) {
  /** @type {Issue[]} */
  const issues = [];
  /** @type {(severity: Severity, code: string, node_id: string | null, message: string) => void} */
  const add = (severity, code, node_id, message) => {
    issues.push({ severity, code, node_id, message });
  };

  const schemaErrors = validateSchema(schema, file);
  for (const e of schemaErrors) add("error", "schema", nodeIdFromPath(file, e.path), `${e.path || "/"} ${e.message}`);
  if (schemaErrors.length > 0) return { issues, variables: [], fieldsUsed: [] };

  const wf = /** @type {WorkflowFile} */ (file);
  const nodes = wf.graph.nodes;
  const globals = wf.graph.global_edges ?? [];
  const fields = wf.fields ?? [];
  const needsSetup = wf.needs_setup ?? [];

  /** @type {Map<string, WorkflowNode>} */
  const byId = new Map();
  for (const node of nodes) {
    if (byId.has(node.id)) add("error", "duplicate_id", node.id, `Two steps have the id "${node.id}".`);
    byId.set(node.id, node);
  }

  /** @type {Map<string, WorkflowField>} */
  const fieldsByKey = new Map();
  for (const field of fields) {
    if (fieldsByKey.has(field.key)) add("error", "duplicate_field", null, `Two fields have the key "${field.key}".`);
    fieldsByKey.set(field.key, field);
  }

  if (!byId.has(wf.graph.start)) {
    add("error", "missing_start", null, `graph.start is "${wf.graph.start}", but no step has that id.`);
  }

  const target = (
    /** @type {string | null | undefined} */ to,
    /** @type {string | null} */ from,
    /** @type {string} */ what,
  ) => {
    if (to != null && !byId.has(to))
      add("error", "unknown_target", from, `${what} goes to "${to}", but no step has that id.`);
  };

  for (const edge of globals) {
    target(edge.to, null, "A whole-call branch");
    checkWhen(edge, null);
    if (edge.when.else) add("error", "global_else", null, "A whole-call branch can't be an else.");
  }

  for (const node of nodes) {
    const edges = /** @type {Edge[]} */ (node.edges ?? []);
    for (const edge of edges) {
      target(edge.to, node.id, "A branch");
      checkWhen(edge, node.id);
    }
    target(node.then, node.id, "then");
    target(node.on_error, node.id, "on_error");
    target(node.fallback, node.id, "fallback");

    const elses = edges.filter((e) => e.when.else === true).length;
    if (elses > 1) add("error", "multiple_else", node.id, "A step can have only one else branch.");
    if (elses > 0 && node.then != null)
      add("error", "else_with_then", node.id, "Use either then or an else branch, not both.");

    switch (node.type) {
      case "condition":
        if (elses === 0)
          add(
            "error",
            "condition_needs_else",
            node.id,
            "Every Condition needs an else (Otherwise), so every call has somewhere to go.",
          );
        for (const edge of edges) {
          if ("intent" in edge.when)
            add(
              "error",
              "condition_intent",
              node.id,
              "A Condition doesn't talk to the caller, so it can't branch on intent. Use a Talk step.",
            );
        }
        break;
      case "end":
        break;
      case "conversation":
      case "knowledge":
        if (edges.length === 0 && node.then == null)
          add("error", "missing_then", node.id, "Choose what happens after this step: add then or a branch.");
        break;
      case "transfer": {
        const hasTo = typeof node.to === "string" && node.to !== "";
        const hasTeam = typeof node.team_id === "string" && node.team_id !== "";
        if (hasTo && hasTeam) add("error", "transfer_both", node.id, "Set either to or team_id, not both.");
        if (!hasTo && !hasTeam && !needsSetup.some((n) => n.kind === "phone_number" && n.node_id === node.id)) {
          add(
            "error",
            "transfer_target",
            node.id,
            "Choose who to transfer to: set to or team_id, or list it in needs_setup.",
          );
        }
        break;
      }
      default:
        if (node.then == null && edges.length === 0)
          add("error", "missing_then", node.id, "Choose what happens after this step.");
    }

    if (node.type === "collect") {
      for (const key of node.fields) {
        const field = fieldsByKey.get(key);
        if (!field) add("error", "unknown_field", node.id, `Collects "${key}", which isn't in fields.`);
        else if (field.collect === "extract_only")
          add(
            "error",
            "extract_only_in_collect",
            node.id,
            `"${key}" is extract_only, so a Collect step can't ask for it.`,
          );
      }
      for (const key of node.optional_fields ?? []) {
        if (!node.fields.includes(key))
          add(
            "error",
            "optional_not_collected",
            node.id,
            `optional_fields has "${key}", which this step doesn't collect.`,
          );
      }
    }

    if (node.type === "code" || node.type === "webhook") {
      if (node.on_error == null)
        add("warning", "missing_on_error", node.id, "Add on_error, so a failure has somewhere to go.");
      for (const name of producedBy(node)) {
        if (name.startsWith("caller_")) add("error", "reserved_name", node.id, `"${name}" can't start with caller_.`);
      }
    }

    if (node.type === "knowledge") {
      const next = node.then ?? edges.find((e) => e.when.else)?.to;
      if (next && byId.get(next)?.type === "end") {
        add(
          "warning",
          "knowledge_ends_call",
          node.id,
          "This step's way out goes straight to an End call, so a caller with a second question can't ask it. Send it back to a step that asks what else they need.",
        );
      }
    }

    if (node.type === "ghl") {
      for (const [contactKey, key] of Object.entries(node.contact_fields ?? {})) {
        if (!fieldsByKey.has(key)) {
          add(
            "error",
            "unknown_field",
            node.id,
            `contact_fields fills "${contactKey}" from "${key}", which isn't in fields.`,
          );
        }
      }
    }
  }

  for (const entry of needsSetup) {
    if (entry.node_id && !byId.has(entry.node_id))
      add("error", "needs_setup_ref", null, `needs_setup names step "${entry.node_id}", which doesn't exist.`);
    if (entry.field_key && !fieldsByKey.has(entry.field_key))
      add("error", "needs_setup_ref", null, `needs_setup names field "${entry.field_key}", which doesn't exist.`);
  }

  for (const id of Object.keys(wf.layout?.nodes ?? {})) {
    if (!byId.has(id)) add("warning", "layout_unknown", null, `layout has a position for "${id}", which isn't a step.`);
  }

  // Whole-call branches can be taken from any step that talks to the caller, so they count as edges from each.
  /** @param {WorkflowNode} node @returns {string[]} */
  const next = (node) => {
    const out = [...(node.edges ?? []).map((/** @type {Edge} */ e) => e.to)];
    for (const key of ["then", "on_error", "fallback"]) if (typeof node[key] === "string") out.push(node[key]);
    if (TALKING.has(node.type)) out.push(...globals.map((e) => e.to));
    return out.filter((id) => byId.has(id));
  };
  const reachable = walk([wf.graph.start], next, byId);
  for (const node of nodes) {
    if (!reachable.has(node.id)) add("error", "unreachable", node.id, "Nothing leads here.");
  }

  /** @type {Map<string, string[]>} */
  const incoming = new Map();
  for (const node of nodes) {
    for (const to of next(node)) incoming.set(to, [...(incoming.get(to) ?? []), node.id]);
  }
  const ends = nodes.filter((n) => n.type === "end").map((n) => n.id);
  if (ends.length === 0) add("error", "no_end", null, "The workflow has no End call step.");
  const canEnd = walk(ends, (n) => incoming.get(n.id) ?? [], byId);
  for (const node of nodes) {
    if (reachable.has(node.id) && !canEnd.has(node.id))
      add("error", "dead_end", node.id, "No path from here reaches an End call.");
  }

  // The docs warn when a time check decides whether callers can reach booking.
  for (const node of nodes) {
    if (node.type !== "condition") continue;
    const edges = /** @type {Edge[]} */ (node.edges);
    if (!edges.some((e) => TIME_CHECKS.some((k) => k in e.when))) continue;
    const books = edges.map((e) =>
      [...walk([e.to], next, byId)].some((id) => byId.get(id)?.action === "book_appointment"),
    );
    if (books.includes(true) && books.includes(false)) {
      add(
        "warning",
        "time_check_before_booking",
        node.id,
        "A time check decides whether callers can book. The calendar only offers open times, so send callers who want to book straight to booking.",
      );
    }
  }

  const produced = new Set(nodes.flatMap(producedBy));
  /** @type {Set<string>} */
  const variables = new Set();
  /** @type {Set<string>} */
  const fieldsUsed = new Set();
  for (const node of nodes) {
    for (const text of strings(node)) {
      for (const m of text.matchAll(/\{\{\s*([A-Za-z0-9_.]+)\s*\}\}/g)) {
        const ref = m[1];
        if (ref.startsWith("fields.")) {
          const key = ref.slice("fields.".length);
          fieldsUsed.add(key);
          if (!fieldsByKey.has(key))
            add("error", "unknown_field", node.id, `Uses {{${ref}}}, but "${key}" isn't in fields.`);
        } else if (ref.startsWith("secrets.")) {
          // Workspace secrets are fine as written.
        } else {
          variables.add(ref.startsWith("variables.") ? ref.slice("variables.".length) : ref);
        }
      }
    }
    if (node.type === "code") {
      for (const m of node.code.matchAll(/\bvariables\.([A-Za-z_]\w*)/g)) variables.add(m[1]);
    }
    for (const edge of /** @type {Edge[]} */ (node.edges ?? [])) {
      if (typeof edge.when.variable === "string") variables.add(edge.when.variable);
    }
  }
  for (const edge of globals) if (typeof edge.when.variable === "string") variables.add(edge.when.variable);
  for (const node of nodes) for (const key of node.type === "collect" ? node.fields : []) fieldsUsed.add(key);
  for (const node of nodes)
    for (const key of Object.values(node.type === "ghl" ? (node.contact_fields ?? {}) : {}))
      fieldsUsed.add(String(key));
  for (const node of nodes)
    for (const edge of /** @type {Edge[]} */ (node.edges ?? [])) if (edge.when.field) fieldsUsed.add(edge.when.field);

  if (options.template) templateRules(wf, add);

  return {
    issues,
    variables: [...variables].filter((v) => !produced.has(v)).sort(),
    fieldsUsed: [...fieldsUsed].sort(),
  };

  /** @param {Edge} edge @param {string | null} from */
  function checkWhen(edge, from) {
    const when = edge.when;
    if ("not" in when && ("intent" in when || "else" in when))
      add("error", "schema", from, "not can't be used with intent or else.");
    if (typeof when.field !== "string") return;
    const field = fieldsByKey.get(when.field);
    if (!field) {
      add("error", "unknown_field", from, `A branch checks "${when.field}", which isn't in fields.`);
      return;
    }
    const values = "equals" in when ? [when.equals] : "in" in when ? when.in : [];
    for (const value of values) {
      if (field.type === "boolean" && typeof value !== "boolean")
        add("error", "check_type", from, `"${field.key}" is a boolean, so compare it with true or false.`);
      if (field.type === "number" && typeof value !== "number")
        add("error", "check_type", from, `"${field.key}" is a number, so compare it with a number.`);
      if (field.type === "enum" && !(field.options ?? []).includes(value))
        add("error", "check_type", from, `${JSON.stringify(value)} isn't one of the options for "${field.key}".`);
    }
  }
}

/**
 * The gallery's own rules for published templates.
 * @param {WorkflowFile} wf
 * @param {(severity: Severity, code: string, node_id: string | null, message: string) => void} add
 */
function templateRules(wf, add) {
  if (!wf.name) add("error", "template_name", null, "Templates need a name.");
  if (!wf.description) add("error", "template_description", null, "Templates need a description.");
  if (wf.exported_at) add("error", "template_exported_at", null, "Leave exported_at out of templates.");
  const fields = new Map((wf.fields ?? []).map((f) => [f.key, f]));

  for (const node of wf.graph.nodes) {
    if (node.type === "collect") {
      for (const key of node.fields) {
        if (fields.get(key)?.type === "phone") {
          add(
            "error",
            "template_collect_phone",
            node.id,
            `Don't ask for "${key}" in a Collect step. On a phone call the agent confirms the number they're calling from.`,
          );
        }
      }
    }
    for (const text of strings(node)) {
      if (/\b(i am|i'm) an ai\b|\bai assistant\b|\bvirtual assistant\b/i.test(text)) {
        add(
          "error",
          "template_ai_notice",
          node.id,
          "The call disclosure already says it's an AI assistant. Don't repeat it in a step.",
        );
      }
      if (node.id === wf.graph.start && /\b(thanks|thank you) for calling\b|^\s*(hi|hello)\b/i.test(text)) {
        add(
          "error",
          "template_greeting",
          node.id,
          "The greeting is said before the first step, so the first step shouldn't greet again.",
        );
      }
    }
  }

  for (const text of strings(wf)) {
    for (const m of text.matchAll(/(?:\+?1[\s.-]?)?\(?([2-9]\d{2})\)?[\s.-]?(\d{3})[\s.-]?(\d{4})\b/g)) {
      if (m[2] !== "555" || !/^01\d\d$/.test(m[3])) {
        add(
          "error",
          "template_phone_number",
          null,
          `"${m[0]}" looks like a real phone number. Use a fictional 555-01xx number.`,
        );
      }
    }
    for (const m of text.matchAll(/[\w.+-]+@([\w-]+\.)+[A-Za-z]{2,}/g)) {
      if (!/@(example\.(com|org|net)|[\w.-]+\.(test|example))$/i.test(m[0])) {
        add("error", "template_email", null, `"${m[0]}" looks like a real email address. Use example.com.`);
      }
    }
  }
}

/** @param {WorkflowNode} node @returns {string[]} */
function producedBy(node) {
  if (node.type === "code") return node.outputs ?? [];
  if (node.type === "webhook") {
    const save = node.save;
    if (Array.isArray(save)) return save.map((s) => s.name);
    if (save && typeof save === "object") return Object.keys(save);
  }
  return [];
}

/**
 * @param {string[]} from
 * @param {(node: WorkflowNode) => string[]} next
 * @param {Map<string, WorkflowNode>} byId
 */
function walk(from, next, byId) {
  const seen = new Set(from.filter((id) => byId.has(id)));
  const queue = [...seen];
  while (queue.length > 0) {
    const node = byId.get(/** @type {string} */ (queue.shift()));
    if (!node) continue;
    for (const id of next(node)) {
      if (!seen.has(id)) {
        seen.add(id);
        queue.push(id);
      }
    }
  }
  return seen;
}

/** @param {unknown} value @returns {string[]} */
function strings(value) {
  if (typeof value === "string") return [value];
  if (Array.isArray(value)) return value.flatMap(strings);
  if (value && typeof value === "object") return Object.values(value).flatMap(strings);
  return [];
}

/** @param {unknown} file @param {string} path */
function nodeIdFromPath(file, path) {
  const m = /^\/graph\/nodes\/(\d+)/.exec(path);
  if (!m) return null;
  const node = /** @type {any} */ (file)?.graph?.nodes?.[Number(m[1])];
  return typeof node?.id === "string" ? node.id : null;
}
