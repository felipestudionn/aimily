# Alfred Integration Guide — aimily Milestones as Tasks

This document explains how the aimily timeline system works so that **Alfred** (the user's personal assistant from another project) can read milestones and present them as actionable tasks/todos.

---

## Overview

aimily manages **fashion collection timelines** — each collection has a launch date and ~41 milestones organized in 9 phases. Each milestone has a start date, duration, status, and responsible party. Alfred should treat these milestones as the user's task list for collection launches.

---

## User Matching

Alfred should match users by **email**. The relevant tables are:

- **`auth.users`** — Supabase Auth users (has `email` field)
- **`public.user`** — App user profiles (has `email` field, unique)
- **`public.collection_plans`** — Each plan has a `user_id` (FK to `auth.users.id`)

**Flow**: Look up the user by email in `auth.users` → get their `id` → query `collection_plans` where `user_id = id` → for each plan, query `collection_timelines`.

---

## Data Sources

### 1. Supabase (collection-linked timelines)

These are timelines linked to a specific collection plan in the database.

**Table: `collection_timelines`**
| Column | Type | Description |
|---|---|---|
| `id` | uuid | Primary key |
| `collection_plan_id` | uuid | FK to `collection_plans.id` (unique) |
| `launch_date` | date | The collection launch date (e.g. `2027-02-01`) |
| `milestones` | jsonb | Array of milestone objects (see schema below) |
| `created_at` | timestamptz | |
| `updated_at` | timestamptz | |

**Table: `collection_plans`**
| Column | Type | Description |
|---|---|---|
| `id` | uuid | Primary key |
| `user_id` | uuid | FK to `auth.users.id` |
| `name` | text | Collection name (e.g. "VAKSA") |
| `season` | text | Season (e.g. "SS27", "FW26") |
| `status` | text | Plan status |

**API Endpoint** (if preferred over direct DB access):
```
GET /api/collection-timelines?planId={collection_plan_id}
```
Returns the full timeline object or `null`.

### 2. Supabase (standalone timelines)

Standalone timelines (not linked to a specific collection plan) are also synced to Supabase when the user is logged in.

**Table: `standalone_timelines`**
| Column | Type | Description |
|---|---|---|
| `id` | uuid | Primary key |
| `user_id` | uuid | FK to `auth.users.id` |
| `collection_name` | text | Name (e.g. "VAKSA") |
| `season` | text | Season (e.g. "SS27") |
| `launch_date` | date | Launch date |
| `milestones` | jsonb | Array of milestone objects (same schema as above) |
| `created_at` | timestamptz | |
| `updated_at` | timestamptz | |

**Unique constraint**: `(user_id, collection_name, season)` — one standalone timeline per collection+season per user.

**API Endpoint**:
```
GET  /api/standalone-timelines?userId={auth_user_id}
POST /api/standalone-timelines  (body: { user_id, collection_name, season, launch_date, milestones })
```

> Note: Standalone timelines are also cached in `localStorage` key `"aimily_collection_timelines"` for offline/fast access, but the Supabase copy is the source of truth for Alfred.

---

### 3. Alfred Dedicated API (recommended)

The easiest way for Alfred to get all milestones is the dedicated endpoint:

```
GET /api/alfred-milestones?email=user@example.com
```

**Response**:
```json
{
  "user_email": "user@example.com",
  "total_tasks": 41,
  "pending": 30,
  "in_progress": 5,
  "completed": 6,
  "overdue": 2,
  "tasks": [
    {
      "id": "ow-1",
      "title": "Trend Research & Moodboarding",
      "title_es": "Investigación de tendencias y moodboarding",
      "phase": "aimily",
      "responsible": "US",
      "status": "pending",
      "start_date": "2026-03-02",
      "end_date": "2026-03-23",
      "duration_weeks": 3,
      "collection": "VAKSA SS27",
      "launch_date": "2027-02-01",
      "is_user_task": true,
      "is_overdue": false,
      "notes": null
    }
  ]
}
```

Tasks are pre-sorted: overdue first, then in-progress, then by start date. Dates are pre-computed from relative weeks. `is_user_task` is `true` when `responsible` is `US`, `ALL`, or `AGENCY/US`.

This endpoint queries **both** collection-linked timelines and standalone timelines for the user.

---

## Milestone Data Schema

Each milestone in the `milestones` JSONB array has this structure:

```typescript
interface TimelineMilestone {
  id: string;              // Unique ID (e.g. "ow-1", "br-2", "ds-3")
  phase: TimelinePhase;    // One of 9 phases (see below)
  name: string;            // English name
  nameEs: string;          // Spanish name
  responsible: Responsible; // Who does this: "US" | "FACTORY" | "ALL" | "AGENCY/US"
  startWeeksBefore: number; // Weeks before launch date (higher = earlier)
  durationWeeks: number;   // Duration in weeks
  color: string;           // Hex color for UI
  status: MilestoneStatus; // "pending" | "in-progress" | "completed"
  notes?: string;          // Optional free-text notes
}
```

### Computing Actual Dates

Milestones don't store absolute dates — they store **weeks relative to the launch date**. To compute:

```
Start date = launch_date - (startWeeksBefore × 7 days)
End date   = start_date + (durationWeeks × 7 days)
```

**Example**: If `launch_date = 2027-02-01` and a milestone has `startWeeksBefore: 48`, `durationWeeks: 3`:
- Start = 2027-02-01 minus 336 days = **2026-03-02**
- End = 2026-03-02 plus 21 days = **2026-03-23**

```javascript
function getMilestoneStartDate(launchDate, startWeeksBefore) {
  const launch = new Date(launchDate);
  const start = new Date(launch);
  start.setDate(start.getDate() - startWeeksBefore * 7);
  return start;
}

function getMilestoneEndDate(launchDate, startWeeksBefore, durationWeeks) {
  const start = getMilestoneStartDate(launchDate, startWeeksBefore);
  const end = new Date(start);
  end.setDate(end.getDate() + durationWeeks * 7);
  return end;
}
```

---

## The 9 Phases (in order)

| Phase Key | Name (EN) | Name (ES) | Color | Typical Weeks Before Launch |
|---|---|---|---|---|
| `aimily` | Product & Merchandising | Product & Merchandising | #FF6B6B | 48–39 |
| `brand` | Brand & Identity | Marca e Identidad | #4ECDC4 | 46–34 |
| `design` | Design & Development | Diseño y Desarrollo | #F5A623 | 36–26 |
| `prototyping` | Prototyping | Prototipado | #7B68EE | 28–16 |
| `sampling` | Sampling | Muestrario | #E91E63 | 19–10 |
| `digital` | Digital Presence | Presencia Digital | #9C27B0 | 30–10 |
| `marketing` | Marketing Pre-launch | Marketing Pre-lanzamiento | #FF9800 | 20–3 |
| `production` | Production | Producción | #2196F3 | 10–1 |
| `launch` | Launch | Lanzamiento | #F44336 | 4 to -3 |

---

## Responsible Parties

| Value | Meaning |
|---|---|
| `US` | The brand team (the user) |
| `FACTORY` | The manufacturing partner |
| `AGENCY/US` | Shared between agency and brand team |
| `ALL` | Everyone involved |

Alfred should **highlight milestones where `responsible` is `"US"` or `"ALL"`** — these are the ones the user needs to act on directly.

---

## How Alfred Should Use This Data

### 1. Fetch the user's timelines

```sql
-- Get all collection plans for a user (by email)
SELECT cp.id, cp.name, cp.season, ct.launch_date, ct.milestones
FROM collection_plans cp
JOIN auth.users au ON cp.user_id = au.id
LEFT JOIN collection_timelines ct ON ct.collection_plan_id = cp.id
WHERE au.email = 'user@example.com';
```

### 2. Convert milestones to tasks

For each milestone in the `milestones` JSONB array:

```python
# Pseudocode
for milestone in timeline.milestones:
    if milestone.status == "completed":
        continue  # Skip done tasks

    start_date = compute_start_date(timeline.launch_date, milestone.startWeeksBefore)
    end_date = compute_end_date(start_date, milestone.durationWeeks)

    task = {
        "title": milestone.name,           # or milestone.nameEs for Spanish
        "due_date": end_date,               # deadline = end of milestone window
        "start_date": start_date,
        "status": milestone.status,         # "pending" or "in-progress"
        "responsible": milestone.responsible,
        "phase": milestone.phase,
        "collection": f"{plan.name} {plan.season}",
        "is_user_task": milestone.responsible in ["US", "ALL", "AGENCY/US"],
        "is_overdue": end_date < today and milestone.status != "completed",
        "priority": "high" if milestone.responsible == "US" else "normal",
    }
```

### 3. Prioritization logic

Alfred should sort/prioritize tasks by:
1. **Overdue** milestones first (end_date < today, status != completed)
2. **In-progress** milestones second
3. **Starting soon** (start_date within next 2 weeks)
4. **Responsible = "US"** milestones get higher priority than "FACTORY"

### 4. Status sync

If Alfred updates a milestone status, it should:
1. Read the full `milestones` JSONB array from `collection_timelines`
2. Find the milestone by `id`
3. Update its `status` field to `"pending"` | `"in-progress"` | `"completed"`
4. Write back the entire array (JSONB update)

```sql
-- Example: Mark milestone "br-2" as completed
UPDATE collection_timelines
SET milestones = (
  SELECT jsonb_agg(
    CASE
      WHEN elem->>'id' = 'br-2'
      THEN jsonb_set(elem, '{status}', '"completed"')
      ELSE elem
    END
  )
  FROM jsonb_array_elements(milestones) elem
),
updated_at = now()
WHERE collection_plan_id = 'xxx';
```

Or via the API:
```
POST /api/collection-timelines
Content-Type: application/json

{
  "collection_plan_id": "xxx",
  "launch_date": "2027-02-01",
  "milestones": [ ...updated milestones array... ]
}
```

---

## Current Default Timeline

The default template is a **48-week timeline** starting ~March 1, 2026 for a February 1, 2027 launch. It contains **41 milestones** across 9 phases. See [src/lib/timeline-template.ts](src/lib/timeline-template.ts) for the full list.

Key milestone IDs follow the pattern: `{phase_prefix}-{number}`
- `ow-1` to `ow-5` — Product & Merchandising
- `br-1` to `br-4` — Brand & Identity
- `ds-1` to `ds-5` — Design & Development
- `pt-1` to `pt-4` — Prototyping
- `sm-1` to `sm-4` — Sampling
- `dg-1` to `dg-5` — Digital Presence
- `mk-1` to `mk-6` — Marketing Pre-launch
- `pd-1` to `pd-4` — Production
- `ln-1` to `ln-4` — Launch

---

## Important Notes for Alfred

1. **Dates are computed, not stored** — Always calculate from `launch_date` + `startWeeksBefore`. The UI may shift milestones via drag-and-drop, which updates `startWeeksBefore` and `durationWeeks`.
2. **Bilingual** — Use `name` for English, `nameEs` for Spanish. The user prefers English by default.
3. **User tasks** — Focus on `responsible: "US"` and `responsible: "ALL"`. Tasks with `responsible: "FACTORY"` are external dependencies to track but not assign to the user.
4. **New milestones can be added** — The user can create custom milestones via the Gantt UI. Always read the live data, don't assume the default 41.
5. **Multiple collections** — A user can have multiple collection plans, each with its own timeline. Present them grouped by collection.
6. **Supabase project**: `sbweszownvspzjfejmfx`
