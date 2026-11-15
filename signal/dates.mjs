export function instant(value) {
  if (typeof value !== "string" || !value.trim()) return null;
  const input = value
    .trim()
    .replace(/EEST$/, "+03:00")
    .replace(/EET$/, "+02:00");
  const time = Date.parse(input);
  return Number.isFinite(time) ? new Date(time).toISOString() : null;
}
