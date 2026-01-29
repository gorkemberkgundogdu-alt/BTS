// Traccar API Types
// Documentation: https://www.traccar.org/api-reference/

export interface TraccarPosition {
  id: number
  deviceId: number
  protocol: string
  serverTime: string
  deviceTime: string
  fixTime: string
  latitude: number
  longitude: number
  altitude: number
  speed: number // knots
  course: number // degrees
  accuracy: number // meters
  address?: string
  valid: boolean
  attributes: {
    batteryLevel?: number
    distance?: number
    totalDistance?: number
    motion?: boolean
    ignition?: boolean
    status?: string
    odometer?: number
    hours?: number
    ip?: string
    [key: string]: any
  }
  network?: {
    radioType?: string
    considerIp?: boolean
  }
}

export interface TraccarDevice {
  id: number
  name: string
  uniqueId: string
  status: 'online' | 'offline' | 'unknown'
  disabled: boolean
  lastUpdate: string
  positionId: number
  groupId?: number
  phone?: string
  model?: string
  contact?: string
  category?: string
  attributes: {
    [key: string]: any
  }
}

export interface TraccarWebhookPayload {
  position: TraccarPosition
  device: TraccarDevice
  event?: {
    id: number
    type: string
    eventTime: string
    deviceId: number
    positionId: number
    geofenceId?: number
    maintenanceId?: number
    attributes?: Record<string, any>
  }
}

export interface TraccarUser {
  id: number
  name: string
  email: string
  phone?: string
  readonly: boolean
  administrator: boolean
  disabled: boolean
  expirationTime?: string
  deviceLimit: number
  userLimit: number
  deviceReadonly: boolean
  limitCommands: boolean
  attributes: Record<string, any>
}

export interface TraccarGeofence {
  id: number
  name: string
  description?: string
  area: string // WKT format
  calendarId?: number
  attributes: Record<string, any>
}

// API Response Types
export interface TraccarApiResponse<T> {
  data?: T
  error?: {
    message: string
    code?: string
  }
}

export interface TraccarDevicePosition {
  device: TraccarDevice
  position: TraccarPosition
}

// Webhook Event Types
export type TraccarEventType = 
  | 'deviceOnline'
  | 'deviceOffline'
  | 'deviceMoving'
  | 'deviceStopped'
  | 'deviceOverspeed'
  | 'deviceFuelDrop'
  | 'geofenceEnter'
  | 'geofenceExit'
  | 'alarm'
  | 'ignitionOn'
  | 'ignitionOff'
  | 'maintenance'
  | 'textMessage'
  | 'driverChanged'
  | 'commandResult'

// Request Types
export interface TraccarDeviceRequest {
  name: string
  uniqueId: string
  groupId?: number
  phone?: string
  model?: string
  contact?: string
  category?: string
  disabled?: boolean
  attributes?: Record<string, any>
}

export interface TraccarPositionQuery {
  deviceId: number
  from: string // ISO 8601 date
  to: string // ISO 8601 date
}

// Database Integration Types
export interface GpsLocationWithTraccar {
  id: string
  user_id: string
  task_id?: string
  latitude: number
  longitude: number
  accuracy: number
  speed?: number
  heading?: number
  altitude?: number
  source: 'browser' | 'traccar' | 'hardware'
  device_id?: string
  battery_level?: number
  traccar_position_id?: number
  recorded_at: string
  created_at: string
}

export interface ProfileWithTraccar {
  id: string
  full_name: string
  email: string
  role: string
  traccar_device_id?: string
}
