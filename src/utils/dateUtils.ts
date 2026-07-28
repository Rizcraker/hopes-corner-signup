// Date-only values (birthdays) are stored as "YYYY-MM-DD". `new Date("2009-05-12")`
// parses as UTC midnight, which rolls back a day when shown in a negative-offset
// zone like PST. These helpers treat the value as a plain local calendar date.

export function formatDateOnly(value: string | null | undefined): string {
  if (!value) return '—'
  const [y, m, d] = value.slice(0, 10).split('-').map(Number)
  if (!y || !m || !d) return value
  return new Date(y, m - 1, d).toLocaleDateString()
}

export function ageFromBirthday(value: string | null | undefined): number | null {
  if (!value) return null
  const [y, m, d] = value.slice(0, 10).split('-').map(Number)
  if (!y || !m || !d) return null
  const today = new Date()
  let age = today.getFullYear() - y
  const monthDiff = today.getMonth() - (m - 1)
  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < d)) age--
  return age
}
