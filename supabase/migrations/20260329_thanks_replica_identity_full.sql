-- Enable REPLICA IDENTITY FULL on thanks table so DELETE events
-- include the full row data in Supabase Realtime
ALTER TABLE thanks REPLICA IDENTITY FULL;
