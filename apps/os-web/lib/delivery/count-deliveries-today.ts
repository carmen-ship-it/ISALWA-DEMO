/** Local calendar day match for mounted fulfillment reads. */
export function countDeliveriesToday(deliveredAtIso: readonly string[], now = new Date()): number {
  const key = localDayKey(now);
  return deliveredAtIso.filter((iso) => localDayKey(new Date(iso)) === key).length;
}

function localDayKey(date: Date): string {
  return `${date.getFullYear()}-${date.getMonth()}-${date.getDate()}`;
}
