# Design tokens

Tokens live in the `@theme` block at the top of `src/app/globals.css`. Every token is a Tailwind
utility, so `--color-surface-1` is `bg-surface-1`, `border-surface-1`, `text-surface-1`, and opacity
modifiers work (`bg-accent/20`). Use tokens in new and touched code; never add a new hex value.

## Hex to token mapping (for the codemod)

Pick the token by the utility prefix, because the same hex means different things as a fill and as
a border.

| Hex (any case) | As `bg-` / `from-` / `to-` | As `border-` / `divide-` / `ring-` | As `text-` | Notes |
| --- | --- | --- | --- | --- |
| `#1a1a1a` | `bg-surface-0` | `border-surface-0` | `text-surface-0` | page background |
| `#181818`, `#1f1f1f`, `#202020` | `bg-surface-inset` | `border-surface-inset` | | inputs, wells |
| `#282828`, `#2a2a2a`, `#2f2f2f` | `bg-surface-1` | `border-line-subtle` | `text-surface-1` | `text-[#282828]` is dark text on a light fill |
| `#323232`, `#333333`, `#343434` | `bg-surface-2` | `border-line-subtle` | | hover rows |
| `#393939`, `#3a3a3a` | `bg-surface-3` | `border-line` | | most common border in the app |
| `#4a4a4a` | `bg-line-strong` | `border-line-strong` | | |
| `#e7e4e4`, `#e0e0e0`, `#ffffff` (text) | `bg-fg` | `border-fg` | `text-fg` | |
| `rgba(231,228,228,0.7)`, `var(--text-secondary)`, `#b9b9b9` | | | `text-secondary` | |
| `#8c8c8c`, `#9ca3af`, `#666666` (text) | | | `text-muted` | muted is slightly lighter (`#939393`) to pass 4.5:1 |
| `#ac66da`, `#8b5cf6`, `#6a5acd`, `var(--accent-purple)` | `bg-accent` | `border-accent` | `text-accent` (`text-accent-fg` for small text) | |
| `#904eb8`, `#9a4fb8` | `bg-accent-strong` | `border-accent-strong` | | gradient ends, pressed |
| `#74c648`, `var(--accent-green)` | `bg-positive` | `border-positive` | `text-positive` | |
| `#5ca137` | `bg-positive-strong` | | | |
| `#d93f3f`, `#e74c3c`, `#ff6b6b`, `var(--error)` | `bg-negative` | `border-negative` | `text-negative-fg` (small text) or `text-negative` (large) | |
| `#b83333`, `#b82e2e`, `#c62828`, `#c0392b` | `bg-negative-strong` | | | |
| `#f59e0b`, `#ffa500`, `#ff8c00`, `#fb8c00`, `#d97706`, `#ffb800`, `#ffbf00` | `bg-warning` | `border-warning` | `text-warning` | |

Leave alone: chart series palettes and category colors (`#4a90e2`, `#e91e8c`, `#f1c40f`, `#795548`,
etc.) that come from data, brand logos, and SVG illustration fills.

Inline styles: `style={{ color: '#E7E4E4' }}` becomes `className="text-fg"`; `var(--bg-surface)` becomes
`bg-surface-1`; `var(--text-secondary)` becomes `text-secondary`.

## Token list

| Token | Utility | Purpose |
| --- | --- | --- |
| surface-inset | `bg-surface-inset` | inputs, wells, chart tracks (below the page) |
| surface-0 | `bg-surface-0` | page background |
| surface-1 | `bg-surface-1` | cards, sidebar, modals |
| surface-2 | `bg-surface-2` | raised rows, hover on cards |
| surface-3 | `bg-surface-3` | selected and active items |
| line-subtle / line / line-strong | `border-line-subtle` ... | dividers, default borders, hover borders |
| fg / secondary / muted | `text-fg` ... | primary, secondary, helper text |
| accent / accent-strong / accent-fg / on-accent | `bg-accent` ... | brand purple fill, pressed, text, text on fill |
| positive / positive-strong | `text-positive` | gains, success |
| negative / negative-strong / negative-fg | `text-negative-fg` | losses, errors |
| warning | `text-warning` | warnings, pending states |
| radius card 30 / panel 20 / control 12 / chip 8 | `rounded-card` ... | concentric radius scale; pills stay `rounded-full` |
| text caption 13 / ui 14 / copy 16 / heading 20 / title 36 / figure 40 | `text-ui` ... | type scale with line heights |

## Rules

- Amounts, percents and counters: add `tabular-nums`.
- Gains and losses always carry a sign or an arrow, never color alone (see `Stat`, `TrendIndicator`).
- No `transition-all`; name the properties (`transition-colors`, `transition-[background-color,transform]`).
- Inputs use `text-base sm:text-ui` so iOS does not zoom.
