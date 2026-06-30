export type UnlockLevel = 'none' | 'parth' | 'full'

function isParthEntry(tags: string[]): boolean {
  return tags.some(t => t.toLowerCase() === 'parth')
}

export function entryUnlocked(tags: string[], published: boolean, level: UnlockLevel): boolean {
  if (level === 'full') return true
  if (level === 'parth') return published || isParthEntry(tags)
  return published
}
