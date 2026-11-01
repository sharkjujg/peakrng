// Everything specific to PeakRNG: names, copy, card art, and which facts the result card shows. app.js is generic.
const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
const fmt = (n) => n.toLocaleString('en');
const hash = (s) => { let h = 2166136261; for (const c of s) h = Math.imul(h ^ c.charCodeAt(0), 16777619) >>> 0; return h; };
const band = (x, cuts) => cuts.find(([max]) => x < max)[1];
const unknown = 'not in Wikidata';

export default {
  key: 'peakrng',
  name: 'PeakRNG',
  pageTitle: 'PeakRNG: a daily mountain discovery game',
  noun: 'peak', nouns: 'peaks', thing: 'Peak',
  worldNote: 'every mountain on Earth',
  repo: 'https://github.com/sharkjujg/peakrng',
  headline: 'Discover a peak. Once a day.',
  intro: (n) => `Roll once to draw one mountain or volcano from a pool of <b>${fmt(n)}</b>. Every peak has the same 1-in-${fmt(n)} chance, famous or obscure. Badges explain what is unusual about it, and rarer badges earn more rarity points (RP). The daily limit resets at 00:00 UTC.`,
  notice: 'Prototype: the facts are real (from Wikidata), but there are no photos or accounts yet, and your results are saved only in this browser. <a href="#/about">What that means</a>',
  header: (m) => ({ title: m.name, sub: `${m.type === 'volcano' ? 'Volcano' : 'Mountain'} in ${m.countries.join(', ')}` }),
  label: (m) => `${m.name} (${fmt(Math.round(m.elevation))} m)`,
  shelves: (m) => [
    ...m.countries.map((c) => ['Country', c]), ...(m.range ? [['Range', m.range]] : []), ['Kind', m.type === 'volcano' ? 'Volcano' : 'Mountain'],
    ['Height', band(m.elevation, [[500, 'Under 500 m'], [1000, '500 to 999 m'], [3000, '1,000 to 2,999 m'], [5000, '3,000 to 4,999 m'], [7000, '5,000 to 6,999 m'], [Infinity, '7,000 m or more']])],
    ...(m.prominence ? [['Prominence', band(m.prominence, [[300, 'Under 300 m'], [1000, '300 to 999 m'], [Infinity, '1,000 m or more']])]] : []),
    ['Hemisphere', m.lat < 0 ? 'Southern' : 'Northern'],
    ['Latitude band', `${Math.floor(Math.abs(m.lat) / 10) * 10} to ${Math.floor(Math.abs(m.lat) / 10) * 10 + 10}° ${m.lat < 0 ? 'south' : 'north'}`],
  ],
  facts: (m) => [
    ['Elevation', `${fmt(Math.round(m.elevation))} m (${fmt(Math.round(m.elevation * 3.28084))} ft)`],
    ['Prominence', m.prominence ? `${fmt(Math.round(m.prominence))} m` : unknown],
    ['Kind', m.type === 'volcano' ? 'Volcano' : 'Mountain'], ['Countries', m.countries.join(', ')], ['Range', m.range || unknown],
    ['Coordinates', `${m.lat}°, ${m.lon}°`], ['Source', `Wikidata ${m.id}`, `https://www.wikidata.org/wiki/${m.id}`],
  ],
  art(m) { // original skyline: the peak's height follows the elevation, its color follows the name; it never affects scoring
    const h = hash(m.id), hue = h % 360, top = 70 - 52 * Math.min(1, m.elevation / 8849);
    const x = 30 + (h >>> 9) % 40, w = 34 + (h >>> 3) % 14;
    const ridge = (dx, t, c) => `<path d="M${-10 + dx} 78 L${20 + dx} ${t + 14} L${42 + dx} ${t + 24} L${62 + dx} ${t + 6} L${110 + dx} 78 Z" fill="${c}"/>`;
    const snow = `<path d="M${x - w / 6} ${top + (78 - top) * 0.22} L${x} ${top} L${x + w / 6} ${top + (78 - top) * 0.22} L${x + w / 12} ${top + (78 - top) * 0.17} L${x} ${top + (78 - top) * 0.25} L${x - w / 12} ${top + (78 - top) * 0.17} Z" fill="#f5f8ff"/>`;
    const vent = m.type === 'volcano' ? `<circle cx="${x}" cy="${top - 4}" r="3.5" fill="#d8dce6" opacity=".55"/><circle cx="${x + 4}" cy="${top - 9}" r="4.5" fill="#d8dce6" opacity=".4"/><circle cx="${x}" cy="${top + 1}" r="2" fill="#ff6a3d"/>` : '';
    return `<svg class="avatar" viewBox="0 0 100 100" role="img" aria-label="Generated skyline for the peak. Not a photograph.">
      <defs><linearGradient id="sky${h}" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="hsl(${hue} 55% 30%)"/><stop offset="1" stop-color="hsl(${(hue + 40) % 360} 60% 72%)"/></linearGradient></defs>
      <rect width="100" height="100" rx="8" fill="url(#sky${h})"/>
      ${ridge(-16, top + 12, `hsl(${hue} 20% 38%)`)}
      <path d="M-5 80 L${x - w} 80 L${x} ${top} L${x + w} 80 L105 80 Z" fill="hsl(${hue} 22% 26%)"/>${snow}${vent}
      <rect x="0" y="78" width="100" height="22" fill="hsl(${hue} 25% 14%)"/>
      <text x="50" y="93" text-anchor="middle" font-family="system-ui,sans-serif" font-size="6" letter-spacing=".6" fill="#9aa5b8">GENERATED SKYLINE</text></svg>`;
  },
  poolNotice: 'Every peak comes from <a href="https://www.wikidata.org">Wikidata</a>, whose data is released under CC0, as a snapshot. Only places with an elevation, coordinates and a country are included, and any whose documented elevations disagree by more than 2% are left out (Mount Etna, whose summit changes with eruptions, is one). The pool leans toward peaks that many Wikipedia editions cover. Odds describe this pool, not every mountain on Earth. No photographs are shown.',
  poolExtra(pool) {
    const tally = (get) => { const c = new Map(); for (const m of pool.members) for (const v of get(m)) c.set(v, (c.get(v) || 0) + 1); return [...c]; };
    const table = (title, rows) => `<table><thead><tr><th>${title}</th><th class="n">Peaks</th></tr></thead><tbody>${rows.map(([k, v]) => `<tr><td>${esc(k)}</td><td class="n">${fmt(v)}</td></tr>`).join('')}</tbody></table>`;
    const top = (rows, k) => rows.sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0])).slice(0, k);
    return `<h2>What is in the pool</h2><p class="small muted">Disclosed because a badge is only rare relative to this mix.</p>
      ${table('Kind', tally((m) => [m.type === 'volcano' ? 'Volcano' : 'Mountain']))}${table('Top countries', top(tally((m) => m.countries), 10))}${table('Top ranges', top(tally((m) => (m.range ? [m.range] : [])), 8))}`;
  },
  aboutData: `<h2>Where the facts come from</h2>
    <p>Name, elevation, topographic prominence, coordinates, countries, mountain range and kind come from <a href="https://www.wikidata.org">Wikidata</a>, whose data is released under CC0. Where Wikidata lists several elevations for one place they are used if they agree within 2% (the middle value is shown); a place whose records conflict by more than that is left out rather than guessed at, which is why a few famous volcanoes such as Mount Etna are absent. These facts are community-maintained, so a badge is only as accurate as its record. Elevations are metres above sea level as documented, not a survey of record. The artwork is a generated skyline, not a photograph.</p>`,
  terms: 'It is not affiliated with Wikimedia or any mapping agency. Badges describe documented measurements, not how hard or dangerous a climb is.',
};
