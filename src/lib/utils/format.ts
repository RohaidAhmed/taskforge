// lib/utils/format.ts

// ── Task ID ───────────────────────────────────────────────────
export function formatTaskId(identifier: string, sequenceNumber: number): string {
  return `${identifier}-${sequenceNumber}`
}

// ── Initials from name or email ───────────────────────────────
export function getInitials(name: string | null, email: string): string {
  if (name) {
    return name
      .split(' ')
      .map((n) => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2)
  }
  return email.slice(0, 2).toUpperCase()
}

// ── Relative time ─────────────────────────────────────────────
export function timeAgo(dateString: string): string {
  const date = new Date(dateString)
  const now = new Date()
  const seconds = Math.floor((now.getTime() - date.getTime()) / 1000)

  if (seconds < 60)    return 'just now'
  if (seconds < 3600)  return `${Math.floor(seconds / 60)}m ago`
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`
  if (seconds < 604800) return `${Math.floor(seconds / 86400)}d ago`

  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

// ── Due date ──────────────────────────────────────────────────
export function formatDueDate(dateString: string | null): string | null {
  if (!dateString) return null
  const date = new Date(dateString + 'T00:00:00')
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

export function isDueSoon(dateString: string | null): boolean {
  if (!dateString) return false
  const date = new Date(dateString + 'T00:00:00')
  const threeDays = Date.now() + 3 * 24 * 60 * 60 * 1000
  return date.getTime() <= threeDays && date.getTime() >= Date.now()
}

export function isOverdue(dateString: string | null): boolean {
  if (!dateString) return false
  const date = new Date(dateString + 'T00:00:00')
  return date.getTime() < Date.now()
}

// ── Slug ──────────────────────────────────────────────────────
export function toSlug(value: string): string {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .slice(0, 48)
}
