// Normalise a user-entered URL. Returns null for empty/blank so callers can
// avoid rendering <a href=""> (which reloads the current page). Prepends
// https:// when the scheme is missing (a value like "tiktok.com/@x" would
// otherwise be treated as a relative link and reload the page).
export function normalizeUrl(raw: string | null | undefined): string | null {
  const s = (raw ?? "").trim();
  if (!s) return null;
  return /^https?:\/\//i.test(s) ? s : `https://${s}`;
}

// Resolve a KOC's TikTok channel URL: use the stored URL if present, otherwise
// build it from the handle (some campaign forms capture the link in a custom
// field, leaving tiktok_url empty).
export function tiktokChannelUrl(input: {
  tiktok_url?: string | null;
  tiktok_handle?: string | null;
}): string | null {
  const url = normalizeUrl(input.tiktok_url);
  if (url) return url;
  const handle = (input.tiktok_handle ?? "").trim().replace(/^@+/, "");
  return handle ? `https://www.tiktok.com/@${handle}` : null;
}
