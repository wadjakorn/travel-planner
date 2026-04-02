# Travel Planner — Requirements

Edit this file to guide development. Add, remove, or modify requirements and share with Claude.

Checkboxes: `[x]` = implemented, `[ ]` = not yet built.

---

## Core Concept

A trip planner where users pin spots on a map, organize by day, and get route optimization for either time-efficiency or comfort (less walking/transfers).

---

## Authentication

- [x] Google SSO via Auth.js v5
- [x] Session persists across refreshes
- [x] Unauthenticated users redirected to `/login`
- [x] Sign out clears session

---

## Trip Management

- [x] Create a trip with title, start date, end date
- [x] Trip days auto-generated from date range (one day per calendar day)
- [x] List all trips on home page (card grid)
- [x] Delete a trip (with confirmation dialog)
- [ ] Edit trip title / dates (UI exists for dates via accommodation panel; dedicated edit form not built)
- [x] Trip card shows: title, date range, day count, spot count

---

## Spot Management

- [x] Search for a place using Google Places Autocomplete
- [x] Add a spot to a specific day from search results
- [x] Spot types: Attraction, Hotel, Restaurant, Cafe, Shopping, Transport, Custom
- [x] Edit spot: name, type, notes, estimated stay time (minutes)
- [x] Delete a spot
- [x] Drag-and-drop to reorder spots within a day (`@dnd-kit/sortable`)
- [x] Drag spot from one day to another
- [x] Click a map pin to select/highlight the spot in the itinerary panel

### Visit Time (stayMinutes)

- [x] Every spot has a `stayMinutes` value (default: 60 minutes)
- [x] New spots default to 60 minutes on creation
- [x] Editable inline on the spot card
- [x] Route time calculations include visit time: `total = travel time + sum of visit times`
- [x] Display format: "Total: 6h 30m (3h 10m travel + 3h 20m visits)"

---

## Accommodation Management

### Adding Accommodations

- [x] User can add accommodations by **searching Google Places API**
- [x] Each accommodation has: name, address, GPS location (lat/lng)
- [x] Stored as a **separate `Accommodation` model** (not a Spot)
- [x] Accommodations belong to a trip (not tied to a specific day)

### Night Assignment

- [x] Nights are date-based: a trip from Mon Apr 13 – Wed Apr 15 has **2 nights** (Apr 13, Apr 14)
- [x] Each night can be assigned one accommodation
- [x] Night of Day N → accommodation becomes **end point of Day N** and **start point of Day N+1**
- [x] If a night has no accommodation assigned, that day falls back to using first/last spot as route start/end
- [x] Different nights can have different accommodations (e.g., switching hotels mid-trip)

### Trip Arrival & Departure Points

- [x] Trip-level **arrival location** (airport, train station, etc.) → fixed **start point of the first day**
- [x] Trip-level **departure location** → fixed **end point of the last day**
- [x] Input via **Google Places Autocomplete** (not plain text) — saves real lat/lng for routing
- [x] Clearable via × button once set
- [x] These are optional; if not set, first/last day uses first/last spot or night accommodation

### Day Start/End Point Resolution (priority order)

1. **First day start:** Trip arrival location → first spot
2. **First day end:** Night of first day's accommodation → last spot
3. **Middle day start:** Previous night's accommodation → first spot
4. **Middle day end:** Current night's accommodation → last spot
5. **Last day start:** Previous night's accommodation → first spot
6. **Last day end:** Trip departure location → current night's accommodation → last spot

### Accommodation UI

- [x] **Dedicated collapsible "Accommodations" panel** in the itinerary sidebar
- [x] Lists all nights with dates and assigned accommodation (or "Not set")
- [x] Click to assign, change, or remove accommodation for a night
- [x] Search via Google Places or add manually (name + address + location)
- [x] Trip arrival/departure locations editable at the top of the panel using Google Places Autocomplete
- [x] **Fixed header/footer rows on each day card** showing the resolved start/end point
  - Visually distinct from draggable spots (pinned, not sortable)
  - Shows accommodation name + icon (bed), or arrival/departure icon as appropriate
- [x] Accommodation pins on the map use a distinct style (bed icon, purple color)

---

## Map

- [x] Google Maps rendered via `@vis.gl/react-google-maps`
- [x] Color-coded pins per SpotType (using CSS token variables)
- [x] Numbered pins (1, 2, 3...) reflecting itinerary order
- [x] Clicking a pin selects that spot in the sidebar
- [x] Filter map to show only selected day's spots (deselect day → show all spots)
- [x] Map auto-fits bounds to visible spots when day selection changes
- [x] **Map auto-fits to full route** (all polyline points) when "Show Route" / "Optimize Route" completes

---

## Route Display & Optimization

### Show Route (without optimization)

- [x] "Show Route" action available from day header dropdown menu
- [x] Calls Google Routes API with spots in **current order** (no `optimizeWaypointOrder`)
- [x] Renders multi-color polyline on map (one color per leg)
- [x] Shows **per-leg duration/distance** and **totals** (same detail level as optimized route)
- [x] Respects per-leg travel mode settings (see Travel Mode below)
- [x] **Endpoint legs included:** hotel/arrival → first spot, and last spot → hotel/departure legs are fetched, displayed, and included in totals

### Optimize Route

- [x] "Optimize Route" action available from day header dropdown menu
- [x] Two optimization sub-options:
  - **Save Time** — minimize travel duration (`DRIVE`, `TRAFFIC_AWARE`)
  - **Comfortable** — prefer transit (`TRANSIT`)
- [x] Calls Google Routes API `computeRoutes` with `optimizeWaypointOrder: true`
- [x] Reorders spots in itinerary based on result
- [x] Renders multi-color route polyline on the map (one color per leg)
- [x] Shows per-leg and total duration/distance (including endpoint legs)
- [x] Loading state during API call
- [ ] **Auto-fill Visit Times dialog after optimization** _(not yet built)_
  - "Fill empty only" — set 1hr default only for spots without a user-entered value
  - "Reset all to 1hr" — overwrite all spots to 1hr
  - "Keep current" — don't change any visit times

### Route Leg Colors

- [x] Each route leg (spot A → spot B) rendered as a **separate polyline** with a **distinct color**
- [x] Colors drawn from a fixed palette of 8 CSS variable colors (`--route-leg-1` through `--route-leg-8`), cycling if more legs exist
- [x] Palette: Blue, Red, Green, Orange, Purple, Teal, Pink, Amber
- [x] Leg colors support dark mode via CSS variables
- [x] Leg colors in sidebar connector rows **match polyline colors** on the map (positional correspondence)
- [x] Endpoint legs (hotel/arrival → first spot, last spot → hotel/departure) receive their own color slot in the sequence

### Travel Mode Per Leg

- [x] 4 travel modes: **Car, Walk, Transit, Bicycle**
- [x] Google Routes API mapping: Car → `DRIVE`, Walk → `WALK`, Transit → `TRANSIT`, Bicycle → `BICYCLE`
- [x] **Day-level default travel mode:** set via day dropdown menu (defaults to Car)
- [x] **Per-spot-leg connector row** between each pair of consecutive spot cards shows:
  - Travel mode icon (car / walk / transit / bicycle)
  - Estimated duration for that leg (shown after route is fetched)
  - Clickable to cycle through travel modes
- [x] **Endpoint connector rows** between hotel/arrival header and first spot, and between last spot and hotel/departure footer:
  - Show travel mode picker (uses day default mode; no per-leg override — endpoint legs always use day default)
  - Show cached duration after route is fetched
- [x] Changing a spot's leg travel mode clears that leg's route cache (re-fetched on next "Show Route")
- [x] Changing a day's default travel mode clears the entire day's route cache
- [x] Per-leg travel mode stored on `Spot.travelModeToNext` (nullable — null means use day default)

### Day Action Dropdown Menu

- [x] Each day header has a **⋮ (kebab) dropdown menu**
- [x] Menu actions:
  - **Show Route** — display route in current spot order (no reordering)
  - **Optimize Route →** sub-menu: "Save Time" / "Comfortable"
  - **Set Default Travel Mode →** Car / Walk / Transit / Bicycle
  - **Clear Route** — remove polyline and route data from display
- [x] Dropdown **overflows the sidebar width** when needed (`min-w-48 w-auto` — not clipped to trigger button width)

---

## Route Cache (DB Persistence)

Routes are expensive to compute (Google Routes API quota + latency). All saveable route data is persisted to the database after every computation so subsequent "Show Route" calls are served instantly from the DB.

### What is cached

- **`Spot.legDuration`**, **`Spot.legDistance`**, **`Spot.legPolyline`** — the leg from this spot to the next
- **`TripDay.startLegDuration/Distance/Polyline`** — endpoint leg: arrival/hotel → first spot
- **`TripDay.endLegDuration/Distance/Polyline`** — endpoint leg: last spot → hotel/departure

### Cache validity & serving

- [x] On "Show Route": check if all expected legs have cached polylines → serve from DB with no Google API call
- [x] `force: true` param available on the Show Route mutation to explicitly bypass cache (not currently used by UI, available for future use)
- [x] "Optimize Route" always calls Google API (optimization must be fresh), then persists the result

### Cache invalidation (automatic, per mutation)

- [x] **Add spot** → clear entire day's leg cache
- [x] **Delete spot** → clear entire day's leg cache
- [x] **Reorder spots within a day** → clear that day's cache
- [x] **Move spot to another day** → clear both source and target day's cache
- [x] **Change spot's `travelModeToNext`** → clear that spot's cached leg only
- [x] **Change day's `defaultTravelMode`** → clear entire day's cache (all legs use it as fallback)
- [x] **Assign/change night accommodation** → clear endpoint leg cache for the day ending on that night and the day starting from it
- [x] **Change arrival location** → clear Day 1's endpoint leg cache
- [x] **Change departure location** → clear last day's endpoint leg cache

### Auto-restore on page load

- [x] On trip page load, `ItineraryPanel` checks each day's cached legs via client-safe helpers (`isCacheValidClient`, `buildRouteFromCacheClient` — no Prisma import)
- [x] If a complete cache exists for the selected day (or first day with complete cache), the route is reconstructed and displayed immediately with **zero API calls**
- [x] Does not overwrite an already-active route (e.g. freshly computed in same session)

---

## Itinerary Panel UI

- [x] **Drag-resizable sidebar**: user can drag the divider between sidebar and map to resize; min 280 px, max 640 px (desktop only)
- [x] Selecting a different day card deselects the previous one (single-day focus)
- [x] **Clicking an already-selected day does NOT deselect it** (prevents accidentally losing a displayed route)
- [x] **"Show all spots" button** (Layers icon, top of itinerary panel header):
  - Clears day selection and active route
  - Map returns to showing all spots across all days
  - Button appears highlighted (secondary variant) when a day is selected, ghost when no day is selected

---

## UI / UX

- [x] Split-pane layout: itinerary sidebar (left) + map (right)
- [x] Dark mode — follows system preference on first visit; manual toggle persisted in localStorage via Zustand
- [ ] Mobile: Sheet-based drawer instead of sidebar
- [ ] Keyboard navigation support
- [ ] Loading skeletons for async content (Skeleton component exists, not widely applied)
- [ ] Empty states with call-to-action
- [ ] Error boundaries for map and itinerary sections
- [ ] Toast notifications for create/delete/error events

---

## Sharing & Export

- [x] **Public share link** — generate a token-based read-only URL (`/share/[token]`); no auth required to view
- [x] **Export to calendar** — `.ics` file download (Google Calendar / Apple Calendar compatible); one event per spot sequenced by visit time
- [ ] Export itinerary to PDF

---

## Performance & Quality

- [x] TanStack Query for server state caching / revalidation
- [x] DB-level route leg cache (see Route Cache section above) avoids redundant Google API calls
- [ ] Optimistic updates for spot reorder (currently waits for server round-trip)
- [x] API routes protected by session check
- [x] Input validation on all API routes before DB access
- [x] Server-only code (Prisma, secrets) never imported into Client Components (`route-cache-client.ts` mirrors server cache logic without Prisma for safe use in React)

---

## Data Model Reference

Key fields added beyond the initial schema:

| Model | Field | Purpose |
|---|---|---|
| `Spot` | `stayMinutes Int` | Estimated visit time |
| `Spot` | `travelModeToNext TravelMode?` | Per-leg travel mode override |
| `Spot` | `legDuration String?` | Cached: travel time to next spot |
| `Spot` | `legDistance String?` | Cached: distance to next spot |
| `Spot` | `legPolyline String? @db.Text` | Cached: encoded polyline to next spot |
| `TripDay` | `defaultTravelMode TravelMode` | Day-wide fallback mode (default CAR) |
| `TripDay` | `startLeg{Duration,Distance,Polyline}` | Cached: endpoint → first spot leg |
| `TripDay` | `endLeg{Duration,Distance,Polyline}` | Cached: last spot → endpoint leg |
| `Accommodation` | `lat Float`, `lng Float` | Real GPS coords for routing |
| `Trip` | `arrival{Name,Address,Lat,Lng}` | Trip-level arrival point |
| `Trip` | `departure{Name,Address,Lat,Lng}` | Trip-level departure point |
| `Trip` | `shareToken String? @unique` | Public share link token |
| `NightAccommodation` | `date DateTime @db.Date` | Maps a night to its accommodation |

---

## Environment Variables Required

See `.env.example` for the full list.

| Variable | Purpose |
|---|---|
| `DATABASE_URL` | PostgreSQL connection string (Neon / Supabase / local Docker) |
| `AUTH_SECRET` | Auth.js signing secret (`npx auth secret`) |
| `GOOGLE_CLIENT_ID` | OAuth 2.0 client ID |
| `GOOGLE_CLIENT_SECRET` | OAuth 2.0 client secret |
| `GOOGLE_MAPS_API_KEY` | Server-side key — Routes API v2, Places API (New) |
| `NEXT_PUBLIC_GOOGLE_MAPS_API_KEY` | Client-side key — Maps JS API, Places Autocomplete |
| `NEXT_PUBLIC_GOOGLE_MAP_ID` | Cloud-based map styling ID (required for AdvancedMarker) |

> **Note on Prisma migrations:** The project has a shadow-DB incompatibility (`P3006`) caused by a migration with no time portion in its name. New migrations must be applied manually:
> ```bash
> npx prisma db execute --file prisma/migrations/<name>/migration.sql
> npx prisma migrate resolve --applied <name>
> ```

---

## Out of Scope (for now)

- Multi-user collaboration / shared editing
- Offline support / PWA
- Native mobile app
- Custom map tile providers
- Flight / hotel booking integration
- Real-time traffic overlays beyond what Google Routes API returns
