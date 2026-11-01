// PeakRNG badge rules. Each rule is a deterministic predicate over known fields: a value Wikidata does not have never matches.
// test(m, poolDate) and evidence(m, poolDate) read the prepared member from prep().

export const norm = (s) => s.normalize('NFKC').toLowerCase();

const pos = (x) => (typeof x === 'number' && Number.isFinite(x) && x > 0 ? x : null); // zero or absent is unknown, never a real value
const num = (x) => (typeof x === 'number' && Number.isFinite(x) ? x : null);
const chars = (s) => Array.from(s);
const m1 = (x) => `${Math.round(x).toLocaleString('en')} m`;

export function prep(raw) {
  const name = typeof raw.name === 'string' && raw.name.trim() ? raw.name.trim() : null;
  return {
    ...raw,
    n: name ? norm(name) : null,
    elevation: pos(raw.elevation), prominence: pos(raw.prominence), lat: num(raw.lat), lon: num(raw.lon),
    countries: Array.isArray(raw.countries) ? raw.countries : [],
    ranged: typeof raw.range === 'string' && raw.range ? norm(raw.range) : null, // mountain range, normalized
    volcano: raw.type === 'volcano',
  };
}

const high = (m) => `${m.name} rises ${m1(m.elevation)} above sea level`;
const prom = (m) => `${m.name} has a prominence of ${m1(m.prominence)}`;
const lat = (m) => `${m.name} is at latitude ${m.lat}°`;
const bord = (m) => `${m.name} lies in ${m.countries.length} countries: ${m.countries.join(', ')}`;
const nm = (m) => `"${m.name}" has ${chars(m.name).length} characters`;

export const RULES = [
  { id: 'thousand-club', name: 'Thousand Club', family: 'Height', rule: 'Elevation of 1,000 m or more', test: (m) => m.elevation !== null && m.elevation >= 1000, evidence: high },
  { id: 'alpine', name: 'Alpine Height', family: 'Height', rule: 'Elevation of 3,000 m or more', test: (m) => m.elevation !== null && m.elevation >= 3000, evidence: high },
  { id: 'high-giant', name: 'High Giant', family: 'Height', rule: 'Elevation of 5,000 m or more', test: (m) => m.elevation !== null && m.elevation >= 5000, evidence: high },
  { id: 'seven-thousander', name: 'Seven-Thousander', family: 'Height', rule: 'Elevation of 7,000 m or more', test: (m) => m.elevation !== null && m.elevation >= 7000, evidence: high },
  { id: 'eight-thousander', name: 'Eight-Thousander', family: 'Height', rule: 'Elevation of 8,000 m or more', test: (m) => m.elevation !== null && m.elevation >= 8000, evidence: high },
  { id: 'low-summit', name: 'Low Summit', family: 'Low', rule: 'Elevation under 500 m', test: (m) => m.elevation !== null && m.elevation < 500, evidence: high },
  { id: 'prominent', name: 'Prominent', family: 'Prominence', rule: 'Topographic prominence of 1,000 m or more', test: (m) => m.prominence !== null && m.prominence >= 1000, evidence: prom },
  { id: 'ultra-prominent', name: 'Ultra-Prominent', family: 'Prominence', rule: 'Topographic prominence of 1,500 m or more', test: (m) => m.prominence !== null && m.prominence >= 1500, evidence: prom },
  { id: 'volcano', name: 'Volcano', family: 'Volcano', rule: 'Typed as a volcano, stratovolcano or shield volcano', test: (m) => m.volcano, evidence: (m) => `${m.name} is a ${m.type}` },
  { id: 'southern-hemisphere', name: 'Southern Hemisphere', family: 'Hemisphere', rule: 'South of the equator', test: (m) => m.lat !== null && m.lat < 0, evidence: lat },
  { id: 'equatorial', name: 'Equatorial', family: 'Latitude', rule: 'Within 10 degrees of the equator', test: (m) => m.lat !== null && Math.abs(m.lat) <= 10, evidence: lat },
  { id: 'polar-reach', name: 'Polar Reach', family: 'Latitude', rule: 'At 60 degrees latitude or beyond', test: (m) => m.lat !== null && Math.abs(m.lat) >= 60, evidence: lat },
  { id: 'date-line', name: 'Date Line', family: 'Longitude', rule: 'Within 5 degrees of the 180th meridian', test: (m) => m.lon !== null && Math.abs(m.lon) >= 175, evidence: (m) => `${m.name} is at longitude ${m.lon}°` },
  { id: 'border-peak', name: 'Border Peak', family: 'Borders', rule: 'Listed in two or more countries', test: (m) => m.countries.length >= 2, evidence: bord },
  { id: 'tri-border', name: 'Tri-Border', family: 'Borders', rule: 'Listed in three or more countries', test: (m) => m.countries.length >= 3, evidence: bord },
  { id: 'mount-name', name: 'Mount Name', family: 'Name form', rule: 'Name starts with Mount, Mont, Monte or Mt',
    test: (m) => m.n !== null && /^(mount|mont|monte|mt\.?)\s/.test(m.n), evidence: (m) => `"${m.name}" starts with a mount word` },
  { id: 'short-name', name: 'Short Name', family: 'Name length', rule: 'Name of 4 characters or fewer', test: (m) => m.n !== null && chars(m.n).length <= 4, evidence: nm },
  { id: 'long-name', name: 'Long Name', family: 'Name length', rule: 'Name of 20 characters or more', test: (m) => m.n !== null && chars(m.n).length >= 20, evidence: nm },
  { id: 'numbered-name', name: 'Numbered Name', family: 'Name digits', rule: 'Name contains a digit 0-9', test: (m) => m.n !== null && /[0-9]/.test(m.n), evidence: (m) => `"${m.name}" contains a digit` },
  { id: 'himalayan', name: 'Himalayan', family: 'Famous range', rule: 'Listed in a range whose name contains "Himalaya"', test: (m) => m.ranged !== null && m.ranged.includes('himalaya'), evidence: (m) => `${m.name} belongs to the ${m.range}` },
  { id: 'alps-peak', name: 'Alps Peak', family: 'Famous range', rule: 'Listed in a range whose name contains "Alps"', test: (m) => m.ranged !== null && m.ranged.includes('alps'), evidence: (m) => `${m.name} belongs to the ${m.range}` },
  { id: 'round-height', name: 'Round Height', family: 'Number pattern', rule: 'Elevation of 1,000 m or more that is a whole multiple of 100 m',
    test: (m) => m.elevation !== null && m.elevation >= 1000 && m.elevation % 100 === 0, evidence: high },
];
