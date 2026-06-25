export function formatDate(dateStr: string, month: 'long' | 'short' = 'long'): string {
  const d = new Date(dateStr + 'T12:00:00')
  if (d.getMonth() === 0 && d.getDate() === 1) return String(d.getFullYear())
  return d.toLocaleDateString('en-US', { month, day: 'numeric', year: 'numeric' })
}
