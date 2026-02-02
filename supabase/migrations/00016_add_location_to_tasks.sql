-- Add location columns to tasks table
-- Date: 2026-02-02
-- Purpose: Support task location assignment (lat/lng/address)

-- Add location columns
ALTER TABLE tasks
ADD COLUMN IF NOT EXISTS location_lat NUMERIC(10,7),
ADD COLUMN IF NOT EXISTS location_lng NUMERIC(10,7),
ADD COLUMN IF NOT EXISTS location_address TEXT;

-- Add index for location queries
CREATE INDEX IF NOT EXISTS idx_tasks_location 
ON tasks(location_lat, location_lng);

-- Add comment
COMMENT ON COLUMN tasks.location_lat IS 'Task location latitude';
COMMENT ON COLUMN tasks.location_lng IS 'Task location longitude';
COMMENT ON COLUMN tasks.location_address IS 'Task location address (human readable)';
