/**
 * Supabase Database Types
 * Simplified type definitions for tables
 */

export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string
          email: string | null
          full_name: string | null
          avatar_url: string | null
          role: string
          municipality_id: string | null
          city: string | null
          district: string | null
          department: string | null
          employee_id: string | null
          phone: string | null
          unit: string | null
          status: string
          notes: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          email?: string | null
          full_name?: string | null
          avatar_url?: string | null
          role: string
          municipality_id?: string | null
          city?: string | null
          district?: string | null
          department?: string | null
          employee_id?: string | null
          phone?: string | null
          unit?: string | null
          status?: string
          notes?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          email?: string | null
          full_name?: string | null
          avatar_url?: string | null
          role?: string
          municipality_id?: string | null
          city?: string | null
          district?: string | null
          department?: string | null
          employee_id?: string | null
          phone?: string | null
          unit?: string | null
          status?: string
          notes?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      gps_locations: {
        Row: {
          id: string
          device_id: string
          user_id: string | null
          municipality_id: string | null
          latitude: number
          longitude: number
          speed: number | null
          heading: number | null
          altitude: number | null
          accuracy: number | null
          battery_level: number | null
          recorded_at: string
          created_at: string
        }
        Insert: {
          id?: string
          device_id: string
          user_id?: string | null
          municipality_id?: string | null
          latitude: number
          longitude: number
          speed?: number | null
          heading?: number | null
          altitude?: number | null
          accuracy?: number | null
          battery_level?: number | null
          recorded_at?: string
          created_at?: string
        }
        Update: {
          id?: string
          device_id?: string
          user_id?: string | null
          municipality_id?: string | null
          latitude?: number
          longitude?: number
          speed?: number | null
          heading?: number | null
          altitude?: number | null
          accuracy?: number | null
          battery_level?: number | null
          recorded_at?: string
          created_at?: string
        }
      }
      municipalities: {
        Row: {
          id: string
          name: string
          code: string
          city: string | null
          district: string | null
          logo_url: string | null
          settings: Json
          subscription_plan: string
          is_active: boolean
          contact_person: string | null
          created_at: string
        }
        Insert: {
          id?: string
          name: string
          code: string
          city?: string | null
          district?: string | null
          logo_url?: string | null
          settings?: Json
          subscription_plan?: string
          is_active?: boolean
          contact_person?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          name?: string
          code?: string
          city?: string | null
          district?: string | null
          logo_url?: string | null
          settings?: Json
          subscription_plan?: string
          is_active?: boolean
          contact_person?: string | null
          created_at?: string
        }
      }
      routes: {
        Row: {
          id: string
          municipality_id: string | null
          code: string | null
          name: string
          description: string | null
          geojson: Json | null
          length_km: number | null
          estimated_duration_minutes: number | null
          scheduled_miles: number | null
          difficulty_level: string
          required_vehicle_type: string | null
          district: string | null
          active: boolean
          last_cleaned_at: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          municipality_id?: string | null
          code?: string | null
          name: string
          description?: string | null
          geojson?: Json | null
          length_km?: number | null
          estimated_duration_minutes?: number | null
          scheduled_miles?: number | null
          difficulty_level?: string
          required_vehicle_type?: string | null
          district?: string | null
          active?: boolean
          last_cleaned_at?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          municipality_id?: string | null
          code?: string | null
          name?: string
          description?: string | null
          geojson?: Json | null
          length_km?: number | null
          estimated_duration_minutes?: number | null
          scheduled_miles?: number | null
          difficulty_level?: string
          required_vehicle_type?: string | null
          district?: string | null
          active?: boolean
          last_cleaned_at?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      tasks: {
        Row: {
          id: string
          municipality_id: string | null
          route_id: string | null
          assigned_to: string | null
          created_by: string | null
          scheduled_start: string | null
          title: string
          description: string | null
          status: string
          assigned_vehicle: string | null
          scheduled_miles: number | null
          completed_miles: number | null
          notes: string | null
          weather_conditions: string | null
          delay_reason: string | null
          photo_count: number
          started_at: string | null
          completed_at: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          municipality_id?: string | null
          route_id?: string | null
          assigned_to?: string | null
          created_by?: string | null
          scheduled_start?: string | null
          title: string
          description?: string | null
          status?: string
          assigned_vehicle?: string | null
          scheduled_miles?: number | null
          completed_miles?: number | null
          notes?: string | null
          weather_conditions?: string | null
          delay_reason?: string | null
          photo_count?: number
          started_at?: string | null
          completed_at?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          municipality_id?: string | null
          route_id?: string | null
          assigned_to?: string | null
          created_by?: string | null
          scheduled_start?: string | null
          title?: string
          description?: string | null
          status?: string
          assigned_vehicle?: string | null
          scheduled_miles?: number | null
          completed_miles?: number | null
          notes?: string | null
          weather_conditions?: string | null
          delay_reason?: string | null
          photo_count?: number
          started_at?: string | null
          completed_at?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      gps_traces: {
        Row: {
          id: string
          municipality_id: string | null
          task_id: string | null
          vehicle: string | null
          points: Json
          miles: number | null
          created_at: string
        }
        Insert: {
          id?: string
          municipality_id?: string | null
          task_id?: string | null
          vehicle?: string | null
          points: Json
          miles?: number | null
          created_at?: string
        }
        Update: {
          id?: string
          municipality_id?: string | null
          task_id?: string | null
          vehicle?: string | null
          points?: Json
          miles?: number | null
          created_at?: string
        }
      }
      inspections: {
        Row: {
          id: string
          task_id: string | null
          inspector_id: string | null
          grade: string
          litter_count: number | null
          notes: string | null
          photos: Json | null
          signed: boolean
          created_at: string
        }
        Insert: {
          id?: string
          task_id?: string | null
          inspector_id?: string | null
          grade: string
          litter_count?: number | null
          notes?: string | null
          photos?: Json | null
          signed?: boolean
          created_at?: string
        }
        Update: {
          id?: string
          task_id?: string | null
          inspector_id?: string | null
          grade?: string
          litter_count?: number | null
          notes?: string | null
          photos?: Json | null
          signed?: boolean
          created_at?: string
        }
      }
      personnel_scores: {
        Row: {
          id: string
          profile_id: string
          municipality_id: string
          period_start: string
          period_end: string
          tasks_completed: number
          tasks_on_time: number
          inspection_avg_grade: number | null
          total_km: number
          bonus_points: number
          penalty_points: number
          final_score: number | null
          created_at: string
        }
        Insert: {
          id?: string
          profile_id: string
          municipality_id: string
          period_start: string
          period_end: string
          tasks_completed?: number
          tasks_on_time?: number
          inspection_avg_grade?: number | null
          total_km?: number
          bonus_points?: number
          penalty_points?: number
          final_score?: number | null
          created_at?: string
        }
        Update: {
          id?: string
          profile_id?: string
          municipality_id?: string
          period_start?: string
          period_end?: string
          tasks_completed?: number
          tasks_on_time?: number
          inspection_avg_grade?: number | null
          total_km?: number
          bonus_points?: number
          penalty_points?: number
          final_score?: number | null
          created_at?: string
        }
      }
      tickets: {
        Row: {
          id: string
          municipality_id: string | null
          title: string
          description: string | null
          status: string
          priority: string
          reported_by_unit: string | null
          channel: string | null
          geo: Json | null
          location_lat: number | null
          location_lng: number | null
          district: string | null
          reporter_name: string | null
          reporter_phone: string | null
          photo_urls: string[] | null
          related_task_id: string | null
          assigned_to: string | null
          reported_at: string
          resolved_at: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          municipality_id?: string | null
          title: string
          description?: string | null
          status?: string
          priority?: string
          reported_by_unit?: string | null
          channel?: string | null
          geo?: Json | null
          location_lat?: number | null
          location_lng?: number | null
          district?: string | null
          reporter_name?: string | null
          reporter_phone?: string | null
          photo_urls?: string[] | null
          related_task_id?: string | null
          assigned_to?: string | null
          reported_at?: string
          resolved_at?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          municipality_id?: string | null
          title?: string
          description?: string | null
          status?: string
          priority?: string
          reported_by_unit?: string | null
          channel?: string | null
          geo?: Json | null
          location_lat?: number | null
          location_lng?: number | null
          district?: string | null
          reporter_name?: string | null
          reporter_phone?: string | null
          photo_urls?: string[] | null
          related_task_id?: string | null
          assigned_to?: string | null
          reported_at?: string
          resolved_at?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      notifications: {
        Row: {
          id: string
          user_id: string
          municipality_id: string
          title: string
          body: string | null
          type: string
          data: Json
          is_read: boolean
          read_at: string | null
          created_at: string
        }
        Insert: {
          id?: string
          user_id: string
          municipality_id: string
          title: string
          body?: string | null
          type: string
          data?: Json
          is_read?: boolean
          read_at?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          municipality_id?: string
          title?: string
          body?: string | null
          type?: string
          data?: Json
          is_read?: boolean
          read_at?: string | null
          created_at?: string
        }
      }
      audit_logs: {
        Row: {
          id: string
          municipality_id: string | null
          actor_id: string | null
          action: string
          entity_type: string
          entity_id: string | null
          before: Json | null
          after: Json | null
          created_at: string
        }
        Insert: {
          id?: string
          municipality_id?: string | null
          actor_id?: string | null
          action: string
          entity_type: string
          entity_id?: string | null
          before?: Json | null
          after?: Json | null
          created_at?: string
        }
        Update: {
          id?: string
          municipality_id?: string | null
          actor_id?: string | null
          action?: string
          entity_type?: string
          entity_id?: string | null
          before?: Json | null
          after?: Json | null
          created_at?: string
        }
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      get_user_municipality_id: {
        Args: Record<string, never>
        Returns: string
      }
      get_user_role: {
        Args: Record<string, never>
        Returns: string
      }
    }
    Enums: {
      [_ in never]: never
    }
  }
}
