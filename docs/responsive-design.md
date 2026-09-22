# AuraNER / NER-Route AI — Responsive Design & Layout Grid

## 1. Breakpoint Grid & Display Strategy

The web portal and mobile views adapt seamlessly across a diverse device spectrum—from dual-monitor command center desks to field-rugged Panasonic Toughbooks, vehicle-mounted Android tablets, and handheld smartphones.

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                             BREAKPOINT SYSTEM                               │
├──────────────┬──────────────┬───────────────────┬───────────────────────────┤
│ Breakpoint   │ Min Width    │ Target Hardware   │ Layout Topology           │
├──────────────┼─────────────-┼───────────────────┼───────────────────────────┤
│ `2xl`        │ 1536px       │ 4K / Ultrawide    │ 3-Pane Command Center     │
│ `xl`         │ 1280px       │ 1080p Desktop     │ 2-Pane Split Radar        │
│ `lg`         │ 1024px       │ Laptop / Toughbook│ Collapsed Sidebar + Canvas│
│ `md`         │ 768px        │ Rugged Cab Tablet │ Single Pane + Bottom Sheet│
│ `sm`         │ 640px        │ Large Smartphone  │ Full-width Stacked Feed   │
│ `xs`         │ < 640px      │ Compact Mobile    │ Mobile Tabbed Navigation  │
└──────────────┴──────────────┴───────────────────┴───────────────────────────┘
```

---

## 2. Responsive Layout Topologies

### 2.1 Ultrawide / 4K Displays (`≥ 1536px`)
- **Topology**: 3-column persistent command center.
  - Column 1 (`260px`): Persistent system navigation and tenant organization switcher.
  - Column 2 (`Flex 1`): Ultra-high-resolution MapLibre GL vector canvas.
  - Column 3 (`440px`): Multi-tab situational panel (Tab 1: Live Alert Triage; Tab 2: Vehicle Telemetry Telematics; Tab 3: AI Copilot Assistant).
- **Benefit**: Dispatchers never lose map context while conversing with AI or resolving incoming alerts.

### 2.2 Standard Desktop (`1024px` to `1535px`)
- **Topology**: 2-column operational radar.
  - Left: Interactive vector map with embedded layer controls (`60%` width).
  - Right: Scrollable list of active shipments and prioritized alerts (`40%` width).
  - Sidebar: Collapsible between `260px` (expanded with labels) and `72px` (icon-only rail).

### 2.3 Tablets & In-Cab Mounted Displays (`768px` to `1023px`)
- **Topology**: Full-screen spatial canvas with floating bottom drawer.
  - Sidebar collapses into an off-canvas drawer opened via hamburger icon.
  - Map occupies `100%` viewport width.
  - Situational alerts dock as a swipeable bottom sheet (`h-16` peek height, expandable to `h-96`).
  - All interactive buttons expand to touch-friendly sizes ($\ge 48\times48\text{px}$).

### 2.4 Mobile Web & Smartphones (`< 768px`)
- **Topology**: Single-column vertical stream.
  - Top navigation collapses into a sticky header with breadcrumb and crisis indicator.
  - Split views convert into sequential tabs (e.g. `[Map Radar View]` | `[Shipments Feed]`).
  - Data tables convert into swipeable responsive cards.
  - Modals convert into bottom sheets sliding up from the screen bottom (`rounded-t-2xl`).

---

## 3. Component-Level Responsive Behaviors

### 3.1 Data Tables (`DataTable.tsx`)
On constrained viewports, data tables automatically prioritize high-value operational columns and hide auxiliary data behind an expandable chevron drawer:

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                          RESPONSIVE DATA TABLE                              │
├─────────────────┬──────────┬──────────┬──────────┬──────────────────────────┤
│ Column          │ Desktop  │ Laptop   │ Tablet   │ Mobile Card Fallback     │
├─────────────────┼──────────┼──────────┼──────────┼──────────────────────────┤
│ Tracking Code   │ Visible  │ Visible  │ Visible  │ Visible (Title)          │
│ Priority Pill   │ Visible  │ Visible  │ Visible  │ Visible (Top Right Chip) │
│ Status Chip     │ Visible  │ Visible  │ Visible  │ Visible (Bottom Pill)    │
│ Origin / Dest   │ Visible  │ Visible  │ Visible  │ Visible (Subtitle)       │
│ Vehicle Reg     │ Visible  │ Visible  │ Hidden*  │ Hidden*                  │
│ Cargo Weight    │ Visible  │ Hidden*  │ Hidden*  │ Hidden*                  │
│ Cold Chain Flag │ Visible  │ Visible  │ Hidden*  │ Visible (Snowflake Icon) │
│ Action Button   │ Visible  │ Visible  │ Visible  │ Visible (Full Width Btn) │
└─────────────────┴──────────┴──────────┴──────────┴──────────────────────────┘
* Accessible via row tap expansion.
```

### 3.2 Dispatch 7-Step Wizard (`/dispatch/new`)
- **Desktop**: Horizontal 7-step breadcrumb bar showing completed, current, and upcoming stages.
- **Tablet / Mobile**: Compact circular step counter (e.g. "Step 3 of 7: Cargo Specification") with horizontal progress bar.

### 3.3 Modal & Dialog Adaptations
- **Desktop**: Floating centered dialog with `max-w-lg` and backdrop blur.
- **Mobile**: Anchored bottom sheet filling `100%` width with a top grab handle and full-width affirmative action button.
