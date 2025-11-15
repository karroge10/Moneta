-- Migration script: Combine Food and Restaurants categories
-- 1. Update all merchants with categoryId 20 (Food) to categoryId 4 (Restaurants)
UPDATE "MerchantGlobal" 
SET "categoryId" = 4, "updatedAt" = NOW()
WHERE "categoryId" = 20;

-- 2. Update all transactions with categoryId 20 (Food) to categoryId 4 (Restaurants)
UPDATE "Transaction" 
SET "categoryId" = 4, "updatedAt" = NOW()
WHERE "categoryId" = 20;

-- 3. Update all bills with categoryId 20 (Food) to categoryId 4 (Restaurants)
UPDATE "Bill" 
SET "categoryId" = 4, "updatedAt" = NOW()
WHERE "categoryId" = 20;

-- 4. Delete the Food category from the Category table
DELETE FROM "Category" 
WHERE "name" = 'Food';

