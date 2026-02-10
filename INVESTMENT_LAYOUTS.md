# Investment Page Layout Variations

## Overview
Three responsive layout variations have been created for the Investments page. All layouts:
- ✅ Reuse Dashboard card components (UpdateCard, IncomeCard/ExpenseCard structure)
- ✅ Use consistent styling with text-card-currency and text-card-value classes
- ✅ Include TrendIndicator on Total Invested card
- ✅ Follow the same responsive breakpoints (mobile stack, tablet 2-col, desktop bento grid)
- ✅ Maintain all existing content and functionality

## Access URLs
- **Layout 1**: `/investments1` - Balanced Grid
- **Layout 2**: `/investments2` - Allocation Emphasized
- **Layout 3**: `/investments3` - Wide Allocation

---

## Layout 1: Balanced Grid (`/investments1`)

### Desktop (≥1536px) - 4-column base grid
```
┌─────────────────────────────────────┬───────┐
│ Left (3 cols)                       │ Right │
│                                     │ (1)   │
│ ┌────────┬────────┬────────┐       │       │
│ │ Update │ Total  │ Total  │       │       │
│ │        │ Value  │Invested│       │ Assets│
│ └────────┴────────┴────────┘       │       │
│                                     │       │
│ ┌─────────────┬──────────┐         │       │
│ │ Performance │Allocation│         │       │
│ │   (3/5)     │  (2/5)   │         │       │
│ └─────────────┴──────────┘         │       │
│                                     │       │
│ ┌──────────────────────────┐       │       │
│ │ Recent Activities        │       │       │
│ └──────────────────────────┘       │       │
└─────────────────────────────────────┴───────┘
```

### Characteristics:
- **Best for**: Users who want a dashboard-like experience with sidebar navigation
- **Allocation**: Medium size (2/5 of middle section)
- **Assets**: Prominent sidebar position, always visible
- **Performance**: Larger chart (3/5 of middle section)

---

## Layout 2: Allocation Emphasized (`/investments2`)

### Desktop (≥1536px) - 5-column base grid
```
┌─────────────────────────────────────┬─────────────┐
│ Left (3 cols)                       │ Right (2)   │
│                                     │             │
│ ┌────────┬────────┬────────┐       │ ┌─────────┐ │
│ │ Update │ Total  │ Total  │       │ │Allocation│
│ │        │ Value  │Invested│       │ │         │ │
│ └────────┴────────┴────────┘       │ │ (Bigger)│ │
│                                     │ └─────────┘ │
│ ┌──────────────────────────┐       │             │
│ │ Performance Chart        │       │ ┌─────────┐ │
│ │                          │       │ │ Assets  │ │
│ └──────────────────────────┘       │ │         │ │
│                                     │ └─────────┘ │
│ ┌──────────────────────────┐       │             │
│ │ Recent Activities        │       │             │
│ └──────────────────────────┘       │             │
└─────────────────────────────────────┴─────────────┘
```

### Characteristics:
- **Best for**: Users who want to emphasize portfolio allocation analysis
- **Allocation**: **Largest** - dedicated 2-column space, not constrained
- **Assets**: Right sidebar below allocation
- **Performance**: Full-width chart on left side

---

## Layout 3: Wide Allocation (`/investments3`)

### Desktop (≥1536px) - Horizontal flow
```
┌────────────────────────────────────────────────┐
│ ┌────────┬────────┬────────┬────────┐         │
│ │ Update │ Total  │ Total  │Allocation        │
│ │        │ Value  │Invested│        │         │
│ └────────┴────────┴────────┴────────┘         │
│                                                │
│ ┌──────────────────────┬──────────────────┐   │
│ │ Performance Chart    │ Assets           │   │
│ │      (50%)           │  (50%)           │   │
│ └──────────────────────┴──────────────────┘   │
│                                                │
│ ┌──────────────────────────────────────────┐  │
│ │ Recent Activities (Full Width)           │  │
│ └──────────────────────────────────────────┘  │
└────────────────────────────────────────────────┘
```

### Characteristics:
- **Best for**: Users who want equal emphasis on all metrics with clean rows
- **Allocation**: Same height as other top cards, equal prominence
- **Assets**: 50% width, side-by-side with Performance
- **Performance**: 50% width, balanced with Assets
- **Layout**: Most symmetrical and organized

---

## Responsive Behavior (All Layouts)

### Mobile (<768px)
All layouts use the same mobile stack:
1. Update Card
2. Total Value | Total Invested (2-col grid)
3. Allocation
4. Performance Chart
5. Assets List
6. Recent Activities

### Tablet (768px - 1536px)
All layouts use the same 2-column grid:
- Update | Total Value
- Total Invested | Allocation
- Performance Chart (full width)
- Assets | Recent Activities

---

## Card Updates Applied

### PortfolioTrendCard
- Now uses `text-card-currency` and `text-card-value` classes
- Matches IncomeCard/ExpenseCard structure exactly
- Shows TrendIndicator for "All Time Return"

### TotalInvestedCard
- Added optional `trend` and `comparisonLabel` props
- Shows TrendIndicator when trend data is available
- Matches IncomeCard/ExpenseCard structure exactly

### UpdateCard
- Reused as-is from Dashboard
- Consistent styling and behavior

---

## Recommendation

**Try all three layouts** to see which fits your workflow best:

- **Layout 1** if you like the Dashboard's sidebar approach
- **Layout 2** if portfolio allocation is your primary focus
- **Layout 3** if you prefer a clean, symmetrical layout with equal emphasis

All layouts maintain full functionality and responsive design!
