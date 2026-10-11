// JSONB reorders object keys; stable comparison must preserve array order.
export function workspaceSignature(value) {
  if (value === null || typeof value !== "object") return JSON.stringify(value);
  if (Array.isArray(value))
    return `[${value.map(workspaceSignature).join(",")}]`;
  return `{${Object.keys(value)
    .sort()
    .filter((k) => value[k] !== undefined)
    .map((k) => `${JSON.stringify(k)}:${workspaceSignature(value[k])}`)
    .join(",")}}`;
}
export function saveLabel(status, workspace) {
  if (status.phase === "saving") return "Saving to your account…";
  if (status.phase === "checking") return "Checking your saved account copy…";
  if (status.phase === "conflict")
    return "Another device saved changes. Review the account copy before saving.";
  if (status.phase === "error")
    return "Account save failed. Your browser copy is retained.";
  if (status.signature && status.signature === workspaceSignature(workspace))
    return "Saved to your account";
  if (status.remoteAvailable && !status.signature)
    return "An account copy is available. Save or load the version you want to keep.";
  return "Changes saved in this browser. Save to your account to keep them across devices.";
}
