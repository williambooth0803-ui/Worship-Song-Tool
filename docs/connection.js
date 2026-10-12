export const connectionDefaults = {
  profile: true,
  libraries: true,
  plans: true,
  notes: false,
  lyrics: false,
};
export function chatgptRedirect(value, expected) {
  const url = new URL(value);
  if (
    url.protocol !== "https:" ||
    !["chatgpt.com", "chat.openai.com"].includes(url.hostname) ||
    url.username ||
    url.password ||
    url.hash ||
    url.port
  )
    throw new Error("This authorization is not returning to ChatGPT.");
  if (expected) {
    const target = new URL(expected);
    if (url.origin !== target.origin || url.pathname !== target.pathname)
      throw new Error("The authorization redirect changed.");
  }
  return url.href;
}
export const mcpEndpoint = (config) =>
  config.supabaseUrl.replace(/\/$/, "") + "/functions/v1/faithful-mcp";
