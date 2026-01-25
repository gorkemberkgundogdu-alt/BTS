-- Fix gps_locations table column name to match code expectations
-- Change personnel_id to user_id for consistency

ALTER TABLE gps_locations RENAME COLUMN personnel_id TO user_id;

-- Update index to use new column name
DROP INDEX IF EXISTS idx_gps_personnel_time;
CREATE INDEX idx_gps_user_time ON gps_locations(user_id, recorded_at DESC);
