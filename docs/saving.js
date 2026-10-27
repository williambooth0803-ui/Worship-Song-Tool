// JSONB reorders object keys; stable comparison must preserve array order.
export function workspaceSignature(value) {
  return signature(value,true);
}
function signature(value,root=false) {
  if (value === null || typeof value !== "object") return JSON.stringify(value);
  if (Array.isArray(value))
    return `[${value.map(item=>signature(item)).join(",")}]`;
  return `{${Object.keys(value)
    .sort()
    .filter((k) => value[k] !== undefined && !(root&&value.version===1&&Array.isArray(value.songs)&&['evaluationClient','evaluationSchema'].includes(k)))
    .map((k) => `${JSON.stringify(k)}:${signature(value[k])}`)
    .join(",")}}`;
}
export function saveLabel(status, workspace) {
  if (status.phase === "saving") return "Saving to your account…";
  if (status.phase === "checking") return "Checking your saved account copy…";
  if (status.phase === "conflict")
    return "Another device saved changes. Review the account copy before saving.";
  if (status.phase === "review") return "An account workspace is available. Review it before enabling autosave to avoid replacing earlier work.";
  if (status.phase === "error")
    return "Account save failed. Your browser copy is retained.";
  if (status.signature && status.signature === workspaceSignature(workspace))
    return "Saved to your account";
  if (status.remoteAvailable && !status.signature)
    return "An account copy is available. Save or load the version you want to keep.";
  return "Saved in this browser. Account autosave is pending.";
}
