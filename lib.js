/* Placefile core: zip reading, Takeout parsing and export. No dependencies, runs in browsers and Node 18+. */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else root.Placefile = factory();
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  const MAX_ENTRY_BYTES = 25 * 1024 * 1024;

  /* ---------- zip ---------- */

  async function openZip(blob) {
    const size = blob.size;
    if (size < 22) throw new Error('This doesn\'t look like a zip file. Use the .zip you downloaded from Google.');
    const tailLen = Math.min(size, 22 + 65535);
    const tail = new DataView(await blob.slice(size - tailLen, size).arrayBuffer());
    let eocd = -1;
    for (let i = tailLen - 22; i >= 0; i--) {
      if (tail.getUint32(i, true) === 0x06054b50) { eocd = i; break; }
    }
    if (eocd < 0) throw new Error('This doesn\'t look like a zip file. Use the .zip you downloaded from Google.');
    const total = tail.getUint16(eocd + 10, true);
    const cdSize = tail.getUint32(eocd + 12, true);
    const cdOff = tail.getUint32(eocd + 16, true);
    if (total === 0xffff || cdSize === 0xffffffff || cdOff === 0xffffffff) {
      throw new Error('This zip is too big to open here. Make a new export on Google Takeout with only Saved and Maps (your places) ticked.');
    }
    const cdBuf = await blob.slice(cdOff, cdOff + cdSize).arrayBuffer();
    const cd = new DataView(cdBuf);
    const bytes = new Uint8Array(cdBuf);
    const decoder = new TextDecoder('utf-8');
    const entries = [];
    let p = 0;
    while (p + 46 <= cdBuf.byteLength && cd.getUint32(p, true) === 0x02014b50) {
      const flags = cd.getUint16(p + 8, true);
      const method = cd.getUint16(p + 10, true);
      const compSize = cd.getUint32(p + 20, true);
      const rawSize = cd.getUint32(p + 24, true);
      const nameLen = cd.getUint16(p + 28, true);
      const extraLen = cd.getUint16(p + 30, true);
      const commentLen = cd.getUint16(p + 32, true);
      const offset = cd.getUint32(p + 42, true);
      const name = decoder.decode(bytes.subarray(p + 46, p + 46 + nameLen));
      entries.push({
        name,
        size: rawSize,
        dir: name.endsWith('/'),
        bytes: () => extractEntry(blob, { flags, method, compSize, offset, name }),
      });
      p += 46 + nameLen + extraLen + commentLen;
    }
    return entries;
  }

  async function extractEntry(blob, e) {
    if (e.flags & 1) throw new Error(`${e.name} is protected by a password, so it can\'t be opened here.`);
    const lh = new DataView(await blob.slice(e.offset, e.offset + 30).arrayBuffer());
    if (lh.getUint32(0, true) !== 0x04034b50) throw new Error('This zip file looks damaged. Try downloading it from Google again.');
    const start = e.offset + 30 + lh.getUint16(26, true) + lh.getUint16(28, true);
    const raw = blob.slice(start, start + e.compSize);
    if (e.method === 0) return new Uint8Array(await raw.arrayBuffer());
    if (e.method !== 8) throw new Error(`${e.name} is packed in a way this page can\'t open. Unzip the download yourself, then drop the .csv and .json files here.`);
    if (typeof DecompressionStream === 'undefined') {
      throw new Error('This browser can\'t open zip files. Unzip the download yourself, then drop the .csv and .json files here.');
    }
    const stream = raw.stream().pipeThrough(new DecompressionStream('deflate-raw'));
    return new Uint8Array(await new Response(stream).arrayBuffer());
  }

  /* ---------- csv ---------- */

  function parseCSV(text) {
    const rows = [];
    let row = [], field = '', quoted = false;
    for (let i = 0; i < text.length; i++) {
      const c = text[i];
      if (quoted) {
        if (c === '"') {
          if (text[i + 1] === '"') { field += '"'; i++; } else quoted = false;
        } else field += c;
      } else if (c === '"') quoted = true;
      else if (c === ',') { row.push(field); field = ''; }
      else if (c === '\n' || c === '\r') {
        if (c === '\r' && text[i + 1] === '\n') i++;
        row.push(field); field = '';
        rows.push(row); row = [];
      } else field += c;
    }
    if (field !== '' || row.length) { row.push(field); rows.push(row); }
    return rows.filter((r) => r.some((v) => v.trim() !== ''));
  }

  function csvCell(v) {
    const s = v == null ? '' : String(v);
    return /[",\r\n]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s;
  }

  /* ---------- places ---------- */

  function validCoords(lat, lng) {
    return Number.isFinite(lat) && Number.isFinite(lng) && Math.abs(lat) <= 90 && Math.abs(lng) <= 180 && !(lat === 0 && lng === 0);
  }

  function coordsFromUrl(url) {
    if (!url) return null;
    let u = url;
    try { u = decodeURIComponent(url); } catch (e) { /* keep raw */ }
    const num = '(-?\\d+(?:\\.\\d+)?)';
    const patterns = [
      new RegExp('!3d' + num + '!4d' + num),
      new RegExp('@' + num + ',' + num),
      new RegExp('[?&](?:q|query|ll|center)=' + num + ',\\s*' + num),
    ];
    for (const re of patterns) {
      const m = u.match(re);
      if (m) {
        const lat = parseFloat(m[1]), lng = parseFloat(m[2]);
        if (validCoords(lat, lng)) return { lat, lng };
      }
    }
    return null;
  }

  /* ---------- place type ---------- */

  // Order matters: the first matching pattern wins.
  const KIND_KEYWORDS = [
    ['Café', /caf[eé]|coffee|espresso|roaster|bakery|boulangerie|patisserie|tea ?house/i],
    ['Hotel', /hotel|hostel|\binn\b|resort|guest ?house|\bb&b\b|lodge|ryokan/i],
    ['Museum', /museum|museo|musée|museu|galler(?:y|ia)|galerie|kunsthal/i],
    ['Market', /market|mercado|marché|\bmarkt\b|bazaar|souk/i],
    ['Restaurant', /restaurant|ristorante|trattoria|pizzeri|osteria|bistro|brasserie|sushi|ramen|diner\b|grill|kitchen|taqueria|noodle|burger|steakhouse|izakaya|eatery/i],
    ['Bar', /\b(?:bar|pub|tavern|brewery|taproom|cocktails?|nightclub|club)\b|brewing/i],
    ['Beach', /\bbeach\b|playa|plage|spiaggia/i],
    ['Park', /\bpark\b|garden|jardin|nature reserve|\bforest\b|\bwoods?\b|botanic|\btrail\b/i],
    ['Shop', /\bshop\b|\bstore\b|boutique|bookshop|bookstore|supermarket|\bmall\b/i],
    ['Transport', /station|airport|\bferry\b|\bmetro\b/i],
    ['Attraction', /cathedral|church|basilica|temple|shrine|mosque|synagogue|castle|palace|\btower\b|bridge|monument|memorial|\bzoo\b|aquarium|\bfort\b|fortress|ruins|abbey|monastery|viewpoint|lookout/i],
  ];

  function guessKind(title) {
    const t = String(title || '');
    for (const [kind, re] of KIND_KEYWORDS) if (re.test(t)) return kind;
    return '';
  }

  const OSM_AMENITY = {
    cafe: 'Café', ice_cream: 'Café',
    restaurant: 'Restaurant', fast_food: 'Restaurant', food_court: 'Restaurant',
    bar: 'Bar', pub: 'Bar', biergarten: 'Bar', nightclub: 'Bar',
    marketplace: 'Market',
    place_of_worship: 'Attraction', theatre: 'Attraction', cinema: 'Attraction', arts_centre: 'Attraction', library: 'Attraction',
    bus_station: 'Transport', ferry_terminal: 'Transport',
  };
  const OSM_TOURISM = {
    museum: 'Museum', gallery: 'Museum',
    hotel: 'Hotel', hostel: 'Hotel', guest_house: 'Hotel', motel: 'Hotel', apartment: 'Hotel', camp_site: 'Hotel',
    attraction: 'Attraction', viewpoint: 'Attraction', zoo: 'Attraction', theme_park: 'Attraction', aquarium: 'Attraction', artwork: 'Attraction',
  };
  const OSM_LEISURE = { park: 'Park', garden: 'Park', nature_reserve: 'Park', playground: 'Park', beach_resort: 'Beach' };

  // Maps a Nominatim result's class and type to one of our labels, or '' when unsure.
  function kindFromOSM(category, type) {
    switch (category) {
      case 'amenity': return OSM_AMENITY[type] || '';
      case 'tourism': return OSM_TOURISM[type] || '';
      case 'leisure': return OSM_LEISURE[type] || '';
      case 'shop': return 'Shop';
      case 'historic': return 'Attraction';
      case 'natural': return type === 'beach' ? 'Beach' : 'Park';
      case 'railway': case 'aeroway': case 'public_transport': return 'Transport';
      case 'place': case 'boundary': return 'Area';
      default: return '';
    }
  }

  function makePlace(o) {
    const p = {
      list: o.list || 'Saved',
      title: (o.title || '').trim() || 'Untitled place',
      note: (o.note || '').trim(),
      comment: (o.comment || '').trim(),
      tags: (o.tags || '').trim(),
      url: (o.url || '').trim(),
      address: (o.address || '').trim(),
      lat: null,
      lng: null,
      source: null,
      matched: '',
      kind: '',
      kindSource: null,
    };
    p.kind = guessKind(p.title);
    if (p.kind) p.kindSource = 'guess';
    if (validCoords(o.lat, o.lng)) {
      p.lat = o.lat; p.lng = o.lng; p.source = 'takeout';
    } else {
      const c = coordsFromUrl(p.url);
      if (c) { p.lat = c.lat; p.lng = c.lng; p.source = 'link'; }
    }
    return p;
  }

  function placeKey(p) {
    return [p.list, p.title, p.url].join('\u0000');
  }

  function baseName(path) {
    return path.split('/').pop().replace(/\.[^.]+$/, '');
  }

  function parseListCSV(path, text) {
    const rows = parseCSV(text);
    if (rows.length < 1) return null;
    const head = rows[0].map((h) => h.trim().toLowerCase());
    const col = (n) => head.indexOf(n);
    if (col('title') < 0 || (col('url') < 0 && col('note') < 0)) return null;
    const list = baseName(path);
    const get = (r, n) => (col(n) >= 0 ? r[col(n)] || '' : '');
    return rows.slice(1).map((r) => makePlace({
      list,
      title: get(r, 'title'),
      note: get(r, 'note'),
      url: get(r, 'url'),
      tags: get(r, 'tags'),
      comment: get(r, 'comment'),
    }));
  }

  function pick(obj, ...keys) {
    if (!obj || typeof obj !== 'object') return undefined;
    for (const k of keys) if (obj[k] != null) return obj[k];
    const lower = Object.keys(obj);
    for (const k of keys) {
      const hit = lower.find((x) => x.toLowerCase() === k.toLowerCase());
      if (hit && obj[hit] != null) return obj[hit];
    }
    return undefined;
  }

  function parseGeoJSON(path, data) {
    if (!data || !Array.isArray(data.features)) return null;
    const file = baseName(path);
    const list = /^saved places$/i.test(file) ? 'Starred places' : file;
    return data.features.filter(Boolean).map((f) => {
      const props = f.properties || {};
      const loc = pick(props, 'Location', 'location') || {};
      const gc = pick(loc, 'Geo Coordinates', 'geo_coordinates') || {};
      let lat = parseFloat(pick(gc, 'Latitude', 'latitude'));
      let lng = parseFloat(pick(gc, 'Longitude', 'longitude'));
      const coords = f.geometry && Array.isArray(f.geometry.coordinates) ? f.geometry.coordinates : null;
      if (coords && validCoords(parseFloat(coords[1]), parseFloat(coords[0]))) {
        lng = parseFloat(coords[0]); lat = parseFloat(coords[1]);
      }
      return makePlace({
        list,
        title: pick(props, 'Title', 'title') || pick(loc, 'Business Name', 'name') || '',
        note: pick(props, 'Note', 'note') || '',
        comment: pick(props, 'Comment', 'comment') || '',
        url: pick(props, 'Google Maps URL', 'google_maps_url') || '',
        address: pick(loc, 'Address', 'address') || '',
        lat,
        lng,
      });
    });
  }

  function parseText(path, text) {
    if (/\.csv$/i.test(path)) return parseListCSV(path, text);
    let data;
    try { data = JSON.parse(text); } catch (e) { return null; }
    return parseGeoJSON(path, data);
  }

  async function ingestFiles(files) {
    const places = [];
    const issues = [];
    for (const file of files) {
      const name = file.name || 'file';
      try {
        if (/\.zip$/i.test(name)) {
          const entries = await openZip(file);
          let found = 0;
          for (const e of entries) {
            if (e.dir || !/\.(csv|json|geojson)$/i.test(e.name) || e.size > MAX_ENTRY_BYTES) continue;
            const got = parseText(e.name, new TextDecoder('utf-8').decode(await e.bytes()));
            if (got) { places.push(...got); found++; }
          }
          if (!found) issues.push(`${name}: no saved places found in this zip. When you made your export on Google Takeout, were Saved and Maps (your places) ticked?`);
        } else if (/\.(csv|json|geojson)$/i.test(name)) {
          const got = parseText(name, await file.text());
          if (got) places.push(...got);
          else issues.push(`${name}: this doesn't look like a file of saved places from Google.`);
        } else {
          issues.push(`${name}: this type of file can't be used. Use the .zip from Google, or the .csv and .json files inside it.`);
        }
      } catch (err) {
        issues.push(`${name}: ${err.message}`);
      }
    }
    return { places, issues };
  }

  function mergePlaces(existing, incoming) {
    const seen = new Set(existing.map(placeKey));
    const out = existing.slice();
    let added = 0;
    for (const p of incoming) {
      const k = placeKey(p);
      if (seen.has(k)) continue;
      seen.add(k); out.push(p); added++;
    }
    return { places: out, added };
  }

  /* ---------- export ---------- */

  const SOURCE_LABEL = { takeout: 'Takeout', link: 'Google Maps link', geocoded: 'OpenStreetMap lookup (approximate)' };

  const KIND_SOURCE_LABEL = { osm: 'OpenStreetMap lookup (approximate)', guess: 'Guessed from title' };

  function round(n) { return Math.round(n * 1e6) / 1e6; }

  function toCSV(places) {
    const head = ['List', 'Title', 'Note', 'Comment', 'Tags', 'Address', 'Latitude', 'Longitude', 'Coordinate source', 'Matched address', 'Type', 'Type source', 'Google Maps URL'];
    const lines = [head.map(csvCell).join(',')];
    for (const p of places) {
      lines.push([
        p.list, p.title, p.note, p.comment, p.tags, p.address,
        p.lat == null ? '' : round(p.lat), p.lng == null ? '' : round(p.lng),
        p.source ? SOURCE_LABEL[p.source] : '', p.matched,
        p.kind, p.kind ? KIND_SOURCE_LABEL[p.kindSource] : '', p.url,
      ].map(csvCell).join(','));
    }
    return '\ufeff' + lines.join('\r\n') + '\r\n';
  }

  function toGeoJSON(places) {
    const located = places.filter((p) => p.lat != null);
    return JSON.stringify({
      type: 'FeatureCollection',
      features: located.map((p) => ({
        type: 'Feature',
        geometry: { type: 'Point', coordinates: [round(p.lng), round(p.lat)] },
        properties: {
          list: p.list, title: p.title, note: p.note, comment: p.comment, tags: p.tags,
          address: p.address, place_type: p.kind || null, place_type_source: p.kind ? p.kindSource : null,
          coordinate_source: p.source, matched_address: p.matched, google_maps_url: p.url,
        },
      })),
    }, null, 2);
  }

  function xml(s) {
    return String(s == null ? '' : s)
      .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F]/g, '')
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  }

  function toKML(places) {
    const located = places.filter((p) => p.lat != null);
    const lists = [...new Set(located.map((p) => p.list))];
    const folders = lists.map((list) => {
      const marks = located.filter((p) => p.list === list).map((p) => {
        const desc = [p.kind && `Type: ${p.kind}`, p.note, p.comment, p.address, p.url].filter(Boolean).join('\n');
        return `    <Placemark>\n      <name>${xml(p.title)}</name>\n` +
          (desc ? `      <description>${xml(desc)}</description>\n` : '') +
          `      <Point><coordinates>${round(p.lng)},${round(p.lat)},0</coordinates></Point>\n    </Placemark>`;
      });
      return `  <Folder>\n    <name>${xml(list)}</name>\n${marks.join('\n')}\n  </Folder>`;
    });
    return `<?xml version="1.0" encoding="UTF-8"?>\n<kml xmlns="http://www.opengis.net/kml/2.2">\n<Document>\n  <name>Saved places</name>\n${folders.join('\n')}\n</Document>\n</kml>\n`;
  }

  return {
    openZip, parseCSV, parseListCSV, parseGeoJSON, coordsFromUrl, ingestFiles, mergePlaces,
    toCSV, toGeoJSON, toKML, placeKey, validCoords, SOURCE_LABEL, guessKind, kindFromOSM,
  };
});
