// PeakRNG fixtures for check.html: one row per case, [rule id, field overrides, expected match].
export const V = '2026-11-01';
export const base = { id: 'Q1', name: 'Sample Peak', elevation: 1500, prominence: 300, lat: 46, lon: 8, countries: ['Switzerland'], range: 'Pennine Alps', type: 'mountain' };

export const cases = [
  ['thousand-club', { elevation: 1000 }, true], ['thousand-club', { elevation: 999.9 }, false], ['thousand-club', { elevation: null }, false], ['thousand-club', { elevation: 0 }, false],
  ['alpine', { elevation: 3000 }, true], ['alpine', { elevation: 2999 }, false],
  ['high-giant', { elevation: 5000 }, true], ['high-giant', { elevation: 4999 }, false],
  ['seven-thousander', { elevation: 7000 }, true], ['seven-thousander', { elevation: 6999 }, false],
  ['eight-thousander', { elevation: 8000 }, true], ['eight-thousander', { elevation: 7999 }, false],
  ['low-summit', { elevation: 499 }, true], ['low-summit', { elevation: 500 }, false], ['low-summit', { elevation: null }, false], ['low-summit', { elevation: 0 }, false],
  ['prominent', { prominence: 1000 }, true], ['prominent', { prominence: 999 }, false], ['prominent', { prominence: null }, false],
  ['ultra-prominent', { prominence: 1500 }, true], ['ultra-prominent', { prominence: 1499 }, false],
  ['volcano', { type: 'volcano' }, true], ['volcano', { type: 'mountain' }, false], ['volcano', { type: undefined }, false],
  ['southern-hemisphere', { lat: -0.001 }, true], ['southern-hemisphere', { lat: 0 }, false], ['southern-hemisphere', { lat: null }, false],
  ['equatorial', { lat: 10 }, true], ['equatorial', { lat: -10 }, true], ['equatorial', { lat: 10.1 }, false], ['equatorial', { lat: null }, false],
  ['polar-reach', { lat: 60 }, true], ['polar-reach', { lat: -60 }, true], ['polar-reach', { lat: 59.9 }, false],
  ['date-line', { lon: 175 }, true], ['date-line', { lon: -175 }, true], ['date-line', { lon: 174.9 }, false],
  ['border-peak', { countries: ['A', 'B'] }, true], ['border-peak', { countries: ['A'] }, false], ['border-peak', { countries: undefined }, false],
  ['tri-border', { countries: ['A', 'B', 'C'] }, true], ['tri-border', { countries: ['A', 'B'] }, false],
  ['mount-name', { name: 'Mount Everest' }, true], ['mount-name', { name: 'Mont Blanc' }, true], ['mount-name', { name: 'Monte Rosa' }, true], ['mount-name', { name: 'Mt. Fuji' }, true],
  ['mount-name', { name: 'Montana Peak' }, false], ['mount-name', { name: 'Mountain' }, false], ['mount-name', { name: '  ' }, false], ['mount-name', { name: undefined }, false],
  ['short-name', { name: 'K2' }, true], ['short-name', { name: 'Etna' }, true], ['short-name', { name: 'Eiger' }, false], ['short-name', { name: '' }, false],
  ['long-name', { name: 'a'.repeat(20) }, true], ['long-name', { name: 'a'.repeat(19) }, false],
  ['numbered-name', { name: 'K2' }, true], ['numbered-name', { name: 'Peak 4' }, true], ['numbered-name', { name: 'Eiger' }, false],
  ['himalayan', { range: 'Himalayas' }, true], ['himalayan', { range: 'Greater Himalaya' }, true], ['himalayan', { range: 'Pennine Alps' }, false], ['himalayan', { range: null }, false],
  ['alps-peak', { range: 'Pennine Alps' }, true], ['alps-peak', { range: 'Julian Alps' }, true], ['alps-peak', { range: 'Himalayas' }, false], ['alps-peak', { range: undefined }, false],
  ['round-height', { elevation: 3000 }, true], ['round-height', { elevation: 1000 }, true], ['round-height', { elevation: 900 }, false], ['round-height', { elevation: 3010 }, false], ['round-height', { elevation: null }, false],
  ['highland', { elevation: 500 }, true], ['highland', { elevation: 999.9 }, true], ['highland', { elevation: 1000 }, false], ['highland', { elevation: 499.9 }, false], ['highland', { elevation: null }, false], ['highland', { elevation: 0 }, false],
  ['northern-hemisphere', { lat: 0.1 }, true], ['northern-hemisphere', { lat: 0 }, false], ['northern-hemisphere', { lat: -1 }, false], ['northern-hemisphere', { lat: null }, false],
  ['eastern-hemisphere', { lon: 0.1 }, true], ['eastern-hemisphere', { lon: 0 }, false], ['eastern-hemisphere', { lon: -8 }, false], ['eastern-hemisphere', { lon: null }, false],
  ['western-hemisphere', { lon: -0.1 }, true], ['western-hemisphere', { lon: 0 }, false], ['western-hemisphere', { lon: 8 }, false], ['western-hemisphere', { lon: null }, false],
];

export function poolChecks(raw, pool, ok) {
  const ms = raw.members;
  ok('place ids look like Wikidata items and ascend', ms.every((m, i) => /^Q[1-9]\d*$/.test(m.id) && (i === 0 || +m.id.slice(1) > +ms[i - 1].id.slice(1))));
  ok('every place has a name, an elevation, coordinates and a country', ms.every((m) => m.name && m.elevation >= 50 && m.elevation < 9000 && Math.abs(m.lat) <= 90 && Math.abs(m.lon) <= 180 && m.countries.length));
  ok('no place is higher than Everest (8,849 m)', ms.every((m) => m.elevation <= 8850));
  ok('prominence is positive or unknown and never exceeds the elevation', ms.every((m) => m.prominence === null || (m.prominence > 0 && m.prominence <= m.elevation + 1)));
  ok('types are mountain or volcano', ms.every((m) => m.type === 'mountain' || m.type === 'volcano'));
  ok('the pool is large enough to be a game (>= 1000)', pool.n >= 1000);
}
