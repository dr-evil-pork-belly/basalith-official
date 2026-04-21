-- Unique constraint so ON CONFLICT (archive_id, email) works correctly
ALTER TABLE contributors
  ADD CONSTRAINT contributors_archive_email_unique
  UNIQUE (archive_id, email);
