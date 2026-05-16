-- Auto-sync voice_samples_count whenever a qualifying voice recording is inserted/updated.
-- Qualifying = transcript_status='complete' AND duration_seconds >= 30

CREATE OR REPLACE FUNCTION sync_voice_sample_count()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE archives
  SET voice_samples_count = (
    SELECT COUNT(*)
    FROM voice_recordings
    WHERE archive_id = NEW.archive_id
      AND transcript_status = 'complete'
      AND duration_seconds >= 30
  )
  WHERE id = NEW.archive_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS voice_recording_count_sync ON voice_recordings;

CREATE TRIGGER voice_recording_count_sync
  AFTER INSERT OR UPDATE
  ON voice_recordings
  FOR EACH ROW
  EXECUTE FUNCTION sync_voice_sample_count();

-- Back-fill existing archives so the cached column is correct right now
UPDATE archives a
SET voice_samples_count = (
  SELECT COUNT(*)
  FROM voice_recordings vr
  WHERE vr.archive_id = a.id
    AND vr.transcript_status = 'complete'
    AND vr.duration_seconds >= 30
);
