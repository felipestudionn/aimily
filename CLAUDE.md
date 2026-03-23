# aimily

Fashion collection management platform for planning, designing, and launching clothing/footwear collections.

## Tech Stack
- **Framework**: Next.js 16 (App Router) + React 19 + TypeScript
- **Styling**: Tailwind CSS 3.3 + Radix UI + Lucide icons
- **Backend**: Supabase (PostgreSQL + Auth), project ID `sbweszownvspzjfejmfx`
- **AI**: Google Gemini 2.5 Flash Lite, Anthropic Claude Sonnet (SketchFlow)
- **Deployment**: Vercel

## Project Structure
```
src/
  app/                        # Next.js App Router pages
    collection-calendar/      # Standalone timeline calendar
    collection-calendar/[id]/ # Collection-linked timeline calendar
    api/collection-timelines/ # REST API for timeline CRUD
  components/
    timeline/GanttChart.tsx   # Interactive Gantt chart (drag, resize, inline edit)
    layout/navbar.tsx         # Shared navigation
    ui/                       # shadcn-style components
  lib/
    timeline-template.ts      # Phase config, default milestones, date math
    export-timeline-excel.ts  # Excel export with ExcelJS
    supabase-admin.ts         # Supabase service-role client
  types/
    timeline.ts               # Core timeline types
  contexts/
    AuthContext.tsx            # Supabase auth context
```

## Conventions
- Feature pages: `'use client'`, `<Navbar />`, bg `bg-[#fff6dc]`, `pt-28 pb-16 px-4`
- API routes: `export async function POST(req: NextRequest)` with `NextResponse.json()`
- Auth: `useAuth()` from `@/contexts/AuthContext`, Supabase session
- Bilingual: all milestones have `name` (EN) + `nameEs` (ES), UI has EN/ES toggle

## Security
- ALL API routes MUST use `getAuthenticatedUser()` from `@/lib/auth-guard`
- Verify collection ownership before data access: `user_id === collection.user_id`
- Never use `supabaseAdmin` where user-scoped access is sufficient
