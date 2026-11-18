# FlowPay — Design System

This document is the source of truth for how the FlowPay dashboard looks, moves
and speaks. Tokens live in `src/styles/globals.css`; primitives live in
`src/components/ui`. If something here and the code disagree, fix one of them.

## 1. Who we design for

| Person                     | What they come to do                                                       | What they fear                                          |
| -------------------------- | -------------------------------------------------------------------------- | ------------------------------------------------------- |
| **Merchant admin** (owner) | Check that money arrived, refund a customer, see what failed               | Refunding twice, losing a secret, not noticing failures |
| **Merchant developer**     | Create keys, wire webhooks, debug a delivery, inspect a payment's attempts | Silent failures, unclear signatures, unreadable IDs     |

The product is a **payment-operations tool**, not a marketing site. People scan,
compare and act on records. Every design choice follows from that.

## 2. Principles

1. **The money is the hero.** Amounts are the largest, most legible element on a
   record. Buttons, icons and decoration are quieter than numbers.
2. **Show the state machine, not just the state.** A payment is a position in a
   lifecycle (`CREATED → PROCESSING → SUCCEEDED → REFUNDED`). Show where it is
   and what can still happen (`LifecycleRail`, `RefundCapacity`, `RetryTrack`).
3. **Tell the truth about uncertainty.** `UNKNOWN` is not `FAILED`. When the
   provider timed out, say so and explain why FlowPay does not guess.
4. **Safe by default for irreversible actions.** Revoke, disable and rotate are
   confirmed. Secrets are shown once with copy as the primary action. Financial
   commands use idempotency keys per intent, so a double click cannot charge twice.
5. **Dense, calm, precise.** Small radii, hairline borders, tabular numerals,
   no shadows on resting surfaces. Calm comes from alignment, not whitespace.
6. **Always say "test mode".** Everything runs against a simulator. The hatched
   amber marker is always visible and never dismissible.

## 3. Avoiding the "generated UI" look

These are explicit **don'ts**. Reviewers should reject UI that does them.

| Don't                                                       | Do instead                                                                |
| ----------------------------------------------------------- | ------------------------------------------------------------------------- |
| Purple/indigo gradients, glassmorphism, glowing blobs       | Ink on warm paper. One accent, used for focus and current-nav only        |
| A row of four identical KPI cards with big icons and "+12%" | Show what needs action ("3 dead deliveries you can retry") and link to it |
| Emoji or decorative icons in headings and buttons           | Icons only where they aid scanning (nav, status, actions)                 |
| Everything rounded-2xl with large drop shadows              | `radius-md` (6px) controls, `radius-lg` (10px) panels, border not shadow  |
| Centered hero empty states with illustrations               | Short, left-to-right reason + the one next action                         |
| Generic copy: "Oops! Something went wrong 😢"               | Specific copy that names the cause and the `requestId`                    |
| Title Case Everywhere, ALL CAPS STATUS                      | Sentence case labels; statuses as "Partially refunded"                    |
| Proportional digits in tables                               | `num` utility (tabular, slashed zero) for every compared number           |
| Random spacing values (`mt-7`, `p-[18px]`)                  | The 4px grid: 1, 1.5, 2, 3, 4, 5, 6, 8                                    |
| Tailwind stock palette (`bg-blue-600`, `text-gray-500`)     | Semantic tokens only (`bg-accent`, `text-ink-2`)                          |
| Bouncy/springy motion, long fades                           | 140–280 ms decelerating motion; exits faster than entrances               |

## 4. Tokens

### 4.1 Colour

Colours are semantic. Components never reference raw hex values or Tailwind's
stock palette.

| Token                                          | Use                                                            |
| ---------------------------------------------- | -------------------------------------------------------------- |
| `canvas`                                       | App background (warm paper)                                    |
| `surface` / `surface-sunken` / `surface-hover` | Panels / wells, code, inputs groups / row hover                |
| `line` / `line-strong`                         | Hairlines between things / control borders                     |
| `ink` / `ink-2` / `ink-3`                      | Primary text / secondary text / labels, metadata, placeholders |
| `accent` / `accent-soft`                       | Focus ring, links, active nav marker. Never decoration         |
| `sim` / `sim-ink`                              | Simulator ("test mode") marker only                            |

**Status tones** map domain states to meaning. Each tone has `fg` and `soft`
(background) variants: `success`, `danger`, `warning`, `refund`, `progress`, `neutral`.

| Tone     | Payment                      | Refund     | Transaction                 | Delivery   | Other               |
| -------- | ---------------------------- | ---------- | --------------------------- | ---------- | ------------------- |
| success  | Succeeded                    | Refunded   | Succeeded                   | Delivered  | Active key/endpoint |
| danger   | Failed                       | Failed     | Declined                    | Dead       | —                   |
| warning  | Processing                   | Processing | Outcome unknown, Processing | Retrying   | Suspended           |
| refund   | Partially refunded, Refunded | —          | —                           | —          | —                   |
| progress | —                            | —          | —                           | Delivering | —                   |
| neutral  | Created                      | Created    | Pending                     | Pending    | Revoked, Disabled   |

Rules:

- `live: true` (pulsing dot) only for states that change by themselves
  (`PROCESSING`, `RETRYING`, `DELIVERING`).
- The mapping lives in one `StatusMap` per domain (`features/*/status.ts` or
  `catalog.ts`). Never inline a tone in a page.
- Never communicate status by colour alone: the badge always has a label.

Dark mode redefines the same tokens under `.dark`.

#### Contrast

Both themes meet WCAG 2.2 AA: **4.5:1 for all text** (the dashboard has no large
display text to exempt) and **3:1 for indicators** such as the focus ring.
`src/styles/contrast.test.ts` reads the tokens from `globals.css`, checks every
pair below and fails when this table is out of date, so a token change and its
numbers land together. Add a pair there when a component puts text on a new
background.

<!-- contrast:start -->

| Pair                                 | Used for                       | Light |  Dark |   Min |
| ------------------------------------ | ------------------------------ | ----: | ----: | ----: |
| `ink` on `canvas`                    | Primary text                   | 15.95 | 15.70 | 4.5:1 |
| `ink` on `surface`                   | Primary text                   | 17.40 | 14.60 | 4.5:1 |
| `ink` on `surface-sunken`            | Primary text                   | 14.86 | 16.29 | 4.5:1 |
| `ink` on `surface-hover`             | Primary text                   | 15.42 | 13.36 | 4.5:1 |
| `ink-2` on `canvas`                  | Secondary text                 |  7.01 |  7.63 | 4.5:1 |
| `ink-2` on `surface`                 | Secondary text                 |  7.65 |  7.10 | 4.5:1 |
| `ink-2` on `surface-sunken`          | Secondary text                 |  6.54 |  7.92 | 4.5:1 |
| `ink-2` on `surface-hover`           | Secondary text                 |  6.78 |  6.49 | 4.5:1 |
| `ink-3` on `canvas`                  | Labels, metadata, placeholders |  4.94 |  5.45 | 4.5:1 |
| `ink-3` on `surface`                 | Labels, metadata, placeholders |  5.39 |  5.06 | 4.5:1 |
| `ink-3` on `surface-sunken`          | Labels, metadata, placeholders |  4.60 |  5.65 | 4.5:1 |
| `ink-3` on `surface-hover`           | Labels, metadata, placeholders |  4.77 |  4.64 | 4.5:1 |
| `accent` on `canvas`                 | Links                          |  6.81 |  7.35 | 4.5:1 |
| `accent` on `surface`                | Links                          |  7.43 |  6.83 | 4.5:1 |
| `ink` on `accent-soft`               | Selected text                  | 14.67 | 11.94 | 4.5:1 |
| `ink-inverse` on `ink`               | Primary button                 | 15.95 | 15.70 | 4.5:1 |
| `ink-inverse` on `danger`            | Danger button                  |  5.48 |  7.37 | 4.5:1 |
| `sim-ink` on `sim` 10% over `canvas` | Test mode badge                |  6.43 |  9.90 | 4.5:1 |
| `success` on `success-soft`          | Status badge                   |  5.33 |  7.44 | 4.5:1 |
| `success` on `surface`               | Status text, field errors      |  6.08 |  8.46 | 4.5:1 |
| `danger` on `danger-soft`            | Status badge                   |  5.16 |  6.35 | 4.5:1 |
| `danger` on `surface`                | Status text, field errors      |  5.98 |  6.85 | 4.5:1 |
| `warning` on `warning-soft`          | Status badge                   |  5.25 |  8.05 | 4.5:1 |
| `warning` on `surface`               | Status text, field errors      |  5.88 |  9.30 | 4.5:1 |
| `refund` on `refund-soft`            | Status badge                   |  6.20 |  6.68 | 4.5:1 |
| `refund` on `surface`                | Status text, field errors      |  7.21 |  7.34 | 4.5:1 |
| `progress` on `progress-soft`        | Status badge                   |  6.26 |  5.90 | 4.5:1 |
| `progress` on `surface`              | Status text, field errors      |  7.43 |  6.83 | 4.5:1 |
| `neutral` on `neutral-soft`          | Status badge                   |  5.74 |  6.24 | 4.5:1 |
| `neutral` on `surface`               | Status text, field errors      |  6.85 |  7.10 | 4.5:1 |
| `accent` on `canvas`                 | Focus ring, active nav marker  |  6.81 |  7.35 |   3:1 |
| `accent` on `surface`                | Focus ring, active nav marker  |  7.43 |  6.83 |   3:1 |

<!-- contrast:end -->

- `ink-3` is the floor for text. In v0 it measured 3.1–4.1:1; P1-T01 darkened it
  (light) and lightened it (dark) to pass. Do not move it toward the background.
  Disabled controls (`opacity-50`) are exempt by WCAG.
- Text on colour uses tokens too: the danger button is `text-ink-inverse`, never `text-white`.
- A panel that is always dark regardless of theme (the sign-in aside) adds the
  `dark` class to its root, so it reuses the dark tokens instead of raw values.
- Known gap: control borders (`line-strong`) are 1.5–1.6:1 against `surface`,
  below 3:1 for component boundaries (WCAG 1.4.11). Inputs are identified by
  their labels today; fixed with the input states in P1-T02.

### 4.2 Typography

- **IBM Plex Sans** (variable) for UI, **IBM Plex Mono** for IDs, keys, event
  names, code and minor-unit values. Plex has an engineering/ledger character and
  ships Vietnamese glyphs.
- Base size is 14px (`text-base`), tables and controls 13px (`text-sm`).

| Role             | Class                                  |
| ---------------- | -------------------------------------- |
| Page title       | `text-xl font-semibold tracking-tight` |
| Panel title      | `text-sm font-semibold`                |
| Body / table     | `text-sm`                              |
| Labels, metadata | `text-xs text-ink-3`                   |
| Hero amount      | `<Money size="xl" />`                  |
| IDs              | `<CopyableId />` (mono, dimmed prefix) |

### 4.3 Space, radius, elevation

- 4px grid. Panel padding `p-4`; page sections `space-y-5`; form fields `space-y-4`.
- Radii: `sm` 4px (badges, checkboxes), `md` 6px (controls), `lg` 10px (panels, dialogs).
- Resting surfaces have **no shadow**. Only floating layers (dialog, menu,
  popover, toast) use `shadow-pop`.

### 4.4 Motion

| Use                         | Duration                        | Curve                        |
| --------------------------- | ------------------------------- | ---------------------------- |
| Hover/press colour          | 150 ms                          | `ease-out-quint`             |
| Overlay fade, menu pop      | 140–200 ms in, 90–100 ms out    | `ease-out-quint` / `ease-in` |
| Sheet slide                 | 280 ms in, 160 ms out           | `ease-out-quint`             |
| Quantity fills (bars, rail) | 500–600 ms, staggered 50–120 ms | `EASE_OUT` (`lib/motion.ts`) |

- CSS classes `fp-fade`, `fp-pop`, `fp-slide-in` animate Radix overlays.
- JS animation uses `m.*` from `motion/react` inside `LazyMotion` (bundle size).
- `prefers-reduced-motion` disables all of it: a global CSS rule for keyframes and
  transitions, `MotionConfig skipAnimations` (`app/App.tsx`) for `m.*`, which then
  renders final values. Review screenshots run with reduced motion for the same reason.
- Animate **meaning** (a bar filling to its value), not decoration.

## 5. Signature patterns

| Pattern          | Component                          | Why                                                                               |
| ---------------- | ---------------------------------- | --------------------------------------------------------------------------------- |
| Simulator marker | 3px hatched bar + "Test mode" chip | No one should mistake this for real money                                         |
| Typed IDs        | `CopyableId`                       | Prefix (`pi_`, `re_`, `wep_`) tells the type; click copies; ⌘K accepts pasted IDs |
| Amount + code    | `Money`                            | `500,000 VND`: minor units formatted per currency, code quieter                   |
| Lifecycle rail   | `LifecycleRail`                    | The payment state machine, with timestamps                                        |
| Refund capacity  | `RefundCapacity`                   | `refunded + in flight + refundable = amount`, the invariant the backend protects  |
| Retry track      | `RetryTrack` in `DeliverySheet`    | Six automatic attempts (now, 10s, 30s, 2m, 10m, 1h) + manual                      |
| One-time secret  | `SecretReveal`                     | Copy is the primary action; dialog can't be dismissed by an outside click         |
| Event matrix     | `EventPicker`                      | Six events are resource × outcome; toggle rows/columns                            |
| Needs attention  | Overview                           | Counts that require action, each linking to the filtered list                     |

## 6. Components

Primitives (`src/components/ui`) are thin wrappers over Radix with FlowPay
styling. Composites (`src/components`) encode FlowPay concepts.

| Need                         | Use                                                                                                     |
| ---------------------------- | ------------------------------------------------------------------------------------------------------- |
| Action                       | `Button` — `primary` (one per view), `secondary` (default), `ghost`, `danger`, `danger-outline`, `link` |
| Form field                   | `Field` + `Input` / `NativeSelect` / `Textarea` / `Checkbox`                                            |
| Single-choice filter         | `Segmented`                                                                                             |
| Modal task                   | `Dialog` + `DialogContent` (title, description, footer)                                                 |
| Inspect a record from a list | `Sheet` (right drawer); keep the list visible                                                           |
| Irreversible confirm         | `ConfirmDialog`                                                                                         |
| Menus                        | `Menu`, `MenuItem tone="danger"`                                                                        |
| Inline message               | `Callout` (info, success, warning, danger)                                                              |
| Transient result             | `toast` from `sonner`                                                                                   |
| Container                    | `Panel` + `PanelHeader`                                                                                 |
| Data                         | `Table`/`Th`/`Tr interactive`/`Td`, `Pagination`, `DescriptionList`                                     |
| Loading                      | `TableSkeleton`, `Skeleton` shaped like the content                                                     |
| Empty / error                | `EmptyState`, `ErrorState` (shows `requestId`)                                                          |

Choosing between toast, callout and dialog:

- **Toast**: the result of an action the person just took (refund succeeded).
- **Callout**: a persistent condition of what's on screen (payment outcome unknown).
- **Dialog**: the person must decide or must not miss it (secret reveal, confirm).

## 7. Page anatomy

```
PageHeader   back link · title · one-line description · actions (one primary)
  filters    Segmented status · search · date range · clear
Panel        table or content
  Pagination "1–20 of 125"  ‹ 1 / 7 ›
Sheet        record details without leaving the list (URL-addressable when useful)
```

Detail pages: identity (amount/status/ID) first, then lifecycle, then a main
column of activity (refunds, attempts, deliveries) and a 20–22rem aside of
static facts (details, code sample).

## 8. States checklist

Every data view handles all of these:

- [ ] Loading: skeleton with the real layout (no spinners for whole pages)
- [ ] Empty, never used: explain what will appear and the one action to start
- [ ] Empty, filtered: say nothing matches and offer "Clear filters"
- [ ] Error: specific message + `requestId` + retry; invalid test key → reconnect
- [ ] Stale while refetching: keep previous rows (`placeholderData`), dim slightly
- [ ] Moving states auto-refresh (PROCESSING payments, RETRYING deliveries)

## 9. Voice and copy

- Sentence case. Short. Concrete nouns from the domain: payment, refund,
  attempt, delivery, endpoint, signing secret.
- Name the cause and the consequence: "Any backend still using this key will get
  401 INVALID_API_KEY on its next request."
- Prefer verbs on buttons: "Refund 200,000 VND", "Revoke key", "Add endpoint".
- Show protocol details where developers need them (`Idempotency-Key`,
  `FlowPay-Signature`, HTTP codes) in `font-mono text-xs`.
- Never blame the person. Never say "simply" or "just".

## 10. Accessibility

- Every interactive element reachable by keyboard; clickable rows also respond
  to Enter and have `tabIndex={0}`.
- `Field` wires `label`, `aria-invalid` and `aria-describedby`.
- Dialogs and sheets always have a title (visually hidden if needed).
- Focus ring: 2px `accent`, 2px offset, on `:focus-visible` only.
- Shortcuts: ⌘K / Ctrl+K command menu, ⇧D theme toggle (ignored while typing).
