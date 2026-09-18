---
name: MELCHUB
description: A calm, restrained admin + borrower-portal system for a Philippine informal lending operation.
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
  sm: "0.45rem"
  md: "0.6rem"
  lg: "0.75rem"
  xl: "1.05rem"
  2xl: "1.35rem"
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
---

# Design System: MELCHUB

## Overview

**Creative North Star: "The Calm Ledger"**

MELCHUB's current visual system reads as a quiet, competent back-office tool: a single cool blue-violet accent, near-white and near-black neutrals, and status colors that are always tinted rather than shouted. Nothing here is trying to be memorable — it's trying to be trustworthy and legible for someone checking a debt balance or logging a payment. The system is one typeface (Geist) doing double duty as both heading and body face, differentiated only by weight and size, which reinforces the "one voice, no drama" character.

Depth is handled the same way everywhere: a soft, primary-hue-tinted ambient shadow lifts cards and buttons slightly off the background, paired with a faint 10%-opacity ring border — never a hard drop shadow, never a bevel. Corners are consistently, moderately rounded (never sharp, never fully pill-shaped except icon buttons and avatars), and interactive elements give one small tactile cue — buttons nudge down 1px on press — so the restraint doesn't read as inert.

No visual anti-reference has been confirmed yet; this file records what is actually implemented, not a stated identity target. A companion `/impeccable critique` review found this system architecturally sound but visually interchangeable with a generic SaaS admin template — that finding is a design-direction question for a future `bolder`/redesign pass, not something this record resolves.

**Key Characteristics:**
- One accent hue (blue-violet, ~264° in OKLCH) carries all primary actions, links, focus rings, and active nav states — nowhere else does color appear except the three semantic status hues.
- One typeface, two weights: Geist Sans for everything, Geist Mono unused in the interface itself (reserved, not currently applied to any visible component).
- Status is always communicated by a tinted background + colored text/icon, never a solid saturated fill — applies identically to badges, alerts, and the destructive button variant.
- Depth is ambient and uniform: the same two-layer soft shadow formula (`--shadow-color`, tinted from the primary hue in light mode, pure black in dark mode) appears on every card and default button.

## Colors

The palette is intentionally narrow: one accent carrying all interactive emphasis, a tight neutral scale for surfaces and text, and three semantic hues reserved strictly for status.

### Primary
- **Deep Trust Violet** (`oklch(0.49 0.24 264)`, dark mode `oklch(0.73 0.22 264)`): every primary button, active nav item, link, focus ring, and the sidebar/login "M" mark. The single color users associate with "this is the important action here."

### Neutral
- **Paper White** (`oklch(0.99 0.003 264)`, dark `oklch(0.16 0.015 264)`): page background.
- **Ink** (`oklch(0.16 0.03 264)`, dark `oklch(0.96 0.005 264)`): primary text.
- **Card White** (`oklch(1 0 0)`, dark `oklch(0.21 0.02 264)`): card/modal/popover surfaces — one step lighter (or, in dark mode, one step lighter/warmer) than the page background, the system's only surface-elevation cue besides shadow.
- **Quiet Tint** (`oklch(0.96 0.01 264)`, dark `oklch(0.27 0.02 264)`): secondary buttons, muted backgrounds, hover fills.
- **Faded Ink** (`oklch(0.48 0.02 264)`, dark `oklch(0.7 0.02 264)`): secondary/muted text, placeholders, helper copy.
- **Hairline** (`oklch(0.91 0.01 264)`, dark `oklch(1 0 0 / 10%)`): all borders, dividers, and input outlines — always subtle, never a strong rule.

### Named Rules
**The Tinted, Never Solid Rule.** Status and destructive signaling always uses a low-opacity tinted background with full-saturation text/icon color on top — never a solid saturated fill. Applies identically to the destructive button (`bg-destructive/10` + `text-destructive`), all badge variants (`/15` or `/10` opacity backgrounds), and alert variants (card-colored background, colored text only). This keeps even "overdue" or "rejected" states from reading as alarming or punitive.

**The One Accent Rule.** Color outside the neutral scale and the three status hues appears in exactly one place: the trust-violet primary. No secondary or tertiary brand color exists. If a new component needs a second color role, that is a departure from the current system, not an extension of it.

## Typography

**Body Font:** Geist, with `ui-sans-serif, system-ui` fallback
**Heading Font:** Geist (same family; distinguished by weight/size only — see the Named Rule below)
**Mono Font:** Geist Mono (loaded via CSS variable, not currently used by any visible component)

**Character:** Restrained and tactile — plain-spoken, not editorial. No serif, no display face, no italics anywhere in the reviewed surfaces.

### Hierarchy
- **Title** (600 weight, `text-3xl`/1.875rem on login heroes, `text-lg`/1.125rem in modal/card titles, snug line-height): page and modal headlines ("Welcome back", modal titles).
- **Body** (400 weight, `text-sm`/0.875rem base, 1.5 line-height): all form labels, table content, descriptions, button labels.
- **Label/Muted** (400-500 weight, `text-xs`/0.75rem, muted-foreground color): helper text, badge text, timestamps.

### Named Rules
**The One Typeface Rule.** Geist Sans serves both headings and body copy (`--font-heading` is aliased directly to `--font-sans`). Hierarchy is built entirely from weight and size, never from a second typeface. Introducing a display face would be a deliberate identity change, not a typesetting refinement.

## Layout

A single shared `AppShell` component drives both the admin and portal apps: a persistent left sidebar (`w-60`, 240px) at the `lg` breakpoint (1024px) and up, collapsing to an off-canvas drawer (`w-72`, 85vw max) below it, triggered by a hamburger in a sticky mobile header. Navigation is flat — no nested menus — capped at 5 items (admin) or 3 items (portal). Main content area uses `p-4` (16px) padding on mobile, `sm:p-6` (24px) on larger screens, with `min-w-0` to prevent table overflow from breaking the layout.

Cards are the primary content-grouping unit throughout (stat cards, table wrappers, form containers), each carrying its own internal `--card-spacing` token (16px default, 12px in the compact `sm` size variant) rather than ad-hoc padding per instance.

## Elevation & Depth

Ambient and uniform, not directional or skeuomorphic. Every card and default-variant button carries the same two-layer soft shadow, generated from a single `--shadow-color` variable (a low-alpha tint of the primary hue in light mode, pure black at higher alpha in dark mode) rather than a generic gray. A `ring-1 ring-foreground/10` hairline border runs alongside the shadow on cards, doing double duty as a crisp edge where the shadow alone would be too soft to read on light backgrounds.

### Shadow Vocabulary
- **Ambient Card/Button Lift** (`0 1px 2px -1px var(--shadow-color), 0 8px 20px -10px var(--shadow-color)` on buttons; `0 1px 2px -1px var(--shadow-color), 0 12px 28px -14px var(--shadow-color)` on cards): the system's only shadow — a close, tight contact shadow plus a wider, very soft ambient glow beneath it. No hover-elevation change; the shadow is a static resting state, not a state-transition cue.

### Named Rules
**The Ambient Glow Rule.** Shadows are tinted by the primary hue (light mode) or pure black (dark mode), always soft and diffuse, never a hard offset shadow implying a specific light-source direction. Depth communicates "this surface is slightly raised," not "this surface is illuminated from above-left."

## Shapes

A single `--radius` primitive (12px) drives every corner value in the system via multiplication, so radius scales consistently rather than being picked ad hoc per component: `sm` (7.2px, ×0.6) for compact controls, `md` (9.6px, ×0.8) for select/menu popovers, `lg` (12px, ×1, the base) for buttons/inputs, `xl` (16.8px, ×1.4) for cards and modals, scaling further to `2xl`/`3xl`/`4xl` for larger surfaces. Nothing in the reviewed components is sharp-cornered; nothing is fully circular except icon-only buttons/avatars and the loading spinner.

## Components

### Buttons
- **Shape:** rounded-lg (12px), border-transparent by default.
- **Primary:** trust-violet background, near-white text, ambient shadow (see Elevation), darkens ~14% (via `color-mix`) on hover.
- **Secondary:** quiet-tint background, ink text, no shadow.
- **Outline / Ghost:** transparent, border or no border, muted-tint hover fill.
- **Destructive:** muted-alarm-red at 10% opacity background with full-saturation red text (Tinted, Never Solid Rule) — deliberately non-alarming even for delete actions.
- **Link:** primary-colored text, underline on hover only.
- **Press state:** every non-link variant translates 1px down on `:active` — the system's one deliberate tactile cue.
- **Sizes:** `xs`/`sm`/`default`/`lg` plus matching icon-only squares (`icon-xs` through `icon-lg`), all sharing the same radius scale as their text-button counterparts.

### Cards / Containers
- **Corner Style:** rounded-xl (16.8px).
- **Background:** Card White surface, one step lighter/distinct from page background.
- **Shadow Strategy:** Ambient Card Lift (see Elevation) + hairline ring border.
- **Internal Padding:** `--card-spacing` token, 16px default / 12px compact (`size="sm"`).
- **Header:** CSS container-query-driven grid (`@container/card-header`) so title/description/action rearrange based on the card's own width, not the viewport's.

### Inputs / Fields
- **Style:** rounded-lg, hairline border, transparent background (subtle tint in dark mode via `bg-input/30`).
- **Focus:** a generous 3px `ring-ring/50` glow plus a border-color shift to the ring color — soft, not a hard outline.
- **Error / Disabled:** `aria-invalid` drives a destructive-tinted border + ring (same Tinted, Never Solid language as everywhere else); disabled state drops opacity and swaps to a faint filled background.

### Badges
- **Style:** rounded-md (9.6px), compact (`text-xs`, tight padding) — five variants (default/success/warning/destructive/muted), each a tinted background (15% or 10% opacity) with matching full-saturation text, never an outline or solid fill.

### Modal
- **Style:** native `<dialog>` element (not a div-based portal), rounded-xl, `backdrop:bg-black/50`, zoom+fade entrance animation. Content area caps at `max-h-[85vh]` with internal scroll, so long forms never push action buttons off-screen.

### Navigation (Sidebar / Drawer)
- **Style:** flat list of icon+label items in a dedicated `sidebar` color role (a background/foreground pair slightly distinct from the main surface tokens, so the nav rail reads as its own zone). Active/hover states use the same trust-violet accent family as everything else in the system — no separate "nav accent" color.
- **Mobile treatment:** off-canvas drawer with a scrim backdrop, manual focus trap, and `inert` applied to the main content region while open.

## Do's and Don'ts

### Do:
- **Do** keep every status/destructive signal in the tinted-background-plus-colored-text form (Tinted, Never Solid Rule) — this is applied with zero exceptions across badges, alerts, and the destructive button today.
- **Do** derive every corner radius from the single `--radius` primitive via its existing multiplier scale, rather than introducing a new hardcoded radius value.
- **Do** keep the ambient, hue-tinted shadow as the only depth cue; don't mix in a second, differently-styled shadow system for new components.

### Don't:
- **Don't** introduce a second accent color for a new feature without treating it as a deliberate identity decision — the current system has exactly one.
- **Don't** add a display/serif typeface for emphasis; hierarchy in this system comes from weight and size on a single face.
- **Don't** give any button, badge, or alert a hard-edged or solid-saturated destructive treatment; it breaks the one visual consistency rule this system enforces without exception.
