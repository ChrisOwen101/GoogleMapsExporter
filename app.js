(function () {
  'use strict';
  const PF = window.Placefile;
  const PAGE = 100;
  const $ = (id) => document.getElementById(id);

  const state = {
    places: [],
    list: null,
    kind: null,
    query: '',
    shown: PAGE,
    sample: false,
    geo: null,
    types: null,
    typeNote: '',
  };

  function el(tag, props, ...kids) {
    const n = document.createElement(tag);
    for (const [k, v] of Object.entries(props || {})) {
      if (v == null || v === false) continue;
      if (k === 'class') n.className = v;
      else if (k === 'text') n.textContent = v;
      else n.setAttribute(k, v === true ? '' : v);
    }
    for (const kid of kids) if (kid != null) n.append(kid);
    return n;
  }

  const plural = (n, one, many) => `${n.toLocaleString()} ${n === 1 ? one : many || one + 's'}`;

  /* ---------- ingest ---------- */

  async function handleFiles(fileList, { fresh = false } = {}) {
    const files = Array.from(fileList);
    if (!files.length) return;
    clearErrors();
    const { places, issues } = await PF.ingestFiles(files);
    if (!places.length) {
      showError(issues.length ? issues.join('\n') : 'We couldn\'t find any saved places in those files.');
      return;
    }
    if (fresh || state.sample) state.places = [];
    state.sample = false;
    const merged = PF.mergePlaces(state.places, places);
    state.places = merged.places;
    state.list = null;
    state.query = '';
    $('q').value = '';
    state.shown = PAGE;
    if (issues.length) showError(issues.join('\n'), 'workspace');
    save();
    enterWorkspace();
  }

  /* ---------- saved copy (this browser only) ---------- */

  const STORE_KEY = 'placefile:v1';

  function save() {
    if (state.sample) return;
    try {
      if (state.places.length) localStorage.setItem(STORE_KEY, JSON.stringify({ v: 1, places: state.places }));
      else localStorage.removeItem(STORE_KEY);
    } catch (err) {
      // Storage full or blocked: the catalogue still works for this session.
    }
  }

  function clearSaved() {
    try { localStorage.removeItem(STORE_KEY); } catch (err) { /* blocked */ }
  }

  function loadSaved() {
    try {
      const data = JSON.parse(localStorage.getItem(STORE_KEY));
      if (!data || data.v !== 1 || !Array.isArray(data.places)) return [];
      return data.places
        .filter((p) => p && typeof p.title === 'string' && typeof p.list === 'string')
        .map((p) => {
          const ok = PF.validCoords(p.lat, p.lng);
          return {
            note: '', comment: '', tags: '', url: '', address: '', matched: '', kind: '', kindSource: null,
            ...p,
            lat: ok ? p.lat : null,
            lng: ok ? p.lng : null,
            source: ok ? p.source || 'takeout' : null,
          };
        });
    } catch (err) {
      return [];
    }
  }

  function showError(msg, where) {
    const target = $(where === 'workspace' ? 'workspace-error' : 'intake-error');
    target.textContent = msg;
    target.hidden = false;
  }
  function clearErrors() {
    $('intake-error').hidden = true;
    $('workspace-error').hidden = true;
  }

  function enterWorkspace() {
    $('intake').hidden = true;
    $('workspace').hidden = false;
    document.body.classList.add('filing');
    render();
    setTimeout(() => document.body.classList.remove('filing'), 1200);
    window.scrollTo({ top: 0 });
  }

  function reset() {
    abortGeocode();
    abortTypes();
    state.typeNote = '';
    if (!state.sample) clearSaved();
    state.places = [];
    state.sample = false;
    $('workspace').hidden = true;
    $('intake').hidden = false;
    clearErrors();
    $('file').value = '';
    $('file-more').value = '';
    $('geo-status').textContent = '';
    window.scrollTo({ top: 0 });
  }

  /* ---------- derived ---------- */

  function lists() {
    const counts = new Map();
    for (const p of state.places) counts.set(p.list, (counts.get(p.list) || 0) + 1);
    return [...counts.entries()].sort((a, b) => a[0].localeCompare(b[0]));
  }

  function inScope() {
    return state.list == null ? state.places : state.places.filter((p) => p.list === state.list);
  }

  function kinds() {
    const counts = new Map();
    for (const p of inScope()) counts.set(p.kind, (counts.get(p.kind) || 0) + 1);
    const named = [...counts.entries()].filter(([k]) => k).sort((a, b) => a[0].localeCompare(b[0]));
    if (counts.get('')) named.push(['', counts.get('')]);
    return named;
  }

  function visible() {
    const q = state.query.trim().toLowerCase();
    const scope = state.kind == null ? inScope() : inScope().filter((p) => p.kind === state.kind);
    if (!q) return scope;
    return scope.filter((p) => [p.title, p.note, p.comment, p.address, p.tags].some((s) => s && s.toLowerCase().includes(q)));
  }

  /* ---------- render ---------- */

  /* ---------- map ---------- */

  const map = { inst: null, layer: null, markers: new Map() };

  function ensureMap() {
    if (map.inst || !window.L) return !!map.inst;
    map.inst = L.map('map', { preferCanvas: true, worldCopyJump: true }).setView([30, 0], 2);
    // tile.openstreetmap.org answers 403 to pages without an approved Referer (file://, localhost) and CARTO now needs a key, so use Esri's keyless street tiles.
    L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Street_Map/MapServer/tile/{z}/{y}/{x}', {
      maxZoom: 19,
      attribution: 'Tiles &copy; <a href="https://www.esri.com">Esri</a>, HERE, Garmin, &copy; OpenStreetMap contributors',
    }).addTo(map.inst);
    map.layer = L.layerGroup().addTo(map.inst);
    return true;
  }

  /* ---------- type icons ---------- */

  // 24x24 outline glyphs, drawn with currentColor.
  const ICONS = {
    'Café': '<path d="M5 8h11v5a4 4 0 0 1-4 4H9a4 4 0 0 1-4-4z"/><path d="M16 9h2a2 2 0 0 1 0 4h-2M8 3v2M12 3v2"/>',
    Restaurant: '<path d="M6 3v7M4 3v5a2 2 0 0 0 4 0V3M6 10v11"/><path d="M17 21V3c-2.5 1.5-3 5-3 8h3"/>',
    Bar: '<path d="M4 4h16l-8 9z"/><path d="M12 13v7M8 20h8"/>',
    Museum: '<path d="M3 9l9-5 9 5z"/><path d="M5 11v7M9.5 11v7M14.5 11v7M19 11v7M3 20h18"/>',
    Park: '<path d="M12 3l5 8h-3l4 6H6l4-6H7z"/><path d="M12 17v4"/>',
    Hotel: '<path d="M3 19V6M3 15h18v4M21 15v-2a3 3 0 0 0-3-3h-7v5"/><circle cx="7" cy="11.5" r="1.5"/>',
    Market: '<path d="M4 9l1.5-5h13L20 9z"/><path d="M4 9a2.7 2.7 0 0 0 5.3 0 2.7 2.7 0 0 0 5.4 0A2.7 2.7 0 0 0 20 9M5 12v8h14v-8"/>',
    Shop: '<path d="M5 8h14l-1 12H6z"/><path d="M9 8V6a3 3 0 0 1 6 0v2"/>',
    Beach: '<path d="M3 12a9 9 0 0 1 18 0z"/><path d="M12 12v6M3 21c3-2 6-2 9 0s6 2 9 0"/>',
    Transport: '<rect x="5" y="4" width="14" height="13" rx="3"/><path d="M5 11h14M8 21l2-4M16 21l-2-4"/>',
    Attraction: '<path d="M12 3l2.7 5.6 6.1.9-4.4 4.3 1 6.1L12 17l-5.4 2.9 1-6.1L3.2 9.5l6.1-.9z"/>',
    Area: '<circle cx="12" cy="12" r="9"/><path d="M3 12h18M12 3c3 3 3 15 0 18M12 3c-3 3-3 15 0 18"/>',
    '': '<circle cx="12" cy="12" r="3"/>',
  };

  const iconSvg = (kind) => `<svg viewBox="0 0 24 24" aria-hidden="true">${ICONS[kind] || ICONS['']}</svg>`;

  function popup(p) {
    const box = el('div', {}, el('span', { class: 'pop-list', text: p.kind ? `${p.list} · ${p.kind}` : p.list }), el('b', { text: p.title }));
    if (p.note) box.append(el('div', { text: p.note }));
    if (p.source === 'geocoded') box.append(el('div', { text: 'Approximate spot: found by searching for the name on OpenStreetMap.' }));
    if (/^https?:\/\//i.test(p.url)) box.append(el('a', { href: p.url, target: '_blank', rel: 'noopener', text: 'Open in Google Maps' }));
    return box;
  }

  function renderMap(fit) {
    const note = $('map-note');
    const mapEl = $('map');
    if (!window.L) {
      mapEl.classList.add('is-empty');
      note.textContent = "The map couldn't load. Check your internet connection and reload the page.";
      return;
    }
    const rows = visible();
    const located = rows.filter((p) => p.lat != null);
    mapEl.classList.toggle('is-empty', !located.length);
    note.textContent = located.length
      ? `${located.length.toLocaleString()} of ${rows.length.toLocaleString()} shown on the map.${located.length < rows.length ? ' The rest don\'t have a map location yet.' : ''}`
      : 'None of these places are on the map yet. Use "Find them on the map" below.';
    if (!located.length || !ensureMap()) return;

    map.inst.invalidateSize();
    map.layer.clearLayers();
    map.markers.clear();
    for (const p of located) {
      const approx = p.source === 'geocoded';
      const m = L.marker([p.lat, p.lng], {
        icon: L.divIcon({
          className: 'pin-wrap',
          html: `<span class="pin${approx ? ' pin-approx' : ''}">${iconSvg(p.kind)}</span>`,
          iconSize: [30, 30],
          iconAnchor: [15, 15],
          popupAnchor: [0, -14],
        }),
        title: p.kind ? `${p.title} (${p.kind})` : p.title,
        keyboard: true,
      }).bindPopup(() => popup(p));
      m.bindTooltip(p.title, { direction: 'top', offset: [0, -14] });
      m.addTo(map.layer);
      map.markers.set(p, m);
    }
    if (fit) {
      const bounds = L.latLngBounds(located.map((p) => [p.lat, p.lng]));
      map.inst.fitBounds(bounds, { padding: [30, 30], maxZoom: 14 });
    }
  }

  function showOnMap(p) {
    const m = map.markers.get(p);
    if (!m || !map.inst) return;
    $('map').scrollIntoView({ behavior: 'smooth', block: 'center' });
    map.inst.setView(m.getLatLng(), Math.max(map.inst.getZoom(), 14));
    m.openPopup();
  }

  function render() {
    renderLedger();
    renderRail();
    renderKinds();
    renderGeo();
    renderTypes();
    renderExport();
    renderCards();
    renderMap(true);
    $('sample-banner').hidden = !state.sample;
  }

  function renderLedger() {
    const total = state.places.length;
    const located = state.places.filter((p) => p.lat != null).length;
    const line = $('ledger-line');
    line.replaceChildren(
      el('b', { text: plural(total, 'place') }),
      ` in ${plural(lists().length, 'list')}. ${located.toLocaleString()} ${located === 1 ? 'is' : 'are'} on the map.`
    );
  }

  function railItem(name, count, pressed, onClick, icon) {
    const label = el('span', { class: 'tab-name', text: name, title: name });
    let lead = label;
    if (icon !== undefined) {
      const glyph = el('span', { class: 'tab-icon' });
      glyph.innerHTML = iconSvg(icon);
      lead = el('span', { class: 'tab-main' }, glyph, label);
    }
    const b = el('button', { type: 'button', class: 'tab', 'aria-pressed': String(pressed) },
      el('span', { class: 'tab-label' }, lead, el('span', { class: 'tab-count', text: count.toLocaleString() })));
    b.addEventListener('click', onClick);
    return el('li', {}, b);
  }

  function renderRail() {
    const all = [[null, 'All places', state.places.length], ...lists().map(([n, c]) => [n, n, c])];
    $('rail').replaceChildren(...all.map(([key, name, count]) => railItem(name, count, state.list === key, () => {
      state.list = key;
      state.shown = PAGE;
      render();
    })));
  }

  function renderKinds() {
    const found = kinds();
    if (state.kind != null && !found.some(([k]) => k === state.kind)) state.kind = null;
    const total = found.reduce((n, [, c]) => n + c, 0);
    const all = [[null, 'All types', total, undefined], ...found.map(([k, c]) => [k, k || 'Unknown type', c, k])];
    $('kinds').replaceChildren(...all.map(([key, name, count, icon]) => railItem(name, count, state.kind === key, () => {
      state.kind = key;
      state.shown = PAGE;
      render();
    }, icon)));
  }

  function renderExport() {
    const n = inScope().length;
    $('export-scope').textContent = state.list == null ? `Download all ${n.toLocaleString()}` : `Download ${n.toLocaleString()} from “${state.list}”`;
  }

  function renderGeo() {
    const missing = state.places.filter((p) => p.lat == null);
    const panel = $('geo');
    const running = !!state.geo;
    panel.hidden = !missing.length && !running;
    if (panel.hidden) return;
    $('geo-copy').textContent = `${plural(missing.length, 'place has', 'places have')} no spot on the map yet. Placefile can search for each one by name on OpenStreetMap, a free map service. The names (nothing else) are sent to it, about one per second, so this can take a while. Results are best guesses.`;
    $('geo-run').hidden = running;
    $('geo-cancel').hidden = !running;
    $('near').disabled = running;
  }

  function renderCards() {
    const rows = visible();
    const slice = rows.slice(0, state.shown);
    $('cards').replaceChildren(...slice.map(card));
    const empty = $('empty');
    empty.hidden = rows.length > 0;
    if (!rows.length) empty.textContent = state.query ? `Nothing matches "${state.query}".` : 'There are no places here.';
    const more = $('more');
    more.hidden = rows.length <= slice.length;
    if (!more.hidden) more.textContent = `Show ${Math.min(PAGE, rows.length - slice.length)} more (${(rows.length - slice.length).toLocaleString()} not shown yet)`;
  }

  function card(p) {
    const body = el('div', { class: 'card-body' });
    if (p.note) body.append(el('p', { class: 'note', text: p.note }));
    if (p.comment) body.append(el('p', { class: 'comment', text: p.comment }));
    if (p.address) body.append(el('p', { class: 'address', text: p.address }));

    let coords, stamp;
    if (p.lat != null) {
      coords = `${p.lat.toFixed(5)}, ${p.lng.toFixed(5)}`;
      stamp = p.source === 'geocoded' ? ['stamp-geocoded', 'Best guess'] : p.source === 'link' ? ['', 'From Google link'] : ['', 'Exact'];
    } else {
      coords = 'Not on the map';
      stamp = ['stamp-none', p.geoFailed ? 'Not found' : 'No location'];
    }
    const foot = el('div', { class: 'place-foot' },
      el('span', { class: 'list-name', text: p.list, title: p.list }),
      el('span', { class: 'stamp ' + stamp[0], text: stamp[1] }),
      p.lat != null
        ? el('button', { type: 'button', class: 'coords coords-btn', title: 'Show on map', text: coords, 'data-show': '1' })
        : el('span', { class: 'coords', text: coords }));
    foot.lastChild.__place = p;
    if (/^https?:\/\//i.test(p.url)) {
      foot.append(el('a', { class: 'place-link', href: p.url, target: '_blank', rel: 'noopener', text: 'Open in Google Maps' }));
    }
    const guess = p.kindSource === 'guess';
    const tag = el('span', {
      class: 'kind' + (guess ? ' kind-guess' : '') + (p.kind ? '' : ' kind-none'),
      text: !p.kind ? 'Type unknown' : guess ? `${p.kind} · guessed` : p.kind,
      title: !p.kind ? 'We haven\'t found a type yet'
        : guess ? 'Guessed from the place\'s name'
        : `From OpenStreetMap${p.kindMatched ? ': ' + p.kindMatched : ''} (best guess)`,
    });
    const li = el('li', { class: 'card place' },
      el('div', { class: 'place-head' }, el('h2', { class: 'place-title', text: p.title }), tag),
      body);
    if (p.matched) li.append(el('p', { class: 'matched', text: `Found as: ${p.matched}` }));
    li.append(foot);
    return li;
  }

  /* ---------- export ---------- */

  function download(fmt) {
    const rows = inScope();
    const stamp = new Date().toISOString().slice(0, 10);
    const slug = (state.list || 'all-places').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'places';
    const specs = {
      csv: [PF.toCSV(rows), 'text/csv;charset=utf-8', 'csv'],
      geojson: [PF.toGeoJSON(rows), 'application/geo+json', 'geojson'],
      kml: [PF.toKML(rows), 'application/vnd.google-earth.kml+xml', 'kml'],
    };
    const [data, type, ext] = specs[fmt];
    const url = URL.createObjectURL(new Blob([data], { type }));
    const a = el('a', { href: url, download: `placefile-${slug}-${stamp}.${ext}` });
    document.body.append(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);

    const skipped = fmt === 'csv' ? 0 : rows.filter((p) => p.lat == null).length;
    $('workspace-error').hidden = !skipped;
    if (skipped) {
      $('workspace-error').textContent = `${plural(skipped, 'place')} ${skipped === 1 ? 'was' : 'were'} left out of the ${ext.toUpperCase()} file because ${skipped === 1 ? 'it has' : 'they have'} no spot on the map. The spreadsheet (CSV) includes every place.`;
    }
  }

  /* ---------- geocoding ---------- */

  const sleep = (ms, signal) => new Promise((res, rej) => {
    const t = setTimeout(res, ms);
    signal.addEventListener('abort', () => { clearTimeout(t); rej(new DOMException('Aborted', 'AbortError')); }, { once: true });
  });

  // Nominatim allows about one request a second, across every lookup we make.
  let lastRequest = 0;
  async function pace(signal) {
    const wait = lastRequest + 1300 - Date.now();
    lastRequest = Date.now() + Math.max(wait, 0);
    if (wait > 0) await sleep(wait, signal);
  }

  const BACKOFF = [5000, 15000, 30000];
  let notify = () => {};

  async function nominatimSearch(params, signal) {
    for (let attempt = 0; ; attempt++) {
      await pace(signal);
      let res = null;
      try {
        res = await fetch('https://nominatim.openstreetmap.org/search?format=jsonv2&accept-language=en&' + params, { signal, headers: { Accept: 'application/json' } });
      } catch (err) {
        if (err.name === 'AbortError') throw err;
        // Nominatim's 429 and 403 replies carry no CORS headers, so the browser reports them as a network error.
      }
      if (res && res.ok) return res.json();
      if (res && res.status !== 429 && res.status !== 403) throw new Error('http');
      if (attempt >= BACKOFF.length) throw new Error('refused');
      notify(`OpenStreetMap is asking us to slow down. Waiting ${BACKOFF[attempt] / 1000} seconds, then trying again.`);
      await sleep(BACKOFF[attempt], signal);
    }
  }

  function failureNote(err, done, total, found, what) {
    if (err.name === 'AbortError') return `Stopped after checking ${done} of ${total}. ${what} ${found}.`;
    if (err.message === 'refused') return `OpenStreetMap stopped answering after ${done} of ${total}, probably because we asked too often. Your progress is saved. Wait a few minutes, then try again to carry on.`;
    return `Something went wrong after ${done} of ${total}. Your progress is saved. Try again in a moment.`;
  }

  async function lookup(query, signal) {
    const hits = await nominatimSearch('limit=1&q=' + encodeURIComponent(query), signal);
    if (!hits.length) return null;
    const lat = parseFloat(hits[0].lat), lng = parseFloat(hits[0].lon);
    const kind = PF.kindFromOSM(hits[0].category, hits[0].type);
    return PF.validCoords(lat, lng) ? { lat, lng, matched: hits[0].display_name, kind } : null;
  }

  function abortGeocode() {
    if (state.geo) state.geo.abort.abort();
  }

  async function runGeocode() {
    const targets = state.places.filter((p) => p.lat == null);
    if (!targets.length) return;
    const near = $('near').value.trim();
    const abort = new AbortController();
    state.geo = { abort };
    const progress = $('geo-progress');
    const status = $('geo-status');
    notify = (m) => { status.textContent = m; };
    progress.max = targets.length;
    progress.value = 0;
    progress.hidden = false;
    renderGeo();

    const cache = new Map();
    let found = 0, done = 0, note = '';
    try {
      for (const p of targets) {
        const q = near ? `${p.title}, ${near}` : p.title;
        let hit;
        if (cache.has(q)) hit = cache.get(q);
        else {
          hit = await lookup(q, abort.signal);
          cache.set(q, hit);
        }
        p.geoFailed = !hit;
        if (hit) {
          p.lat = hit.lat; p.lng = hit.lng; p.source = 'geocoded'; p.matched = hit.matched;
          if (hit.kind) { p.kind = hit.kind; p.kindSource = 'osm'; }
          found++;
        }
        done++;
        progress.value = done;
        status.textContent = `Checked ${done} of ${targets.length}. Found ${found}.`;
        if (done % 5 === 0) { renderLedger(); renderCards(); renderMap(false); save(); }
      }
      note = `Done. Found ${found} of ${targets.length}. These are best guesses, so check the "Found as" line on each place.`;
    } catch (err) {
      note = failureNote(err, done, targets.length, found, 'Found');
    }
    notify = () => {};
    state.geo = null;
    progress.hidden = true;
    save();
    render();
    $('geo-status').textContent = note;
  }

  /* ---------- place types ---------- */

  const box = (p, d) => `${p.lng - d},${p.lat + d},${p.lng + d},${p.lat - d}`;

  const words = (s) => String(s).normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().split(/[^a-z0-9]+/).filter((w) => w.length >= 3);

  // Rejects nearby features that merely mention the title in their address.
  function namesMatch(title, hit) {
    const wanted = words(title);
    if (!wanted.length) return true;
    const pool = new Set([hit.name, ...Object.values(hit.namedetails || {})].filter(Boolean).flatMap(words));
    return wanted.filter((w) => pool.has(w)).length * 2 >= wanted.length;
  }

  function km(p, hit) {
    const rad = Math.PI / 180;
    const dLat = (hit.lat - p.lat) * rad, dLng = (hit.lon - p.lng) * rad;
    const a = Math.sin(dLat / 2) ** 2 + Math.cos(p.lat * rad) * Math.cos(hit.lat * rad) * Math.sin(dLng / 2) ** 2;
    return 12742 * Math.asin(Math.sqrt(a));
  }

  function firstKind(hits, p, maxKm) {
    for (const h of hits) {
      if (!namesMatch(p.title, h)) continue;
      if (maxKm != null && p.lat != null && km(p, h) > maxKm) continue;
      const kind = PF.kindFromOSM(h.category, h.type);
      if (kind) return { kind, matched: h.display_name };
    }
    return null;
  }

  // With coordinates: the best-ranked match within 50 km, then a title search inside a ~2 km box. Without: search the title alone.
  async function findKind(p, near, signal) {
    const q = 'limit=5&namedetails=1&q=' + encodeURIComponent(p.title);
    if (p.lat == null) return firstKind(await nominatimSearch(near ? q + encodeURIComponent(', ' + near) : q, signal), p);
    const ranked = firstKind(await nominatimSearch(q, signal), p, 50);
    if (ranked) return ranked;
    return firstKind(await nominatimSearch(`${q}&bounded=1&viewbox=${box(p, 0.02)}`, signal), p);
  }

  function abortTypes() {
    if (state.types) state.types.abort.abort();
  }

  async function runTypes() {
    const pending = state.places.filter((p) => p.kindSource !== 'osm');
    const untried = pending.filter((p) => !p.kindTried);
    const targets = untried.length ? untried : pending;
    if (!targets.length) return;
    const near = $('near').value.trim();
    const abort = new AbortController();
    state.types = { abort };
    const progress = $('types-progress');
    const status = $('types-status');
    notify = (m) => { status.textContent = m; };
    progress.max = targets.length;
    progress.value = 0;
    progress.hidden = false;
    status.textContent = '';
    state.typeNote = '';
    renderTypes();

    const cache = new Map();
    let found = 0, done = 0, note = '';
    try {
      for (const p of targets) {
        const key = [p.title, p.lat, p.lng].join('\u0000');
        let hit;
        if (cache.has(key)) hit = cache.get(key);
        else { hit = await findKind(p, near, abort.signal); cache.set(key, hit); }
        p.kindTried = true;
        if (hit) { p.kind = hit.kind; p.kindSource = 'osm'; p.kindMatched = hit.matched; found++; }
        done++;
        progress.value = done;
        status.textContent = `Checked ${done} of ${targets.length}. Found ${found}.`;
        if (done % 5 === 0) { renderKinds(); renderCards(); renderMap(false); save(); }
      }
      const left = done - found;
      note = `Done. Found the type for ${found} of ${targets.length}.` + (left ? ` ${plural(left, 'place')} couldn\'t be matched, so ${left === 1 ? 'it keeps its' : 'they keep their'} guessed type.` : '');
    } catch (err) {
      note = failureNote(err, done, targets.length, found, 'Found');
    }
    notify = () => {};
    state.types = null;
    state.typeNote = note;
    progress.hidden = true;
    save();
    render();
  }

  function renderTypes() {
    const pending = state.places.filter((p) => p.kindSource !== 'osm');
    const fresh = pending.filter((p) => !p.kindTried).length;
    const running = !!state.types;
    const panel = $('types');
    panel.hidden = !running && !fresh && !state.typeNote;
    if (panel.hidden) return;
    $('types-copy').textContent = fresh
      ? `${plural(fresh, 'place has', 'places have')} no confirmed type (like café or museum). Placefile can search for each one on OpenStreetMap, a free map service. The names (nothing else) are sent to it, about one per second. Results are best guesses.`
      : 'Types come from OpenStreetMap and are best guesses.';
    if (!running) $('types-status').textContent = state.typeNote;
    $('types-run').hidden = running || !pending.length;
    $('types-run').textContent = fresh ? 'Find types' : 'Try again';
    $('types-cancel').hidden = !running;
  }

  /* ---------- sample ---------- */

  function loadSample() {
    const q = (s) => '"' + s + '"';
    const csv = (rows) => 'Title,Note,URL,Tags,Comment\n' + rows.map((r) => r.map((c, i) => (i === 2 ? q(c) : /[,"]/.test(c) ? q(c.replace(/"/g, '""')) : c)).join(',')).join('\n');
    const m = (name, ll) => `https://www.google.com/maps/place/${encodeURIComponent(name).replace(/%20/g, '+')}${ll ? '/@' + ll + ',17z' : ''}`;
    const wantToGo = csv([
      ['Sagrada Família', 'Book the tower tickets ahead', m('Sagrada Família', '41.4036,2.1744'), '', ''],
      ['Time Out Market Lisboa', 'Go hungry', m('Time Out Market Lisboa'), '', 'Lunch, not dinner'],
      ['Borough Market', '', m('Borough Market', '51.5055,-0.0910'), '', ''],
      ['Tsukiji Outer Market', 'Early morning', m('Tsukiji Outer Market'), '', ''],
      ['Kunstmuseum Basel', '', m('Kunstmuseum Basel'), '', ''],
    ]);
    const favourites = csv([
      ['Prospect Park', 'Sunday loop', m('Prospect Park', '40.6602,-73.9690'), '', ''],
      ['Rijksmuseum', '', m('Rijksmuseum', '52.3600,4.8852'), '', 'Night Watch room first'],
      ['Café de Flore', '', m('Café de Flore'), '', ''],
    ]);
    const starred = {
      type: 'FeatureCollection',
      features: [
        { type: 'Feature', geometry: { type: 'Point', coordinates: [-0.1276, 51.5072] }, properties: { Title: 'London', 'Google Maps URL': 'https://www.google.com/maps/place/London', Location: { Address: 'London, United Kingdom' } } },
        { type: 'Feature', geometry: { type: 'Point', coordinates: [139.6917, 35.6895] }, properties: { Title: 'Tokyo', 'Google Maps URL': 'https://www.google.com/maps/place/Tokyo', Location: { Address: 'Tokyo, Japan' } } },
      ],
    };
    const mk = (name, text) => new File([text], name, { type: 'text/plain' });
    handleFiles([
      mk('Want to go.csv', wantToGo),
      mk('Favourites.csv', favourites),
      mk('Saved Places.json', JSON.stringify(starred)),
    ], { fresh: true }).then(() => { state.sample = true; $('sample-banner').hidden = false; });
  }

  /* ---------- wiring ---------- */

  $('file').addEventListener('change', (e) => { handleFiles(e.target.files, { fresh: true }); e.target.value = ''; });
  $('file-more').addEventListener('change', (e) => { handleFiles(e.target.files); e.target.value = ''; });
  $('sample').addEventListener('click', loadSample);
  $('reset').addEventListener('click', reset);
  $('q').addEventListener('input', (e) => { state.query = e.target.value; state.shown = PAGE; renderCards(); renderMap(true); });
  $('cards').addEventListener('click', (e) => {
    const b = e.target.closest('.coords-btn');
    if (b) showOnMap(b.__place);
  });
  $('more').addEventListener('click', () => { state.shown += PAGE; renderCards(); });
  $('geo-run').addEventListener('click', runGeocode);
  $('geo-cancel').addEventListener('click', abortGeocode);
  $('types-run').addEventListener('click', runTypes);
  $('types-cancel').addEventListener('click', abortTypes);
  document.querySelector('.export').addEventListener('click', (e) => {
    const b = e.target.closest('button[data-fmt]');
    if (b) download(b.dataset.fmt);
  });

  const drop = $('drop');
  let depth = 0;
  const hasFiles = (e) => e.dataTransfer && Array.from(e.dataTransfer.types || []).includes('Files');
  window.addEventListener('dragenter', (e) => {
    if (!hasFiles(e)) return;
    depth++;
    if ($('intake').hidden) document.body.classList.add('dragging'); else drop.classList.add('is-over');
  });
  window.addEventListener('dragleave', (e) => {
    if (!hasFiles(e)) return;
    depth = Math.max(0, depth - 1);
    if (!depth) { document.body.classList.remove('dragging'); drop.classList.remove('is-over'); }
  });
  window.addEventListener('dragover', (e) => { if (hasFiles(e)) e.preventDefault(); });
  window.addEventListener('drop', (e) => {
    if (!hasFiles(e)) return;
    e.preventDefault();
    depth = 0;
    document.body.classList.remove('dragging');
    drop.classList.remove('is-over');
    handleFiles(e.dataTransfer.files, { fresh: !$('intake').hidden });
  });

  const saved = loadSaved();
  if (saved.length) {
    state.places = saved;
    enterWorkspace();
  }
})();
