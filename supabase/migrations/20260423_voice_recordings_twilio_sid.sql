-- Store Twilio RecordingSid so audio can be retrieved later if the
-- initial download fails (401, timeout, etc.).
ALTER TABLE voice_recordings
  ADD COLUMN IF NOT EXISTS twilio_recording_sid text;

-- Index for lookups by SID (e.g. retry jobs, admin tools).
CREATE INDEX IF NOT EXISTS idx_voice_recordings_twilio_sid
  ON voice_recordings(twilio_recording_sid)
  WHERE twilio_recording_sid IS NOT NULL;
