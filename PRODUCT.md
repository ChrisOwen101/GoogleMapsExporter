# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Stack
Plain static HTML/CSS/JS, no build step; opens from index.html. Confirmed by the user.

## Users
Anyone who has saved places in Google Maps (lists such as Favourites, Want to go, custom lists; starred and labelled places) and wants them out as portable files, usually to move to another map app, keep a backup, or analyse them in a spreadsheet. Audience and name were left open by the user (general public).

## Product Purpose
Takes a Google Takeout export (the zip, or the loose CSV/JSON files inside it) and turns it into one clean dataset of saved places. Everything is parsed in the browser; nothing is uploaded. It then exports CSV, GeoJSON, or KML. Success: someone with a Takeout zip gets a usable file of every saved place in under a minute.

## Positioning
Google offers the raw export but no tool to make it usable. This site reads the Takeout archive locally, merges the per-list CSVs and Saved Places.json into one table, and fills in missing coordinates, with no account and no upload.

## Operating Context
Takeout has to be requested at takeout.google.com (select "Saved" and "Maps (your places)"). The site cannot fetch the user's data itself, so it guides them through the Takeout request and then accepts the files. Each Saved list is its own CSV (title, note, URL, comment); Saved Places.json holds starred and labelled places with coordinates.

## Capabilities and Constraints
- Accepts the Takeout .zip or individual .csv/.json files, parsed client-side.
- List CSVs contain no coordinates or addresses. Optional geocoding goes through OpenStreetMap Nominatim (free, no key, by title; must respect its ~1 request/second policy). Results can be wrong for closed or renamed venues, so rows geocoded this way are flagged as approximate.
- Where a CSV Google Maps URL contains coordinates, use them directly.
- Exports: CSV, GeoJSON, KML.
- No Google Places API key support (decided against).

## Evidence on Hand
No real user data, testimonials, or metrics exist. Do not fabricate any. Demonstration data must be labelled as sample.

## Product Principles
- Privacy is a mechanism, not a claim: files never leave the browser, and the interface shows that.
- Be honest about what Takeout does and does not contain; flag approximate coordinates.
- The user's own data is the interface; show it quickly.
- Fewest steps from zip to file.

## Accessibility & Inclusion
Keyboard-operable file drop and controls; WCAG AA contrast; works on mobile for reviewing and downloading.
