// Conservative credit reservation from the Router's live /models response, 15 Nov 2026.
// UTF-8 bytes bound input tokens; the margin also covers provider accounting overhead.
export const routerPrices = {
  "gpt-4.1-mini": { prompt: 0.000048, completion: 0.000192 },
  "gpt-4.1": { prompt: 0.000264, completion: 0.001056 },
  "claude-opus-5.5": { prompt: 0.000528, completion: 0.00264 },
  "claude-fable-5.2": { prompt: 0.00096, completion: 0.0048 },
};
export function reserveRouter(params) {
  if (!params.model) return 10;
  const p = routerPrices[params.model];
  if (!p) return 250;
  const input =
      Buffer.byteLength(JSON.stringify(params.messages || []), "utf8") + 4096,
    output = params.max_tokens || params.max_completion_tokens || 6000;
  return Math.max(
    10,
    Math.ceil(2 * (input * p.prompt + output * p.completion)),
  );
}
