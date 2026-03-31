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
Scopes (optional): `auth`, `db`, `api`, `map`, `itinerary`, `trip`, `ui`, `services`

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

### Phase 1 — Foundation
Auth, database, schema, basic Trip/Day/Spot CRUD.

**Exit criteria:**
- Google SSO works locally
- `prisma migrate dev` runs clean against Docker Postgres
- Can create/list/delete a trip via API routes

**Tag:** `phase/1-foundation`

---

### Phase 2 — Map Integration
Google Maps render, place search/autocomplete, pin display, drag-and-drop reorder.

**Exit criteria:**
- Map renders with color-coded pins per SpotType
- Pins numbered by itinerary order
- Places Autocomplete adds a spot to a day
- Drag-and-drop reorders spots within and across days

**Tag:** `phase/2-map`

---

### Phase 3 — Route Optimization
Google Routes API integration, waypoint optimization, polyline rendering.

**Exit criteria:**
- "Save Time" optimization reorders spots and renders polyline
- "Comfortable" optimization works as a second mode
- Duration + distance displayed per optimized route

**Tag:** `phase/3-optimization`

---

### Phase 4 — Polish & Ship
Dark mode, mobile layout, trip sharing, export.

**Exit criteria:**
- Dark mode toggles via system preference and manual override
- Mobile layout uses Sheet-based sidebar
- Public share link renders read-only trip view
- PDF or Google Calendar export works

**Tag:** `phase/4-polish`

---

## Before Writing Code

1. Read `node_modules/next/dist/docs/` for any Next.js API you're about to use.
2. For Google Maps / Routes / Places APIs, verify the current SDK method signatures — they change frequently.
3. Check `REQUIREMENTS.md` for scope. Don't build what isn't listed.
4. Run `docker compose up -d` and verify DB is healthy before any Prisma work.

## Code Conventions

- All API routes validate input before touching the DB.
- Server-only code (Prisma, secrets) never imported into Client Components.
- Use TanStack Query for all data fetching in Client Components — no raw `fetch` in `useEffect`.
- Zustand stores hold UI state only (selected day, selected spot, map bounds). Server state lives in TanStack Query cache.
- Design tokens in `globals.css` — no hardcoded colors in components.
