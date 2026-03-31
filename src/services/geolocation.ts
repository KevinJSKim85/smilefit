/**
 * Detect user's country via ipinfo.io (free tier, no token).
 * Returns ISO 3166-1 alpha-2 code (e.g. "KR", "US") or empty string on failure.
 */
export async function detectCountry(): Promise<string> {
  try {
    const res = await fetch('https://ipinfo.io/json');
    if (!res.ok) return '';
    const data = await res.json();
    return (data.country as string) || '';
  } catch {
    return '';
  }
}
