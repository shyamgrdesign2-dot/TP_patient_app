// Age from a date of birth, and a date of birth from an age. Profiles may be
// created with an age only (as in Tatva Practice): the date of birth is then
// derived and flagged with `dobFromAge`, so the age keeps counting up.
export const GENDERS = ["Male", "Female", "Other"];
export const RELATIONS = [
  "Father",
  "Mother",
  "Spouse",
  "Son",
  "Daughter",
  "Brother",
  "Sister",
  "Grandfather",
  "Grandmother",
  "Other",
];
// Relations that can only be an adult; a child's age here is a data mistake.
export const ADULT_RELATIONS = [
  "Father",
  "Mother",
  "Spouse",
  "Grandfather",
  "Grandmother",
];
export const MIN_ADULT_YEARS = 12;
export const MAX_AGE_YEARS = 120;

const key = (d) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;

// { years, months, totalMonths, days } or null for a missing/future date.
export function ageParts(dob, now = new Date()) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(dob || "")) return null;
  const born = new Date(`${dob}T00:00:00`);
  if (Number.isNaN(+born) || born > now) return null;
  let totalMonths =
    (now.getFullYear() - born.getFullYear()) * 12 +
    now.getMonth() -
    born.getMonth();
  if (now.getDate() < born.getDate()) totalMonths -= 1;
  totalMonths = Math.max(0, totalMonths);
  return {
    years: Math.floor(totalMonths / 12),
    months: totalMonths % 12,
    totalMonths,
    days: Math.floor((now - born) / 86400000),
  };
}

const plural = (n, one, many) => `${n} ${n === 1 ? one : many}`;

// "32 yrs", "1 yr 4 mos", "7 months", "12 days". Empty when the age is
// unknown or impossible for the relation, so a parent never reads "0 yrs".
export function ageLabel(member, now = new Date()) {
  const age = ageParts(member?.dob, now);
  if (!age) return "";
  if (
    age.years < MIN_ADULT_YEARS &&
    ADULT_RELATIONS.includes(member.relation)
  )
    return "";
  if (age.years >= 2) return `${age.years} yrs`;
  if (age.years === 1)
    return age.months ? `1 yr ${plural(age.months, "mo", "mos")}` : "1 yr";
  if (age.totalMonths >= 1) return plural(age.totalMonths, "month", "months");
  return age.days < 1 ? "Newborn" : plural(age.days, "day", "days");
}

// Today minus the given age, as a date key.
export function dobFromAge(years = 0, months = 0, now = new Date()) {
  const d = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 12);
  d.setMonth(d.getMonth() - (Number(years) || 0) * 12 - (Number(months) || 0));
  return key(d);
}

// Age and gender for a profile, as separate parts for a meta line.
export const memberMeta = (member) =>
  [ageLabel(member), GENDERS.includes(member?.gender) && member.gender].filter(
    Boolean,
  );

// Shared profile rules for onboarding and family profiles. Returns the first
// problem as a message, or "" when the profile can be saved.
export function profileProblem(profile, { relation = true } = {}) {
  if (!profile.name?.trim()) return "Enter the full name.";
  if (relation && !profile.relation?.trim())
    return "Select the relationship.";
  const age = ageParts(profile.dob);
  if (!profile.dob)
    return "Enter a date of birth or an age. Either one is enough.";
  if (!age || age.years > MAX_AGE_YEARS)
    return "Enter a valid date of birth or age.";
  if (
    age.years < MIN_ADULT_YEARS &&
    ADULT_RELATIONS.includes(profile.relation)
  )
    return `Check the ${profile.dobFromAge ? "age" : "date of birth"}. It looks too young for a ${profile.relation.toLowerCase()}.`;
  if (!GENDERS.includes(profile.gender)) return "Select a gender.";
  if (!/^[6-9]\d{9}$/.test(profile.phone || ""))
    return "Enter a valid 10-digit mobile number.";
  return "";
}
