// Client-side feedback only. The server performs authoritative bounds, ownership and JSON validation.
export function parseDocument(text: string):
  | { document: Record<string, unknown>; error: null }
  | { document: null; error: string } {
  let value: unknown;
  try {
    value = JSON.parse(text);
  } catch {
    return { document: null, error: 'Use valid JSON. Check quotes, commas and brackets.' };
  }
  if (value === null || Array.isArray(value) || typeof value !== 'object')
    return { document: null, error: 'The project document must be a JSON object, not a list or value.' };
  if (new TextEncoder().encode(JSON.stringify(value)).length > 16_384)
    return { document: null, error: 'The project document exceeds the 16 KiB server storage limit.' };
  return { document: value as Record<string, unknown>, error: null };
}

export function prettyDocument(value: Record<string, unknown>) {
  return JSON.stringify(value, null, 2);
}
