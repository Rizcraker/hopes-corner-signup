// Age ranges drive volunteering eligibility (matching Hope's Corner's age rules).
// We ask for a range rather than an exact birthday; birthday stays optional.

export type AgeRange = '14_15' | '16_17' | '18_plus'

// Parent/guardian link requirement per range:
//  - required : 14–15 must link a verified parent account; can't sign up for shifts without it
//  - optional : 16–17 may link one but can sign up regardless
//  - none     : 18+ has no parent option
export type ParentLink = 'required' | 'optional' | 'none'

interface AgeRangeMeta {
  value: AgeRange
  label: string
  short: string       // compact label for tight UI (pills, tables)
  minAge: number      // representative minimum age, used against a job's min_age gate
  minor: boolean      // under 18
  parentLink: ParentLink
}

export const AGE_RANGES: AgeRangeMeta[] = [
  { value: '14_15', label: '14–15', short: '14–15', minAge: 14, minor: true, parentLink: 'required' },
  { value: '16_17', label: '16–17', short: '16–17', minAge: 16, minor: true, parentLink: 'optional' },
  { value: '18_plus', label: '18 or older', short: '18+', minAge: 18, minor: false, parentLink: 'none' },
]

const byValue = (v: string | null | undefined) => AGE_RANGES.find(a => a.value === v)

export const ageRangeLabel = (v: string | null | undefined): string => byValue(v)?.label ?? '—'
export const ageRangeShort = (v: string | null | undefined): string => byValue(v)?.short ?? '—'
export const ageRangeMinAge = (v: string | null | undefined): number | null => byValue(v)?.minAge ?? null
export const ageRangeIsMinor = (v: string | null | undefined): boolean => byValue(v)?.minor ?? false
export const parentLinkMode = (v: string | null | undefined): ParentLink => byValue(v)?.parentLink ?? 'none'

// Is a volunteer with this age range eligible for a job requiring `jobMinAge`?
export const meetsAgeRequirement = (range: string | null | undefined, jobMinAge: number): boolean => {
  const min = ageRangeMinAge(range)
  return min === null ? false : min >= jobMinAge
}
