export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "13.0.4"
  }
  public: {
    Tables: {
      audit_events: {
        Row: {
          action: string
          created_at: string
          entity_id: string | null
          entity_type: string
          id: string
          ip_address: unknown | null
          new_values: Json | null
          old_values: Json | null
          user_agent: string | null
          user_id: string | null
        }
        Insert: {
          action: string
          created_at?: string
          entity_id?: string | null
          entity_type: string
          id?: string
          ip_address?: unknown | null
          new_values?: Json | null
          old_values?: Json | null
          user_agent?: string | null
          user_id?: string | null
        }
        Update: {
          action?: string
          created_at?: string
          entity_id?: string | null
          entity_type?: string
          id?: string
          ip_address?: unknown | null
          new_values?: Json | null
          old_values?: Json | null
          user_agent?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "audit_events_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      claims: {
        Row: {
          claim_date: string
          created_at: string
          entry_id: string
          hole_number: number
          id: string
          notes: string | null
          photo_urls: string[] | null
          status: Database["public"]["Enums"]["claim_status"]
          updated_at: string
          verified_at: string | null
          verified_by: string | null
          witness_contact: string | null
          witness_name: string | null
        }
        Insert: {
          claim_date?: string
          created_at?: string
          entry_id: string
          hole_number: number
          id?: string
          notes?: string | null
          photo_urls?: string[] | null
          status?: Database["public"]["Enums"]["claim_status"]
          updated_at?: string
          verified_at?: string | null
          verified_by?: string | null
          witness_contact?: string | null
          witness_name?: string | null
        }
        Update: {
          claim_date?: string
          created_at?: string
          entry_id?: string
          hole_number?: number
          id?: string
          notes?: string | null
          photo_urls?: string[] | null
          status?: Database["public"]["Enums"]["claim_status"]
          updated_at?: string
          verified_at?: string | null
          verified_by?: string | null
          witness_contact?: string | null
          witness_name?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "claims_entry_id_fkey"
            columns: ["entry_id"]
            isOneToOne: false
            referencedRelation: "entries"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "claims_verified_by_fkey"
            columns: ["verified_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      club_payments: {
        Row: {
          amount: number
          club_id: string
          commission_rate: number
          created_at: string
          created_by: string | null
          entries_count: number
          id: string
          notes: string | null
          payment_date: string
          payment_method: string | null
          payment_reference: string | null
          period_end: string
          period_start: string
          status: string | null
          updated_at: string
        }
        Insert: {
          amount: number
          club_id: string
          commission_rate?: number
          created_at?: string
          created_by?: string | null
          entries_count?: number
          id?: string
          notes?: string | null
          payment_date: string
          payment_method?: string | null
          payment_reference?: string | null
          period_end: string
          period_start: string
          status?: string | null
          updated_at?: string
        }
        Update: {
          amount?: number
          club_id?: string
          commission_rate?: number
          created_at?: string
          created_by?: string | null
          entries_count?: number
          id?: string
          notes?: string | null
          payment_date?: string
          payment_method?: string | null
          payment_reference?: string | null
          period_end?: string
          period_start?: string
          status?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "club_payments_club_id_fkey"
            columns: ["club_id"]
            isOneToOne: false
            referencedRelation: "clubs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "club_payments_club_id_fkey"
            columns: ["club_id"]
            isOneToOne: false
            referencedRelation: "clubs_public"
            referencedColumns: ["id"]
          },
        ]
      }
      clubs: {
        Row: {
          active: boolean
          address: string | null
          archived: boolean
          bank_account_holder: string | null
          bank_account_number: string | null
          bank_iban: string | null
          bank_sort_code: string | null
          bank_swift: string | null
          contract_signed: boolean
          contract_signed_by_email: string | null
          contract_signed_by_name: string | null
          contract_signed_date: string | null
          contract_url: string | null
          created_at: string
          email: string | null
          id: string
          logo_url: string | null
          name: string
          phone: string | null
          updated_at: string
          website: string | null
        }
        Insert: {
          active?: boolean
          address?: string | null
          archived?: boolean
          bank_account_holder?: string | null
          bank_account_number?: string | null
          bank_iban?: string | null
          bank_sort_code?: string | null
          bank_swift?: string | null
          contract_signed?: boolean
          contract_signed_by_email?: string | null
          contract_signed_by_name?: string | null
          contract_signed_date?: string | null
          contract_url?: string | null
          created_at?: string
          email?: string | null
          id?: string
          logo_url?: string | null
          name: string
          phone?: string | null
          updated_at?: string
          website?: string | null
        }
        Update: {
          active?: boolean
          address?: string | null
          archived?: boolean
          bank_account_holder?: string | null
          bank_account_number?: string | null
          bank_iban?: string | null
          bank_sort_code?: string | null
          bank_swift?: string | null
          contract_signed?: boolean
          contract_signed_by_email?: string | null
          contract_signed_by_name?: string | null
          contract_signed_date?: string | null
          contract_url?: string | null
          created_at?: string
          email?: string | null
          id?: string
          logo_url?: string | null
          name?: string
          phone?: string | null
          updated_at?: string
          website?: string | null
        }
        Relationships: []
      }
      competitions: {
        Row: {
          archived: boolean
          club_id: string
          commission_amount: number | null
          created_at: string
          description: string | null
          end_date: string | null
          entry_fee: number | null
          hero_image_url: string | null
          hole_number: number
          id: string
          is_year_round: boolean
          name: string
          prize_pool: number | null
          rules: Json | null
          start_date: string
          status: Database["public"]["Enums"]["competition_status"]
          updated_at: string
        }
        Insert: {
          archived?: boolean
          club_id: string
          commission_amount?: number | null
          created_at?: string
          description?: string | null
          end_date?: string | null
          entry_fee?: number | null
          hero_image_url?: string | null
          hole_number?: number
          id?: string
          is_year_round?: boolean
          name: string
          prize_pool?: number | null
          rules?: Json | null
          start_date: string
          status?: Database["public"]["Enums"]["competition_status"]
          updated_at?: string
        }
        Update: {
          archived?: boolean
          club_id?: string
          commission_amount?: number | null
          created_at?: string
          description?: string | null
          end_date?: string | null
          entry_fee?: number | null
          hero_image_url?: string | null
          hole_number?: number
          id?: string
          is_year_round?: boolean
          name?: string
          prize_pool?: number | null
          rules?: Json | null
          start_date?: string
          status?: Database["public"]["Enums"]["competition_status"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "competitions_club_id_fkey"
            columns: ["club_id"]
            isOneToOne: false
            referencedRelation: "clubs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "competitions_club_id_fkey"
            columns: ["club_id"]
            isOneToOne: false
            referencedRelation: "clubs_public"
            referencedColumns: ["id"]
          },
        ]
      }
      entries: {
        Row: {
          amount_minor: number | null
          attempt_window_end: string | null
          attempt_window_start: string | null
          competition_id: string
          completed_at: string | null
          created_at: string
          entry_date: string
          id: string
          location_accuracy: number | null
          location_latitude: number | null
          location_longitude: number | null
          location_timestamp: string | null
          outcome_official: string | null
          outcome_reported_at: string | null
          outcome_self: string | null
          paid: boolean
          payment_date: string | null
          player_id: string
          score: number | null
          status: string | null
          terms_accepted_at: string | null
          terms_version: string | null
          updated_at: string
        }
        Insert: {
          amount_minor?: number | null
          attempt_window_end?: string | null
          attempt_window_start?: string | null
          competition_id: string
          completed_at?: string | null
          created_at?: string
          entry_date?: string
          id?: string
          location_accuracy?: number | null
          location_latitude?: number | null
          location_longitude?: number | null
          location_timestamp?: string | null
          outcome_official?: string | null
          outcome_reported_at?: string | null
          outcome_self?: string | null
          paid?: boolean
          payment_date?: string | null
          player_id: string
          score?: number | null
          status?: string | null
          terms_accepted_at?: string | null
          terms_version?: string | null
          updated_at?: string
        }
        Update: {
          amount_minor?: number | null
          attempt_window_end?: string | null
          attempt_window_start?: string | null
          competition_id?: string
          completed_at?: string | null
          created_at?: string
          entry_date?: string
          id?: string
          location_accuracy?: number | null
          location_latitude?: number | null
          location_longitude?: number | null
          location_timestamp?: string | null
          outcome_official?: string | null
          outcome_reported_at?: string | null
          outcome_self?: string | null
          paid?: boolean
          payment_date?: string | null
          player_id?: string
          score?: number | null
          status?: string | null
          terms_accepted_at?: string | null
          terms_version?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "entries_competition_id_fkey"
            columns: ["competition_id"]
            isOneToOne: false
            referencedRelation: "competitions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "entries_player_id_fkey"
            columns: ["player_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      leads: {
        Row: {
          club_id: string | null
          contacted_at: string | null
          converted_at: string | null
          created_at: string
          email: string
          id: string
          name: string
          notes: string | null
          phone: string | null
          source: string | null
          status: Database["public"]["Enums"]["lead_status"]
          updated_at: string
        }
        Insert: {
          club_id?: string | null
          contacted_at?: string | null
          converted_at?: string | null
          created_at?: string
          email: string
          id?: string
          name: string
          notes?: string | null
          phone?: string | null
          source?: string | null
          status?: Database["public"]["Enums"]["lead_status"]
          updated_at?: string
        }
        Update: {
          club_id?: string | null
          contacted_at?: string | null
          converted_at?: string | null
          created_at?: string
          email?: string
          id?: string
          name?: string
          notes?: string | null
          phone?: string | null
          source?: string | null
          status?: Database["public"]["Enums"]["lead_status"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "leads_club_id_fkey"
            columns: ["club_id"]
            isOneToOne: false
            referencedRelation: "clubs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "leads_club_id_fkey"
            columns: ["club_id"]
            isOneToOne: false
            referencedRelation: "clubs_public"
            referencedColumns: ["id"]
          },
        ]
      }
      notes: {
        Row: {
          content: string
          created_at: string
          created_by: string | null
          created_by_name: string | null
          entity_id: string
          entity_type: string
          id: string
          immutable: boolean
          note_type: string
          updated_at: string
        }
        Insert: {
          content: string
          created_at?: string
          created_by?: string | null
          created_by_name?: string | null
          entity_id: string
          entity_type: string
          id?: string
          immutable?: boolean
          note_type?: string
          updated_at?: string
        }
        Update: {
          content?: string
          created_at?: string
          created_by?: string | null
          created_by_name?: string | null
          entity_id?: string
          entity_type?: string
          id?: string
          immutable?: boolean
          note_type?: string
          updated_at?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          age_years: number | null
          club_id: string | null
          consent_marketing: boolean | null
          created_at: string
          dob: string | null
          email: string
          first_name: string | null
          handicap: number | null
          id: string
          last_name: string | null
          location_accuracy: number | null
          location_latitude: number | null
          location_longitude: number | null
          location_timestamp: string | null
          phone: string | null
          phone_e164: string | null
          role: Database["public"]["Enums"]["user_role"]
          updated_at: string
        }
        Insert: {
          age_years?: number | null
          club_id?: string | null
          consent_marketing?: boolean | null
          created_at?: string
          dob?: string | null
          email: string
          first_name?: string | null
          handicap?: number | null
          id: string
          last_name?: string | null
          location_accuracy?: number | null
          location_latitude?: number | null
          location_longitude?: number | null
          location_timestamp?: string | null
          phone?: string | null
          phone_e164?: string | null
          role?: Database["public"]["Enums"]["user_role"]
          updated_at?: string
        }
        Update: {
          age_years?: number | null
          club_id?: string | null
          consent_marketing?: boolean | null
          created_at?: string
          dob?: string | null
          email?: string
          first_name?: string | null
          handicap?: number | null
          id?: string
          last_name?: string | null
          location_accuracy?: number | null
          location_latitude?: number | null
          location_longitude?: number | null
          location_timestamp?: string | null
          phone?: string | null
          phone_e164?: string | null
          role?: Database["public"]["Enums"]["user_role"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "profiles_club_id_fkey"
            columns: ["club_id"]
            isOneToOne: false
            referencedRelation: "clubs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "profiles_club_id_fkey"
            columns: ["club_id"]
            isOneToOne: false
            referencedRelation: "clubs_public"
            referencedColumns: ["id"]
          },
        ]
      }
      venues: {
        Row: {
          club_id: string | null
          created_at: string
          id: string
          name: string
          slug: string
          updated_at: string
        }
        Insert: {
          club_id?: string | null
          created_at?: string
          id?: string
          name: string
          slug: string
          updated_at?: string
        }
        Update: {
          club_id?: string | null
          created_at?: string
          id?: string
          name?: string
          slug?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "venues_club_id_fkey"
            columns: ["club_id"]
            isOneToOne: false
            referencedRelation: "clubs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "venues_club_id_fkey"
            columns: ["club_id"]
            isOneToOne: false
            referencedRelation: "clubs_public"
            referencedColumns: ["id"]
          },
        ]
      }
      verifications: {
        Row: {
          created_at: string
          entry_id: string | null
          id: string
          staff_code: string | null
          status: string | null
          updated_at: string
          verified_at: string | null
          verified_by: string | null
          video_url: string | null
          witnesses: Json
        }
        Insert: {
          created_at?: string
          entry_id?: string | null
          id?: string
          staff_code?: string | null
          status?: string | null
          updated_at?: string
          verified_at?: string | null
          verified_by?: string | null
          video_url?: string | null
          witnesses: Json
        }
        Update: {
          created_at?: string
          entry_id?: string | null
          id?: string
          staff_code?: string | null
          status?: string | null
          updated_at?: string
          verified_at?: string | null
          verified_by?: string | null
          video_url?: string | null
          witnesses?: Json
        }
        Relationships: [
          {
            foreignKeyName: "verifications_entry_id_fkey"
            columns: ["entry_id"]
            isOneToOne: false
            referencedRelation: "entries"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "verifications_verified_by_fkey"
            columns: ["verified_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      clubs_public: {
        Row: {
          created_at: string | null
          id: string | null
          name: string | null
          website: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string | null
          name?: string | null
          website?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string | null
          name?: string | null
          website?: string | null
        }
        Relationships: []
      }
    }
    Functions: {
      get_competition_status: {
        Args: { end_date: string; is_year_round: boolean; start_date: string }
        Returns: Database["public"]["Enums"]["competition_status"]
      }
      get_current_user_club_id: {
        Args: Record<PropertyKey, never>
        Returns: string
      }
      get_current_user_role: {
        Args: Record<PropertyKey, never>
        Returns: Database["public"]["Enums"]["user_role"]
      }
      get_safe_clubs_data: {
        Args: Record<PropertyKey, never>
        Returns: {
          created_at: string
          id: string
          logo_url: string
          name: string
          website: string
        }[]
      }
    }
    Enums: {
      claim_status: "PENDING" | "VERIFIED" | "REJECTED"
      competition_status: "SCHEDULED" | "ACTIVE" | "ENDED"
      lead_status: "NEW" | "CONTACTED" | "CONVERTED" | "LOST"
      user_role: "ADMIN" | "CLUB" | "PLAYER"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      claim_status: ["PENDING", "VERIFIED", "REJECTED"],
      competition_status: ["SCHEDULED", "ACTIVE", "ENDED"],
      lead_status: ["NEW", "CONTACTED", "CONVERTED", "LOST"],
      user_role: ["ADMIN", "CLUB", "PLAYER"],
    },
  },
} as const
