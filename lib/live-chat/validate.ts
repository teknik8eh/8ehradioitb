export function sanitizeNickname(raw: unknown): string | null {
  if (typeof raw !== "string") return null;
  const trimmed = raw.trim();
  if (trimmed.length < 2 || trimmed.length > 30) return null;
  const cleaned = trimmed.replace(/<[^>]*>/g, "").replace(/[\x00-\x1F\x7F]/g, "");
  if (cleaned.length < 2) return null;
  return cleaned;
}

export function sanitizeMessageText(raw: unknown): string | null {
  if (typeof raw !== "string") return null;
  const trimmed = raw.trim();
  if (trimmed.length < 1 || trimmed.length > 300) return null;
  const cleaned = trimmed.replace(/<[^>]*>/g, "").replace(/[\x00-\x1F\x7F]/g, "");
  if (cleaned.length === 0) return null;
  return cleaned;
}
