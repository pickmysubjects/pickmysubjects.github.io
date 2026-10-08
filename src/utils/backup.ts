/**
 * A student's record, plans and rated subjects live only in this browser. A
 * backup file lets them move to another browser or computer without anything
 * being uploaded.
 */
const KEYS = ['sc:profiles', 'sc:plans', 'sc:rated'] as const
const APP = 'pickmysubjects'
// Backups saved before the site was renamed from Subject Compass still restore.
const OLD_APPS: readonly string[] = ['subject-compass']

interface Backup {
  app: string
  version: 1
  savedAt: string
  data: Partial<Record<(typeof KEYS)[number], unknown>>
}

export function makeBackup(now = new Date()): string {
  const data: Backup['data'] = {}
  for (const key of KEYS) {
    try {
      const raw = localStorage.getItem(key)
      if (raw !== null) data[key] = JSON.parse(raw)
    } catch {
      // Unreadable or blocked storage: leave that part out.
    }
  }
  const backup: Backup = { app: APP, version: 1, savedAt: now.toISOString(), data }
  return JSON.stringify(backup, null, 2)
}

/** Writes a backup back into this browser. Returns false if the text isn't one of ours. */
export function restoreBackup(text: string): boolean {
  let parsed: unknown
  try {
    parsed = JSON.parse(text)
  } catch {
    return false
  }
  if (!isBackup(parsed)) return false
  try {
    for (const key of KEYS) {
      const value = parsed.data[key]
      if (value !== undefined) localStorage.setItem(key, JSON.stringify(value))
    }
  } catch {
    return false
  }
  return true
}

function isBackup(x: unknown): x is Backup {
  if (typeof x !== 'object' || x === null) return false
  const b = x as Partial<Backup>
  return (b.app === APP || OLD_APPS.includes(b.app ?? '')) && b.version === 1 && typeof b.data === 'object' && b.data !== null
}

/** Offer the backup as a file download (no upload anywhere). */
export function downloadBackup(): void {
  const blob = new Blob([makeBackup()], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `pickmysubjects-backup-${new Date().toISOString().slice(0, 10)}.json`
  a.click()
  setTimeout(() => URL.revokeObjectURL(url), 1000)
}
