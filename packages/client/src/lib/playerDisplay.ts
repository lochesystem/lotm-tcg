export function formatPlayerHandle(name: string | null | undefined): string {
  const trimmed = (name ?? '').trim();
  if (!trimmed) return '@Player';
  return trimmed.startsWith('@') ? trimmed : `@${trimmed}`;
}
