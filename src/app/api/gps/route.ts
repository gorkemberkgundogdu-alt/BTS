import { NextRequest, NextResponse } from 'next/server'
import { createClient as createSupabaseClient } from '@supabase/supabase-js'
import { createClient } from '@/lib/supabase/server'
import type { Database } from '@/types/database'

/**
 * GPS Tracking API Endpoint
 * 
 * Supports both GET and POST for Traccar Client compatibility
 * GET: Traccar Client default method
 * POST: Alternative method
 * 
 * Format: ?id=device_id&lat=41.0082&lon=28.9784&timestamp=1706529000000&speed=45.5&bearing=180&altitude=100&accuracy=10&batt=85.5
 */

// Validate environment variables
if (!process.env.NEXT_PUBLIC_SUPABASE_URL) {
  throw new Error('Missing NEXT_PUBLIC_SUPABASE_URL')
}
if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
  throw new Error('Missing SUPABASE_SERVICE_ROLE_KEY')
}

// Create Supabase Admin client (bypasses RLS)
const supabaseAdmin = createSupabaseClient<Database>(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  }
)

console.log('✅ Supabase Admin Client initialized for GPS API')

// Development logging helper
const devLog = (...args: any[]) => {
  if (process.env.NODE_ENV === 'development') {
    console.log(...args)
  }
}

// Type aliases
type Profile = Database['public']['Tables']['profiles']['Row']
type GpsLocationInsert = Omit<Database['public']['Tables']['gps_locations']['Insert'], 'source'>
type GpsLocationRow = Database['public']['Tables']['gps_locations']['Row']

// Profile with user relation (for queries)
interface ProfileRelation {
  id: string
  full_name: string | null
  municipality_id: string | null
  role: string
}

// CORS headers
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
}

// OPTIONS handler for CORS preflight
export async function OPTIONS() {
  return NextResponse.json({}, { status: 200, headers: corsHeaders })
}

interface TraccarClientParams {
  id: string // device unique ID (IMEI, phone number, etc)
  lat: string
  lon: string
  timestamp: string // Unix timestamp in milliseconds
  speed?: string // m/s
  bearing?: string // degrees (0-360)
  altitude?: string // meters
  accuracy?: string // meters
  battery?: string // percentage (0-100)
  batt?: string // alternative battery field
}

export async function POST(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    
    // ALWAYS log incoming requests (production too)
    console.log('🚀 GPS POST Request received:', {
      url: request.url,
      params: Object.fromEntries(searchParams.entries()),
      timestamp: new Date().toISOString()
    })
    
    // Try to get data from query params OR form data (Traccar compatibility)
    let deviceId = searchParams.get('id')?.trim()
    let lat = searchParams.get('lat')?.trim()
    let lon = searchParams.get('lon')?.trim()
    let timestamp = searchParams.get('timestamp')?.trim()
    let speed = searchParams.get('speed')?.trim()
    let bearing = searchParams.get('bearing')?.trim()
    let altitude = searchParams.get('altitude')?.trim()
    let accuracy = searchParams.get('accuracy')?.trim()
    let battery = searchParams.get('battery')?.trim() || searchParams.get('batt')?.trim()

    // If not in query params, try form data (Traccar Client sends POST form data)
    if (!deviceId || !lat || !lon) {
      try {
        const formData = await request.formData()
        console.log('📦 Trying form data:', Object.fromEntries(formData.entries()))
        
        deviceId = deviceId || formData.get('id')?.toString().trim()
        lat = lat || formData.get('lat')?.toString().trim()
        lon = lon || formData.get('lon')?.toString().trim()
        timestamp = timestamp || formData.get('timestamp')?.toString().trim()
        speed = speed || formData.get('speed')?.toString().trim()
        bearing = bearing || formData.get('bearing')?.toString().trim() || formData.get('course')?.toString().trim()
        altitude = altitude || formData.get('altitude')?.toString().trim()
        accuracy = accuracy || formData.get('accuracy')?.toString().trim() || formData.get('hdop')?.toString().trim()
        battery = battery || formData.get('battery')?.toString().trim() || formData.get('batt')?.toString().trim()
      } catch (e) {
        console.log('⚠️ Not form data, trying JSON...')
        try {
          const body = await request.json()
          console.log('📦 Trying JSON body:', body)
          
          deviceId = deviceId || body.id?.toString().trim()
          lat = lat || body.lat?.toString().trim()
          lon = lon || body.lon?.toString().trim()
          timestamp = timestamp || body.timestamp?.toString().trim()
          speed = speed || body.speed?.toString().trim()
          bearing = bearing || body.bearing?.toString().trim() || body.course?.toString().trim()
          altitude = altitude || body.altitude?.toString().trim()
          accuracy = accuracy || body.accuracy?.toString().trim() || body.hdop?.toString().trim()
          battery = battery || body.battery?.toString().trim() || body.batt?.toString().trim()
        } catch (jsonError) {
          console.log('⚠️ Not JSON either')
        }
      }
    }

    console.log('📊 Parsed data:', { deviceId, lat, lon, timestamp })

    // Validation
    if (!deviceId || !lat || !lon || !timestamp) {
      console.error('❌ Missing parameters:', { deviceId, lat, lon, timestamp })
      return NextResponse.json(
        { error: 'Missing required parameters: id, lat, lon, timestamp' },
        { status: 400, headers: corsHeaders }
      )
    }

    console.log('📍 Processing GPS location from device:', deviceId)

    // Convert to numbers
    const latitude = parseFloat(lat)
    const longitude = parseFloat(lon)
    const recordedAt = new Date(parseInt(timestamp))

    // Validate coordinates
    if (isNaN(latitude) || isNaN(longitude) || latitude < -90 || latitude > 90 || longitude < -180 || longitude > 180) {
      console.error('❌ Invalid coordinates:', { lat, lon })
      return NextResponse.json(
        { error: 'Invalid coordinates' },
        { status: 400, headers: corsHeaders }
      )
    }

    console.log('✅ Valid coordinates:', { latitude, longitude, recordedAt })

    // Find user by checking device_mappings table
    console.log('🔍 Looking for device mapping:', deviceId)
    const { data: deviceMapping, error: mappingError } = await supabaseAdmin
      .from('device_mappings')
      .select('user_id, municipality_id, profiles:user_id(id, full_name, municipality_id, role)')
      .eq('device_id', deviceId)
      .eq('is_active', true)
      .single()

    console.log('📊 Device mapping result:', { deviceMapping, mappingError })

    type DeviceMappingWithProfile = {
      user_id: string
      municipality_id: string | null
      profiles: ProfileRelation | null
    }

    const mappingData = deviceMapping as DeviceMappingWithProfile | null
    const profile = mappingData?.profiles

    if (!profile) {
      console.warn(`⚠️ Device ${deviceId} not mapped to any user - saving with null user_id`)
      console.warn(`⚠️ Admin needs to map this device at /admin/personnel`)
    } else {
      console.log('👤 Device mapped to user:', profile.full_name, '(', profile.id, ')')
    }

    // Prepare GPS location data with validation
    const gpsData: GpsLocationInsert = {
      user_id: profile?.id || null,
      municipality_id: mappingData?.municipality_id || profile?.municipality_id || null,
      latitude,
      longitude,
      accuracy: accuracy ? parseFloat(accuracy) : null,
      speed: speed ? parseFloat(speed) : null,
      heading: bearing ? parseFloat(bearing) : null,
      altitude: altitude ? parseFloat(altitude) : null,
      battery_level: battery ? parseFloat(battery) : null,
      device_id: deviceId,
      recorded_at: recordedAt.toISOString()
    }

    // Validate required fields
    if (!gpsData.device_id) {
      console.error('❌ Missing device_id in GPS data')
      return NextResponse.json(
        { error: 'Invalid data: device_id is required' },
        { status: 400, headers: corsHeaders }
      )
    }

    console.log('💾 Inserting GPS data:', {
      ...gpsData,
      user_mapped: !!profile,
      municipality_mapped: !!gpsData.municipality_id
    })

    // Insert into database using admin client (bypasses RLS)
    const { data, error } = await supabaseAdmin
      .from('gps_locations')
      // @ts-ignore - Supabase type inference issue with Insert type
      .insert(gpsData as Database['public']['Tables']['gps_locations']['Insert'])
      .select()
      .single()

    if (error) {
      console.error('❌ Database insert error:', {
        message: error.message,
        details: error.details,
        hint: error.hint,
        code: error.code,
        device_id: deviceId,
        has_user_id: !!gpsData.user_id
      })
      
      // More specific error messages
      let errorMessage = 'Failed to save location'
      if (error.message.includes('not-null constraint')) {
        errorMessage = 'Database constraint violation - check required fields'
      } else if (error.message.includes('foreign key')) {
        errorMessage = 'Invalid reference - user or municipality not found'
      } else if (error.message.includes('unique constraint')) {
        errorMessage = 'Duplicate GPS data detected'
      }
      
      return NextResponse.json(
        { 
          error: errorMessage, 
          details: error.message,
          device_id: deviceId,
          hint: 'Check if device is properly mapped in /admin/personnel'
        },
        { status: 500, headers: corsHeaders }
      )
    }

    const insertedData = data as GpsLocationRow
    console.log('✅ GPS location saved successfully:', {
      location_id: insertedData.id,
      device_id: deviceId,
      user_id: gpsData.user_id
    })

    return NextResponse.json({ 
      success: true,
      location_id: insertedData.id,
      user_mapped: !!profile,
      message: 'Location saved'
    }, { status: 200, headers: corsHeaders })

  } catch (error) {
    console.error('❌ GPS POST API error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500, headers: corsHeaders }
    )
  }
}

/**
 * GET /api/gps
 * 
 * Traccar Client sends GPS data via GET request
 * Format: ?id=device_id&lat=41.0082&lon=28.9784&timestamp=1706529000000&speed=45.5&bearing=180&altitude=100&accuracy=10&batt=85.5
 */
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    
    // ALWAYS log incoming requests (production too)
    console.log('🚀 GPS GET Request received:', {
      url: request.url,
      params: Object.fromEntries(searchParams.entries()),
      timestamp: new Date().toISOString()
    })

    // Check if this is a Traccar Client request (has required GPS params)
    const deviceId = searchParams.get('id')?.trim()
    const lat = searchParams.get('lat')?.trim()
    const lon = searchParams.get('lon')?.trim()
    const timestamp = searchParams.get('timestamp')?.trim()

    // If GPS params present, treat as Traccar Client location update
    if (deviceId && lat && lon && timestamp) {
      devLog('📍 Processing GPS location from device:', deviceId)

      const speed = searchParams.get('speed')?.trim()
      const bearing = searchParams.get('bearing')?.trim()
      const altitude = searchParams.get('altitude')?.trim()
      const accuracy = searchParams.get('accuracy')?.trim()
      const battery = searchParams.get('battery')?.trim() || searchParams.get('batt')?.trim()

      // Convert to numbers
      const latitude = parseFloat(lat)
      const longitude = parseFloat(lon)
      const recordedAt = new Date(parseInt(timestamp))

      // Validate coordinates
      if (isNaN(latitude) || isNaN(longitude) || latitude < -90 || latitude > 90 || longitude < -180 || longitude > 180) {
        console.error('❌ Invalid coordinates:', { lat, lon })
        return NextResponse.json(
          { error: 'Invalid coordinates' },
          { status: 400 }
        )
      }

      devLog('✅ Valid coordinates:', { latitude, longitude, recordedAt })

      // Find user by checking device_mappings table
      const { data: deviceMapping } = await supabaseAdmin
        .from('device_mappings')
        .select('user_id, municipality_id, profiles:user_id(id, full_name, municipality_id, role)')
        .eq('device_id', deviceId)
        .eq('is_active', true)
        .single()

      type DeviceMappingWithProfile = {
        user_id: string
        municipality_id: string | null
        profiles: ProfileRelation | null
      }

      const mappingData = deviceMapping as DeviceMappingWithProfile | null
      const profile = mappingData?.profiles

      if (!profile) {
        console.warn(`⚠️ Device ${deviceId} not mapped to any user - saving with null user_id`)
        console.warn(`⚠️ Admin needs to map this device at /admin/devices`)
      } else {
        devLog('👤 Device mapped to user:', profile.full_name, '(', profile.id, ')')
      }

      // Prepare GPS data with validation
      const gpsData: GpsLocationInsert = {
        user_id: profile?.id || null,
        municipality_id: mappingData?.municipality_id || profile?.municipality_id || null,
        latitude,
        longitude,
        accuracy: accuracy ? parseFloat(accuracy) : null,
        speed: speed ? parseFloat(speed) : null,
        heading: bearing ? parseFloat(bearing) : null,
        altitude: altitude ? parseFloat(altitude) : null,
        battery_level: battery ? parseFloat(battery) : null,
        device_id: deviceId,
        recorded_at: recordedAt.toISOString()
      }

      // Validate required fields
      if (!gpsData.device_id) {
        console.error('❌ Missing device_id in GPS data')
        return NextResponse.json(
          { error: 'Invalid data: device_id is required' },
          { status: 400, headers: corsHeaders }
        )
      }

      devLog('💾 Inserting GPS data:', {
        ...gpsData,
        user_mapped: !!profile,
        municipality_mapped: !!gpsData.municipality_id
      })

      // Insert into database using admin client (bypasses RLS)
      const { data, error } = await supabaseAdmin
        .from('gps_locations')
        // @ts-ignore - Supabase type inference issue with Insert type
        .insert(gpsData as Database['public']['Tables']['gps_locations']['Insert'])
        .select()
        .single()

      if (error) {
        console.error('❌ Database insert error (GET):', {
          message: error.message,
          details: error.details,
          hint: error.hint,
          code: error.code,
          device_id: deviceId,
          has_user_id: !!gpsData.user_id
        })
        
        let errorMessage = 'Failed to save location'
        if (error.message.includes('not-null constraint')) {
          errorMessage = 'Database constraint violation - check required fields'
        } else if (error.message.includes('foreign key')) {
          errorMessage = 'Invalid reference - user or municipality not found'
        } else if (error.message.includes('unique constraint')) {
          errorMessage = 'Duplicate GPS data detected'
        }
        
        return NextResponse.json(
          { 
            error: errorMessage, 
            details: error.message,
            device_id: deviceId
          },
          { status: 500, headers: corsHeaders }
        )
      }

      const insertedData = data as GpsLocationRow
      devLog('✅ GPS location saved successfully:', insertedData.id)

      return NextResponse.json({ 
        success: true,
        location_id: insertedData.id,
        user_mapped: !!profile,
        message: 'Location saved'
      }, { 
        status: 200,
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
          'Access-Control-Allow-Headers': 'Content-Type'
        }
      })
    }

    // If no GPS params, this is a query request (requires auth)
    devLog('📊 Query request (requires authentication)')
    
    // Use regular authenticated client for queries
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    
    if (!user) {
      console.warn('⚠️ Unauthorized query request')
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    // Get user profile
    const { data: profile } = await supabase
      .from('profiles')
      .select('municipality_id, role')
      .eq('id', user.id)
      .single()

    if (!profile) {
      return NextResponse.json(
        { error: 'Profile not found' },
        { status: 404 }
      )
    }

    // Type assertion for profile - we know these fields exist from select
    const userProfile = profile as { municipality_id: string | null; role: string }

    // Parse query parameters
    const userId = searchParams.get('user_id')
    const limit = parseInt(searchParams.get('limit') || '100')
    const since = searchParams.get('since')

    // Build query
    let query = supabase
      .from('gps_locations')
      .select(`
        *,
        profiles:user_id (
          id,
          full_name,
          role
        )
      `)
      .order('recorded_at', { ascending: false })
      .limit(limit)

    // Filter by user_id if provided
    if (userId) {
      if (userProfile.role === 'worker' && userId !== user.id) {
        return NextResponse.json(
          { error: 'Forbidden: Cannot view other users locations' },
          { status: 403 }
        )
      }
      query = query.eq('user_id', userId)
    } else if (userProfile.role === 'worker') {
      query = query.eq('user_id', user.id)
    }

    // Filter by municipality (use gps_locations.municipality_id directly)
    if (userProfile.role !== 'super_admin' && userProfile.municipality_id) {
      query = query.eq('municipality_id', userProfile.municipality_id)
    }

    // Filter by time if provided
    if (since) {
      query = query.gte('recorded_at', new Date(since).toISOString())
    }

    const { data, error } = await query

    if (error) {
      console.error('Database query error:', error)
      return NextResponse.json(
        { error: 'Failed to fetch locations' },
        { status: 500 }
      )
    }

    devLog('✅ Query successful, returning', data.length, 'locations')

    return NextResponse.json({ 
      locations: data,
      count: data.length
    }, { status: 200 })

  } catch (error) {
    console.error('❌ GPS GET API error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
