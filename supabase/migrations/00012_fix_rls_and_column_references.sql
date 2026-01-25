-- Fix RLS policies and column references
-- 1. Fix tasks policies to use 'assigned_to' instead of 'assigned_personnel'
-- 2. Fix gps_locations policies to use 'user_id' instead of 'personnel_id'

-- ============================================
-- DROP OLD POLICIES
-- ============================================

-- Tasks policies
DROP POLICY IF EXISTS "Personnel can view assigned tasks" ON tasks;
DROP POLICY IF EXISTS "Personnel can update own tasks" ON tasks;

-- GPS Locations policies
DROP POLICY IF EXISTS "Users can insert own location" ON gps_locations;
DROP POLICY IF EXISTS "Admins can view municipality locations" ON gps_locations;
DROP POLICY IF EXISTS "Users can view own locations" ON gps_locations;

-- ============================================
-- CREATE NEW POLICIES WITH CORRECT COLUMN NAMES
-- ============================================

-- TASKS POLICIES (using 'assigned_to' instead of 'assigned_personnel')
CREATE POLICY "Personnel can view assigned tasks"
  ON tasks FOR SELECT
  USING (assigned_to = auth.uid());

CREATE POLICY "Personnel can update own tasks"
  ON tasks FOR UPDATE
  USING (
    assigned_to = auth.uid()
    AND get_user_role() = 'personnel'
  )
  WITH CHECK (assigned_to = auth.uid());

-- GPS_LOCATIONS POLICIES (using 'user_id' instead of 'personnel_id')
CREATE POLICY "Users can insert own location"
  ON gps_locations FOR INSERT
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Admins can view municipality locations"
  ON gps_locations FOR SELECT
  USING (
    user_id IN (
      SELECT id FROM profiles WHERE municipality_id = get_user_municipality_id()
    )
    AND get_user_role() IN ('admin', 'supervisor')
  );

CREATE POLICY "Users can view own locations"
  ON gps_locations FOR SELECT
  USING (user_id = auth.uid());

-- ============================================
-- PROFILES POLICY FIX
-- ============================================

-- Remove duplicate "Users can view own profile" policy if exists
-- Keep only "Users can view same municipality profiles" which covers both cases
DROP POLICY IF EXISTS "Users can view own profile" ON profiles;

-- Recreate with better logic that allows viewing all profiles in same municipality
DROP POLICY IF EXISTS "Users can view same municipality profiles" ON profiles;

CREATE POLICY "Users can view same municipality profiles"
  ON profiles FOR SELECT
  USING (
    -- Users can always view their own profile
    id = auth.uid()
    OR
    -- Users can view profiles from same municipality
    municipality_id = get_user_municipality_id()
  );
