export function parseSetCookie(headers: Headers, into: Map<string, string>): void {
  for (const raw of headers.getSetCookie()) {
    const [pair] = raw.split(';');
    const separator = pair.indexOf('=');
    if (separator <= 0) continue;
    into.set(pair.slice(0, separator).trim(), pair.slice(separator + 1).trim());
  }
}

export function cookieHeader(cookies: Map<string, string>): string {
  return [...cookies.entries()].map(([name, value]) => `${name}=${value}`).join('; ');
}

export function extractFirst(html: string, patterns: RegExp[]): string | null {
  for (const pattern of patterns) {
    const match = pattern.exec(html);
    if (match?.[1]) return match[1];
  }
  return null;
}
