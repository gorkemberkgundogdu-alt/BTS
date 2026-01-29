import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

/**
 * GPS Tracking API Endpoint
 * 
 * Supports both GET and POST for Traccar Client compatibility
 * GET: Traccar Client default method
 * POST: Alternative method
 * 
 * Format: ?id=device_id&lat=41.0082&lon=28.9784&timestamp=1706529000000&speed=45.5&bearing=180&altitude=100&accuracy=10&batt=85.5
 */

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
    const supabase = createClient()
    const searchParams = request.nextUrl.searchParams
    
    // Log incoming request
    console.log('🚀 GPS POST Request received:', {
      url: request.url,
      params: Object.fromEntries(searchParams.entries()),
      timestamp: new Date().toISOString()
    })
    
    const deviceId = searchParams.get('id')
    const lat = searchParams.get('lat')
    const lon = searchParams.get('lon')
    const timestamp = searchParams.get('timestamp')
    const speed = searchParams.get('speed')
    const bearing = searchParams.get('bearing')
    const altitude = searchParams.get('altitude')
    const accuracy = searchParams.get('accuracy')
    const battery = searchParams.get('battery') || searchParams.get('batt')

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

    // Find user by device_id
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('id, municipality_id, full_name')
      .eq('traccar_device_id', deviceId)
      .single()

    if (profileError) {
      console.warn('⚠️ Profile query error:', profileError)
    }

    if (!profile) {
      console.warn(`⚠️ Device ${deviceId} not mapped to any user - saving with null user_id`)
    } else {
      console.log('👤 Device mapped to user:', profile.full_name, '(', profile.id, ')')
    }

    // Prepare GPS location data
    const gpsData = {
      user_id: profile?.id || null,
      latitude,
      longitude,
      accuracy: accuracy ? parseFloat(accuracy) : null,
      speed: speed ? parseFloat(speed) : null,
      heading: bearing ? parseFloat(bearing) : null,
      altitude: altitude ? parseFloat(altitude) : null,
      battery_level: battery ? parseFloat(battery) : null,
      source: 'traccar' as const,
      device_id: deviceId,
      recorded_at: recordedAt.toISOString()
    }

    console.log('💾 Inserting GPS data:', gpsData)

    // Insert into database
    const { data, error } = await supabase
      .from('gps_locations')
      .insert(gpsData)
      .select()
      .single()

    if (error) {
      console.error('❌ Database insert error:', error)
      return NextResponse.json(
        { error: 'Failed to save location', details: error.message },
        { status: 500, headers: corsHeaders }
      )
    }

    console.log('✅ GPS location saved successfully:', data.id)

    return NextResponse.json({ 
      success: true,
      location_id: data.id,
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
    const supabase = createClient()
    const searchParams = request.nextUrl.searchParams
    
    // Log incoming request for debugging
    console.log('🚀 GPS GET Request received:', {
      url: request.url,
      params: Object.fromEntries(searchParams.entries()),
      timestamp: new Date().toISOString()
    })

    // Check if this is a Traccar Client request (has required GPS params)
    const deviceId = searchParams.get('id')
    const lat = searchParams.get('lat')
    const lon = searchParams.get('lon')
    const timestamp = searchParams.get('timestamp')

    // If GPS params present, treat as Traccar Client location update
    if (deviceId && lat && lon && timestamp) {
      console.log('📍 Processing GPS location from device:', deviceId)

      const speed = searchParams.get('speed')
      const bearing = searchParams.get('bearing')
      const altitude = searchParams.get('altitude')
      const accuracy = searchParams.get('accuracy')
      const battery = searchParams.get('battery') || searchParams.get('batt')

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

      console.log('✅ Valid coordinates:', { latitude, longitude, recordedAt })

      // Find user by device_id
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('id, municipality_id, full_name')
        .eq('traccar_device_id', deviceId)
        .single()

      if (profileError) {
        console.warn('⚠️ Profile query error:', profileError)
      }

      if (!profile) {
        console.warn(`⚠️ Device ${deviceId} not mapped to any user - saving with null user_id`)
      } else {
        console.log('👤 Device mapped to user:', profile.full_name, '(', profile.id, ')')
      }

      // Prepare GPS data
      const gpsData = {
        user_id: profile?.id || null,
        latitude,
        longitude,
        accuracy: accuracy ? parseFloat(accuracy) : null,
        speed: speed ? parseFloat(speed) : null,
        heading: bearing ? parseFloat(bearing) : null,
        altitude: altitude ? parseFloat(altitude) : null,
        battery_level: battery ? parseFloat(battery) : null,
        source: 'traccar' as const,
        device_id: deviceId,
        recorded_at: recordedAt.toISOString()
      }

      console.log('💾 Inserting GPS data:', gpsData)

      // Insert into database
      const { data, error } = await supabase
        .from('gps_locations')
        .insert(gpsData)
        .select()
        .single()

      if (error) {
        console.error('❌ Database insert error:', error)
        return NextResponse.json(
          { error: 'Failed to save location', details: error.message },
          { status: 500 }
        )
      }

      console.log('✅ GPS location saved successfully:', data.id)

      return NextResponse.json({ 
        success: true,
        location_id: data.id,
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
    console.log('📊 Query request (requires authentication)')
    
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
      if (profile.role === 'worker' && userId !== user.id) {
        return NextResponse.json(
          { error: 'Forbidden: Cannot view other users locations' },
          { status: 403 }
        )
      }
      query = query.eq('user_id', userId)
    } else if (profile.role === 'worker') {
      query = query.eq('user_id', user.id)
    }

    // Filter by municipality
    if (profile.role !== 'super_admin') {
      query = query.eq('profiles.municipality_id', profile.municipality_id)
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

    console.log('✅ Query successful, returning', data.length, 'locations')

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
