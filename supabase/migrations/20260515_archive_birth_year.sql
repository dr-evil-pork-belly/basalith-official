-- Add birth year to archives for Life Timeline personalization
ALTER TABLE archives
  ADD COLUMN IF NOT EXISTS owner_birth_year   integer,
  ADD COLUMN IF NOT EXISTS owner_birth_decade integer;
-- birth_decade = floor(birth_year/10)*10 — e.g. 1949 → 1940

-- Seed known archives
UPDATE archives SET owner_birth_year = 1949, owner_birth_decade = 1940
  WHERE id = '7612e230-1ab3-4faf-bca6-07e234503e37';  -- Stevens Ha

UPDATE archives SET owner_birth_year = 1949, owner_birth_decade = 1940
  WHERE id = '1783f9cf-19b5-486e-8c84-800f85f665c0';  -- Hoa Le Tran
