I want to redesign investments to be transaction-driven and aggregated at runtime. Treat this as a full refactor spec. Implement everything below, do not partially implement.  

====================
CORE ARCHITECTURE
====================

Transactions are the single source of truth. Portfolio aggregates are computed dynamically at runtime.  

We will reuse the existing transactions table instead of creating a separate investments table.  

Add the following columns to the existing transactions table:

- investmentAssetId (nullable FK -> assets.id)
- investmentType (nullable enum: 'buy', 'sell')
- quantity (nullable decimal)
- pricePerUnit (nullable decimal)

Rules:
- If investmentAssetId IS NULL → normal finance transaction (expense/income)
- If investmentAssetId IS NOT NULL → investment transaction
- amount column remains for legacy finance logic and must NOT be used for investment math
- investment transactions ignore amount/categoryId logic

====================
ASSET TABLE
====================

Global assets table:

- id
- name
- ticker
- assetType (crypto | stock | other)
- coingeckoId (nullable)
- pricingMode (live | manual)

pricingMode rules:
- live → price pulled from API on page load
- manual → user controls price (stored in transaction snapshot)

Do NOT store:
- currentValue
- changePercent
- lastPriceUpdate
- icon  

Icons can be derived from assetType dynamically.

====================
REMOVE OLD INVESTMENT LOGIC
====================

Delete:
- investment history cron
- price caching cron
- stored portfolio aggregates
- currentValue in DB
- changePercent in DB
- lastPriceUpdate
- icon column

Live prices fetched on demand; manual assets store only transactions.

====================
HOLDING AGGREGATION LOGIC
====================

Compute holdings by grouping transactions by asset.  

For each asset:

netQuantity = SUM(buys.quantity) - SUM(sells.quantity)
totalCost = SUM(buys.quantity * pricePerUnit) - proportional cost removed by sells
avgPrice = totalCost / netQuantity
currentPrice = pricingMode == 'live' ? fetch from API : last manual transaction price
currentValue = netQuantity * currentPrice
pnl = currentValue - totalCost
pnlPercent = pnl / totalCost


Do NOT store computed fields in DB. Recompute on load.

====================
DEDUPLICATION RULE
====================

Aggregate holdings by ticker per user.  

Example:
- User has BTC manual quantity 1
- BTC live quantity 0.52
- Portfolio must show ONE BTC row: quantity 1.52

====================
PORTFOLIO TAB CONTRACT
====================

Each row shows:

- Asset name + ticker
- Total quantity
- Current value
- P/L absolute
- P/L percentage

====================
ASSET MODAL (ON PORTFOLIO CLICK)
====================

Sections:

1. Summary (read-only):
   - Total quantity
   - Average buy price
   - Current price
   - Current value
   - Total invested
   - P/L absolute
   - P/L percentage

2. Transactions list (editable):
   - Row shows: Buy/Sell, Quantity, Price per unit, Date/time, Notes
   - Editable fields: quantity, price, date, notes
   - Asset field read-only or optionally editable

3. Actions:
   - Add transaction button
   - Delete transaction button per row
   - Sell button (creates new transaction)

====================
TRANSACTION MODAL (ON TRANSACTION CLICK)
====================

Fields to show:
- Asset (readonly or optional editable)
- Buy / Sell toggle
- Quantity
- Price per unit
- Currency
- Date & time
- Notes
- Delete button

Rules:
- Editing a transaction recomputes portfolio automatically
- Only the transaction is editable; summary is read-only
- Live assets: price can be locked to API or allow manual override

====================
ADDING NEW INVESTMENT TRANSACTIONS
====================

Flow:
1. Search/select asset
2. Buy/Sell toggle
3. Quantity
4. Price:
   - Toggle: live price / manual price
   - Live → prefill from API, user can override if allowed
5. Date/time
6. Save → triggers recomputation

Assets appear automatically when the first transaction exists.

====================
TESTS
====================

Write tests that:

1. Insert BTC manual + BTC live transactions
2. Aggregate holdings
3. Assert ONE BTC row
4. Assert total quantity = sum of both
5. Assert avg price calculation
6. Edit transaction price → assert portfolio recomputes
7. Delete transaction → assert portfolio recomputes

Use userId with existing BTC rows (ids 9 and 10).

====================
IMPORTANT GUARANTEES
====================

- Transactions are immutable truth
- Portfolio is derived math only
- No duplicated assets in UI
- No stored aggregates
- Removal of Investment, InvestmentPriceHistory, functions to update asset prices in cron.
- Live price fetched on demand
- Manual assets use transaction snapshot price
- Supports future sells/taxes/history
- Editing/deleting transactions auto-updates portfolio view
