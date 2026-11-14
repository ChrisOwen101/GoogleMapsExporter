const test = require('node:test');
const assert = require('node:assert/strict');
const { execFileSync } = require('node:child_process');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const P = require('../lib.js');

test('CSV parser handles quotes, commas, newlines and CRLF', () => {
  const rows = P.parseCSV('Title,Note\r\n"Café, Bar","line1\nline2 ""x"""\r\nPlain,\r\n');
  assert.deepEqual(rows, [['Title', 'Note'], ['Café, Bar', 'line1\nline2 "x"'], ['Plain', '']]);
});

test('coordinates are read from the common Google Maps URL shapes', () => {
  assert.deepEqual(P.coordsFromUrl('https://www.google.com/maps/place/X/@41.4036,2.1744,17z'), { lat: 41.4036, lng: 2.1744 });
  assert.deepEqual(P.coordsFromUrl('https://www.google.com/maps/place/X/data=!4m2!3d-33.8568!4d151.2153'), { lat: -33.8568, lng: 151.2153 });
  assert.deepEqual(P.coordsFromUrl('https://www.google.com/maps/search/?api=1&query=51.5,-0.12'), { lat: 51.5, lng: -0.12 });
  assert.equal(P.coordsFromUrl('https://www.google.com/maps/place/X/data=!4m2!3m1!1s0x1:0x2'), null);
  assert.equal(P.coordsFromUrl('https://maps.google.com/?q=0,0'), null);
});

test('list CSV and Saved Places.json become places', () => {
  const csv = 'Title,Note,URL,Tags,Comment\nA,n,"https://www.google.com/maps/place/A/@1.5,2.5,17z",t,c\nB,,https://www.google.com/maps/place/B,,\n';
  const list = P.parseListCSV('Takeout/Saved/Want to go.csv', csv);
  assert.equal(list.length, 2);
  assert.equal(list[0].list, 'Want to go');
  assert.equal(list[0].source, 'link');
  assert.equal(list[1].lat, null);

  const geo = P.parseGeoJSON('Takeout/Maps (your places)/Saved Places.json', {
    type: 'FeatureCollection',
    features: [
      { geometry: { type: 'Point', coordinates: [13.4, 52.5] }, properties: { Title: 'Berlin', 'Google Maps URL': 'https://maps.google.com/?cid=1', Location: { Address: 'Somewhere' } } },
      { geometry: { type: 'Point', coordinates: [0, 0] }, properties: { Title: 'Nowhere', Location: { 'Geo Coordinates': { Latitude: '10.5', Longitude: '20.5' } } } },
    ],
  });
  assert.equal(geo[0].list, 'Starred places');
  assert.equal(geo[0].lat, 52.5);
  assert.equal(geo[0].address, 'Somewhere');
  assert.equal(geo[1].lat, 10.5);
});

test('reads a real deflated zip and exports all formats', async () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'pf-'));
  const saved = path.join(dir, 'Takeout', 'Saved');
  fs.mkdirSync(saved, { recursive: true });
  fs.writeFileSync(path.join(saved, 'Favourites.csv'), 'Title,Note,URL,Tags,Comment\n' +
    ('"Café <&> ""Bar""",a note,"https://www.google.com/maps/place/x/@1.5,2.5,17z",,\n').repeat(50));
  fs.writeFileSync(path.join(dir, 'Takeout', 'junk.txt'), 'ignore me');
  execFileSync('zip', ['-qr', 'takeout.zip', 'Takeout'], { cwd: dir });
  const file = new Blob([fs.readFileSync(path.join(dir, 'takeout.zip'))]);
  file.name = 'takeout.zip';
  const { places, issues } = await P.ingestFiles([file]);
  assert.deepEqual(issues, []);
  assert.equal(places.length, 50);
  assert.equal(places[0].title, 'Café <&> "Bar"');

  assert.match(P.toKML(places), /Café &lt;&amp;&gt; &quot;Bar&quot;/);
  assert.equal(JSON.parse(P.toGeoJSON(places)).features.length, 50);
  assert.equal(P.parseCSV(P.toCSV(places).replace(/^\ufeff/, '')).length, 51);
  fs.rmSync(dir, { recursive: true });
});

test('merging skips duplicates', () => {
  const a = P.parseListCSV('a.csv', 'Title,Note,URL\nX,,u\n');
  const { places, added } = P.mergePlaces(a, P.parseListCSV('a.csv', 'Title,Note,URL\nX,,u\nY,,u\n'));
  assert.equal(places.length, 2);
  assert.equal(added, 1);
});

test('place type: guessed from the title, overridden by OSM class and type', () => {
  assert.equal(P.guessKind('Café de Flore'), 'Café');
  assert.equal(P.guessKind('Kunstmuseum Basel'), 'Museum');
  assert.equal(P.guessKind('Prospect Park'), 'Park');
  assert.equal(P.guessKind('Hotel Lisboa'), 'Hotel');
  assert.equal(P.guessKind('Barcelona'), '');
  assert.equal(P.kindFromOSM('amenity', 'cafe'), 'Café');
  assert.equal(P.kindFromOSM('tourism', 'museum'), 'Museum');
  assert.equal(P.kindFromOSM('natural', 'beach'), 'Beach');
  assert.equal(P.kindFromOSM('building', 'yes'), '');

  const [p] = P.parseListCSV('a.csv', 'Title,Note,URL\nCafé Central,,u\n');
  assert.deepEqual([p.kind, p.kindSource], ['Café', 'guess']);
  const csv = P.parseCSV(P.toCSV([p]).replace(/^\ufeff/, ''));
  assert.equal(csv[1][csv[0].indexOf('Type')], 'Café');
});
