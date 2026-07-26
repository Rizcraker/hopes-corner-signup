// Helper: turns a day number into its ordinal form (1st, 2nd, 3rd, 4th...)
export const getOrdinalDay = (day: number) => {
  const suffixes = ['th', 'st', 'nd', 'rd']
  const remainder = day % 100
  return day + (suffixes[(remainder - 20) % 10] || suffixes[remainder] || suffixes[0])
}
