export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export interface Database {
  public: {
    Tables: {
      contacts: {
        Row: {
          id: number
          hubspot_id: string
          email: string | null
          first_name: string | null
          last_name: string | null
          phone: string | null
          company: string | null
          job_title: string | null
          raw_data: Json
          hubspot_synced_at: string
          created_at: string
          updated_at: string
        }
        Insert: Omit<Database['public']['Tables']['contacts']['Row'], 'id' | 'created_at' | 'updated_at'>
        Update: Partial<Database['public']['Tables']['contacts']['Insert']>
      }
      companies: {
        Row: {
          id: number
          hubspot_id: string
          name: string
          domain: string | null
          raw_data: Json
          hubspot_synced_at: string
          created_at: string
          updated_at: string
        }
        Insert: Omit<Database['public']['Tables']['companies']['Row'], 'id' | 'created_at' | 'updated_at'>
        Update: Partial<Database['public']['Tables']['companies']['Insert']>
      }
      deals: {
        Row: {
          id: number
          hubspot_deal_id: string
          hubspot_owner_id: string | null
          name: string
          stage: string
          amount: number | null
          close_date: string | null
          raw_data: Json
          hubspot_synced_at: string
          created_at: string
          updated_at: string
        }
        Insert: Omit<Database['public']['Tables']['deals']['Row'], 'id' | 'created_at' | 'updated_at'>
        Update: Partial<Database['public']['Tables']['deals']['Insert']>
      }
      deal_engagements: {
        Row: {
          id: number
          deal_id: number
          hubspot_engagement_id: string
          type: string
          title: string | null
          description: string | null
          created_at: string
          updated_at: string
        }
        Insert: Omit<Database['public']['Tables']['deal_engagements']['Row'], 'id' | 'created_at' | 'updated_at'>
        Update: Partial<Database['public']['Tables']['deal_engagements']['Insert']>
      }
      hubspot_associations: {
        Row: {
          id: number
          from_type: string
          from_id: number
          to_type: string
          to_id: number
          association_type: string
          created_at: string
          updated_at: string
        }
        Insert: Omit<Database['public']['Tables']['hubspot_associations']['Row'], 'id' | 'created_at' | 'updated_at'>
        Update: Partial<Database['public']['Tables']['hubspot_associations']['Insert']>
      }
      users: {
        Row: {
          id: number
          clerk_id: string
          email: string
          hubspot_owner_id: string | null
          created_at: string
          updated_at: string
        }
        Insert: Omit<Database['public']['Tables']['users']['Row'], 'id' | 'created_at' | 'updated_at'>
        Update: Partial<Database['public']['Tables']['users']['Insert']>
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      get_duplicate_associations: {
        Args: {
          from_type: string
          to_type: string
        }
        Returns: {
          from_id: number
          to_id: number
          count: number
        }[]
      }
    }
    Enums: {
      [_ in never]: never
    }
  }
}
