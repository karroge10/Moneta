# Investment Asset UI Improvements

## Changes Made

### 1. Manual Asset Value Editing - Relocated to Current Value Card

**Problem**: The "Set Value" button for manual assets was cramped in the header subtitle area alongside ticker and asset type information.

**Solution**: 
- Removed the manual price editing UI from the header subtitle section
- Added a subtle edit icon (pencil) in the top-right corner of the "Current Value" card in the Overview section
- The edit icon appears on hover for manual assets only (`pricingMode === 'manual'` and `userId` is set)
- Clicking the edit icon transforms the card into an inline editing form with:
  - Input field for the new price
  - Save and Cancel buttons
  - Enter key to save, Escape key to cancel

**Files Modified**:
- `src/components/investments/AssetModal.tsx`

### 2. Live Asset Price Display Enhancement

**Problem**: For live assets, the current price per unit wasn't prominently displayed in the asset detail modal.

**Solution**:
- Added price information below the Current Value in the Overview section
- For **live assets**: Shows `"$X.XX per unit"` using the fetched live price
- For **manual assets**: Shows `"Manual: $X.XX per unit"` when a manual price is set
- Uses smart number formatting for better readability

**Files Modified**:
- `src/components/investments/AssetModal.tsx`
- `src/app/api/investments/[id]/route.ts` (added `pricingMode` to response)

## Technical Details

### AssetModal.tsx Changes

1. **Removed** lines 328-375: Manual price editing UI from header subtitle area
2. **Enhanced** Current Value card (lines 399-423):
   - Added `isCurrentValue: true` flag to identify the Current Value stat
   - Added `relative group` classes for hover effects
   - Added conditional edit button that appears on hover
   - Added inline editing form that replaces the value display when editing
   - Added price display subtitle for both live and manual assets

### API Route Changes

Added `pricingMode` to the asset details response in `src/app/api/investments/[id]/route.ts` so the frontend can properly distinguish between manual and live assets.

## User Experience Improvements

### Before:
- Manual asset value editing was hidden in the header with other metadata
- Live asset prices were only visible in the portfolio list views
- Cluttered header with too much information

### After:
- Clean, uncluttered header showing only essential info (name, ticker, type)
- Manual asset editing is discoverable via hover on the relevant card
- Live asset prices are prominently displayed where users expect them (next to the value)
- Consistent editing pattern (hover → edit icon → inline form)

## Design Alignment

This implementation follows the MONETA design system:
- Uses purple accent color (#AC66DA) for interactive elements
- Maintains consistent spacing and border radius
- Follows the established card design patterns
- Uses opacity transitions for progressive disclosure
- Implements proper hover states and focus indicators
