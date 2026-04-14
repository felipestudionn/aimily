# WorkspaceShell — Session Prompt

## Context
Read `design-system-v2.md` in memory FIRST. It has all the design decisions, colors, typography, component architecture, and what's been built.

## What's Done
- Sidebar navigation: 4 blocks × 4 mini-blocks, expandable, active pill state, SKU count badges
- Dashboard: 4 block cards in horizontal row, sub-dashboards with zoom animation
- Design tokens: colors (#EBEAE6 sidebar, #F3F2F0 workspace), typography (negative tracking), Daniel Cross reference
- Clean workspace layout for Consumer Definition (centered, mode selector, no redundant headers)
- Collection Builder phase filtering via ?phase= query params
- Daniel Cross React export cloned at `references/daniel-cross-react/`

## The Problem
Navigating from sub-dashboard to workspace causes a page flash (URL change). Dashboard→sub-dashboard is smooth (state-based), but sub-dashboard→workspace is broken because it navigates to a different Next.js page.

## The Task: Build WorkspaceShell

### Architecture
Replace `CollectionHubShell.tsx` + `WizardLayout.tsx` with a unified `WorkspaceShell.tsx`:

```
WorkspaceShell
  ├── Sidebar (WizardSidebar — unchanged)
  ├── TopBar (Navbar — unchanged)  
  └── ViewPort
        state: 'dashboard' | 'sub-dashboard:{blockId}' | 'workspace:{workspaceId}'
        
        Transitions (all animated, no page navigation):
        dashboard → sub-dashboard   (already works in CollectionOverview)
        sub-dashboard → workspace   (TO BUILD — card expands, workspace fades in)
        workspace → sub-dashboard   (TO BUILD — workspace fades out, cards appear)
        sidebar click → workspace   (TO BUILD — direct, with animation)
```

### Key Decisions
1. Workspaces are React.lazy loaded components — NOT inlined
2. URL updates via `router.replace()` for deep-linking — NOT `router.push()`
3. Collection Builder gets `fullWidth` mode in the viewport
4. All transitions use spring animation: `cubic-bezier(0.32, 0.72, 0, 1)`, 400-600ms
5. The ViewPort manages mounting/unmounting of workspace components
6. Workspace components receive standardized props (collectionId, collectionName, etc.)

### Files to Create/Modify
- CREATE: `src/components/workspace/WorkspaceShell.tsx` — the main orchestrator
- CREATE: `src/components/workspace/ViewPort.tsx` — animated view container
- MODIFY: `src/app/collection/[id]/layout.tsx` — use WorkspaceShell
- MODIFY: `src/app/collection/[id]/CollectionHubShell.tsx` — simplify or merge
- MODIFY: `src/components/wizard/WizardSidebar.tsx` — emit navigation events instead of Links
- KEEP: `src/app/collection/[id]/CollectionOverview.tsx` — dashboard + sub-dashboard views
- KEEP: All workspace page components (creative, merchandising, brand, marketing, etc.)

### Workspace Component Interface
Each workspace should export a component that accepts:
```tsx
interface WorkspaceProps {
  collectionId: string;
  collectionName: string;
  season?: string;
  blockParam?: string; // e.g. 'consumer', 'moodboard'
}
```

### Animation Spec (from Daniel Cross)
- Spring: `bounce: 0.2, duration: 0.4, type: "spring"` (Framer Motion)
- CSS equivalent: `cubic-bezier(0.32, 0.72, 0, 1)` at 400-500ms
- Exit: opacity 0 + scale 0.96 + translateY 8px
- Enter: opacity 0→1 + scale 0.96→1 + translateY 8px→0, staggered 100ms per element

### What NOT to Change
- Sidebar design (WizardSidebar.tsx) — approved
- Dashboard card design (CollectionOverview) — approved  
- Design tokens (colors, typography) — approved
- Any backend functionality (API routes, hooks, data)
- The Daniel Cross reference repo

### Quality Standards
- Enterprise-ready: no patches, no shortcuts
- Transitions must be seamless — like navigating inside an iPad app
- Zero flash of wrong background color between views
- The sidebar active state must update instantly on view change
- Deep-linking must work (copy URL → paste → lands on correct workspace)
