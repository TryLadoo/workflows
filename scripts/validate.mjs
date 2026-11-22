#!/usr/bin/env node
// @ts-check
/**
 * Check .lassi-workflow.json files against the schema and the graph rules.
 *
 *   node scripts/validate.mjs                 # every template in the gallery
 *   node scripts/validate.mjs my.lassi-workflow.json other-dir/
 *   node scripts/validate.mjs --json my.lassi-workflow.json
 *
 * Files under templates/ also get the gallery's template rules, and their
 * README must document every business setting the workflow uses.
 * Exits 1 when any file has an error. Warnings don't fail.
 */
import { existsSync, readFileSync } from "node:fs";
import { relative, resolve } from "node:path";
import { checkWorkflow, BUILT_IN_VARIABLES } from "../lib/check.mjs";
import { TEMPLATES, findWorkflowFiles, isTemplate } from "../lib/templates.mjs";

const args = process.argv.slice(2);
if (args.includes("--help") || args.includes("-h")) {
  console.log(
    "Usage: lassi-workflow [--json] [--template] [file-or-dir ...]\nWith no paths, checks the gallery's templates.",
  );
  process.exit(0);
}
const asJson = args.includes("--json");
const forceTemplate = args.includes("--template");
const paths = args.filter((a) => !a.startsWith("--"));
const targets = paths.length > 0 ? paths.map((p) => resolve(p)) : [TEMPLATES];

/** @type {{ file: string, issues: import("../lib/check.mjs").Issue[] }[]} */
const results = [];
for (const target of targets) {
  if (!existsSync(target)) {
    results.push({
      file: target,
      issues: [{ severity: "error", code: "not_found", node_id: null, message: "No such file or directory." }],
    });
    continue;
  }
  for (const file of findWorkflowFiles(target)) results.push({ file, issues: checkFile(file) });
}

const display = (/** @type {string} */ f) => {
  const rel = relative(process.cwd(), f);
  return rel.startsWith("..") ? f : rel;
};
const errors = results.reduce((n, r) => n + r.issues.filter((i) => i.severity === "error").length, 0);
const warnings = results.reduce((n, r) => n + r.issues.filter((i) => i.severity === "warning").length, 0);

if (asJson) {
  console.log(
    JSON.stringify(
      { valid: errors === 0, files: results.map((r) => ({ file: display(r.file), issues: r.issues })) },
      null,
      2,
    ),
  );
} else {
  for (const { file, issues } of results) {
    const bad = issues.some((i) => i.severity === "error");
    console.log(`${bad ? "✗" : "✓"} ${display(file)}`);
    for (const i of issues) {
      console.log(
        `    ${i.severity === "error" ? "error  " : "warning"} ${i.code}${i.node_id ? ` [${i.node_id}]` : ""}: ${i.message}`,
      );
    }
  }
  if (results.length === 0) console.log("No .lassi-workflow.json files found.");
  console.log(`\n${results.length} file(s), ${errors} error(s), ${warnings} warning(s)`);
}
process.exit(errors > 0 || results.length === 0 ? 1 : 0);

/** @param {string} file */
function checkFile(file) {
  let json;
  try {
    json = JSON.parse(readFileSync(file, "utf8"));
  } catch (err) {
    return [
      {
        severity: /** @type {const} */ ("error"),
        code: "invalid_json",
        node_id: null,
        message: String(/** @type {Error} */ (err).message),
      },
    ];
  }
  const template = forceTemplate || isTemplate(file);
  const { issues, variables } = checkWorkflow(json, { template });
  if (template && isTemplate(file)) {
    const readme = resolve(file, "..", "README.md");
    if (!existsSync(readme)) {
      issues.push({
        severity: "error",
        code: "template_readme",
        node_id: null,
        message: "Templates need a README.md next to the workflow file.",
      });
    } else {
      const text = readFileSync(readme, "utf8");
      for (const v of variables.filter((v) => !BUILT_IN_VARIABLES.has(v))) {
        if (!text.includes(`\`${v}\``)) {
          issues.push({
            severity: "error",
            code: "template_readme_variable",
            node_id: null,
            message: `README.md doesn't document the business setting \`${v}\`.`,
          });
        }
      }
    }
  }
  return issues;
}
