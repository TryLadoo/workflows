// @ts-check
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

/** @param {string} name */
export function fixture(name) {
  return JSON.parse(readFileSync(fileURLToPath(new URL(`fixtures/${name}`, import.meta.url)), "utf8"));
}

/** The workflow from the docs' file format page, deep-copied so tests can change it. */
export function docsExample() {
  return fixture("docs-example.lassi-workflow.json");
}

/** @param {any} wf @param {string} id */
export function node(wf, id) {
  const found = wf.graph.nodes.find((/** @type {any} */ n) => n.id === id);
  if (!found) throw new Error(`no step ${id}`);
  return found;
}
