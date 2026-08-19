export function addMinutes(date: Date, minutes: number) {
  return new Date(date.getTime() + minutes * 60_000);
}

export function addHours(date: Date, hours: number) {
  return addMinutes(date, hours * 60);
}

export function addDays(date: Date, days: number) {
  return addHours(date, days * 24);
}
