const frequencies = ['WEEKLY', 'FORTNIGHTLY', 'MONTHLY', 'QUARTERLY', 'YEARLY'];

function validDate(value) {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const date = new Date(`${value}T00:00:00Z`);
  return (
    !Number.isNaN(date.getTime()) &&
    date.toISOString().slice(0, 10) === value &&
    value >= '2000-01-01' &&
    value <= '2100-12-31'
  );
}

function dueDates(schedule, from, to) {
  const anchor = new Date(`${schedule.start_date}T00:00:00Z`);
  const dates = [];
  const last = schedule.end_date && schedule.end_date < to ? schedule.end_date : to;
  for (let index = 0; ; index++) {
    let date;
    if (['WEEKLY', 'FORTNIGHTLY'].includes(schedule.frequency)) {
      date = new Date(
        anchor.getTime() + index * (schedule.frequency === 'WEEKLY' ? 7 : 14) * 86400000
      );
    } else {
      const months = { MONTHLY: 1, QUARTERLY: 3, YEARLY: 12 }[schedule.frequency];
      if (!months) throw new Error('Invalid payment frequency');
      const target = new Date(
        Date.UTC(anchor.getUTCFullYear(), anchor.getUTCMonth() + index * months, 1)
      );
      const finalDay = new Date(
        Date.UTC(target.getUTCFullYear(), target.getUTCMonth() + 1, 0)
      ).getUTCDate();
      date = new Date(
        Date.UTC(
          target.getUTCFullYear(),
          target.getUTCMonth(),
          Math.min(anchor.getUTCDate(), finalDay)
        )
      );
    }
    const iso = date.toISOString().slice(0, 10);
    if (iso > last) break;
    if (iso >= from) dates.push(iso);
  }
  return dates;
}

module.exports = { frequencies, validDate, dueDates };
