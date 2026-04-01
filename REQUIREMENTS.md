# Travel Planner — Requirements

Edit this file to guide development. Add, remove, or modify requirements and share with Claude.

---

## Core Concept

A trip planner where users pin spots on a map, organize by day, and get route optimization for either time-efficiency or comfort (less walking/transfers).

---

## Authentication

- [ ] Google SSO via Auth.js v5
- [ ] Session persists across refreshes
- [ ] Unauthenticated users redirected to `/login`
- [ ] Sign out clears session

---

## Trip Management

- [ ] Create a trip with title, start date, end date
- [ ] Trip days auto-generated from date range (one day per calendar day)
- [ ] List all trips on home page (card grid)
- [ ] Delete a trip (with confirmation dialog)
- [ ] Edit trip title / dates
- [ ] Trip card shows: title, date range, day count, spot count

---

## Spot Management

- [ ] Search for a place using Google Places Autocomplete
- [ ] Add a spot to a specific day from search results
- [ ] Spot types: Attraction, Hotel, Restaurant, Cafe, Shopping, Transport, Custom
- [ ] Edit spot: name, type, notes, estimated stay time (minutes)
- [ ] Delete a spot
- [ ] Drag-and-drop to reorder spots within a day (`@dnd-kit/sortable`)
- [ ] Drag spot from one day to another
- [ ] Click a map pin to select/highlight the spot in the itinerary panel

### Visit Time (stayMinutes)

- [ ] Every spot **must have** a `stayMinutes` value (required field, default: 60 minutes)
- [ ] New spots default to 60 minutes on creation
- [ ] Editable inline on the spot card
- [ ] Route time calculations include visit time: `total = travel time + sum of visit times`
- [ ] Display format: "Total: 6h 30m (3h 10m travel + 3h 20m visits)"

---

## Accommodation Management

### Adding Accommodations

- [ ] User can add accommodations by **searching Google Places API** or **manual entry**
- [ ] Each accommodation has: name, address, GPS location (lat/lng)
- [ ] Stored as a **separate `Accommodation` model** (not a Spot)
- [ ] Accommodations belong to a trip (not tied to a specific day)

### Night Assignment

- [ ] Nights are date-based: a trip from Mon Apr 13 – Wed Apr 15 has **2 nights** (Apr 13, Apr 14)
- [ ] Each night can be assigned one accommodation
- [ ] Night of Day N → accommodation becomes **end point of Day N** and **start point of Day N+1**
- [ ] If a night has **no accommodation assigned**, that day falls back to using **first/last spot** as start/end of route
- [ ] Different nights can have different accommodations (e.g., switching hotels mid-trip)

### Trip Arrival & Departure Points

- [ ] Trip-level **arrival location** (any place — airport, train station, etc.) → fixed **start point of the first day**
- [ ] Trip-level **departure location** → fixed **end point of the last day**
- [ ] These are optional; if not set, first/last day uses first/last spot or night accommodation as fallback

### Day Start/End Point Resolution (priority order)

1. **First day start:** Trip arrival location → Night before (N/A for first day) → first spot
2. **First day end:** Night of first day's accommodation → last spot
3. **Middle day start:** Previous night's accommodation → first spot
4. **Middle day end:** Current night's accommodation → last spot
5. **Last day start:** Previous night's accommodation → first spot
6. **Last day end:** Trip departure location → last spot

### Accommodation UI

- [ ] **Dedicated collapsible "Accommodations" panel** in the itinerary sidebar
- [ ] Lists all nights with dates and assigned accommodation (or "Not set")
- [ ] Click to assign, change, or remove accommodation for a night
- [ ] Search via Google Places or add manually (name + address + location)
- [ ] Trip arrival/departure locations editable at the top of the panel
- [ ] **Fixed header/footer on each day card** showing the resolved start/end point
  - Visually distinct from draggable spots (pinned, not sortable)
  - Shows accommodation name + icon, or "From: [first spot]" as fallback
- [ ] Accommodation pins on the map use a distinct style (e.g., bed icon or house icon)

---

## Map

- [ ] Google Maps rendered via `@vis.gl/react-google-maps`
- [ ] Color-coded pins per SpotType (using CSS token variables)
- [ ] Numbered pins (1, 2, 3...) reflecting itinerary order
- [ ] Clicking a pin selects that spot in the sidebar
- [ ] Filter map to show only selected day's spots
- [ ] Map auto-fits bounds to visible spots

### Route Polyline Display

- [ ] Each route leg (spot A → spot B) rendered as a **separate polyline** with a **distinct color**
- [ ] Colors drawn from a fixed palette of 8 CSS variable colors (`--route-leg-1` through `--route-leg-8`), cycling if more legs exist
- [ ] Palette colors: Blue, Red, Green, Orange, Purple, Teal, Pink, Amber
- [ ] Leg colors support dark mode via CSS variables
- [ ] Leg colors in sidebar connector rows match polyline colors on the map (positional correspondence)

---

## Route Display & Optimization

### Show Route (without optimization)

- [ ] "Show Route" action available from day header dropdown menu
- [ ] Calls Google Routes API with spots in **current order** (no `optimizeWaypointOrder`)
- [ ] Renders multi-color polyline on map (one color per leg)
- [ ] Shows **per-leg duration/distance** and **totals** (same detail level as optimized route)
- [ ] Respects per-leg travel mode settings (see Travel Mode below)

### Optimize Route

- [ ] "Optimize Route" action available from day header dropdown menu
- [ ] Two optimization sub-options:
  - **Save Time** — minimize travel duration, real-time traffic (`DRIVE`, `TRAFFIC_AWARE`)
  - **Comfortable** — prefer transit, fewer transfers (`TRANSIT`)
- [ ] Calls Google Routes API `computeRoutes` with `optimizeWaypointOrder: true`
- [ ] Reorders spots in itinerary based on result
- [ ] Renders multi-color route polyline on the map (one color per leg)
- [ ] Shows per-leg and total duration/distance
- [ ] Loading state during API call

### Auto-fill Visit Times After Optimization

- [ ] After optimization completes, show a **confirmation dialog**: "Set visit times?"
  - **"Fill empty only"** — set 1hr default only for spots without a user-entered value
  - **"Reset all to 1hr"** — overwrite all spots to 1hr
  - **"Keep current"** — don't change any visit times
- [ ] Route duration display accounts for both travel time AND visit time

### Travel Mode Per Leg

- [ ] 4 travel modes available: **Car, Walk, Transit, Bicycle**
- [ ] Google Routes API mapping: Car → `DRIVE`, Walk → `WALK`, Transit → `TRANSIT`, Bicycle → `BICYCLE`
- [ ] **Day-level default:** set via day dropdown menu (defaults to Car)
- [ ] **Per-leg override:** a **connector row between spot cards** in the sidebar shows:
  - Travel mode icon (car / walk / transit / bicycle)
  - Estimated duration for that leg (shown after route is fetched)
  - Clickable to change travel mode for that specific leg
- [ ] Changing a leg's travel mode **re-fetches that leg's route** from Google Routes API
- [ ] Per-leg travel mode stored on the Spot model (`travelModeToNext` field, nullable for last spot)

### Day Action Dropdown Menu

- [ ] Each day header has a **⋮ (kebab) dropdown menu** replacing the old optimization buttons
- [ ] Menu actions:
  - **Show Route** — display route in current spot order (no reordering)
  - **Optimize Route →** sub-menu: "Save Time" / "Comfortable"
  - **Set Default Travel Mode →** Car / Walk / Transit / Bicycle
  - **Clear Route** — remove polyline and route data from display

---

## UI / UX

- [ ] Split-pane layout: itinerary sidebar (left) + map (right)
- [ ] Mobile: Sheet-based drawer instead of sidebar
- [ ] Dark mode (toggle, system preference)
- [ ] Keyboard navigation support
- [ ] Loading skeletons for async content
- [ ] Empty states with call-to-action
- [ ] Error boundaries for map and itinerary sections
- [ ] Toast notifications for create/delete/error events

---

## Sharing & Export (Phase 4)

- [ ] Public share link (read-only view, no auth required)
- [ ] Export itinerary to PDF
- [ ] Export to Google Calendar (one event per spot with time estimate)

---

## Performance & Quality

- [ ] TanStack Query for server state caching / revalidation
- [ ] Optimistic updates for spot reorder
- [ ] API routes protected by session check
- [ ] Input validation on all API routes
- [ ] PostGIS-ready schema (lat/lng stored as Float; can upgrade to geometry)

---

## Environment Variables Required

See `.env.example` for the full list. Key variables:

| Variable | Purpose |
|---|---|
| `DATABASE_URL` | PostgreSQL connection string (Neon / Supabase / local) |
| `AUTH_SECRET` | Auth.js signing secret (`npx auth secret`) |
| `GOOGLE_CLIENT_ID` | OAuth 2.0 client ID |
| `GOOGLE_CLIENT_SECRET` | OAuth 2.0 client secret |
| `GOOGLE_MAPS_API_KEY` | Server-side key (Routes API, Places API) |
| `NEXT_PUBLIC_GOOGLE_MAPS_API_KEY` | Client-side key (Maps JS API) |
| `NEXT_PUBLIC_GOOGLE_MAP_ID` | Cloud-based map styling ID |

---

## Out of Scope (for now)

- Multi-user collaboration / shared editing
- Offline support / PWA
- Native mobile app
- Custom map tile providers
- Flight / hotel booking integration
