-- Fix tasks table schema to match code expectations

-- 1. Rename columns
ALTER TABLE tasks RENAME COLUMN assigned_personnel TO assigned_to;
ALTER TABLE tasks RENAME COLUMN scheduled_date TO scheduled_start;

-- 2. Change scheduled_start type from DATE to TIMESTAMPTZ
ALTER TABLE tasks ALTER COLUMN scheduled_start TYPE TIMESTAMPTZ;

-- 3. Add missing columns
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS title TEXT;
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS description TEXT;

-- 4. Update status constraint to match code values
ALTER TABLE tasks DROP CONSTRAINT IF EXISTS tasks_status_check;
ALTER TABLE tasks ADD CONSTRAINT tasks_status_check 
  CHECK (status IN ('assigned', 'in_progress', 'completed', 'cancelled'));

-- 5. Update existing status values
UPDATE tasks SET status = 'assigned' WHERE status = 'beklemede';
UPDATE tasks SET status = 'in_progress' WHERE status = 'devam_ediyor';
UPDATE tasks SET status = 'completed' WHERE status = 'tamamlandi';
UPDATE tasks SET status = 'cancelled' WHERE status = 'iptal';

-- 6. Change default status
ALTER TABLE tasks ALTER COLUMN status SET DEFAULT 'assigned';
