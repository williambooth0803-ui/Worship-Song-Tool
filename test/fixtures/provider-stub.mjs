// Test-only provider: never sends any network request or needs real credentials.
globalThis.fetch = async (url, options) => {
  if (url !== "https://api.openai.com/v1/chat/completions")
    throw new Error("Unexpected provider URL");
  const request = JSON.parse(options.body),
    input = JSON.parse(request.messages[1].content);
  const results = input.songs.map((song) => ({
    id: song.id,
    fit: "possible",
    reason: "Fixture criterion interpretation.",
    evidence: [
      input.criterion === "invent evidence"
        ? "Not in the supplied record"
        : song.text,
    ],
  }));
  return new Response(
    JSON.stringify({
      choices: [{ message: { content: JSON.stringify({ results }) } }],
    }),
    { status: 200 },
  );
};
