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
      admin_permissions: {
        Row: {
          category: string
          created_at: string
          description: string | null
          id: string
          name: string
        }
        Insert: {
          category?: string
          created_at?: string
          description?: string | null
          id?: string
          name: string
        }
        Update: {
          category?: string
          created_at?: string
          description?: string | null
          id?: string
          name?: string
        }
        Relationships: []
      }
      admin_user_permissions: {
        Row: {
          granted_at: string
          granted_by: string | null
          id: string
          permission_id: string
          user_id: string
        }
        Insert: {
          granted_at?: string
          granted_by?: string | null
          id?: string
          permission_id: string
          user_id: string
        }
        Update: {
          granted_at?: string
          granted_by?: string | null
          id?: string
          permission_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "admin_user_permissions_permission_id_fkey"
            columns: ["permission_id"]
            isOneToOne: false
            referencedRelation: "admin_permissions"
            referencedColumns: ["id"]
          },
        ]
      }
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
          is_demo_data: boolean | null
          logo_url: string | null
          name: string
          phone: string | null
          slug: string | null
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
          is_demo_data?: boolean | null
          logo_url?: string | null
          name: string
          phone?: string | null
          slug?: string | null
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
          is_demo_data?: boolean | null
          logo_url?: string | null
          name?: string
          phone?: string | null
          slug?: string | null
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
          is_demo_data: boolean | null
          is_year_round: boolean
          name: string
          prize_pool: number | null
          rules: Json | null
          slug: string | null
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
          is_demo_data?: boolean | null
          is_year_round?: boolean
          name: string
          prize_pool?: number | null
          rules?: Json | null
          slug?: string | null
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
          is_demo_data?: boolean | null
          is_year_round?: boolean
          name?: string
          prize_pool?: number | null
          rules?: Json | null
          slug?: string | null
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
      entries: {
        Row: {
          amount_minor: number | null
          attempt_number: number | null
          attempt_window_end: string | null
          attempt_window_start: string | null
          competition_id: string
          completed_at: string | null
          created_at: string
          device: Json | null
          email: string | null
          entry_date: string
          id: string
          ip_hash: string | null
          is_demo_data: boolean | null
          is_repeat_attempt: boolean | null
          location_accuracy: number | null
          location_latitude: number | null
          location_longitude: number | null
          location_timestamp: string | null
          outcome_official: string | null
          outcome_reported_at: string | null
          outcome_self: string | null
          paid: boolean
          payment_date: string | null
          payment_id: string | null
          payment_provider: string | null
          player_id: string
          price_paid: number | null
          referrer: string | null
          score: number | null
          status: string | null
          terms_accepted_at: string | null
          terms_version: string | null
          updated_at: string
          utm: Json | null
          video_evidence_url: string | null
        }
        Insert: {
          amount_minor?: number | null
          attempt_number?: number | null
          attempt_window_end?: string | null
          attempt_window_start?: string | null
          competition_id: string
          completed_at?: string | null
          created_at?: string
          device?: Json | null
          email?: string | null
          entry_date?: string
          id?: string
          ip_hash?: string | null
          is_demo_data?: boolean | null
          is_repeat_attempt?: boolean | null
          location_accuracy?: number | null
          location_latitude?: number | null
          location_longitude?: number | null
          location_timestamp?: string | null
          outcome_official?: string | null
          outcome_reported_at?: string | null
          outcome_self?: string | null
          paid?: boolean
          payment_date?: string | null
          payment_id?: string | null
          payment_provider?: string | null
          player_id: string
          price_paid?: number | null
          referrer?: string | null
          score?: number | null
          status?: string | null
          terms_accepted_at?: string | null
          terms_version?: string | null
          updated_at?: string
          utm?: Json | null
          video_evidence_url?: string | null
        }
        Update: {
          amount_minor?: number | null
          attempt_number?: number | null
          attempt_window_end?: string | null
          attempt_window_start?: string | null
          competition_id?: string
          completed_at?: string | null
          created_at?: string
          device?: Json | null
          email?: string | null
          entry_date?: string
          id?: string
          ip_hash?: string | null
          is_demo_data?: boolean | null
          is_repeat_attempt?: boolean | null
          location_accuracy?: number | null
          location_latitude?: number | null
          location_longitude?: number | null
          location_timestamp?: string | null
          outcome_official?: string | null
          outcome_reported_at?: string | null
          outcome_self?: string | null
          paid?: boolean
          payment_date?: string | null
          payment_id?: string | null
          payment_provider?: string | null
          player_id?: string
          price_paid?: number | null
          referrer?: string | null
          score?: number | null
          status?: string | null
          terms_accepted_at?: string | null
          terms_version?: string | null
          updated_at?: string
          utm?: Json | null
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
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      insurance_companies: {
        Row: {
          active: boolean | null
          contact_email: string
          contract_url: string | null
          created_at: string | null
          id: string
          logo_url: string | null
          name: string
          premium_rate_per_entry: number | null
          updated_at: string | null
        }
        Insert: {
          active?: boolean | null
          contact_email: string
          contract_url?: string | null
          created_at?: string | null
          id?: string
          logo_url?: string | null
          name: string
          premium_rate_per_entry?: number | null
          updated_at?: string | null
        }
        Update: {
          active?: boolean | null
          contact_email?: string
          contract_url?: string | null
          created_at?: string | null
          id?: string
          logo_url?: string | null
          name?: string
          premium_rate_per_entry?: number | null
          updated_at?: string | null
        }
        Relationships: []
      }
      insurance_premiums: {
        Row: {
          generated_at: string | null
          id: string
          insurance_company_id: string | null
          payment_required_at: string | null
          period_end: string
          period_start: string
          premium_rate: number
          status: string | null
          total_entries: number | null
          total_premium_amount: number
        }
        Insert: {
          generated_at?: string | null
          id?: string
          insurance_company_id?: string | null
          payment_required_at?: string | null
          period_end: string
          period_start: string
          premium_rate: number
          status?: string | null
          total_entries?: number | null
          total_premium_amount: number
        }
        Update: {
          generated_at?: string | null
          id?: string
          insurance_company_id?: string | null
          payment_required_at?: string | null
          period_end?: string
          period_start?: string
          premium_rate?: number
          status?: string | null
          total_entries?: number | null
          total_premium_amount?: number
        }
        Relationships: [
          {
            foreignKeyName: "insurance_premiums_insurance_company_id_fkey"
            columns: ["insurance_company_id"]
            isOneToOne: false
            referencedRelation: "insurance_companies"
            referencedColumns: ["id"]
          },
        ]
      }
      insurance_users: {
        Row: {
          active: boolean | null
          created_at: string | null
          id: string
          insurance_company_id: string | null
          role: string | null
          user_id: string | null
        }
        Insert: {
          active?: boolean | null
          created_at?: string | null
          id?: string
          insurance_company_id?: string | null
          role?: string | null
          user_id?: string | null
        }
        Update: {
          active?: boolean | null
          created_at?: string | null
          id?: string
          insurance_company_id?: string | null
          role?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "insurance_users_insurance_company_id_fkey"
            columns: ["insurance_company_id"]
            isOneToOne: false
            referencedRelation: "insurance_companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "insurance_users_user_id_fkey"
            columns: ["user_id"]
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
          email_sent: boolean | null
          email_sent_at: string | null
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
          email_sent?: boolean | null
          email_sent_at?: string | null
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
          email_sent?: boolean | null
          email_sent_at?: string | null
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
          handicap: number | null
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
          handicap?: number | null
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
          handicap?: number | null
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
          is_demo_data: boolean | null
          last_name: string | null
          location_accuracy: number | null
          location_latitude: number | null
          location_longitude: number | null
          location_timestamp: string | null
          phone: string | null
          phone_e164: string | null
          role: Database["public"]["Enums"]["user_role"]
          status: string
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
          is_demo_data?: boolean | null
          last_name?: string | null
          location_accuracy?: number | null
          location_latitude?: number | null
          location_longitude?: number | null
          location_timestamp?: string | null
          phone?: string | null
          phone_e164?: string | null
          role?: Database["public"]["Enums"]["user_role"]
          status?: string
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
          is_demo_data?: boolean | null
          last_name?: string | null
          location_accuracy?: number | null
          location_latitude?: number | null
          location_longitude?: number | null
          location_timestamp?: string | null
          phone?: string | null
          phone_e164?: string | null
          role?: Database["public"]["Enums"]["user_role"]
          status?: string
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
      site_settings: {
        Row: {
          created_at: string
          current_insurance_company_id: string | null
          email_notifications_enabled: boolean | null
          id: string
          insurance_contact_name: string | null
          insurance_contact_phone: string | null
          insurance_enabled: boolean | null
          insurance_premium_rate: number | null
          maintenance_message: string | null
          maintenance_mode: boolean
          max_competitions_per_club: number | null
          max_entry_fee_pounds: number | null
          password_min_length: number | null
          site_description: string | null
          site_name: string
          stripe_connected: boolean | null
          support_email: string | null
          two_factor_required: boolean | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          current_insurance_company_id?: string | null
          email_notifications_enabled?: boolean | null
          id?: string
          insurance_contact_name?: string | null
          insurance_contact_phone?: string | null
          insurance_enabled?: boolean | null
          insurance_premium_rate?: number | null
          maintenance_message?: string | null
          maintenance_mode?: boolean
          max_competitions_per_club?: number | null
          max_entry_fee_pounds?: number | null
          password_min_length?: number | null
          site_description?: string | null
          site_name?: string
          stripe_connected?: boolean | null
          support_email?: string | null
          two_factor_required?: boolean | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          current_insurance_company_id?: string | null
          email_notifications_enabled?: boolean | null
          id?: string
          insurance_contact_name?: string | null
          insurance_contact_phone?: string | null
          insurance_enabled?: boolean | null
          insurance_premium_rate?: number | null
          maintenance_message?: string | null
          maintenance_mode?: boolean
          max_competitions_per_club?: number | null
          max_entry_fee_pounds?: number | null
          password_min_length?: number | null
          site_description?: string | null
          site_name?: string
          stripe_connected?: boolean | null
          support_email?: string | null
          two_factor_required?: boolean | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "site_settings_current_insurance_company_id_fkey"
            columns: ["current_insurance_company_id"]
            isOneToOne: false
            referencedRelation: "insurance_companies"
            referencedColumns: ["id"]
          },
        ]
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
      user_roles: {
        Row: {
          created_at: string | null
          id: string
          role: Database["public"]["Enums"]["user_role"]
          updated_at: string | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          role: Database["public"]["Enums"]["user_role"]
          updated_at?: string | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          role?: Database["public"]["Enums"]["user_role"]
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      venues: {
        Row: {
          active: boolean
          address: string | null
          club_id: string
          created_at: string
          email: string | null
          id: string
          name: string
          phone: string | null
          slug: string | null
          updated_at: string
          website: string | null
        }
        Insert: {
          active?: boolean
          address?: string | null
          club_id: string
          created_at?: string
          email?: string | null
          id?: string
          name: string
          phone?: string | null
          slug?: string | null
          updated_at?: string
          website?: string | null
        }
        Update: {
          active?: boolean
          address?: string | null
          club_id?: string
          created_at?: string
          email?: string | null
          id?: string
          name?: string
          phone?: string | null
          slug?: string | null
          updated_at?: string
          website?: string | null
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
          social_consent: boolean | null
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
          social_consent?: boolean | null
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
          social_consent?: boolean | null
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
      [_ in never]: never
    }
    Functions: {
      admin_delete_admin_user: {
        Args: { p_reason?: string; p_user_id: string }
        Returns: Json
      }
      admin_delete_player: {
        Args: { p_player_id: string; p_reason?: string }
        Returns: Json
      }
      admin_mark_all_unpaid_entries_paid: {
        Args: Record<PropertyKey, never>
        Returns: number
      }
      admin_toggle_user_status: {
        Args: { p_active: boolean; p_reason?: string; p_user_id: string }
        Returns: Json
      }
      admin_update_own_profile: {
        Args: { p_first_name?: string; p_last_name?: string; p_phone?: string }
        Returns: Json
      }
      backfill_demo_data_flags: {
        Args: Record<PropertyKey, never>
        Returns: Json
      }
      calculate_attempt_number: {
        Args: { p_competition_id: string; p_email: string }
        Returns: number
      }
      calculate_monthly_premiums: {
        Args: { company_id: string; period_end: string; period_start: string }
        Returns: {
          entry_count: number
          premium_rate: number
          total_premium: number
        }[]
      }
      cleanup_demo_data: {
        Args: { cleanup_all?: boolean }
        Returns: Json
      }
      convert_partnership_lead_to_club: {
        Args: {
          p_admin_email?: string
          p_club_name?: string
          p_lead_id: string
          p_metadata?: Json
        }
        Returns: Json
      }
      create_verifications_for_wins: {
        Args: Record<PropertyKey, never>
        Returns: number
      }
      flush_production_data: {
        Args:
          | {
              p_confirmation_text?: string
              p_include_demo_data?: boolean
              p_keep_super_admin?: boolean
            }
          | { p_confirmation_text?: string; p_keep_super_admin?: boolean }
        Returns: Json
      }
      get_admin_players_with_stats: {
        Args: { p_limit?: number; p_offset?: number; p_search?: string }
        Returns: {
          age_years: number
          club_id: string
          club_name: string
          created_at: string
          email: string
          entry_count: number
          first_name: string
          gender: string
          handicap: number
          id: string
          last_entry_date: string
          last_name: string
          phone: string
          role: Database["public"]["Enums"]["user_role"]
          status: string
          total_count: number
        }[]
      }
      get_competition_status: {
        Args: { end_date: string; is_year_round: boolean; start_date: string }
        Returns: Database["public"]["Enums"]["competition_status"]
      }
      get_current_user_club_id: {
        Args: Record<PropertyKey, never>
        Returns: string
      }
      get_current_user_is_admin: {
        Args: Record<PropertyKey, never>
        Returns: boolean
      }
      get_current_user_permissions: {
        Args: Record<PropertyKey, never>
        Returns: {
          category: string
          permission_description: string
          permission_name: string
        }[]
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
      get_demo_data_stats: {
        Args: Record<PropertyKey, never>
        Returns: {
          demo_clubs: number
          demo_competitions: number
          demo_entries: number
          demo_profiles: number
          latest_demo_session: string
          total_clubs: number
          total_competitions: number
          total_entries: number
          total_profiles: number
        }[]
      }
      get_incomplete_players: {
        Args: Record<PropertyKey, never>
        Returns: {
          created_at: string
          email: string
          first_name: string
          has_paid_entry: boolean
          has_success_payment: boolean
          id: string
          last_name: string
          onboarding_complete: boolean
        }[]
      }
      get_insurance_entries_count: {
        Args: {
          company_id?: string
          include_demo?: boolean
          month_end?: string
          month_start?: string
        }
        Returns: number
      }
      get_insurance_entries_data: {
        Args: {
          company_id?: string
          include_demo?: boolean
          month_end?: string
          month_start?: string
        }
        Returns: {
          competition_name: string
          entry_date: string
          player_first_name: string
          player_last_name: string
        }[]
      }
      get_insurance_entries_page: {
        Args: {
          company_id?: string
          include_demo?: boolean
          month_end?: string
          month_start?: string
          p_limit?: number
          p_offset?: number
        }
        Returns: {
          competition_name: string
          entry_date: string
          player_first_name: string
          player_last_name: string
        }[]
      }
      get_my_entries: {
        Args: { p_filters?: Json; p_limit?: number; p_offset?: number }
        Returns: {
          attempt_number: number
          club_name: string
          competition_id: string
          competition_name: string
          created_at: string
          entry_date: string
          id: string
          is_repeat_attempt: boolean
          outcome_self: string
          price_paid: number
          status: string
        }[]
      }
      get_my_entry_totals: {
        Args: Record<PropertyKey, never>
        Returns: {
          competitions_played: number
          last_played_at: string
          total_entries: number
          total_spend: number
        }[]
      }
      get_public_clubs_data: {
        Args: { include_demo?: boolean }
        Returns: {
          active: boolean
          address: string
          created_at: string
          email: string
          id: string
          logo_url: string
          name: string
          phone: string
          website: string
        }[]
      }
      get_public_competition_data: {
        Args: { p_club_id?: string; p_competition_slug?: string }
        Returns: {
          club_address: string
          club_email: string
          club_id: string
          club_logo_url: string
          club_name: string
          club_phone: string
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
        }[]
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
          address: string
          email: string
          id: string
          logo_url: string
          name: string
          phone: string
          website: string
        }[]
      }
      get_safe_competition_data: {
        Args: { p_club_id?: string; p_competition_slug?: string }
        Returns: {
          club_address: string
          club_email: string
          club_id: string
          club_logo_url: string
          club_name: string
          club_phone: string
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
        }[]
      }
      get_site_settings: {
        Args: Record<PropertyKey, never>
        Returns: {
          created_at: string
          email_notifications_enabled: boolean
          id: string
          maintenance_message: string
          maintenance_mode: boolean
          max_competitions_per_club: number
          max_entry_fee_pounds: number
          password_min_length: number
          site_description: string
          site_name: string
          stripe_connected: boolean
          support_email: string
          two_factor_required: boolean
          updated_at: string
        }[]
      }
      get_user_role_safe: {
        Args: { user_uuid: string }
        Returns: Database["public"]["Enums"]["user_role"]
      }
      is_production_environment: {
        Args: Record<PropertyKey, never>
        Returns: boolean
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
      setup_insurer_account: {
        Args: { p_email: string; p_first_name?: string; p_last_name?: string }
        Returns: Json
      }
      update_club_contract_status: {
        Args: {
          p_club_id: string
          p_signed: boolean
          p_signed_by_email?: string
          p_signed_by_name?: string
        }
        Returns: boolean
      }
      update_entry_outcome: {
        Args: { p_entry_id: string; p_outcome: string; p_video_url?: string }
        Returns: boolean
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
      user_has_permission: {
        Args: { permission_name: string; user_uuid: string }
        Returns: boolean
      }
      validate_text_input: {
        Args: { input_text: string; max_length?: number }
        Returns: string
      }
    }
    Enums: {
      claim_status: "PENDING" | "VERIFIED" | "REJECTED"
      competition_status: "SCHEDULED" | "ACTIVE" | "ENDED" | "active"
      lead_status:
        | "NEW"
        | "CONTACTED"
        | "CONVERTED"
        | "LOST"
        | "IN_REVIEW"
        | "REJECTED"
      user_role:
        | "ADMIN"
        | "CLUB"
        | "PLAYER"
        | "SUPER_ADMIN"
        | "INSURANCE_PARTNER"
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
      competition_status: ["SCHEDULED", "ACTIVE", "ENDED", "active"],
      lead_status: [
        "NEW",
        "CONTACTED",
        "CONVERTED",
        "LOST",
        "IN_REVIEW",
        "REJECTED",
      ],
      user_role: [
        "ADMIN",
        "CLUB",
        "PLAYER",
        "SUPER_ADMIN",
        "INSURANCE_PARTNER",
      ],
    },
  },
} as const
