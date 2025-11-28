# Testing Multi-Currency Implementation

## Prerequisites

1. **Start the development server:**
   ```bash
   npm run dev
   ```

2. **Ensure database is ready:**
   - Exchange rates are populated (run `npx tsx scripts/seed-currencies-and-rates.ts` if needed)
   - You have at least one user account set up

## Test Scenarios

### 1. Test Currency Detection & Selection During Import

**Steps:**
1. Navigate to `/transactions/import`
2. Upload a PDF statement (preferably a RUB statement if you have one)
3. Wait for processing to complete
4. Check the "Statement currency" section:
   - Should show detected currency (e.g., "Detected RUB · 85% confidence")
   - Currency dropdown should be populated with all available currencies
   - Should require currency selection before import

**Expected Results:**
- ✅ Currency is auto-detected from PDF (if possible)
- ✅ Confidence percentage is shown
- ✅ Currency dropdown shows all currencies (GEL, USD, EUR, RUB, etc.)
- ✅ "Confirm Import" button is disabled until currency is selected
- ✅ Error message appears if trying to import without selecting currency

### 2. Test Import with Different Currency

**Steps:**
1. Upload a RUB statement (or any non-GEL currency)
2. Select "Russian Ruble (RUB)" from the currency dropdown
3. Review transactions
4. Click "Confirm Import"

**Expected Results:**
- ✅ Transactions are saved with RUB currency
- ✅ Import completes successfully
- ✅ No errors in console

### 3. Test Transaction Display (Original Currency)

**Steps:**
1. Navigate to `/transactions` page
2. Find a transaction that was imported in a different currency (e.g., RUB)
3. Check the amount display

**Expected Results:**
- ✅ Transaction shows original currency symbol (₽) and amount
- ✅ If different from user's currency, shows converted amount below (e.g., "≈ ₾X.XX")
- ✅ Original currency is clearly visible

**Example:**
```
Transaction: "Coffee Shop"
Amount: ₽500.00
          ≈ ₾17.15  (if user's currency is GEL)
```

### 4. Test Dashboard Totals (Converted Currency)

**Steps:**
1. Navigate to `/dashboard`
2. Check the income/expense cards
3. Check category breakdowns

**Expected Results:**
- ✅ All totals show in user's preferred currency (GEL by default)
- ✅ Totals correctly sum transactions from different currencies
- ✅ Charts and summaries use converted amounts
- ✅ No currency mixing (all in one currency)

**Example:**
- If you have:
  - 1000 GEL income
  - 5000 RUB income (≈ 171.50 GEL at current rates)
- Dashboard should show: **1171.50 GEL** total income

### 5. Test Currency Conversion Accuracy

**Steps:**
1. Import a transaction in RUB (e.g., 1000 RUB)
2. Check the exchange rate: RUB → GEL (should be around 0.0343 based on seeded rates)
3. Verify the converted amount: 1000 RUB × 0.0343 ≈ 34.3 GEL
4. Check if dashboard shows the converted amount

**Expected Results:**
- ✅ Conversion uses the rate from `ExchangeRate` table
- ✅ Rate matches the date of the transaction (uses rate from transaction date)
- ✅ Math is accurate (within rounding)

### 6. Test Manual Transaction Creation

**Steps:**
1. Navigate to `/transactions`
2. Create a new transaction manually
3. Check what currency it uses

**Expected Results:**
- ✅ Manual transactions use user's default currency (from settings)
- ✅ Transaction is saved with correct currencyId

### 7. Database Verification

**Steps:**
1. Connect to your database
2. Check the `Transaction` table:
   ```sql
   SELECT id, amount, description, "currencyId", date 
   FROM "Transaction" 
   ORDER BY date DESC 
   LIMIT 10;
   ```
3. Check the `ExchangeRate` table:
   ```sql
   SELECT * FROM "ExchangeRate" 
   WHERE "rateDate" = '2025-11-27' 
   LIMIT 10;
   ```

**Expected Results:**
- ✅ Transactions have `currencyId` set (not null)
- ✅ Exchange rates exist for the target date
- ✅ Rates are stored with proper precision

### 8. Test Edge Cases

**Test 1: Same Currency (No Conversion)**
- Import GEL transactions when user's currency is GEL
- ✅ Should show no conversion helper text
- ✅ Amounts display normally

**Test 2: Missing Exchange Rate**
- If a currency pair doesn't have a rate, system should:
  - ✅ Fall back to 1:1 rate (with warning in console)
  - ✅ Still display the transaction

**Test 3: Currency Selection Error**
- Try to import without selecting currency
- ✅ Should show error message
- ✅ Import button should be disabled

## Quick Test Checklist

- [ ] Currency detection works on PDF upload
- [ ] Currency selection dropdown appears and works
- [ ] Import requires currency selection
- [ ] Transactions show original currency symbol
- [ ] Converted amounts appear when currency differs
- [ ] Dashboard totals are in user's preferred currency
- [ ] All transactions sum correctly (converted)
- [ ] Exchange rates are being used correctly
- [ ] Manual transactions use user's default currency

## Troubleshooting

**Issue: Currency not detected**
- Check Python processor logs for currency detection
- Verify PDF contains currency indicators (RUB, ₽, руб, etc.)

**Issue: Conversion not working**
- Check if exchange rate exists in database for the currency pair
- Verify the transaction date matches the rate date
- Check server console for conversion warnings

**Issue: Wrong currency displayed**
- Verify `currencyId` is set correctly in Transaction table
- Check if currency relation is included in API queries
- Verify CurrencyContext is fetching user's currency correctly

## Manual Database Queries for Verification

```sql
-- Check transactions with their currencies
SELECT 
  t.id,
  t.amount,
  t.description,
  c.alias as currency,
  c.symbol,
  t.date
FROM "Transaction" t
JOIN "Currency" c ON t."currencyId" = c.id
ORDER BY t.date DESC
LIMIT 20;

-- Check exchange rates
SELECT 
  bc.alias as base,
  qc.alias as quote,
  er.rate,
  er."rateDate"
FROM "ExchangeRate" er
JOIN "Currency" bc ON er."baseCurrencyId" = bc.id
JOIN "Currency" qc ON er."quoteCurrencyId" = qc.id
WHERE er."rateDate" = '2025-11-27'
ORDER BY bc.alias, qc.alias;

-- Check user's preferred currency
SELECT 
  u.id,
  u."clerkUserId",
  c.alias as currency,
  c.symbol
FROM "User" u
LEFT JOIN "Currency" c ON u."currencyId" = c.id;
```

