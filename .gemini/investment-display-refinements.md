# Investment Asset Display Refinements

## Summary of Changes

This update refines how asset information is displayed across the investment portfolio views and asset detail modal, focusing on clarity and relevance of displayed data.

## Changes Made

### 1. Asset Modal - Removed Per-Unit Price Display

**Location**: `src/components/investments/AssetModal.tsx`

**Change**: Removed the per-unit price subtitle from the Current Value card for both live and manual assets.

**Rationale**: 
- The per-unit price was redundant when the total value and quantity are already shown
- Simplified the card display for better visual clarity
- Users can calculate per-unit price from Value ÷ Quantity if needed

**Before**:
```
Current Value
₽1,560,048
₽7.1168725 per unit  ← Removed
```

**After**:
```
Current Value
₽1,560,048
```

---

### 2. Asset Modal - Added Quantity Display

**Location**: `src/components/investments/AssetModal.tsx`

**Change**: Added a new "Quantity" card to the Overview section, positioned between "Current Value" and "P&L".

**Details**:
- Grid layout updated from 4 columns to 5 columns (responsive: 2 cols on mobile, 3 on tablet, 5 on desktop)
- Shows total quantity held with smart number formatting
- No currency symbol (just the numeric quantity)

**New Overview Layout**:
1. Total Invested
2. Current Value (with edit icon for manual assets)
3. **Quantity** ← NEW
4. P&L
5. ROI

---

### 3. Portfolio Cards - Conditional Price Display

**Location**: `src/components/investments/PortfolioDesignOptions.tsx`

**Change**: Modified all three portfolio view designs to only show price for live assets.

#### CompactListDesign
- **Live assets**: Shows ticker, price, and quantity
  - Example: `BTC • ₽7.12 • Qty: 219,219`
- **Manual assets**: Shows ticker and quantity only
  - Example: `PROPERTY • Qty: 1`

#### CarouselDesign
- **Live assets**: Shows "Current Value" and "Price" side-by-side
- **Manual assets**: Shows "Current Value" and "Quantity" side-by-side

#### TableDesign
- **Live assets**: Shows value with price below
- **Manual assets**: Shows value only
- Both show quantity in the asset name row

**Conditional Logic**:
```tsx
{item.sourceType === 'live' && item.currentPrice && (
    // Show price
)}
```

---

### 4. Portfolio Cards - Added Quantity Display

**Location**: `src/components/investments/PortfolioDesignOptions.tsx`

**Change**: Added quantity display to all three portfolio view designs.

**Implementation**:
- **CompactListDesign**: Added as inline text with ticker and price
- **CarouselDesign**: Added as dedicated field (shown when price is not shown for manual assets)
- **TableDesign**: Added as inline text below ticker in asset name column

---

## Technical Details

### Files Modified
1. `src/components/investments/AssetModal.tsx`
   - Removed per-unit price display (lines ~399-420)
   - Added Quantity card to overview grid
   - Updated grid layout to 5 columns

2. `src/components/investments/PortfolioDesignOptions.tsx`
   - Updated CompactListDesign (lines ~37-45)
   - Updated CarouselDesign (lines ~111-128)
   - Updated TableDesign (lines ~279-294)

### Data Flow
- `sourceType` field from Investment interface determines if asset is 'live' or 'manual'
- `quantity` field from Investment interface provides the quantity value
- `currentPrice` is only shown when `sourceType === 'live'`

## User Experience Improvements

### Before
- ❌ Cluttered display with redundant per-unit price information
- ❌ Manual assets showed confusing "Manual: ₽X per unit" text
- ❌ No quantity information visible in portfolio cards
- ❌ Price shown for all assets regardless of type

### After
- ✅ Clean, focused display showing only relevant information
- ✅ Quantity prominently displayed in both modal and cards
- ✅ Price only shown for live assets where it's meaningful
- ✅ Manual assets show quantity instead of price (more relevant)
- ✅ Consistent information hierarchy across all views

## Design Alignment

All changes maintain the MONETA design system:
- Consistent typography and spacing
- Proper use of helper text colors
- Smart number formatting throughout
- Responsive grid layouts
- Maintains existing hover states and interactions
