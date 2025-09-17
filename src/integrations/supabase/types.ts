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
    PostgrestVersion: "13.0.5"
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
            referencedRelation: "incomplete_players_v1"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "audit_events_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      audit_logs: {
        Row: {
          action: string
          actor_id: string | null
          created_at: string | null
          id: string
          metadata: Json | null
          reason: string | null
          target_user_id: string | null
        }
        Insert: {
          action: string
          actor_id?: string | null
          created_at?: string | null
          id?: string
          metadata?: Json | null
          reason?: string | null
          target_user_id?: string | null
        }
        Update: {
          action?: string
          actor_id?: string | null
          created_at?: string | null
          id?: string
          metadata?: Json | null
          reason?: string | null
          target_user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "audit_logs_actor_id_fkey"
            columns: ["actor_id"]
            isOneToOne: false
            referencedRelation: "incomplete_players_v1"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "audit_logs_actor_id_fkey"
            columns: ["actor_id"]
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
            referencedRelation: "incomplete_players_v1"
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
      club_banking: {
        Row: {
          access_count: number | null
          bank_account_holder: string | null
          bank_account_number: string | null
          bank_iban: string | null
          bank_sort_code: string | null
          bank_swift: string | null
          club_id: string
          created_at: string
          created_by: string | null
          id: string
          last_accessed_at: string | null
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          access_count?: number | null
          bank_account_holder?: string | null
          bank_account_number?: string | null
          bank_iban?: string | null
          bank_sort_code?: string | null
          bank_swift?: string | null
          club_id: string
          created_at?: string
          created_by?: string | null
          id?: string
          last_accessed_at?: string | null
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          access_count?: number | null
          bank_account_holder?: string | null
          bank_account_number?: string | null
          bank_iban?: string | null
          bank_sort_code?: string | null
          bank_swift?: string | null
          club_id?: string
          created_at?: string
          created_by?: string | null
          id?: string
          last_accessed_at?: string | null
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "club_banking_club_id_fkey"
            columns: ["club_id"]
            isOneToOne: true
            referencedRelation: "clubs"
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
        ]
      }
      clubs: {
        Row: {
          active: boolean
          address: string | null
          archived: boolean
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
        ]
      }
      data_access_log: {
        Row: {
          access_type: string
          created_at: string
          id: string
          ip_address: unknown | null
          record_id: string | null
          sensitive_fields: string[] | null
          table_name: string
          user_agent: string | null
          user_id: string | null
        }
        Insert: {
          access_type: string
          created_at?: string
          id?: string
          ip_address?: unknown | null
          record_id?: string | null
          sensitive_fields?: string[] | null
          table_name: string
          user_agent?: string | null
          user_id?: string | null
        }
        Update: {
          access_type?: string
          created_at?: string
          id?: string
          ip_address?: unknown | null
          record_id?: string | null
          sensitive_fields?: string[] | null
          table_name?: string
          user_agent?: string | null
          user_id?: string | null
        }
        Relationships: []
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
          payment_provider: string | null
          player_id: string
          score: number | null
          status: string | null
          terms_accepted_at: string | null
          terms_version: string | null
          updated_at: string
          video_evidence_url: string | null
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
          payment_provider?: string | null
          player_id: string
          score?: number | null
          status?: string | null
          terms_accepted_at?: string | null
          terms_version?: string | null
          updated_at?: string
          video_evidence_url?: string | null
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
          payment_provider?: string | null
          player_id?: string
          score?: number | null
          status?: string | null
          terms_accepted_at?: string | null
          terms_version?: string | null
          updated_at?: string
          video_evidence_url?: string | null
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
            referencedRelation: "incomplete_players_v1"
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
        ]
      }
      magic_link_tokens: {
        Row: {
          age_years: number
          competition_url: string
          created_at: string
          email: string
          expires_at: string
          first_name: string
          handicap: number
          id: string
          last_name: string
          phone_e164: string
          token: string
          updated_at: string
          used: boolean
          used_at: string | null
        }
        Insert: {
          age_years: number
          competition_url: string
          created_at?: string
          email: string
          expires_at: string
          first_name: string
          handicap: number
          id?: string
          last_name: string
          phone_e164: string
          token: string
          updated_at?: string
          used?: boolean
          used_at?: string | null
        }
        Update: {
          age_years?: number
          competition_url?: string
          created_at?: string
          email?: string
          expires_at?: string
          first_name?: string
          handicap?: number
          id?: string
          last_name?: string
          phone_e164?: string
          token?: string
          updated_at?: string
          used?: boolean
          used_at?: string | null
        }
        Relationships: []
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
          deleted_at: string | null
          dob: string | null
          email: string
          first_name: string | null
          gender: string | null
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
          status: string | null
          updated_at: string
        }
        Insert: {
          age_years?: number | null
          club_id?: string | null
          consent_marketing?: boolean | null
          created_at?: string
          deleted_at?: string | null
          dob?: string | null
          email: string
          first_name?: string | null
          gender?: string | null
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
          status?: string | null
          updated_at?: string
        }
        Update: {
          age_years?: number | null
          club_id?: string | null
          consent_marketing?: boolean | null
          created_at?: string
          deleted_at?: string | null
          dob?: string | null
          email?: string
          first_name?: string | null
          gender?: string | null
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
          status?: string | null
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
        ]
      }
      security_logs: {
        Row: {
          created_at: string | null
          details: Json | null
          event_type: string
          id: string
          ip_address: unknown | null
          user_agent: string | null
          user_id: string | null
        }
        Insert: {
          created_at?: string | null
          details?: Json | null
          event_type: string
          id?: string
          ip_address?: unknown | null
          user_agent?: string | null
          user_id?: string | null
        }
        Update: {
          created_at?: string | null
          details?: Json | null
          event_type?: string
          id?: string
          ip_address?: unknown | null
          user_agent?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      staff: {
        Row: {
          active: boolean
          club_id: string
          created_at: string
          email: string
          first_name: string
          id: string
          last_name: string
          role: string
          updated_at: string
        }
        Insert: {
          active?: boolean
          club_id: string
          created_at?: string
          email: string
          first_name: string
          id?: string
          last_name: string
          role?: string
          updated_at?: string
        }
        Update: {
          active?: boolean
          club_id?: string
          created_at?: string
          email?: string
          first_name?: string
          id?: string
          last_name?: string
          role?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "staff_club_id_fkey"
            columns: ["club_id"]
            isOneToOne: false
            referencedRelation: "clubs"
            referencedColumns: ["id"]
          },
        ]
      }
      staff_code_attempts: {
        Row: {
          attempted_at: string
          code_prefix: string
          code_suffix: string
          entry_id: string
          id: string
          ip_address: unknown | null
          staff_code_id: string | null
          success: boolean
          user_agent: string | null
        }
        Insert: {
          attempted_at?: string
          code_prefix: string
          code_suffix: string
          entry_id: string
          id?: string
          ip_address?: unknown | null
          staff_code_id?: string | null
          success?: boolean
          user_agent?: string | null
        }
        Update: {
          attempted_at?: string
          code_prefix?: string
          code_suffix?: string
          entry_id?: string
          id?: string
          ip_address?: unknown | null
          staff_code_id?: string | null
          success?: boolean
          user_agent?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "staff_code_attempts_entry_id_fkey"
            columns: ["entry_id"]
            isOneToOne: false
            referencedRelation: "entries"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "staff_code_attempts_staff_code_id_fkey"
            columns: ["staff_code_id"]
            isOneToOne: false
            referencedRelation: "staff_codes"
            referencedColumns: ["id"]
          },
        ]
      }
      staff_codes: {
        Row: {
          active: boolean
          club_id: string
          code_prefix: string
          code_suffix: string
          competition_id: string | null
          created_at: string
          current_uses: number
          id: string
          max_uses: number | null
          staff_id: string | null
          updated_at: string
          valid_from: string
          valid_until: string
        }
        Insert: {
          active?: boolean
          club_id: string
          code_prefix: string
          code_suffix: string
          competition_id?: string | null
          created_at?: string
          current_uses?: number
          id?: string
          max_uses?: number | null
          staff_id?: string | null
          updated_at?: string
          valid_from?: string
          valid_until: string
        }
        Update: {
          active?: boolean
          club_id?: string
          code_prefix?: string
          code_suffix?: string
          competition_id?: string | null
          created_at?: string
          current_uses?: number
          id?: string
          max_uses?: number | null
          staff_id?: string | null
          updated_at?: string
          valid_from?: string
          valid_until?: string
        }
        Relationships: [
          {
            foreignKeyName: "staff_codes_club_id_fkey"
            columns: ["club_id"]
            isOneToOne: false
            referencedRelation: "clubs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "staff_codes_competition_id_fkey"
            columns: ["competition_id"]
            isOneToOne: false
            referencedRelation: "competitions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "staff_codes_staff_id_fkey"
            columns: ["staff_id"]
            isOneToOne: false
            referencedRelation: "staff"
            referencedColumns: ["id"]
          },
        ]
      }
      uploaded_files: {
        Row: {
          expires_at: string | null
          file_size_bytes: number
          id: string
          mime_type: string
          original_filename: string
          storage_bucket: string
          storage_path: string
          upload_purpose: string
          uploaded_at: string
          user_id: string
        }
        Insert: {
          expires_at?: string | null
          file_size_bytes: number
          id?: string
          mime_type: string
          original_filename: string
          storage_bucket: string
          storage_path: string
          upload_purpose: string
          uploaded_at?: string
          user_id: string
        }
        Update: {
          expires_at?: string | null
          file_size_bytes?: number
          id?: string
          mime_type?: string
          original_filename?: string
          storage_bucket?: string
          storage_path?: string
          upload_purpose?: string
          uploaded_at?: string
          user_id?: string
        }
        Relationships: []
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
        ]
      }
      verifications: {
        Row: {
          auto_miss_applied: boolean | null
          auto_miss_at: string | null
          created_at: string
          entry_id: string
          evidence_captured_at: string | null
          handicap_proof_url: string | null
          id: string
          id_document_url: string | null
          selfie_url: string | null
          staff_code: string | null
          status: string | null
          updated_at: string
          verified_at: string | null
          verified_by: string | null
          video_url: string | null
          witnesses: Json
        }
        Insert: {
          auto_miss_applied?: boolean | null
          auto_miss_at?: string | null
          created_at?: string
          entry_id: string
          evidence_captured_at?: string | null
          handicap_proof_url?: string | null
          id?: string
          id_document_url?: string | null
          selfie_url?: string | null
          staff_code?: string | null
          status?: string | null
          updated_at?: string
          verified_at?: string | null
          verified_by?: string | null
          video_url?: string | null
          witnesses: Json
        }
        Update: {
          auto_miss_applied?: boolean | null
          auto_miss_at?: string | null
          created_at?: string
          entry_id?: string
          evidence_captured_at?: string | null
          handicap_proof_url?: string | null
          id?: string
          id_document_url?: string | null
          selfie_url?: string | null
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
            referencedRelation: "incomplete_players_v1"
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
      incomplete_players_v1: {
        Row: {
          created_at: string | null
          email: string | null
          first_name: string | null
          has_paid_entry: boolean | null
          has_success_payment: boolean | null
          id: string | null
          last_name: string | null
          onboarding_complete: boolean | null
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
      get_current_user_profile_safe: {
        Args: Record<PropertyKey, never>
        Returns: {
          created_at: string
          email: string
          first_name: string
          id: string
          last_name: string
          role: Database["public"]["Enums"]["user_role"]
        }[]
      }
      get_current_user_role: {
        Args: Record<PropertyKey, never>
        Returns: Database["public"]["Enums"]["user_role"]
      }
      get_safe_club_info: {
        Args: { club_uuid: string }
        Returns: {
          created_at: string
          id: string
          logo_url: string
          name: string
          website: string
        }[]
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
      get_safe_competition_data: {
        Args: { club_uuid: string; competition_slug_param: string }
        Returns: {
          club_id: string
          club_logo_url: string
          club_name: string
          club_website: string
          description: string
          end_date: string
          entry_fee: number
          hero_image_url: string
          hole_number: number
          id: string
          is_year_round: boolean
          name: string
          prize_pool: number
          start_date: string
          status: Database["public"]["Enums"]["competition_status"]
        }[]
      }
      get_user_role_safe: {
        Args: { user_uuid: string }
        Returns: Database["public"]["Enums"]["user_role"]
      }
      is_role_change_authorized: {
        Args: {
          new_role: Database["public"]["Enums"]["user_role"]
          target_user_id: string
        }
        Returns: boolean
      }
      is_valid_email: {
        Args: { email_text: string }
        Returns: boolean
      }
      is_valid_phone: {
        Args: { phone_text: string }
        Returns: boolean
      }
      log_security_event: {
        Args: {
          details?: Json
          event_type: string
          ip_address?: unknown
          user_id?: string
        }
        Returns: boolean
      }
      log_sensitive_access: {
        Args: {
          access_type: string
          record_id: string
          sensitive_fields: string[]
          table_name: string
        }
        Returns: boolean
      }
      migrate_club_banking_data: {
        Args: Record<PropertyKey, never>
        Returns: undefined
      }
      update_expired_entries: {
        Args: Record<PropertyKey, never>
        Returns: number
      }
      upsert_profile_safe: {
        Args: {
          profile_email: string
          profile_first_name?: string
          profile_last_name?: string
          profile_phone?: string
          profile_phone_e164?: string
          profile_role?: Database["public"]["Enums"]["user_role"]
          user_id: string
        }
        Returns: string
      }
      validate_file_upload: {
        Args: {
          file_size_bytes: number
          mime_type: string
          original_filename: string
          upload_purpose: string
        }
        Returns: boolean
      }
      validate_text_input: {
        Args: { input_text: string; max_length?: number }
        Returns: string
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
