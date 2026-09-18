---
name: MELCHUB
description: A calm, restrained admin + borrower-portal system for a Philippine informal lending operation, with a colorful data layer and a native-app mobile shell.
colors:
  trust-violet:
    value: "oklch(0.49 0.24 264)"
    darkValue: "oklch(0.73 0.22 264)"
  neutral-bg:
    value: "oklch(0.99 0.003 264)"
    darkValue: "oklch(0.16 0.015 264)"
  neutral-fg:
    value: "oklch(0.16 0.03 264)"
    darkValue: "oklch(0.96 0.005 264)"
  surface-card:
    value: "oklch(1 0 0)"
    darkValue: "oklch(0.21 0.02 264)"
  neutral-secondary:
    value: "oklch(0.96 0.01 264)"
    darkValue: "oklch(0.27 0.02 264)"
  neutral-muted-fg:
    value: "oklch(0.48 0.02 264)"
    darkValue: "oklch(0.7 0.02 264)"
  accent-tint:
    value: "oklch(0.91 0.06 264)"
    darkValue: "oklch(0.32 0.09 264)"
  muted-alarm-red:
    value: "oklch(0.577 0.245 27.325)"
    darkValue: "oklch(0.704 0.191 22.216)"
  amber-caution:
    value: "oklch(0.666 0.179 58)"
    darkValue: "oklch(0.83 0.16 80)"
  settled-green:
    value: "oklch(0.6 0.145 163)"
    darkValue: "oklch(0.77 0.15 163)"
  border-hairline:
    value: "oklch(0.91 0.01 264)"
    darkValue: "oklch(1 0 0 / 10%)"
  data-teal:
    value: "oklch(0.6 0.19 165)"
    darkValue: "oklch(0.72 0.17 165)"
  data-amber:
    value: "oklch(0.72 0.22 70)"
    darkValue: "oklch(0.8 0.19 70)"
  data-rose:
    value: "oklch(0.56 0.26 22)"
    darkValue: "oklch(0.7 0.22 22)"
  data-magenta:
    value: "oklch(0.56 0.22 320)"
    darkValue: "oklch(0.7 0.19 320)"
typography:
  body:
    fontFamily: "Geist, ui-sans-serif, system-ui"
    fontWeight: 400
    lineHeight: 1.5
  heading:
    fontFamily: "Geist, ui-sans-serif, system-ui"
    fontWeight: 600
    lineHeight: 1.3
  mono:
    fontFamily: "Geist Mono, ui-monospace, monospace"
rounded:
  sm: "0.6rem"
  md: "0.8rem"
  lg: "1rem"
  xl: "1.4rem"
  2xl: "1.8rem"
components:
  button-primary:
    backgroundColor: "{colors.trust-violet}"
    textColor: "{colors.neutral-bg}"
    rounded: "{rounded.lg}"
    padding: "0.5rem 0.625rem"
  button-destructive:
    backgroundColor: "{colors.muted-alarm-red}"
    textColor: "{colors.muted-alarm-red}"
    rounded: "{rounded.lg}"
    padding: "0.5rem 0.625rem"
  card:
    backgroundColor: "{colors.surface-card}"
    textColor: "{colors.neutral-fg}"
    rounded: "{rounded.xl}"
    padding: "1rem"
  badge-success:
    backgroundColor: "{colors.settled-green}"
    textColor: "{colors.settled-green}"
    rounded: "{rounded.md}"
    padding: "0.125rem 0.5rem"
  stat-tile:
    backgroundColor: "{colors.data-teal}"
    textColor: "{colors.data-teal}"
    rounded: "{rounded.xl}"
    padding: "0.875rem"
---

# Design System: MELCHUB

## Overview

**Creative North Star: "The Calm Ledger, in color"**

MELCHUB's visual system is still a quiet, competent back-office tool at its core — one cool blue-violet accent carries every action, and status colors stay tinted rather than shouted. What changed is the data layer: the five chart hues that used to live only inside the Analytics charts now double as **Data Color Roles**, giving every metric tile and every borrower row its own recognizable color and a round, tinted icon badge instead of a flat white card with a gray label. The system reads less like a spreadsheet and more like a modern consumer finance app, without touching the single-typeface, tinted-never-solid, or ambient-shadow rules that make it feel trustworthy.

Depth is unchanged: a soft, primary-hue-tinted ambient shadow lifts cards and buttons slightly off the background, paired with a faint ring border — never a hard drop shadow, never a bevel. Corners are rounder than before (`--radius` moved from 12px to 16px) so the whole system reads friendlier and more "installed app" than "internal tool," and interactive elements still give one small tactile cue — buttons nudge down 1px on press.

Below `lg`, both apps are a bottom-tab-bar phone app, not a shrunk desktop site: a fixed bottom tab bar replaces the hamburger drawer, overflow nav items and account actions (theme, install, log out) collapse into a "More" bottom sheet, and every modal becomes a bottom sheet instead of a centered dialog. See Layout and Components below.

**Key Characteristics:**
- One accent hue (blue-violet, ~264° in OKLCH) still carries every primary action, link, focus ring, and active nav state — the One Accent Rule below is now scoped to *action* color specifically, not to color in general.
- Five chart hues (`chart-1`…`chart-5`, already used in Analytics) are also **Data Color Roles**: they color-code stat tiles and give every borrower an avatar, deterministically, by name — never used for primary actions.
- One typeface, two weights: Geist Sans for everything, Geist Mono unused in the interface itself.
- Status is still always communicated by a tinted background + colored text/icon, never a solid saturated fill.
- Depth is ambient and uniform: the same two-layer soft shadow formula appears on every card and default button, including the new colorful stat tiles (tinted from that tile's own hue, not just the primary hue).
- Shapes are rounder system-wide (`--radius: 1rem`), and icon badges throughout are circular (`rounded-full`), not square.
- On phone widths, the app is a bottom-tab-bar shell with sheet-style modals — see Layout.

## Colors

The palette is no longer "one accent, three status hues, and neutrals" — it now has a fourth role: a five-hue **data** set, reserved for color-coding metrics and people rather than actions or status.

### Primary (action)
- **Deep Trust Violet** (`oklch(0.49 0.24 264)`, dark mode `oklch(0.73 0.22 264)`): every primary button, active nav item, link, focus ring, and the sidebar/login "M" mark (now a subtle violet→magenta gradient — see Named Rules). The single color users associate with "this is the important action here."

### Data (metrics & people)
Five OKLCH hues, already defined as `--chart-1`…`--chart-5` for the Analytics charts, reused at low-opacity tint for stat tiles and avatars:
- **`chart-1`** (≈ primary hue, 264°): the first/lead metric on a page (e.g. borrower count, "Principal").
- **`chart-2` / Data Teal** (`oklch(0.6 0.19 165)`): money-in metrics (loaned, balance).
- **`chart-3` / Data Amber** (`oklch(0.72 0.22 70)`): money-collected / in-progress metrics.
- **`chart-4` / Data Rose** (`oklch(0.56 0.26 22)`): risk metrics (outstanding, interest, overdue).
- **`chart-5` / Data Magenta** (`oklch(0.56 0.22 320)`): a fifth category slot (status breakdowns, "More" overflow).

Borrower avatars pick one of the five, deterministically hashed from the borrower's name — the same person always lands on the same color, with no field to store or keep in sync.

### Neutral
- **Paper White** (`oklch(0.99 0.003 264)`, dark `oklch(0.16 0.015 264)`): page background.
- **Ink** (`oklch(0.16 0.03 264)`, dark `oklch(0.96 0.005 264)`): primary text.
- **Card White** (`oklch(1 0 0)`, dark `oklch(0.21 0.02 264)`): card/modal/popover surfaces.
- **Quiet Tint** (`oklch(0.96 0.01 264)`, dark `oklch(0.27 0.02 264)`): secondary buttons, muted backgrounds, hover fills.
- **Faded Ink** (`oklch(0.48 0.02 264)`, dark `oklch(0.7 0.02 264)`): secondary/muted text, placeholders, helper copy.
- **Hairline** (`oklch(0.91 0.01 264)`, dark `oklch(1 0 0 / 10%)`): borders and dividers outside the colorful tiles — always subtle, never a strong rule.

### Named Rules
**The Tinted, Never Solid Rule.** Status and destructive signaling — badges, alerts, the destructive button, and every data-color icon badge — always uses a low-opacity tinted background with full-saturation text/icon color on top, never a solid saturated fill. This is also what keeps the new colorful stat tiles legible: the tile's gradient wash stays under ~12% opacity, and only the small icon badge and the (already-contrast-checked) chart-color text ever reach full saturation.

**The Action/Data Split (replaces the old "One Accent Rule").** Color outside the neutral scale now has exactly two jobs: the trust-violet primary owns *actions* (buttons, links, active nav, focus), and the five chart hues own *data* (stat tiles, avatars, chart series). Nothing outside those two roles introduces a new color — a component that isn't an action and isn't a metric/person stays neutral.

**The Gradient Mark Rule.** The "M" brand mark (login heroes, sidebar, mobile app bar) is a two-stop gradient from primary to a primary/`chart-5` mix, not a flat fill — the one place brand color is allowed to move, everywhere else color is flat.

## Typography

**Body Font:** Geist, with `ui-sans-serif, system-ui` fallback
**Heading Font:** Geist (same family; distinguished by weight/size only — see the Named Rule below)
**Mono Font:** Geist Mono (loaded via CSS variable, not currently used by any visible component)

**Character:** Restrained and tactile — plain-spoken, not editorial. No serif, no display face, no italics anywhere in the reviewed surfaces.

### Hierarchy
- **Title** (600 weight, `text-3xl`/1.875rem on login heroes and page headings, `text-lg`/1.125rem in modal/card titles, snug line-height): page and modal headlines ("Welcome back", modal titles).
- **Body** (400 weight, `text-sm`/0.875rem base, 1.5 line-height): all form labels, table content, descriptions, button labels.
- **Label/Muted** (400-500 weight, `text-xs`/0.75rem, muted-foreground color): helper text, badge text, timestamps. Stat-tile labels drop to `text-xs` on phone width, `text-sm` at `sm` and up, to fit a 2-column mobile grid.

### Named Rules
**The One Typeface Rule.** Geist Sans serves both headings and body copy (`--font-heading` is aliased directly to `--font-sans`). Hierarchy is built entirely from weight and size, never from a second typeface.

## Layout

A single shared `AppShell` component drives both the admin and portal apps.

**Desktop (`lg`, 1024px, and up):** unchanged — a persistent left sidebar (`w-60`, 240px), full nav item list, brand mark + account controls in the footer.

**Phone/tablet (below `lg`):** a native-app shell, not a shrunk desktop site:
- A sticky, minimal top app bar (brand mark + app title, safe-area-aware padding for notches) — no hamburger.
- A **fixed bottom tab bar** (safe-area-aware) is the primary navigation: the first four nav items become tabs, and a fifth, always-present **"More" tab** opens a bottom sheet holding any remaining nav items plus the account controls (theme, install, log out) that have no other home on mobile. Admin (7 nav items) shows 4 tabs + More; Portal (3 items) shows all 3 + More.
- Every `<Modal>` (and the hand-rolled `TermsModal` dialog) renders as a **bottom sheet** below `sm` — full-width, pinned to the bottom edge, rounded top corners only, a grab-handle bar, slide-up entrance — and reverts to the original centered dialog at `sm` and up.

Main content area uses `p-4` (16px) padding on mobile, `sm:p-6` (24px) on larger screens, with `min-w-0` to prevent table overflow from breaking the layout, plus bottom padding on phone width to clear the fixed tab bar.

Cards are the primary content-grouping unit throughout (stat tiles, table wrappers, form containers), each carrying its own internal `--card-spacing` token (16px default, 12px in the compact `sm` size variant) rather than ad-hoc padding per instance.

## Elevation & Depth

Ambient and uniform, not directional or skeuomorphic. Every card and default-variant button carries the same two-layer soft shadow, generated from a single `--shadow-color` variable (a low-alpha tint of the primary hue in light mode, pure black at higher alpha in dark mode) rather than a generic gray. A `ring-1 ring-foreground/10` hairline border runs alongside the shadow on neutral cards; colorful stat tiles use the same two-layer shadow but ring in their own hue at low opacity instead of the neutral hairline.

### Shadow Vocabulary
- **Ambient Card/Button Lift** (`0 1px 2px -1px var(--shadow-color), 0 8px 20px -10px var(--shadow-color)` on buttons; `0 1px 2px -1px var(--shadow-color), 0 12px 28px -14px var(--shadow-color)` on cards and stat tiles): the system's only shadow — a close, tight contact shadow plus a wider, very soft ambient glow beneath it. No hover-elevation change; the shadow is a static resting state, not a state-transition cue.

### Named Rules
**The Ambient Glow Rule.** Shadows are tinted by the primary hue (light mode) or pure black (dark mode) on neutral surfaces, always soft and diffuse, never a hard offset shadow implying a specific light-source direction.

## Shapes

A single `--radius` primitive (**16px**, moved up from 12px) drives every corner value in the system via multiplication: `sm` (9.6px, ×0.6) for compact controls, `md` (12.8px, ×0.8) for select/menu popovers, `lg` (16px, ×1, the base) for buttons/inputs, `xl` (22.4px, ×1.4) for cards, modals, and stat tiles, scaling further to `2xl`/`3xl`/`4xl` for larger surfaces and bottom sheets. Icon badges (stat tiles, avatars, card-header icons, bottom-sheet grab handles) are fully circular (`rounded-full`), a deliberate step up from the old "square icon chip" — round is the shape data/people get, the multiplied `--radius` scale is the shape containers get.

## Components

### Buttons
- **Shape:** rounded-lg (16px), border-transparent by default.
- **Primary:** trust-violet background, near-white text, ambient shadow (see Elevation), darkens ~14% (via `color-mix`) on hover.
- **Secondary:** quiet-tint background, ink text, no shadow.
- **Outline / Ghost:** transparent, border or no border, muted-tint hover fill.
- **Destructive:** muted-alarm-red at 10% opacity background with full-saturation red text (Tinted, Never Solid Rule).
- **Link:** primary-colored text, underline on hover only.
- **Press state:** every non-link variant translates 1px down on `:active`.
- **Sizes:** `xs`/`sm`/`default`/`lg` plus matching icon-only squares (`icon-xs` through `icon-lg`). On coarse-pointer (touch) input, every icon-only button gets an invisible 44×44px hit-area overlay (a `::after` sized to `max(100%, 2.75rem)`) without growing the visible icon — the visual density of a dense table row stays the same, the tap target doesn't.

### Cards / Containers
- **Corner Style:** rounded-xl (22.4px).
- **Background:** Card White surface, or — for the new `StatCard` tile — a gradient wash of one data-color hue (from ~12% opacity to transparent) with a matching low-opacity ring instead of the neutral hairline.
- **Shadow Strategy:** Ambient Card Lift (see Elevation).
- **Internal Padding:** `--card-spacing` token, 16px default / 12px compact (`size="sm"`).
- **Header:** CSS container-query-driven grid (`@container/card-header`) by default; card headers that pair a round icon badge with a title/description override to `!flex items-center gap-3` (the `!` is required — `CardHeader`'s base `grid` utility otherwise wins the display-property tie).

### StatCard (`components/ui/stat-card.tsx`)
The colorful metric tile shared by the admin dashboard, analytics, and borrower-portal home: a `tone` prop (`1`–`5`, matching `chart-1`…`chart-5`) selects a literal, pre-written Tailwind class set (gradient wash + ring + badge + icon color) — never built via string interpolation, so Tailwind's static scanner can always see the classes it needs to generate. Renders as a 2-column grid on phone width, 4-column at `lg`.

### Avatar (`components/ui/avatar.tsx`)
A round, tinted initials avatar for every borrower-name context (loan tables/cards, payment-proof and loan-request rows, the portal welcome header, the profile page). Color is picked from the same five data hues by hashing the borrower's name — deterministic, no stored field, always in sync.

### Inputs / Fields
- **Style:** rounded-lg, hairline border, transparent background (subtle tint in dark mode via `bg-input/30`).
- **Focus:** a generous 3px `ring-ring/50` glow plus a border-color shift to the ring color.
- **Error / Disabled:** `aria-invalid` drives a destructive-tinted border + ring; disabled state drops opacity and swaps to a faint filled background.

### Badges
- **Style:** rounded-md (12.8px), compact (`text-xs`, tight padding) — five variants (default/success/warning/destructive/muted), each a tinted background with matching full-saturation text, never an outline or solid fill.

### Modal
- **Style:** native `<dialog>` element. **Below `sm`:** a bottom sheet — full-width, pinned to the bottom edge (`inset-x-0 bottom-0`), rounded top corners only, a grab-handle bar, slide-up entrance, safe-area-aware bottom padding. **At `sm` and up:** the original centered dialog (`inset-0` + `m-auto`, `rounded-xl`, zoom+fade entrance). `TermsModal`'s hand-rolled `<dialog>` (it can't use the shared `Modal` because acceptance is mandatory and `onCancel` must be suppressed) mirrors the same responsive treatment directly. Content area caps at `max-h-[85vh]` (`90vh` on the mobile sheet) with internal scroll.

### Navigation (Sidebar / Bottom Tab Bar)
- **Desktop (`lg`+):** flat list of icon+label items in a dedicated `sidebar` color role. Active/hover states use the trust-violet accent family — no separate "nav accent" color.
- **Phone/tablet (below `lg`):** a fixed bottom tab bar (first four nav items + an always-present "More" tab), sticky minimal top app bar, and a "More" bottom sheet for overflow nav + account actions. Active tabs get a `bg-primary/10` pill behind the icon and a primary-colored, bolder label — the same tinted-badge language used everywhere else, applied to navigation.

## Do's and Don'ts

### Do:
- **Do** keep every status/destructive signal in the tinted-background-plus-colored-text form (Tinted, Never Solid Rule) — including the new colorful stat tiles and icon badges.
- **Do** derive every corner radius from the single `--radius` primitive via its existing multiplier scale, rather than introducing a new hardcoded radius value.
- **Do** keep the ambient, hue-tinted shadow as the only depth cue; don't mix in a second, differently-styled shadow system for new components.
- **Do** pick data colors (stat tiles, avatars) from the five `chart-*` tokens only, written as literal class strings — never build a Tailwind class via string interpolation from a color name/number.
- **Do** keep the primary/action hue reserved for buttons, links, active nav, and focus — never repurpose it as a fifth "data" color or vice versa.

### Don't:
- **Don't** introduce a color outside the action hue (primary) and the five data hues (`chart-1`…`5`) without treating it as a deliberate identity decision.
- **Don't** add a display/serif typeface for emphasis; hierarchy in this system comes from weight and size on a single face.
- **Don't** give any button, badge, or alert a hard-edged or solid-saturated destructive treatment; it breaks the one visual consistency rule this system enforces without exception.
- **Don't** use a square icon chip for a new stat tile or avatar — circular badges are now the shape data/people get; square stays reserved for the brand mark and desktop nav icons.
