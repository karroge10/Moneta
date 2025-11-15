-- Seed script for global merchants database
-- Combines worldwide and Georgia-specific merchants
-- Category IDs: Groceries=6, Restaurants=4, Transportation=14, Technology=10, Fitness=8, Entertainment=3, Clothes=12, Furniture=5, Gifts=7, Other=20, Mobile Data=18, Home Internet=16, Electricity Bill=11, Water Bill=9, Heating Bill=15, Rent=2, Taxes in Georgia=17, Taxes in USA=19, Elevator & Cleaning Bill=13
--
-- NOTE: Store only BASE merchant names (e.g., "yandex", "bus", "koton", "metro")
-- The matching system uses word-based matching and automatically filters out location words
-- (tbilisi, georgia, georgian) from descriptions, so you don't need location-specific entries.
--
-- Examples:
--   - "yandex" matches: "YANDEX.GO", "yandex taxi", "Vip Pay*YANDEX.GO"
--   - "bus" matches: "bus_tbilisi", "tbilisi bus"
--   - "metro" matches: "tbilisi metro", "metro station"
--   - "koton" matches: "KOTON TEXTILE LIMITED LTD"
--   - "agrohub" matches: "agrohub 15.33 GEL"
--
-- For official company names that include location (e.g., "Bank of Georgia"), keep the full name
-- as it's the official merchant name, not a location modifier. The word "bank" will still match.

INSERT INTO "MerchantGlobal" ("namePattern", "categoryId", "createdAt", "updatedAt") VALUES
-- GROCERIES (categoryId: 6)
('walmart', 6, NOW(), NOW()),
('target', 6, NOW(), NOW()),
('costco', 6, NOW(), NOW()),
('kroger', 6, NOW(), NOW()),
('safeway', 6, NOW(), NOW()),
('whole foods', 6, NOW(), NOW()),
('trader joes', 6, NOW(), NOW()),
('aldi', 6, NOW(), NOW()),
('lidl', 6, NOW(), NOW()),
('carrefour', 6, NOW(), NOW()),
('tesco', 6, NOW(), NOW()),
('asda', 6, NOW(), NOW()),
('sainsburys', 6, NOW(), NOW()),
('spar', 6, NOW(), NOW()),
('walmart supercenter', 6, NOW(), NOW()),
('walmart neighborhood market', 6, NOW(), NOW()),
('goodwill', 6, NOW(), NOW()),
('nikora', 6, NOW(), NOW()),
('fresco', 6, NOW(), NOW()),
('populi', 6, NOW(), NOW()),
('orienti', 6, NOW(), NOW()),
('ori nabiji', 6, NOW(), NOW()),
('agrohub', 6, NOW(), NOW()),
('magniti', 6, NOW(), NOW()),
('madagoni', 6, NOW(), NOW()),
('oneprice', 6, NOW(), NOW()),

-- RESTAURANTS (categoryId: 4)
('mcdonalds', 4, NOW(), NOW()),
('burger king', 4, NOW(), NOW()),
('kfc', 4, NOW(), NOW()),
('wendys', 4, NOW(), NOW()),
('taco bell', 4, NOW(), NOW()),
('subway', 4, NOW(), NOW()),
('pizza hut', 4, NOW(), NOW()),
('dominos', 4, NOW(), NOW()),
('starbucks', 4, NOW(), NOW()),
('dunkin donuts', 4, NOW(), NOW()),
('chipotle', 4, NOW(), NOW()),
('panera bread', 4, NOW(), NOW()),
('olive garden', 4, NOW(), NOW()),
('red lobster', 4, NOW(), NOW()),
('applebees', 4, NOW(), NOW()),
('outback steakhouse', 4, NOW(), NOW()),
('pf changs', 4, NOW(), NOW()),
('cheesecake factory', 4, NOW(), NOW()),
('cafe littera', 4, NOW(), NOW()),
('barbarestan', 4, NOW(), NOW()),
('shavi lomi', 4, NOW(), NOW()),
('purpur', 4, NOW(), NOW()),
('salobie bia', 4, NOW(), NOW()),
('pasanauri', 4, NOW(), NOW()),
('zakhar zakharich', 4, NOW(), NOW()),
('sushi', 4, NOW(), NOW()),
('avtograpi', 4, NOW(), NOW()),
('mugsy', 4, NOW(), NOW()),
('wolt', 4, NOW(), NOW()),
('glovo', 4, NOW(), NOW()),
('ubereats', 4, NOW(), NOW()),
('doordash', 4, NOW(), NOW()),
('grubhub', 4, NOW(), NOW()),
('postmates', 4, NOW(), NOW()),
('deliveroo', 4, NOW(), NOW()),

-- TRANSPORTATION (categoryId: 14)
('uber', 14, NOW(), NOW()),
('lyft', 14, NOW(), NOW()),
('bolt', 14, NOW(), NOW()),
('taxi', 14, NOW(), NOW()),
('airport shuttle', 14, NOW(), NOW()),
('amtrak', 14, NOW(), NOW()),
('greyhound', 14, NOW(), NOW()),
('delta', 14, NOW(), NOW()),
('united', 14, NOW(), NOW()),
('american airlines', 14, NOW(), NOW()),
('southwest', 14, NOW(), NOW()),
('british airways', 14, NOW(), NOW()),
('lufthansa', 14, NOW(), NOW()),
('air france', 14, NOW(), NOW()),
('shell', 14, NOW(), NOW()),
('bp', 14, NOW(), NOW()),
('exxon', 14, NOW(), NOW()),
('chevron', 14, NOW(), NOW()),
('mobil', 14, NOW(), NOW()),
('76', 14, NOW(), NOW()),
('speedway', 14, NOW(), NOW()),
('circle k', 14, NOW(), NOW()),
('parking', 14, NOW(), NOW()),
('toll', 14, NOW(), NOW()),
('yandex', 14, NOW(), NOW()),
('metro', 14, NOW(), NOW()),
('bus', 14, NOW(), NOW()),
('marshrutka', 14, NOW(), NOW()),
('railway', 14, NOW(), NOW()),

-- TECHNOLOGY (categoryId: 10)
('apple', 10, NOW(), NOW()),
('apple store', 10, NOW(), NOW()),
('mac center', 10, NOW(), NOW()),
('best buy', 10, NOW(), NOW()),
('microcenter', 10, NOW(), NOW()),
('amazon', 10, NOW(), NOW()),
('newegg', 10, NOW(), NOW()),
('samsung', 10, NOW(), NOW()),
('dell', 10, NOW(), NOW()),
('hp', 10, NOW(), NOW()),
('lenovo', 10, NOW(), NOW()),
('microsoft', 10, NOW(), NOW()),
('google', 10, NOW(), NOW()),
('adobe', 10, NOW(), NOW()),
('oracle', 10, NOW(), NOW()),
('technopark', 10, NOW(), NOW()),
('zoomer', 10, NOW(), NOW()),
('click', 10, NOW(), NOW()),
('yvershini', 10, NOW(), NOW()),

-- FITNESS (categoryId: 8)
('golds gym', 8, NOW(), NOW()),
('planet fitness', 8, NOW(), NOW()),
('anytime fitness', 8, NOW(), NOW()),
('24 hour fitness', 8, NOW(), NOW()),
('la fitness', 8, NOW(), NOW()),
('equinox', 8, NOW(), NOW()),
('peloton', 8, NOW(), NOW()),
('fitplus', 8, NOW(), NOW()),
('fitlab', 8, NOW(), NOW()),

-- ENTERTAINMENT (categoryId: 3)
('netflix', 3, NOW(), NOW()),
('spotify', 3, NOW(), NOW()),
('amazon prime', 3, NOW(), NOW()),
('disney plus', 3, NOW(), NOW()),
('hulu', 3, NOW(), NOW()),
('hbo max', 3, NOW(), NOW()),
('apple tv', 3, NOW(), NOW()),
('youtube premium', 3, NOW(), NOW()),
('playstation', 3, NOW(), NOW()),
('xbox', 3, NOW(), NOW()),
('nintendo', 3, NOW(), NOW()),
('steam', 3, NOW(), NOW()),
('epic games', 3, NOW(), NOW()),
('movie theater', 3, NOW(), NOW()),
('cinema', 3, NOW(), NOW()),
('amc', 3, NOW(), NOW()),
('regal', 3, NOW(), NOW()),
('imax', 3, NOW(), NOW()),
('rustaveli', 3, NOW(), NOW()),
('amirani', 3, NOW(), NOW()),
('east point', 3, NOW(), NOW()),
('mall', 3, NOW(), NOW()),
('city mall', 3, NOW(), NOW()),

-- CLOTHES (categoryId: 12)
('zara', 12, NOW(), NOW()),
('hm', 12, NOW(), NOW()),
('koton', 12, NOW(), NOW()),
('bershka', 12, NOW(), NOW()),
('pull and bear', 12, NOW(), NOW()),
('mango', 12, NOW(), NOW()),
('massimo dutti', 12, NOW(), NOW()),
('uniqlo', 12, NOW(), NOW()),
('gap', 12, NOW(), NOW()),
('old navy', 12, NOW(), NOW()),
('banana republic', 12, NOW(), NOW()),
('j crew', 12, NOW(), NOW()),
('nordstrom', 12, NOW(), NOW()),
('macys', 12, NOW(), NOW()),
('jcpenney', 12, NOW(), NOW()),
('kohls', 12, NOW(), NOW()),
('nike', 12, NOW(), NOW()),
('adidas', 12, NOW(), NOW()),
('under armour', 12, NOW(), NOW()),
('puma', 12, NOW(), NOW()),
('reebok', 12, NOW(), NOW()),

-- FURNITURE (categoryId: 5)
('ikea', 5, NOW(), NOW()),
('wayfair', 5, NOW(), NOW()),
('overstock', 5, NOW(), NOW()),
('pottery barn', 5, NOW(), NOW()),
('west elm', 5, NOW(), NOW()),
('crate and barrel', 5, NOW(), NOW()),
('ashley furniture', 5, NOW(), NOW()),
('rooms to go', 5, NOW(), NOW()),
('home depot', 5, NOW(), NOW()),
('lowes', 5, NOW(), NOW()),
('home center', 5, NOW(), NOW()),
('profi', 5, NOW(), NOW()),

-- GIFTS (categoryId: 7)
('etsy', 7, NOW(), NOW()),
('gift shop', 7, NOW(), NOW()),

-- OTHER (categoryId: 20) - for banks, fees, commissions, ATM withdrawals
('utility bill', 20, NOW(), NOW()),
('bank of georgia', 20, NOW(), NOW()),
('tbc bank', 20, NOW(), NOW()),
('liberty bank', 20, NOW(), NOW()),
('basisbank', 20, NOW(), NOW()),
('bog', 20, NOW(), NOW()),
('credo bank', 20, NOW(), NOW()),
('procredit bank', 20, NOW(), NOW()),

-- MOBILE DATA (categoryId: 18)
('verizon', 18, NOW(), NOW()),
('at&t', 18, NOW(), NOW()),
('tmobile', 18, NOW(), NOW()),
('sprint', 18, NOW(), NOW()),
('vodafone', 18, NOW(), NOW()),
('orange', 18, NOW(), NOW()),
('ee', 18, NOW(), NOW()),
('magti', 18, NOW(), NOW()),
('beeline', 18, NOW(), NOW()),
('geocell', 18, NOW(), NOW()),
('silknet', 18, NOW(), NOW()),

-- HOME INTERNET (categoryId: 16)
('verizon fios', 16, NOW(), NOW()),
('xfinity', 16, NOW(), NOW()),
('spectrum', 16, NOW(), NOW()),
('att internet', 16, NOW(), NOW()),
('cox', 16, NOW(), NOW()),
('century link', 16, NOW(), NOW()),
('bt', 16, NOW(), NOW()),
('sky', 16, NOW(), NOW()),
('tnet', 16, NOW(), NOW()),

-- ELECTRICITY BILL (categoryId: 11)
('electric company', 11, NOW(), NOW()),
('power company', 11, NOW(), NOW()),
('telasi', 11, NOW(), NOW()),
('energo pro', 11, NOW(), NOW()),
('telmiko', 11, NOW(), NOW()),
('telmi', 11, NOW(), NOW()),

-- WATER BILL (categoryId: 9)
('water company', 9, NOW(), NOW()),
('water utility', 9, NOW(), NOW()),
('aisi', 9, NOW(), NOW()),
('gwp', 9, NOW(), NOW()),

-- HEATING BILL (categoryId: 15)
('heating company', 15, NOW(), NOW()),
('gas company', 15, NOW(), NOW()),
('utility company', 15, NOW(), NOW()),
('tbilisi energy', 15, NOW(), NOW()),

-- RENT (categoryId: 2)
('property management', 2, NOW(), NOW()),
('real estate', 2, NOW(), NOW()),
('landlord', 2, NOW(), NOW()),

-- TAXES IN GEORGIA (categoryId: 17)
('revenue service', 17, NOW(), NOW()),

-- TAXES IN USA (categoryId: 19)
('irs', 19, NOW(), NOW()),

-- ELEVATOR & CLEANING BILL (categoryId: 13)
('building management', 13, NOW(), NOW()),
('condo association', 13, NOW(), NOW()),
('hoa', 13, NOW(), NOW()),
('tbiliservis', 13, NOW(), NOW()),
('tbilisi servis', 13, NOW(), NOW())
ON CONFLICT ("namePattern") DO UPDATE SET 
  "categoryId" = EXCLUDED."categoryId",
  "updatedAt" = NOW();

