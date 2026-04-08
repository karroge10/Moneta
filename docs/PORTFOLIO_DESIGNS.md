# Portfolio Design Options

## Overview
Three unique, visually distinct designs for displaying the Assets Portfolio on the Investments page. Each design follows the Moneta style guide while offering different UX approaches.

---

## 🎯 Design 1: COMPACT LIST (Default)

### Visual Style
- **Layout**: Vertical scrollable list
- **Density**: High - shows maximum assets in minimal space
- **Best For**: Users with many assets who need quick scanning

### Key Features
- ✅ Horizontal rows with icon, name/ticker, trend arrow, value, and percentage
- ✅ Hover effect changes border to purple
- ✅ Trend arrows (StatUp/StatDown) for quick visual scanning
- ✅ Most space-efficient design
- ✅ Max height: 400px with vertical scroll

### Use Case
Perfect for power users who want to see all their assets at a glance without scrolling through cards.

---

## 🎠 Design 2: CAROUSEL

### Visual Style
- **Layout**: Horizontal sliding cards with pagination
- **Density**: Low - emphasizes individual assets
- **Best For**: Users who want a more visual, engaging experience

### Key Features
- ✅ Large, prominent cards (3 per page on desktop)
- ✅ Gradient icon backgrounds with purple accent
- ✅ Performance badges with colored backgrounds and borders
- ✅ Navigation arrows and dot indicators
- ✅ Hover effect: scale up + purple border
- ✅ Swipeable on mobile (future enhancement)

### Use Case
Ideal for users with fewer assets (3-9) who want a more premium, magazine-style presentation. Great for showcasing key investments.

---

## 📊 Design 3: TABLE VIEW

### Visual Style
- **Layout**: Professional data table with sortable columns
- **Density**: Medium-High - traditional spreadsheet feel
- **Best For**: Users who want to analyze and compare data

### Key Features
- ✅ Sortable columns: Asset, Type, Value, Change
- ✅ Click column headers to sort (ascending/descending)
- ✅ Sort indicators (StatUp/StatDown icons)
- ✅ Sticky header stays visible while scrolling
- ✅ Row hover highlights entire row
- ✅ Type badges (Crypto, Stocks, Property, etc.)
- ✅ Colored performance badges with icons

### Use Case
Best for analytical users who want to sort by performance, value, or asset type. Familiar interface for users coming from spreadsheet tools.

---

## 🎨 Design Comparison

| Feature | Compact List | Carousel | Table |
|---------|-------------|----------|-------|
| **Space Efficiency** | ⭐⭐⭐⭐⭐ | ⭐⭐ | ⭐⭐⭐⭐ |
| **Visual Appeal** | ⭐⭐⭐ | ⭐⭐⭐⭐⭐ | ⭐⭐⭐ |
| **Data Density** | ⭐⭐⭐⭐ | ⭐⭐ | ⭐⭐⭐⭐⭐ |
| **Sortability** | ❌ | ❌ | ✅ |
| **Best for Many Assets** | ✅ | ❌ | ✅ |
| **Mobile Friendly** | ✅ | ⭐⭐⭐⭐ | ⭐⭐ |
| **Quick Scanning** | ✅ | ❌ | ✅ |
| **Premium Feel** | ⭐⭐⭐ | ⭐⭐⭐⭐⭐ | ⭐⭐⭐ |

---

## 🔄 Switching Between Designs

Users can switch between designs using the toggle buttons in the card header:
- **List** - Compact vertical list
- **Carousel** - Sliding cards with pagination
- **Table** - Sortable data table

The selected design is highlighted in purple (#AC66DA).

---

## 🎨 Style Guide Compliance

All three designs follow the Moneta style guide:
- ✅ Sen font family
- ✅ Dark theme (#202020 background, #282828 surfaces)
- ✅ 30px border radius on cards
- ✅ Purple accent (#AC66DA) for interactive elements
- ✅ Green (#74C648) for positive, Red (#D93F3F) for negative
- ✅ Consistent spacing and typography
- ✅ Smooth transitions and hover effects
- ✅ No sharp corners or bright neon colors

---

## 💡 Recommendations

**For Most Users**: Start with **Compact List** (default) - it's the most balanced option.

**For Visual Impact**: Use **Carousel** if you have 3-12 assets and want to impress.

**For Analysis**: Use **Table** if you frequently sort or compare assets.
