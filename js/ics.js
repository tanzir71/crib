// Calendar reminders built on the device: there is no server to send push notifications.
const pad = n => String(n).padStart(2, '0');
const utc = ts => { const d = new Date(ts); return `${d.getUTCFullYear()}${pad(d.getUTCMonth() + 1)}${pad(d.getUTCDate())}T${pad(d.getUTCHours())}${pad(d.getUTCMinutes())}00Z`; };
const escText = s => s.replace(/[\\,;]/g, m => '\\' + m).replace(/\n/g, '\\n');

/** events: [{title, at, minutes, desc}] */
export function buildICS(events, url) {
  const now = utc(Date.now());
  const lines = ['BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//Crib//Recall plan//EN', 'CALSCALE:GREGORIAN', 'METHOD:PUBLISH'];
  events.forEach((e, i) => {
    lines.push('BEGIN:VEVENT',
      `UID:crib-${e.at}-${i}@crib`,
      `DTSTAMP:${now}`,
      `DTSTART:${utc(e.at)}`,
      `DTEND:${utc(e.at + (e.minutes || 10) * 60000)}`,
      `SUMMARY:${escText(e.title)}`,
      `DESCRIPTION:${escText((e.desc || '') + (url ? `\nOpen Crib: ${url}` : ''))}`,
      url ? `URL:${url}` : '',
      'BEGIN:VALARM', 'ACTION:DISPLAY', `DESCRIPTION:${escText(e.title)}`, 'TRIGGER:-PT0M', 'END:VALARM',
      'END:VEVENT');
  });
  lines.push('END:VCALENDAR');
  return lines.filter(Boolean).join('\r\n');
}
