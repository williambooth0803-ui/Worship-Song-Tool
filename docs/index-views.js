import { indexFields } from "./song-index.js";

const knownFields = new Set(indexFields([]).map((field) => field.id));
const operators = new Set([
  "contains", "equals", "word", "excludes", "gte", "lte", "numeric", "missing", "present",
]);
export function validateIndexView(value) {
  const fail = () => { throw new Error("Invalid saved index view."); };
  const text = (v, max, required = false) => {
    if (typeof v !== "string" || v.length > max || (required && !v.trim())) fail();
    return v;
  };
  const field = (v) => {
    text(v, 110, true);
    if (!knownFields.has(v) && !/^custom:\S.{0,99}$/u.test(v)) fail();
    return v;
  };
  if (!value || typeof value !== "object" || Array.isArray(value) ||
      !Array.isArray(value.rules) || value.rules.length > 30 ||
      typeof value.descending !== "boolean") fail();
  return {
    id: text(value.id, 200, true),
    name: text(value.name, 100, true).trim(),
    query: text(value.query, 1000),
    rules: value.rules.map((rule) => {
      if (!rule || !operators.has(rule.op)) fail();
      const result = { field: field(rule.field), op: rule.op, value: text(rule.value, 1000) };
      if (["gte", "lte", "numeric"].includes(rule.op) &&
          (!rule.value.trim() || !Number.isFinite(Number(rule.value)))) fail();
      return result;
    }),
    sort: field(value.sort),
    descending: value.descending,
    column: field(value.column),
  };
}
