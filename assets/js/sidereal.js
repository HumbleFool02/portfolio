/**
 * Local sidereal time: the right ascension crossing the meridian overhead right now.
 * Greenwich mean sidereal time from the Julian date, shifted by longitude (degrees, east positive).
 */
export function localSiderealHours(date, longitudeDeg) {
  const jd = date.getTime() / 86400000 + 2440587.5;
  const gmst = 18.697374558 + 24.06570982441908 * (jd - 2451545.0);
  return (((gmst + longitudeDeg / 15) % 24) + 24) % 24;
}

const pad = (n) => String(n).padStart(2, '0');

export function formatSidereal(hours) {
  const hh = Math.floor(hours);
  const mf = (hours - hh) * 60, mm = Math.floor(mf), ss = Math.floor((mf - mm) * 60);
  return `LST ${pad(hh)}h ${pad(mm)}m ${pad(ss)}s`;
}

export function startSiderealClock(el, longitudeDeg) {
  const tick = () => { el.textContent = formatSidereal(localSiderealHours(new Date(), longitudeDeg)); };
  tick();
  return setInterval(tick, 1000);
}
