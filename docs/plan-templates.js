import { copyPlan } from "./planning.js";

// A template is a snapshot of a service explicitly built by its owner.
// It is stored outside plans, so it never counts as a planned/completed service.
export function templateFromPlan(plan, title, keepSongs = true, newId) {
  if (typeof title !== "string" || !title.trim() || title.length > 200)
    throw new Error("Enter a template name of up to 200 characters.");
  const template = copyPlan(plan, { title, date: "" }, newId);
  if (!keepSongs)
    template.items = template.items.map((item) => item.type !== "song" ? item : {
      id: item.id,
      type: "other",
      title: "Song — choose manually",
      role: item.role,
      notes: item.notes,
      minutes: item.minutes,
    });
  return template;
}
export function planFromTemplate(template, { title, date = "" }, newId) {
  return copyPlan(template, { title: title || template.title, date }, newId);
}
