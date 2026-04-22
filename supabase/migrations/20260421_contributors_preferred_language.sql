-- Preferred language for contributors — controls which language their emails arrive in
ALTER TABLE contributors
  ADD COLUMN IF NOT EXISTS preferred_language text DEFAULT 'en';
