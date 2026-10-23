export function messageKey(source: string): string {
  let hash = 2166136261;
  for (let i = 0; i < source.length; i++) hash = Math.imul(hash ^ source.charCodeAt(i), 16777619);
  return 'm' + (hash >>> 0).toString(16);
}
export function translateText(messages: Record<string, string>, source: string, values?: Record<string, string | number>): string {
  const clean = source.replace(/&apos;/g, "'").replace(/&amp;/g, '&').replace(/&quot;/g, '"');
  const leading = clean.match(/^\s*/)?.[0] ?? '';
  const trailing = clean.match(/\s*$/)?.[0] ?? '';
  const template = leading + (messages[messageKey(clean.trim())] ?? clean.trim()) + trailing;
  return template.replace(/\{(\w+)\}/g, (match, key: string) => values?.[key] === undefined ? match : String(values[key]));
}
