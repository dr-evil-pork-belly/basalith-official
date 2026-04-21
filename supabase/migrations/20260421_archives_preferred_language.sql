-- Add preferred_language to archives for localised Twilio voice greetings
ALTER TABLE archives
  ADD COLUMN IF NOT EXISTS preferred_language text DEFAULT 'en';

-- Set Chinese speakers
UPDATE archives
SET preferred_language = 'zh'
WHERE id IN (
  '1783f9cf-19b5-486e-8c84-800f85f665c0',
  '7612e230-1ab3-4faf-bca6-07e234503e37'
);
