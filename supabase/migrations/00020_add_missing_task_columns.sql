-- Add missing columns to tasks table
-- Date: 2026-02-02
-- Purpose: Add title, description, priority, and rename assigned_personnel to assigned_to

BEGIN;

-- Add title column (required for task assignment form)
ALTER TABLE tasks
ADD COLUMN IF NOT EXISTS title TEXT;

-- Add description column
ALTER TABLE tasks
ADD COLUMN IF NOT EXISTS description TEXT;

-- Add priority column with enum constraint
ALTER TABLE tasks
ADD COLUMN IF NOT EXISTS priority TEXT DEFAULT 'medium' 
CHECK (priority IN ('low', 'medium', 'high'));

-- Add assigned_to column (will replace assigned_personnel)
ALTER TABLE tasks
ADD COLUMN IF NOT EXISTS assigned_to UUID REFERENCES profiles(id) ON DELETE SET NULL;

-- Copy data from assigned_personnel to assigned_to (if exists)
UPDATE tasks 
SET assigned_to = assigned_personnel 
WHERE assigned_personnel IS NOT NULL AND assigned_to IS NULL;

-- Create index for assigned_to
CREATE INDEX IF NOT EXISTS idx_tasks_assigned_to ON tasks(assigned_to);

-- Create index for priority
CREATE INDEX IF NOT EXISTS idx_tasks_priority ON tasks(priority);

-- Update status enum to match frontend expectations
ALTER TABLE tasks DROP CONSTRAINT IF EXISTS tasks_status_check;
ALTER TABLE tasks ADD CONSTRAINT tasks_status_check 
CHECK (status IN ('assigned', 'in_progress', 'completed', 'cancelled', 'beklemede', 'devam_ediyor', 'tamamlandi', 'iptal'));

-- Add comments
COMMENT ON COLUMN tasks.title IS 'Task title/name';
COMMENT ON COLUMN tasks.description IS 'Task description/details';
COMMENT ON COLUMN tasks.priority IS 'Task priority level (low, medium, high)';
COMMENT ON COLUMN tasks.assigned_to IS 'User ID of assigned personnel (replaces assigned_personnel)';

COMMIT;

-- Verify the changes
SELECT 
  column_name, 
  data_type, 
  is_nullable,
  column_default
FROM information_schema.columns 
WHERE table_name = 'tasks' 
AND column_name IN ('title', 'description', 'priority', 'assigned_to', 'assigned_personnel')
ORDER BY column_name;
