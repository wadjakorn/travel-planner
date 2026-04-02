<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

---

# Development Workflow

## Git Versioning Policy

Commit at every meaningful checkpoint. Do not batch unrelated changes into one commit. The rule: **if rolling it back independently would make sense, it gets its own commit.**

### When to commit

| Trigger | Example commit message |
|---|---|
| Dependency installation settled | `chore: add @vis.gl/react-google-maps and dnd-kit` |
| Schema change (migration created) | `feat(db): add Spot.stayMinutes and SpotType enum` |
| New API route working end-to-end | `feat(api): POST /trips creates trip with days` |
| New UI component usable | `feat(ui): TripCard with date range and spot count` |
| Feature phase complete | `feat: complete Phase 2 — map integration` |
| Config / env / tooling change | `chore: add PostGIS docker-compose service` |
| Bug fix | `fix(map): pins not re-rendering on day switch` |
| Refactor with no behavior change | `refactor(services): extract route-optimizer into own module` |

### Commit message format

Follow [Conventional Commits](https://www.conventionalcommits.org/):

```
<type>(<scope>): <short summary>

[optional body — what changed and why, not how]
```

Types: `feat`, `fix`, `chore`, `refactor`, `docs`, `test`, `style`
Scopes (optional): `auth`, `db`, `api`, `map`, `itinerary`, `trip`, `ui`, `services`, `cache`

### Phase boundary tags

At the end of each development phase, create an annotated git tag:

```bash
git tag -a phase/1-foundation   -m "Phase 1 complete: auth, DB, basic CRUD"
git tag -a phase/2-map          -m "Phase 2 complete: map integration, pins, search"
git tag -a phase/3-optimization -m "Phase 3 complete: route optimization"
git tag -a phase/4-polish       -m "Phase 4 complete: dark mode, mobile, sharing"
```

This gives clean rollback points if a later phase breaks something foundational.

---

## Development Phases

### Phase 1 — Foundation ✅ `phase/1-foundation`
Auth, database, schema, basic Trip/Day/Spot CRUD.

**Completed:**
- Google SSO via Auth.js v5
- Prisma schema, Docker Postgres, basic migrations
- Trip / TripDay / Spot CRUD API routes

---

### Phase 2 — Map Integration ✅ `phase/2-map`
Google Maps render, place search/autocomplete, pin display, drag-and-drop reorder.

**Completed:**
- Map renders with color-coded, numbered pins per SpotType
- Google Places Autocomplete adds spots to a day
- Drag-and-drop reorders spots within and across days

---

### Phase 3 — Route Optimization ✅ `phase/3-optimization`
Google Routes API integration, waypoint optimization, polyline rendering.

**Completed:**
- "Save Time" and "Comfortable" optimization modes
- Multi-color polyline rendering (one color per leg, synced between map and sidebar)
- Per-leg travel mode overrides stored on `Spot.travelModeToNext`
- Day-level default travel mode
- Connector rows between spot cards showing mode icon + leg duration
- Visit time (`stayMinutes`) included in route totals

---

### Phase 4 — Polish & Ship ✅ `phase/4-polish` (partially; see Phase 5 for remainder)
Dark mode, sharing, export, accommodation management, route UX refinements.

**Completed:**
- Dark mode (system preference + manual toggle, persisted in localStorage)
- Public share link (token-based read-only view)
- Calendar export (`.ics` download, one event per spot)
- Accommodation management: add/edit/delete, night assignment, arrival/departure points
- Arrival/departure via Google Places Autocomplete (real lat/lng saved for routing)
- Endpoint legs (hotel/arrival → first spot, last spot → hotel/departure) in route totals + connector rows
- Map auto-fits to full route on Show Route / Optimize
- Resizable sidebar (drag divider, min 280px / max 640px)
- Day dropdown wider than trigger (overflows sidebar)
- Prevent accidental day deselection; "Show all spots" Layers button
- DB-persisted route leg cache (see Route Cache section in REQUIREMENTS.md)
- Auto-restore cached route on page load (zero API calls)

**Still to build (Phase 5):**
- Mobile layout (Sheet-based drawer)
- Toast notifications for mutations
- Error boundaries
- Loading skeletons
- Visit-time dialog after optimization
- PDF export
- Edit trip title / dates

---

### Phase 5 — Remaining Polish
Mobile layout, toasts, error states, PDF export, visit-time dialog.

**Exit criteria:**
- Mobile layout uses Sheet-based sidebar drawer
- Toast shown on spot add / delete / error
- Error boundary wraps map and itinerary sections
- Optimization triggers visit-time fill dialog
- PDF export generates downloadable itinerary
- Trip title and dates editable after creation

**Tag:** `phase/5-remaining-polish`

---

## Before Writing Code

1. Read `node_modules/next/dist/docs/` for any Next.js API you're about to use.
2. For Google Maps / Routes / Places APIs, verify the current SDK method signatures — they change frequently.
3. Check `REQUIREMENTS.md` for scope and completion status. Don't build what isn't listed.
4. Run `docker compose up -d` and verify DB is healthy before any Prisma work.
5. **Do NOT use `prisma migrate dev`** — it is permanently broken on this project due to a P3006 shadow-DB error (a migration name without a time portion breaks the shadow database). Use the manual workflow instead:

```bash
# 1. Write SQL manually in prisma/migrations/<timestamp>_<name>/migration.sql
# 2. Apply it directly:
npx prisma db execute --file prisma/migrations/<timestamp>_<name>/migration.sql
# 3. Mark it applied so Prisma tracks it:
npx prisma migrate resolve --applied <timestamp>_<name>
# 4. Regenerate the client:
npx prisma generate
```

---

## Code Conventions

### General

- All API routes validate input before touching the DB.
- Server-only code (Prisma, secrets) never imported into Client Components.
- Use TanStack Query for all data fetching in Client Components — no raw `fetch` in `useEffect`.
- Zustand stores hold UI state only (selected day, active route, dark mode). Server state lives in TanStack Query cache.
- Design tokens in `globals.css` — no hardcoded colors in components.

### Server vs. client code split

Some logic is needed in both API routes (server) and React components (client). **Never share a file that imports Prisma** into the client bundle. Instead, create a parallel `*-client.ts` in `src/lib/` that mirrors the pure logic without any Prisma or Node.js imports.

Example: `src/services/route-cache.service.ts` (server, uses Prisma) is mirrored by `src/lib/route-cache-client.ts` (client-safe, plain TypeScript). Both export the same logical functions; the client version operates on plain objects that match the Prisma shape.

### Route cache invalidation

Any API handler that mutates spots, travel modes, or accommodations **must** clear the relevant route cache. The pattern:

```ts
// Non-blocking — don't await, don't let cache errors fail the request
clearDayRouteCache(dayId).catch(() => {});
```

Use the right granularity:
- Spot added / deleted / reordered → `clearDayRouteCache(dayId)`
- Spot `travelModeToNext` changed → `clearSpotLegCache(spotId)`
- Day `defaultTravelMode` changed → `clearDayRouteCache(dayId)`
- Night accommodation changed → `clearDayEndpointLegCache(dayId)` for affected day(s)
- Arrival / departure changed → `clearDayEndpointLegCache` for first / last day

### Sentinel IDs for endpoint legs

The Google Routes API pipeline and the route cache both use two sentinel spot IDs to represent non-spot endpoints:

- `__endpoint_start__` — the arrival location or previous night's hotel
- `__endpoint_end__` — the departure location or current night's hotel

These appear as `startSpotId` / `endSpotId` on `RouteLeg` objects, in `persistRouteLegs`, in `buildRouteFromCache`, and in `ConnectorRow` rendering. Any code that processes legs must handle these sentinel values explicitly — they are not real `Spot` IDs.

### Async persist / cache pattern

Route leg data is persisted to the DB **fire-and-forget** to avoid blocking the HTTP response:

```ts
persistRouteLegs(dayId, result).catch((e) =>
  console.error("[handler] persistRouteLegs failed:", e)
);
return NextResponse.json(result); // returned immediately
```

Cache clears in mutating handlers are also fire-and-forget (`.catch(() => {})`). Errors here should never surface to the user — the worst outcome is a stale cache that causes one extra Google API call.
