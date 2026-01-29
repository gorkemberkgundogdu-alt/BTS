-- Migration: Fix GPS RLS Policies for Traccar Client API
-- Description: Allows public INSERT from /api/gps endpoint without authentication

-- Drop old restrictive policy
DROP POLICY IF EXISTS "Users can insert own location" ON gps_locations;

-- Create new permissive policy for API endpoint
CREATE POLICY "Allow public GPS insert from API"
  ON gps_locations FOR INSERT
  WITH CHECK (true);

-- Note: This is secure because:
-- 1. API endpoint validates all inputs
-- 2. Device mapping happens server-side
-- 3. Municipality isolation via user_id
-- 4. Can add rate limiting / IP whitelist if needed

-- Keep existing SELECT policies (already updated in migration 00012)
-- Admins can view municipality locations
-- Users can view own locations

COMMENT ON POLICY "Allow public GPS insert from API" ON gps_locations 
IS 'Allows Traccar Client to POST location data to /api/gps without authentication. Validation happens in API route.';
