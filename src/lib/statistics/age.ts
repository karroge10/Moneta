/** Age bucket used for demographic cohorts, computed on UTC calendar dates. Under 18 has no bucket. */
export function getAgeGroup(dateOfBirth: Date | null, now: Date): string | null {
  if (!dateOfBirth) return null;
  const birth = new Date(dateOfBirth);
  const age = getUtcAge(birth, now);
  if (age >= 55) return '55+';
  if (age >= 45) return '45-54';
  if (age >= 35) return '35-44';
  if (age >= 25) return '25-34';
  if (age >= 18) return '18-24';
  return null;
}

function getUtcAge(birth: Date, now: Date): number {
  let age = now.getUTCFullYear() - birth.getUTCFullYear();
  const monthDiff = now.getUTCMonth() - birth.getUTCMonth();
  if (monthDiff < 0 || (monthDiff === 0 && now.getUTCDate() < birth.getUTCDate())) age--;
  return age;
}
