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

---

## Map

- [ ] Google Maps rendered via `@vis.gl/react-google-maps`
- [ ] Color-coded pins per SpotType (using CSS token variables)
- [ ] Numbered pins (1, 2, 3...) reflecting itinerary order
- [ ] Clicking a pin selects that spot in the sidebar
- [ ] Filter map to show only selected day's spots
- [ ] Route polyline rendered after optimization
- [ ] Map auto-fits bounds to visible spots

---

## Route Optimization

- [ ] "Optimize Route" button per day (or for selected spots)
- [ ] Two modes selectable via toggle:
  - **Save Time** — minimize travel duration, real-time traffic (`DRIVE`, `TRAFFIC_AWARE`)
  - **Comfortable** — prefer transit, fewer transfers (`TRANSIT`)
- [ ] Calls Google Routes API `computeRoutes` with `optimizeWaypointOrder: true`
- [ ] Reorders spots in itinerary based on result
- [ ] Renders route polyline on the map
- [ ] Shows total duration and distance per optimized route
- [ ] Loading state during API call

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
