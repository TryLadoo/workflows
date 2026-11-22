#!/usr/bin/env node
// @ts-check
/**
 * Regenerate the parts of the READMEs that come from the workflow files:
 * each template's Mermaid diagram and field table, and the gallery table in
 * the root README.
 *
 *   node scripts/diagram.mjs          # rewrite them
 *   node scripts/diagram.mjs --check  # exit 1 if any is out of date (CI)
 */
import { readFileSync, writeFileSync } from "node:fs";
import { join, relative } from "node:path";
import { toMermaid } from "../lib/mermaid.mjs";
import { ROOT, listTemplates } from "../lib/templates.mjs";

const check = process.argv.includes("--check");

/** Display names for industry folders. Anything else is title-cased. */
const INDUSTRIES = /** @type {Record<string, string>} */ ({
  "home-services": "Home services",
  "med-spa": "Med spa",
  "property-management": "Property management",
  "real-estate": "Real estate",
  general: "Any business",
});

/** @param {string} slug */
function industryName(slug) {
  return INDUSTRIES[slug] ?? slug.replace(/-/g, " ").replace(/^./, (c) => c.toUpperCase());
}

/** @type {string[]} */
const stale = [];
/** @type {string[]} */
const rows = [];

for (const t of listTemplates()) {
  /** @type {import("../lib/check.mjs").WorkflowFile} */
  const wf = JSON.parse(readFileSync(t.file, "utf8"));
  const block = ["```mermaid", toMermaid(wf), "```", "", fieldTable(wf)].join("\n");
  update(t.readme, "diagram", block);
  const link = relative(ROOT, t.dir).split("\\").join("/");
  rows.push(
    `| [${wf.name}](${link}) | ${industryName(t.industry)} | ${cell(wf.description ?? "")} | ${wf.graph.nodes.length} |`,
  );
}

update(
  join(ROOT, "README.md"),
  "gallery",
  ["| Template | Industry | What it does | Steps |", "| --- | --- | --- | --- |", ...rows].join("\n"),
);

if (check) {
  if (stale.length > 0) {
    console.error(`Out of date: ${stale.join(", ")}\nRun \`npm run diagram\` and commit the result.`);
    process.exit(1);
  }
  console.log("Diagrams and gallery are up to date.");
} else {
  console.log(stale.length > 0 ? `Updated ${stale.join(", ")}` : "Nothing to update.");
}

/**
 * Replace the text between <!-- BEGIN GENERATED: name --> and <!-- END GENERATED: name -->.
 * @param {string} file @param {string} name @param {string} content
 */
function update(file, name, content) {
  const begin = `<!-- BEGIN GENERATED: ${name} (npm run diagram) -->`;
  const end = `<!-- END GENERATED: ${name} -->`;
  const text = readFileSync(file, "utf8");
  const start = text.indexOf(begin);
  const stop = text.indexOf(end);
  if (start === -1 || stop < start)
    throw new Error(`${relative(ROOT, file)} is missing the markers:\n${begin}\n${end}`);
  const next = `${text.slice(0, start)}${begin}\n<!-- prettier-ignore-start -->\n\n${content}\n\n<!-- prettier-ignore-end -->\n${text.slice(stop)}`;
  if (next !== text) {
    stale.push(relative(ROOT, file));
    if (!check) writeFileSync(file, next);
  }
}

/** @param {import("../lib/check.mjs").WorkflowFile} wf */
function fieldTable(wf) {
  const fields = wf.fields ?? [];
  if (fields.length === 0) return "This workflow doesn't define any fields.";
  const collect = { required: "Required", optional: "Optional", extract_only: "Picked up, never asked" };
  return [
    "| Field | Type | Asked | What it's for |",
    "| --- | --- | --- | --- |",
    ...fields.map((f) => {
      const type = f.type === "enum" ? `one of ${(f.options ?? []).map((o) => `\`${o}\``).join(", ")}` : f.type;
      return `| \`${f.key}\` | ${type} | ${collect[/** @type {keyof typeof collect} */ (f.collect)]} | ${cell(f.description ?? f.label)} |`;
    }),
  ].join("\n");
}

/** @param {string} text */
function cell(text) {
  return text.replace(/\|/g, "\\|").replace(/\n/g, " ");
}
