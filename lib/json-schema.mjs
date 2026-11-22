// @ts-check
/**
 * A small JSON Schema (2020-12) evaluator covering the keywords the workflow
 * schema uses. It keeps the validator zero-install: no dependencies, runs on
 * any Node.js 22+. The test suite checks it agrees with Ajv on every fixture.
 *
 * Supported: $ref (local "#/..." only), type, const, enum, properties,
 * required, additionalProperties, propertyNames, items, minItems, maxItems,
 * uniqueItems, minLength, maxLength, pattern, minimum, maximum, allOf, anyOf,
 * oneOf, not, if/then/else. Annotations (description, title, format, default)
 * are ignored.
 */

/** @typedef {{ path: string, message: string }} SchemaError */
/** @typedef {Record<string, any>} Schema */

const SUPPORTED = new Set([
  "$schema",
  "$id",
  "$defs",
  "$ref",
  "title",
  "description",
  "default",
  "format",
  "type",
  "const",
  "enum",
  "properties",
  "required",
  "additionalProperties",
  "propertyNames",
  "items",
  "minItems",
  "maxItems",
  "uniqueItems",
  "minLength",
  "maxLength",
  "pattern",
  "minimum",
  "maximum",
  "allOf",
  "anyOf",
  "oneOf",
  "not",
  "if",
  "then",
  "else",
]);

/**
 * Validate `value` against `schema`. Returns an empty array when it's valid.
 * @param {Schema} schema
 * @param {unknown} value
 * @returns {SchemaError[]}
 */
export function validateSchema(schema, value) {
  /** @type {Map<string, RegExp>} */
  const patterns = new Map();
  return check(schema, value, "");

  /**
   * @param {Schema | boolean} s
   * @param {unknown} v
   * @param {string} path
   * @returns {SchemaError[]}
   */
  function check(s, v, path) {
    if (s === true) return [];
    if (s === false) return [{ path, message: "is not allowed" }];
    /** @type {SchemaError[]} */
    const errors = [];
    const fail = (/** @type {string} */ message, at = path) => errors.push({ path: at, message });

    for (const key of Object.keys(s)) {
      if (!SUPPORTED.has(key)) throw new Error(`json-schema: unsupported keyword "${key}" at ${path || "/"}`);
    }

    if (s.$ref !== undefined) errors.push(...check(resolve(s.$ref), v, path));

    if (s.type !== undefined) {
      const types = Array.isArray(s.type) ? s.type : [s.type];
      if (!types.some((/** @type {string} */ t) => isType(v, t))) {
        fail(`must be ${types.join(" or ")}`);
        return errors;
      }
    }
    if ("const" in s && !deepEqual(v, s.const)) fail(`must be ${JSON.stringify(s.const)}`);
    if (s.enum !== undefined && !s.enum.some((/** @type {unknown} */ e) => deepEqual(v, e))) {
      fail(`must be one of ${s.enum.map((/** @type {unknown} */ e) => JSON.stringify(e)).join(", ")}`);
    }

    if (typeof v === "string") {
      const length = [...v].length;
      if (s.minLength !== undefined && length < s.minLength) fail(`must be at least ${s.minLength} characters`);
      if (s.maxLength !== undefined && length > s.maxLength) fail(`must be at most ${s.maxLength} characters`);
      if (s.pattern !== undefined && !regex(s.pattern).test(v)) fail(`must match ${s.pattern}`);
    }

    if (typeof v === "number") {
      if (s.minimum !== undefined && v < s.minimum) fail(`must be >= ${s.minimum}`);
      if (s.maximum !== undefined && v > s.maximum) fail(`must be <= ${s.maximum}`);
    }

    if (Array.isArray(v)) {
      if (s.minItems !== undefined && v.length < s.minItems) fail(`must have at least ${s.minItems} item(s)`);
      if (s.maxItems !== undefined && v.length > s.maxItems) fail(`must have at most ${s.maxItems} items`);
      if (s.uniqueItems) {
        for (let i = 0; i < v.length; i++) {
          for (let j = i + 1; j < v.length; j++) {
            if (deepEqual(v[i], v[j])) fail(`must not repeat ${JSON.stringify(v[i])}`, `${path}/${j}`);
          }
        }
      }
      if (s.items !== undefined) v.forEach((item, i) => errors.push(...check(s.items, item, `${path}/${i}`)));
    }

    if (isObject(v)) {
      for (const key of s.required ?? []) {
        if (!(key in v)) fail(`is missing required "${key}"`);
      }
      const props = s.properties ?? {};
      for (const [key, item] of Object.entries(v)) {
        const at = `${path}/${escape(key)}`;
        if (key in props) errors.push(...check(props[key], item, at));
        else if (s.additionalProperties === false) fail(`has unknown key "${key}"`, at);
        else if (s.additionalProperties !== undefined) errors.push(...check(s.additionalProperties, item, at));
        if (s.propertyNames !== undefined) {
          for (const e of check(s.propertyNames, key, at)) fail(`key ${e.message}`, at);
        }
      }
    }

    for (const sub of s.allOf ?? []) errors.push(...check(sub, v, path));

    if (s.anyOf !== undefined) {
      const results = s.anyOf.map((/** @type {Schema} */ sub) => check(sub, v, path));
      if (!results.some((/** @type {SchemaError[]} */ r) => r.length === 0)) errors.push(...closest(results));
    }

    if (s.oneOf !== undefined) {
      const results = s.oneOf.map((/** @type {Schema} */ sub) => check(sub, v, path));
      const passing = results.filter((/** @type {SchemaError[]} */ r) => r.length === 0).length;
      if (passing === 0) errors.push(...closest(results));
      else if (passing > 1) fail("matches more than one allowed shape");
    }

    if (s.not !== undefined && check(s.not, v, path).length === 0) fail("is not allowed in this combination");

    if (s.if !== undefined) {
      const branch = check(s.if, v, path).length === 0 ? s.then : s.else;
      if (branch !== undefined) errors.push(...check(branch, v, path));
    }

    return errors;
  }

  /** @param {string} ref */
  function resolve(ref) {
    if (!ref.startsWith("#")) throw new Error(`json-schema: only local $ref is supported, got ${ref}`);
    /** @type {any} */
    let node = schema;
    for (const part of ref.slice(1).split("/").filter(Boolean)) {
      node = node?.[part.replace(/~1/g, "/").replace(/~0/g, "~")];
    }
    if (node === undefined) throw new Error(`json-schema: can't resolve ${ref}`);
    return node;
  }

  /** @param {string} source */
  function regex(source) {
    let re = patterns.get(source);
    if (!re) {
      re = new RegExp(source, "u");
      patterns.set(source, re);
    }
    return re;
  }
}

/**
 * When no branch of anyOf/oneOf matches, report the branch that came closest:
 * the fewest errors, preferring errors deeper in the value.
 * @param {SchemaError[][]} results
 */
function closest(results) {
  const depth = (/** @type {SchemaError[]} */ r) => Math.max(...r.map((e) => e.path.split("/").length));
  return [...results].sort((a, b) => a.length - b.length || depth(b) - depth(a))[0];
}

/** @param {unknown} v @returns {v is Record<string, unknown>} */
function isObject(v) {
  return typeof v === "object" && v !== null && !Array.isArray(v);
}

/** @param {unknown} v @param {string} type */
function isType(v, type) {
  switch (type) {
    case "object":
      return isObject(v);
    case "array":
      return Array.isArray(v);
    case "integer":
      return Number.isInteger(v);
    case "number":
      return typeof v === "number" && Number.isFinite(v);
    case "null":
      return v === null;
    default:
      return typeof v === type;
  }
}

/** @param {unknown} a @param {unknown} b @returns {boolean} */
function deepEqual(a, b) {
  if (a === b) return true;
  if (Array.isArray(a) && Array.isArray(b)) return a.length === b.length && a.every((x, i) => deepEqual(x, b[i]));
  if (isObject(a) && isObject(b)) {
    const keys = Object.keys(a);
    return keys.length === Object.keys(b).length && keys.every((k) => k in b && deepEqual(a[k], b[k]));
  }
  return false;
}

/** @param {string} key */
function escape(key) {
  return key.replace(/~/g, "~0").replace(/\//g, "~1");
}
