---
name: Placefile
description: Saved Google Maps places filed as index cards in a green-ground catalogue room, with brass hardware and red rubber stamps.
colors:
  catalogue-green: "#34503f"
  catalogue-green-deep: "#2a4132"
  ground-line: "rgba(255, 255, 255, 0.18)"
  on-ground: "#ffffff"
  on-ground-soft: "#cddcd2"
  brass: "#c8a24c"
  brass-bright: "#dbb961"
  brass-dark: "#8a6a1f"
  index-card: "#fdfdfb"
  pale-blue-rule: "#bcd0e6"
  red-line: "#c9453d"
  typewriter-ink: "#1e2128"
  typewriter-ink-soft: "#4a505c"
  stamp-red: "#b3261e"
  focus-yellow: "#ffd978"
typography:
  display:
    fontFamily: "Courier Prime, Courier New, Courier, monospace"
    fontSize: "2.75rem"
    fontWeight: 700
    lineHeight: 1.1
    letterSpacing: "-0.04em"
  title:
    fontFamily: "Courier Prime, Courier New, Courier, monospace"
    fontSize: "0.9375rem"
    fontWeight: 700
    lineHeight: "24px"
  body:
    fontFamily: "Archivo, system-ui, -apple-system, Segoe UI, sans-serif"
    fontSize: "1rem"
    fontWeight: 400
    lineHeight: 1.5
  typed:
    fontFamily: "Courier Prime, Courier New, Courier, monospace"
    fontSize: "0.9375rem"
    fontWeight: 400
    lineHeight: "24px"
  label:
    fontFamily: "Archivo Narrow, Arial Narrow, Archivo, system-ui, sans-serif"
    fontSize: "0.75rem"
    fontWeight: 600
    lineHeight: 1.2
    letterSpacing: "0.12em"
  button:
    fontFamily: "Archivo, system-ui, -apple-system, Segoe UI, sans-serif"
    fontSize: "0.9375rem"
    fontWeight: 600
    lineHeight: 1.2
rounded:
  card: "3px"
  tab: "4px"
  drawer: "6px"
  pill: "50%"
spacing:
  xs: "0.5rem"
  sm: "1rem"
  md: "1.1rem"
  lg: "2rem"
  xl: "3.5rem"
  line: "24px"
components:
  button-primary:
    backgroundColor: "{colors.brass}"
    textColor: "#1b261f"
    typography: "{typography.button}"
    rounded: "{rounded.card}"
    padding: "0.5rem 1rem"
    height: "2.5rem"
  button-ghost:
    backgroundColor: "transparent"
    textColor: "{colors.on-ground}"
    typography: "{typography.button}"
    rounded: "{rounded.card}"
    padding: "0.5rem 1rem"
    height: "2.5rem"
  button-dark:
    backgroundColor: "{colors.catalogue-green}"
    textColor: "{colors.on-ground}"
    typography: "{typography.button}"
    rounded: "{rounded.card}"
    padding: "0.5rem 1rem"
    height: "2.5rem"
  button-dark-ghost:
    backgroundColor: "transparent"
    textColor: "{colors.typewriter-ink}"
    typography: "{typography.button}"
    rounded: "{rounded.card}"
    padding: "0.5rem 1rem"
    height: "2.5rem"
  index-card:
    backgroundColor: "{colors.index-card}"
    textColor: "{colors.typewriter-ink}"
    typography: "{typography.typed}"
    rounded: "{rounded.card}"
    padding: "0 1rem 0.5rem"
  index-card-head:
    textColor: "{colors.typewriter-ink-soft}"
    typography: "{typography.label}"
    padding: "0.4rem 1rem 0.3rem"
  drawer-tab:
    backgroundColor: "{colors.brass}"
    textColor: "{colors.typewriter-ink}"
    typography: "{typography.title}"
    rounded: "{rounded.card}"
    padding: "3px"
    height: "2.2rem"
  drawer-tab-active:
    backgroundColor: "{colors.typewriter-ink}"
    textColor: "{colors.on-ground}"
  search-field:
    backgroundColor: "{colors.index-card}"
    textColor: "{colors.typewriter-ink}"
    rounded: "{rounded.card}"
    padding: "0.5rem 0.8rem"
    height: "2.5rem"
  stamp:
    textColor: "{colors.catalogue-green}"
    typography: "{typography.label}"
    rounded: "2px"
    padding: "1px 7px"
  stamp-approximate:
    textColor: "{colors.stamp-red}"
---

# Design System: Placefile

## Overview

**Creative North Star: "The Catalogue Room"**

Saved places are index cards in a library card catalogue, not rows in an export. The page is a catalogue-room green ground with a faint paper grain. Lists are drawers and drawer-front tabs in brass, each place is a white index card with pale-blue ruled lines and a single red line under its title, and everything on a card is set in typewriter type. The tool files the user's data; it does not present an upload widget above a table.

Density is moderate and calm. One brass primary action per area carries all the colour; the rest is green, white card and ink. Depth is physical (paper edges, brass bevels, a drawer lip), never glassy. Motion is small and mechanical: a card files in, a tab slides out, a drawer pull gives a few pixels.

The build matches the OWN-WORLD block of the direction contract. Where the contract says red rubber stamps mark approximate coordinates, the build goes further: every card carries a stamp. Green-ink for exact and from-link, red for approximate, dashed grey for unfiled.

**Key Characteristics:**
- Green ground, white card: the only two large surfaces, with brass as the sole accent.
- Typewriter (Courier Prime) for anything that sits on a card or names the thing being filed; Archivo for interface text and controls.
- A 24px baseline (`--line`) shared by the ruled card background and the typed text so type sits on the rules.
- Hardware (brass bevels, rivets, drawer pull) for controls; paper for content.
- Honesty is rendered as ink: approximate coordinates are the one red thing on a card.

## Colors

A restrained two-ground palette: deep catalogue green behind, near-white card in front, brass for action and hardware, red reserved for the ruled line and the stamp.

### Primary
- **Brass** (#c8a24c): Primary buttons, drawer-tab frames, label holder, rivets. Rendered as a vertical gradient from #e6c978 through the base to #b08a35 with a #6f5518 edge, never flat.
- **Bright Brass** (#dbb961): Brass used as text on the green ground: wordmark, ledger counts, inline link buttons, active tab count.
- **Dark Brass** (#8a6a1f): The inset hairline on the drawer front and the rivet shading.

### Secondary
- **Red Rule** (#c9453d): The single red line under every card head and place title, and the top border of peek tabs.
- **Stamp Red** (#b3261e): Rubber-stamp ink. Approximate-coordinate stamps, "Good to know" head, matched-query line, error messages (with a 1.5px border).

### Neutral
- **Catalogue Green** (#34503f): Page ground, dark button fill, exact/from-link stamp ink, progress accent. **Deep Catalogue Green** (#2a4132) is its border and the drawer's lower gradient stop (drawer fill runs #2f4a3a to #263b2e).
- **On Ground** (#ffffff) and **On Ground Soft** (#cddcd2): Text on green: headings and primary lines in white; ledes, hints, footer and secondary text in the soft tint. **Ground Line** (rgba(255,255,255,0.18)) is the hairline divider on green.
- **Index Card** (#fdfdfb): Card surfaces, inputs, the drawer label.
- **Pale Blue Rule** (#bcd0e6): The ruled lines inside card bodies and card-foot dividers.
- **Typewriter Ink** (#1e2128) and **Soft Ink** (#4a505c): Text on cards; soft ink for labels, addresses, comments and counts. Ink is also the active-tab fill.
- **Focus Yellow** (#ffd978): Focus ring on green (3px, 2px offset), drop-target ring, sample banner. On cards the ring switches to Typewriter Ink.

### Named Rules
**The Two-Ground Rule.** Large areas are catalogue green or index card, nothing else. A third large surface colour breaks the room.

**The Red Is Ink Rule.** Red appears only as the single red line on a card head and as stamp or error ink. It is never a button, a badge fill, or decoration.

**The Brass Is Hardware Rule.** Brass belongs to things you pull, press or label: primary buttons, tab frames, the drawer holder. It is not used for panels or backgrounds.

## Typography

**Display Font:** Courier Prime (with Courier New, Courier, monospace)
**Body Font:** Archivo (with system-ui, -apple-system, Segoe UI, sans-serif)
**Label Font:** Archivo Narrow (with Arial Narrow, Archivo, system-ui)

**Character:** A typewriter that files and a clean grotesque that operates. Courier Prime sets the headline, wordmark, card titles, card bodies and stamps; Archivo handles buttons, inputs, ledes and notices; Archivo Narrow is used for small tracked labels only.

### Hierarchy
- **Display** (Courier Prime 700, 2.75rem / 2rem under 40rem, line-height 1.1, letter-spacing -0.04em): The single h1, capped at 16ch and balanced.
- **Wordmark** (Courier Prime 700, 1.5rem, line-height 1, -0.02em): Masthead, in Bright Brass.
- **Title** (Courier Prime 700, 0.9375rem on the 24px line): Place titles, tab labels, step heads.
- **Body / Typed** (Courier Prime 400, 0.9375rem on the 24px line): Card contents, ledger line (1.0625rem / 1.4), empty state.
- **Lede** (Archivo 400, 1.125rem / 1.55, max 52ch, On Ground Soft): Under the h1. Interface paragraphs inside the geocode slip run Archivo 0.9375rem / 1.55, max 62ch.
- **Button** (Archivo 600, 0.9375rem / 1.2): All buttons; the place link is Archivo 600 0.8125rem.
- **Label** (Archivo Narrow 600, 0.75rem, +0.1 to +0.12em, uppercase): Card heads, field labels, list name in the card foot, peek tabs. Small and always quiet.

### Named Rules
**The Typed Is Filed Rule.** Courier Prime is for the user's data and the filing apparatus (titles, notes, stamps, tabs, counts). Archivo is for the instrument (buttons, inputs, explanatory prose). Don't swap them.

**The Baseline Rule.** Any ruled card body uses `--line` (24px) as its line-height so text sits on the pale-blue rule. Change the variable, not individual line-heights.

## Layout

A 1240px centred container with 2rem side padding (1.1rem under 40rem). The intake is a two-column grid at 1.15fr / 0.85fr with a 4.5rem gap: headline and drawer on the left, four stacked step cards on the right, each indented 1.25rem further than the last like cards fanned in a tray. The workspace is a 17rem sticky rail of list tabs beside a fluid column; place cards fill `repeat(auto-fill, minmax(18.5rem, 1fr))` with a 1.1rem gap.

Spacing is rem-based and hand-set rather than from a strict scale; recurring steps are 0.5rem, 1rem, 1.1rem, 1.25rem, 2rem and 3.5 to 4rem between regions. Card inner padding is 1rem horizontally.

Responsive: below 62rem the columns collapse to one and the rail becomes a horizontally scrolling, snap-aligned row of tabs with a right-edge fade mask; below 40rem the step indents drop, the third peek tab hides and the search goes full-width. The `filing` entrance and all transitions are removed under `prefers-reduced-motion`.

## Elevation & Depth

Depth is physical: stacked paper, bevelled brass, a recessed drawer. There is no blur-glass, no coloured glow. Surfaces are flat at rest apart from the paper edge; the only lift on interaction is a 2px card rise and a 5px drawer-pull drop.

### Shadow Vocabulary
- **Paper stack** (`box-shadow: 0 2px 0 -1px #eceee9, 0 3px 0 -1px rgba(0,0,0,.3), 0 10px 16px -8px rgba(0,0,0,.55)`): Every index card. Negative spreads keep the edge as a thin sheet beneath the card, not an offset block.
- **Brass bevel** (`inset 0 1px 0 rgba(255,255,255,.55), 0 2px 3px rgba(0,0,0,.35)`): Primary buttons, tab frames and the label holder.
- **Recessed label** (`inset 0 1px 2px rgba(0,0,0,.25)` to `.3`): The drawer label and the card inside each tab.
- **Drawer front** (`inset 0 2px 0 rgba(255,255,255,.1), inset 0 -14px 20px -14px rgba(0,0,0,.6), 0 24px 30px -18px rgba(0,0,0,.65)`): The intake drawer, with a 3px #1c2c22 border and a 2px Dark Brass inset outline at -9px.

### Named Rules
**The Paper-Not-Plastic Rule.** Shadows describe sheets and metal. No diffuse tinted glows, no card-on-card stacking beyond the peek tabs.

## Shapes

Small, practical corners: 3px on cards, buttons, inputs and tab frames (the catalogue's cut-card feel), 4px top corners on the peek tabs, 6px on the drawer, circles for rivets, 2px on stamps. Stamps are rotated -2deg and roughened with an SVG turbulence filter (`#ink`) so they read as pressed ink; the "no match / unfiled" stamp drops the rotation and filter and uses a dashed border. Borders are 1px brass-edge (#6f5518) on hardware, 1px Red Rule under heads, 2px currentColor on stamps.

## Components

### Buttons
- **Shape:** 3px corners, min-height 2.5rem, padding 0.5rem 1rem, Archivo 600 0.9375rem.
- **Primary:** Brass gradient with #1b261f text and a dark-brass border plus the brass bevel. Hover brightens (1.08); active dims and goes inset. Used for the drawer's "Choose files" and CSV, GeoJSON and KML downloads.
- **Ghost:** Transparent, white text, 50% white border; hover adds a 10% white wash. On-ground secondary actions (Add files, Start over, Show more).
- **Dark / Dark-ghost:** On cards only: catalogue-green fill with white text, or transparent with ink text and soft-ink border.
- **Disabled:** 50% opacity, not-allowed cursor. **Focus:** 3px focus ring, 2px offset (ink-coloured on cards).

### Cards / Containers
- **Index card:** Index Card colour with a faint warm paper-grain, 3px corners, Paper stack shadow, ruled body on the 24px line.
- **Head:** Red Rule bottom border. On place cards the head is the Courier title; on the slip it is a small tracked label.
- **Foot:** A grid with list name at left and stamp at right, separated by a pale-blue hairline. A matched-query line in Stamp Red can sit below.
- **Hover:** Place cards rise 2px (0.15s ease-out).

### Inputs / Fields
- **Style:** Index Card fill, 1px #8b93a0 border, 3px corners, Archivo 0.9375rem, min-height 2.5rem; placeholder #5b6270. Focus uses the 3px ring. Search is capped at 28rem; the labelled field is Archivo Narrow uppercase.
- **Errors:** The "errata" slip: Index Card fill, Stamp Red typed text and a 1.5px Stamp Red border, `role="alert"`.

### Navigation
- **Drawer tabs (list rail):** A brass frame (3px padding) holding a white label strip with list name (ellipsised) and tabular count in Courier. The active tab inverts to ink with a Bright Brass count and slides out 0.7rem (`translateX`, 0.2s expo-out); on narrow screens it does not shift.

### Drawer (signature component)
The intake dropzone is a drawer front: a green-gradient face with a brass label holder (rivet, "Drop Takeout .zip" on a white label, rivet), a Choose-files button, a hint line and an SVG brass pull that drops 5px on hover or drag-over. Behind it three peek tabs show list names. The whole thing is one `<label>` for the visually hidden file input, so it is keyboard- and drop-operable; drag-over switches its inset outline to Focus Yellow.

### Stamp (signature component)
Pressed-ink status on each place: green ink for exact or from-link coordinates, red with a second inner hairline for approximate (geocoded), dashed grey for no coordinates. It is the only place red carries meaning, so approximate data is visible at a glance.

### Motion
New lists "file in": cards (first twelve) and tabs rise 14px and fade over 0.38s with `cubic-bezier(.16, 1, .3, 1)`, staggered by 35ms. Other transitions are 0.15s ease-out. Reduced motion removes all of it.

## Do's and Don'ts

### Do:
- **Do** keep large surfaces to catalogue green (#34503f) and index card (#fdfdfb), and put all content on cards.
- **Do** set card text in Courier Prime on the 24px rule line, with one red line under the head.
- **Do** build primary controls as bevelled brass (gradient, #6f5518 edge, brass bevel shadow) with dark text.
- **Do** mark every place's coordinate provenance with a stamp, using stamp-red for approximate.
- **Do** switch focus rings to ink on cards and keep Focus Yellow on green.
- **Do** keep entrance motion to the file-in rise and honour reduced motion.

### Don't:
- **Don't** use red for anything but the card rule, stamps and error messages.
- **Don't** introduce a third surface colour, a gradient background wash, or glassmorphism.
- **Don't** set card body text in Archivo or button text in Courier; the two voices stay separate.
- **Don't** show a place as a table row; places are cards.
- **Don't** add icons as glyph characters; marks in this system are inline SVG (lock, wordmark, drawer pull).
- **Don't** invent sample metrics or testimonials; sample data is always labelled as such (banner in dashed Focus Yellow).
