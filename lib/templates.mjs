// @ts-check
/** Finds workflow files and the gallery's templates. */
import { readdirSync, statSync } from "node:fs";
import { join, relative, sep } from "node:path";
import { fileURLToPath } from "node:url";

export const ROOT = fileURLToPath(new URL("..", import.meta.url));
export const TEMPLATES = join(ROOT, "templates");
export const WORKFLOW_FILE = "workflow.lassi-workflow.json";

/**
 * Every *.lassi-workflow.json under `path` (or `path` itself), sorted.
 * @param {string} path
 * @returns {string[]}
 */
export function findWorkflowFiles(path) {
  if (!statSync(path).isDirectory()) return [path];
  return readdirSync(path, { recursive: true, encoding: "utf8" })
    .filter((f) => f.endsWith(".lassi-workflow.json") && !f.split(sep).includes("node_modules"))
    .map((f) => join(path, f))
    .sort();
}

/**
 * The gallery's templates: templates/<industry>/<name>/workflow.lassi-workflow.json.
 * @returns {{ industry: string, slug: string, dir: string, file: string, readme: string }[]}
 */
export function listTemplates() {
  return findWorkflowFiles(TEMPLATES).map((file) => {
    const [industry, slug, name] = relative(TEMPLATES, file).split(sep);
    if (name !== WORKFLOW_FILE || !industry || !slug) {
      throw new Error(`${relative(ROOT, file)}: templates live at templates/<industry>/<name>/${WORKFLOW_FILE}`);
    }
    const dir = join(TEMPLATES, industry, slug);
    return { industry, slug, dir, file, readme: join(dir, "README.md") };
  });
}

/** @param {string} path */
export function isTemplate(path) {
  const rel = relative(TEMPLATES, path);
  return !rel.startsWith("..") && !rel.startsWith(sep);
}
