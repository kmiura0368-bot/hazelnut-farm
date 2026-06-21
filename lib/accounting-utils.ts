export function fmt(n: number): string {
  return (n || 0).toLocaleString('ja-JP');
}

export function esc(s: string): string {
  return (s || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

export function generateId(): string {
  return Date.now().toString(36) + Math.random().toString(36).slice(2);
}
