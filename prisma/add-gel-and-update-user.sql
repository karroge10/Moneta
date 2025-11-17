-- Add GEL currency if it doesn't exist
INSERT INTO "Currency" ("name", "symbol", "alias")
VALUES ('Georgian Lari', '₾', 'GEL')
ON CONFLICT DO NOTHING;

-- If the above doesn't work (no unique constraint), use this instead:
-- Check if GEL exists, if not insert it
DO $$
DECLARE
    gel_id INTEGER;
    english_id INTEGER;
BEGIN
    -- Add GEL currency
    SELECT id INTO gel_id FROM "Currency" WHERE "alias" = 'GEL' LIMIT 1;
    IF gel_id IS NULL THEN
        INSERT INTO "Currency" ("name", "symbol", "alias")
        VALUES ('Georgian Lari', '₾', 'GEL')
        RETURNING id INTO gel_id;
        RAISE NOTICE 'Created GEL currency with ID: %', gel_id;
    ELSE
        RAISE NOTICE 'GEL currency already exists with ID: %', gel_id;
    END IF;

    -- Ensure English language exists
    SELECT id INTO english_id FROM "Language" WHERE "alias" = 'en' LIMIT 1;
    IF english_id IS NULL THEN
        INSERT INTO "Language" ("name", "alias")
        VALUES ('English', 'en')
        RETURNING id INTO english_id;
        RAISE NOTICE 'Created English language with ID: %', english_id;
    ELSE
        RAISE NOTICE 'English language already exists with ID: %', english_id;
    END IF;

    -- Update all users to use English and GEL
    UPDATE "User"
    SET 
        "languageId" = english_id,
        "currencyId" = gel_id,
        "updatedAt" = NOW()
    WHERE "languageId" IS DISTINCT FROM english_id 
       OR "currencyId" IS DISTINCT FROM gel_id;

    RAISE NOTICE 'Updated all users to use English language and GEL currency';
END $$;

