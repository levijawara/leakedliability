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
      account_bans: {
        Row: {
          appeal_email: string | null
          banned_by: string
          created_at: string
          id: string
          reason: string
          revoked_at: string | null
          revoked_by: string | null
          revoked_reason: string | null
          target_display_name: string | null
          target_email: string | null
          target_user_id: string
        }
        Insert: {
          appeal_email?: string | null
          banned_by: string
          created_at?: string
          id?: string
          reason: string
          revoked_at?: string | null
          revoked_by?: string | null
          revoked_reason?: string | null
          target_display_name?: string | null
          target_email?: string | null
          target_user_id: string
        }
        Update: {
          appeal_email?: string | null
          banned_by?: string
          created_at?: string
          id?: string
          reason?: string
          revoked_at?: string | null
          revoked_by?: string | null
          revoked_reason?: string | null
          target_display_name?: string | null
          target_email?: string | null
          target_user_id?: string
        }
        Relationships: []
      }
      analytics_daily_visitors: {
        Row: {
          city: string | null
          country: string | null
          created_at: string
          day: string
          hashed_visitor: string
          id: number
          region: string | null
        }
        Insert: {
          city?: string | null
          country?: string | null
          created_at?: string
          day: string
          hashed_visitor: string
          id?: number
          region?: string | null
        }
        Update: {
          city?: string | null
          country?: string | null
          created_at?: string
          day?: string
          hashed_visitor?: string
          id?: number
          region?: string | null
        }
        Relationships: []
      }
      audit_logs: {
        Row: {
          created_at: string
          event_type: string
          id: string
          payload: Json
          user_id: string | null
        }
        Insert: {
          created_at?: string
          event_type: string
          id?: string
          payload?: Json
          user_id?: string | null
        }
        Update: {
          created_at?: string
          event_type?: string
          id?: string
          payload?: Json
          user_id?: string | null
        }
        Relationships: []
      }
      ban_pages: {
        Row: {
          body: string
          created_at: string
          id: string
          title: string
          updated_at: string
        }
        Insert: {
          body: string
          created_at?: string
          id?: string
          title?: string
          updated_at?: string
        }
        Update: {
          body?: string
          created_at?: string
          id?: string
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      call_sheet_config: {
        Row: {
          created_at: string | null
          id: string
          rate_limit_enabled: boolean | null
          rate_limit_per_hour: number | null
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          rate_limit_enabled?: boolean | null
          rate_limit_per_hour?: number | null
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string
          rate_limit_enabled?: boolean | null
          rate_limit_per_hour?: number | null
          updated_at?: string | null
        }
        Relationships: []
      }
      call_sheets: {
        Row: {
          contacts_extracted: number | null
          content_hash: string | null
          error_message: string | null
          file_name: string
          file_path: string
          id: string
          last_error_at: string | null
          parsed_contacts: Json | null
          parsed_date: string | null
          parsing_started_at: string | null
          retry_count: number | null
          review_completed_at: string | null
          status: string | null
          updated_at: string | null
          uploaded_at: string | null
          user_id: string
        }
        Insert: {
          contacts_extracted?: number | null
          content_hash?: string | null
          error_message?: string | null
          file_name: string
          file_path: string
          id?: string
          last_error_at?: string | null
          parsed_contacts?: Json | null
          parsed_date?: string | null
          parsing_started_at?: string | null
          retry_count?: number | null
          review_completed_at?: string | null
          status?: string | null
          updated_at?: string | null
          uploaded_at?: string | null
          user_id: string
        }
        Update: {
          contacts_extracted?: number | null
          content_hash?: string | null
          error_message?: string | null
          file_name?: string
          file_path?: string
          id?: string
          last_error_at?: string | null
          parsed_contacts?: Json | null
          parsed_date?: string | null
          parsing_started_at?: string | null
          retry_count?: number | null
          review_completed_at?: string | null
          status?: string | null
          updated_at?: string | null
          uploaded_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      confirmation_cash_transactions: {
        Row: {
          amount: number
          confirmation_speed: string | null
          created_at: string
          id: string
          metadata: Json | null
          payment_report_id: string
          transaction_type: string
          user_id: string
        }
        Insert: {
          amount: number
          confirmation_speed?: string | null
          created_at?: string
          id?: string
          metadata?: Json | null
          payment_report_id: string
          transaction_type: string
          user_id: string
        }
        Update: {
          amount?: number
          confirmation_speed?: string | null
          created_at?: string
          id?: string
          metadata?: Json | null
          payment_report_id?: string
          transaction_type?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "confirmation_cash_transactions_payment_report_id_fkey"
            columns: ["payment_report_id"]
            isOneToOne: false
            referencedRelation: "payment_reports"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "confirmation_cash_transactions_payment_report_id_fkey"
            columns: ["payment_report_id"]
            isOneToOne: false
            referencedRelation: "public_payment_reports"
            referencedColumns: ["id"]
          },
        ]
      }
      confirmation_pool: {
        Row: {
          available_balance: number
          id: string
          total_collected: number
          total_distributed: number
          updated_at: string
        }
        Insert: {
          available_balance?: number
          id?: string
          total_collected?: number
          total_distributed?: number
          updated_at?: string
        }
        Update: {
          available_balance?: number
          id?: string
          total_collected?: number
          total_distributed?: number
          updated_at?: string
        }
        Relationships: []
      }
      crew_contacts: {
        Row: {
          confidence: number | null
          created_at: string | null
          departments: string[] | null
          emails: string[] | null
          hidden_departments: string[] | null
          hidden_emails: string[] | null
          hidden_ig_handle: boolean | null
          hidden_phones: string[] | null
          hidden_roles: string[] | null
          id: string
          ig_handle: string | null
          is_favorite: boolean | null
          name: string
          needs_review: boolean | null
          phones: string[] | null
          project_title: string | null
          roles: string[] | null
          source_files: string[] | null
          user_id: string
        }
        Insert: {
          confidence?: number | null
          created_at?: string | null
          departments?: string[] | null
          emails?: string[] | null
          hidden_departments?: string[] | null
          hidden_emails?: string[] | null
          hidden_ig_handle?: boolean | null
          hidden_phones?: string[] | null
          hidden_roles?: string[] | null
          id?: string
          ig_handle?: string | null
          is_favorite?: boolean | null
          name: string
          needs_review?: boolean | null
          phones?: string[] | null
          project_title?: string | null
          roles?: string[] | null
          source_files?: string[] | null
          user_id: string
        }
        Update: {
          confidence?: number | null
          created_at?: string | null
          departments?: string[] | null
          emails?: string[] | null
          hidden_departments?: string[] | null
          hidden_emails?: string[] | null
          hidden_ig_handle?: boolean | null
          hidden_phones?: string[] | null
          hidden_roles?: string[] | null
          id?: string
          ig_handle?: string | null
          is_favorite?: boolean | null
          name?: string
          needs_review?: boolean | null
          phones?: string[] | null
          project_title?: string | null
          roles?: string[] | null
          source_files?: string[] | null
          user_id?: string
        }
        Relationships: []
      }
      custom_departments: {
        Row: {
          created_at: string | null
          id: string
          name: string
          sort_order: number | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          name: string
          sort_order?: number | null
        }
        Update: {
          created_at?: string | null
          id?: string
          name?: string
          sort_order?: number | null
        }
        Relationships: []
      }
      custom_role_mappings: {
        Row: {
          canonical_role: string | null
          created_at: string | null
          department: string
          id: string
          role_name: string
          source_file: string | null
        }
        Insert: {
          canonical_role?: string | null
          created_at?: string | null
          department: string
          id?: string
          role_name: string
          source_file?: string | null
        }
        Update: {
          canonical_role?: string | null
          created_at?: string | null
          department?: string
          id?: string
          role_name?: string
          source_file?: string | null
        }
        Relationships: []
      }
      dispute_evidence: {
        Row: {
          created_at: string
          dispute_id: string
          explanation: string
          file_paths: string[] | null
          id: string
          round: number
          submitted_by: string
        }
        Insert: {
          created_at?: string
          dispute_id: string
          explanation: string
          file_paths?: string[] | null
          id?: string
          round?: number
          submitted_by: string
        }
        Update: {
          created_at?: string
          dispute_id?: string
          explanation?: string
          file_paths?: string[] | null
          id?: string
          round?: number
          submitted_by?: string
        }
        Relationships: [
          {
            foreignKeyName: "dispute_evidence_dispute_id_fkey"
            columns: ["dispute_id"]
            isOneToOne: false
            referencedRelation: "disputes"
            referencedColumns: ["id"]
          },
        ]
      }
      dispute_timeline: {
        Row: {
          actor_id: string | null
          created_at: string
          dispute_id: string
          event_type: string
          id: string
          metadata: Json | null
        }
        Insert: {
          actor_id?: string | null
          created_at?: string
          dispute_id: string
          event_type: string
          id?: string
          metadata?: Json | null
        }
        Update: {
          actor_id?: string | null
          created_at?: string
          dispute_id?: string
          event_type?: string
          id?: string
          metadata?: Json | null
        }
        Relationships: [
          {
            foreignKeyName: "dispute_timeline_dispute_id_fkey"
            columns: ["dispute_id"]
            isOneToOne: false
            referencedRelation: "disputes"
            referencedColumns: ["id"]
          },
        ]
      }
      disputes: {
        Row: {
          created_at: string | null
          dispute_type: string
          disputer_id: string
          evidence_metadata: Json | null
          evidence_url: string | null
          explanation: string
          id: string
          payment_report_id: string | null
          resolution_notes: string | null
          resolution_type: string | null
          resolved_at: string | null
          round: number
          status: string | null
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          dispute_type: string
          disputer_id: string
          evidence_metadata?: Json | null
          evidence_url?: string | null
          explanation: string
          id?: string
          payment_report_id?: string | null
          resolution_notes?: string | null
          resolution_type?: string | null
          resolved_at?: string | null
          round?: number
          status?: string | null
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          dispute_type?: string
          disputer_id?: string
          evidence_metadata?: Json | null
          evidence_url?: string | null
          explanation?: string
          id?: string
          payment_report_id?: string | null
          resolution_notes?: string | null
          resolution_type?: string | null
          resolved_at?: string | null
          round?: number
          status?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "disputes_payment_report_id_fkey"
            columns: ["payment_report_id"]
            isOneToOne: false
            referencedRelation: "payment_reports"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "disputes_payment_report_id_fkey"
            columns: ["payment_report_id"]
            isOneToOne: false
            referencedRelation: "public_payment_reports"
            referencedColumns: ["id"]
          },
        ]
      }
      email_logs: {
        Row: {
          created_at: string | null
          email_type: string
          error_message: string | null
          id: string
          metadata: Json | null
          recipient_email: string
          sent_at: string | null
          status: string
          subject: string
        }
        Insert: {
          created_at?: string | null
          email_type: string
          error_message?: string | null
          id?: string
          metadata?: Json | null
          recipient_email: string
          sent_at?: string | null
          status?: string
          subject: string
        }
        Update: {
          created_at?: string | null
          email_type?: string
          error_message?: string | null
          id?: string
          metadata?: Json | null
          recipient_email?: string
          sent_at?: string | null
          status?: string
          subject?: string
        }
        Relationships: []
      }
      escrow_payments: {
        Row: {
          amount_due: number
          created_at: string
          crew_member_id: string
          id: string
          metadata: Json | null
          paid_at: string | null
          payment_code: string
          payment_report_id: string
          producer_id: string
          released_at: string | null
          status: string
          stripe_payment_intent_id: string | null
          stripe_session_id: string | null
          updated_at: string
        }
        Insert: {
          amount_due: number
          created_at?: string
          crew_member_id: string
          id?: string
          metadata?: Json | null
          paid_at?: string | null
          payment_code: string
          payment_report_id: string
          producer_id: string
          released_at?: string | null
          status?: string
          stripe_payment_intent_id?: string | null
          stripe_session_id?: string | null
          updated_at?: string
        }
        Update: {
          amount_due?: number
          created_at?: string
          crew_member_id?: string
          id?: string
          metadata?: Json | null
          paid_at?: string | null
          payment_code?: string
          payment_report_id?: string
          producer_id?: string
          released_at?: string | null
          status?: string
          stripe_payment_intent_id?: string | null
          stripe_session_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "escrow_payments_payment_report_id_fkey"
            columns: ["payment_report_id"]
            isOneToOne: false
            referencedRelation: "payment_reports"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "escrow_payments_payment_report_id_fkey"
            columns: ["payment_report_id"]
            isOneToOne: false
            referencedRelation: "public_payment_reports"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "escrow_payments_producer_id_fkey"
            columns: ["producer_id"]
            isOneToOne: false
            referencedRelation: "producers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "escrow_payments_producer_id_fkey"
            columns: ["producer_id"]
            isOneToOne: false
            referencedRelation: "public_leaderboard"
            referencedColumns: ["producer_id"]
          },
          {
            foreignKeyName: "escrow_payments_producer_id_fkey"
            columns: ["producer_id"]
            isOneToOne: false
            referencedRelation: "public_producer_search"
            referencedColumns: ["producer_id"]
          },
        ]
      }
      fafo_entries: {
        Row: {
          created_at: string
          created_by_admin_id: string | null
          display_order: number | null
          hold_that_l_image_path: string
          id: string
          metadata: Json | null
          proof_image_path: string
        }
        Insert: {
          created_at?: string
          created_by_admin_id?: string | null
          display_order?: number | null
          hold_that_l_image_path: string
          id?: string
          metadata?: Json | null
          proof_image_path: string
        }
        Update: {
          created_at?: string
          created_by_admin_id?: string | null
          display_order?: number | null
          hold_that_l_image_path?: string
          id?: string
          metadata?: Json | null
          proof_image_path?: string
        }
        Relationships: []
      }
      identity_claim_history: {
        Row: {
          admin_id: string | null
          created_at: string
          id: string
          matched_email_domain: string | null
          matched_name: string | null
          new_status: string
          old_status: string | null
          producer_id: string
          rejection_reason: string | null
          stripe_session_id: string | null
          user_id: string
          verification_report_id: string | null
        }
        Insert: {
          admin_id?: string | null
          created_at?: string
          id?: string
          matched_email_domain?: string | null
          matched_name?: string | null
          new_status: string
          old_status?: string | null
          producer_id: string
          rejection_reason?: string | null
          stripe_session_id?: string | null
          user_id: string
          verification_report_id?: string | null
        }
        Update: {
          admin_id?: string | null
          created_at?: string
          id?: string
          matched_email_domain?: string | null
          matched_name?: string | null
          new_status?: string
          old_status?: string | null
          producer_id?: string
          rejection_reason?: string | null
          stripe_session_id?: string | null
          user_id?: string
          verification_report_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "identity_claim_history_producer_id_fkey"
            columns: ["producer_id"]
            isOneToOne: false
            referencedRelation: "producers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "identity_claim_history_producer_id_fkey"
            columns: ["producer_id"]
            isOneToOne: false
            referencedRelation: "public_leaderboard"
            referencedColumns: ["producer_id"]
          },
          {
            foreignKeyName: "identity_claim_history_producer_id_fkey"
            columns: ["producer_id"]
            isOneToOne: false
            referencedRelation: "public_producer_search"
            referencedColumns: ["producer_id"]
          },
        ]
      }
      ig_usernames: {
        Row: {
          co_workers: string[] | null
          created_at: string | null
          handle: string
          id: string
          occurrences: number | null
          raw_credits: string[] | null
          roles: string[] | null
        }
        Insert: {
          co_workers?: string[] | null
          created_at?: string | null
          handle: string
          id?: string
          occurrences?: number | null
          raw_credits?: string[] | null
          roles?: string[] | null
        }
        Update: {
          co_workers?: string[] | null
          created_at?: string | null
          handle?: string
          id?: string
          occurrences?: number | null
          raw_credits?: string[] | null
          roles?: string[] | null
        }
        Relationships: []
      }
      image_generations: {
        Row: {
          created_at: string | null
          debt_age: number
          debt_amount: number
          id: string
          ig_handle: string
          producer_name: string
          production_company_name: string | null
          pscs_score: number
          user_id: string | null
        }
        Insert: {
          created_at?: string | null
          debt_age: number
          debt_amount: number
          id?: string
          ig_handle: string
          producer_name: string
          production_company_name?: string | null
          pscs_score: number
          user_id?: string | null
        }
        Update: {
          created_at?: string | null
          debt_age?: number
          debt_amount?: number
          id?: string
          ig_handle?: string
          producer_name?: string
          production_company_name?: string | null
          pscs_score?: number
          user_id?: string | null
        }
        Relationships: []
      }
      leaderboard_config: {
        Row: {
          created_at: string | null
          free_access_enabled: boolean | null
          id: string
          locked_at: string | null
          producer_count_at_lock: number | null
          threshold_locked: boolean
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          free_access_enabled?: boolean | null
          id?: string
          locked_at?: string | null
          producer_count_at_lock?: number | null
          threshold_locked?: boolean
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          free_access_enabled?: boolean | null
          id?: string
          locked_at?: string | null
          producer_count_at_lock?: number | null
          threshold_locked?: boolean
          updated_at?: string | null
        }
        Relationships: []
      }
      liability_chain: {
        Row: {
          accused_email: string
          accused_name: string
          accused_response: string | null
          accused_role: string
          accuser_id: string | null
          affirmation_ip: unknown
          created_at: string | null
          id: string
          report_id: string
          response_at: string | null
        }
        Insert: {
          accused_email: string
          accused_name: string
          accused_response?: string | null
          accused_role: string
          accuser_id?: string | null
          affirmation_ip?: unknown
          created_at?: string | null
          id?: string
          report_id: string
          response_at?: string | null
        }
        Update: {
          accused_email?: string
          accused_name?: string
          accused_response?: string | null
          accused_role?: string
          accuser_id?: string | null
          affirmation_ip?: unknown
          created_at?: string | null
          id?: string
          report_id?: string
          response_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "liability_chain_report_id_fkey"
            columns: ["report_id"]
            isOneToOne: false
            referencedRelation: "payment_reports"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "liability_chain_report_id_fkey"
            columns: ["report_id"]
            isOneToOne: false
            referencedRelation: "public_payment_reports"
            referencedColumns: ["id"]
          },
        ]
      }
      liability_claim_tokens: {
        Row: {
          accused_email: string
          created_at: string | null
          expires_at: string | null
          id: string
          report_id: string
          token: string
          used_at: string | null
        }
        Insert: {
          accused_email: string
          created_at?: string | null
          expires_at?: string | null
          id?: string
          report_id: string
          token?: string
          used_at?: string | null
        }
        Update: {
          accused_email?: string
          created_at?: string | null
          expires_at?: string | null
          id?: string
          report_id?: string
          token?: string
          used_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "liability_claim_tokens_report_id_fkey"
            columns: ["report_id"]
            isOneToOne: false
            referencedRelation: "payment_reports"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "liability_claim_tokens_report_id_fkey"
            columns: ["report_id"]
            isOneToOne: false
            referencedRelation: "public_payment_reports"
            referencedColumns: ["id"]
          },
        ]
      }
      liability_history: {
        Row: {
          action_type: string
          affirmation_text: string | null
          created_at: string | null
          id: string
          new_email: string
          new_name: string
          previous_email: string | null
          previous_name: string | null
          report_id: string
          triggered_by: string | null
        }
        Insert: {
          action_type: string
          affirmation_text?: string | null
          created_at?: string | null
          id?: string
          new_email: string
          new_name: string
          previous_email?: string | null
          previous_name?: string | null
          report_id: string
          triggered_by?: string | null
        }
        Update: {
          action_type?: string
          affirmation_text?: string | null
          created_at?: string | null
          id?: string
          new_email?: string
          new_name?: string
          previous_email?: string | null
          previous_name?: string | null
          report_id?: string
          triggered_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "liability_history_report_id_fkey"
            columns: ["report_id"]
            isOneToOne: false
            referencedRelation: "payment_reports"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "liability_history_report_id_fkey"
            columns: ["report_id"]
            isOneToOne: false
            referencedRelation: "public_payment_reports"
            referencedColumns: ["id"]
          },
        ]
      }
      liability_redirects: {
        Row: {
          created_at: string
          from_producer_email: string | null
          from_producer_id: string
          from_producer_name: string
          id: string
          original_report_id: string
          performed_by: string
          reason: string | null
          report_id: string
          to_producer_email: string | null
          to_producer_id: string
          to_producer_name: string
        }
        Insert: {
          created_at?: string
          from_producer_email?: string | null
          from_producer_id: string
          from_producer_name: string
          id?: string
          original_report_id: string
          performed_by: string
          reason?: string | null
          report_id: string
          to_producer_email?: string | null
          to_producer_id: string
          to_producer_name: string
        }
        Update: {
          created_at?: string
          from_producer_email?: string | null
          from_producer_id?: string
          from_producer_name?: string
          id?: string
          original_report_id?: string
          performed_by?: string
          reason?: string | null
          report_id?: string
          to_producer_email?: string | null
          to_producer_id?: string
          to_producer_name?: string
        }
        Relationships: [
          {
            foreignKeyName: "liability_redirects_report_id_fkey"
            columns: ["report_id"]
            isOneToOne: false
            referencedRelation: "payment_reports"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "liability_redirects_report_id_fkey"
            columns: ["report_id"]
            isOneToOne: false
            referencedRelation: "public_payment_reports"
            referencedColumns: ["id"]
          },
        ]
      }
      manual_email_logs: {
        Row: {
          admin_id: string
          created_at: string
          error_message: string | null
          id: string
          metadata: Json | null
          producer_email: string
          producer_id: string
          sent_at: string
          status: string
          template_key: string
        }
        Insert: {
          admin_id: string
          created_at?: string
          error_message?: string | null
          id?: string
          metadata?: Json | null
          producer_email: string
          producer_id: string
          sent_at?: string
          status: string
          template_key: string
        }
        Update: {
          admin_id?: string
          created_at?: string
          error_message?: string | null
          id?: string
          metadata?: Json | null
          producer_email?: string
          producer_id?: string
          sent_at?: string
          status?: string
          template_key?: string
        }
        Relationships: [
          {
            foreignKeyName: "manual_email_logs_producer_id_fkey"
            columns: ["producer_id"]
            isOneToOne: false
            referencedRelation: "producers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "manual_email_logs_producer_id_fkey"
            columns: ["producer_id"]
            isOneToOne: false
            referencedRelation: "public_leaderboard"
            referencedColumns: ["producer_id"]
          },
          {
            foreignKeyName: "manual_email_logs_producer_id_fkey"
            columns: ["producer_id"]
            isOneToOne: false
            referencedRelation: "public_producer_search"
            referencedColumns: ["producer_id"]
          },
        ]
      }
      moderation_logs: {
        Row: {
          action: string
          created_at: string
          id: string
          notes: string | null
          target_id: string
          target_type: string
          user_id: string
        }
        Insert: {
          action: string
          created_at?: string
          id?: string
          notes?: string | null
          target_id: string
          target_type: string
          user_id: string
        }
        Update: {
          action?: string
          created_at?: string
          id?: string
          notes?: string | null
          target_id?: string
          target_type?: string
          user_id?: string
        }
        Relationships: []
      }
      past_debts: {
        Row: {
          amount_owed: number
          created_at: string | null
          date_resolved: string
          days_overdue: number
          id: string
          producer_id: string
          reporter_type: string
          total_reports_at_time: number
        }
        Insert: {
          amount_owed: number
          created_at?: string | null
          date_resolved?: string
          days_overdue: number
          id?: string
          producer_id: string
          reporter_type?: string
          total_reports_at_time?: number
        }
        Update: {
          amount_owed?: number
          created_at?: string | null
          date_resolved?: string
          days_overdue?: number
          id?: string
          producer_id?: string
          reporter_type?: string
          total_reports_at_time?: number
        }
        Relationships: [
          {
            foreignKeyName: "past_debts_producer_id_fkey"
            columns: ["producer_id"]
            isOneToOne: false
            referencedRelation: "producers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "past_debts_producer_id_fkey"
            columns: ["producer_id"]
            isOneToOne: false
            referencedRelation: "public_leaderboard"
            referencedColumns: ["producer_id"]
          },
          {
            foreignKeyName: "past_debts_producer_id_fkey"
            columns: ["producer_id"]
            isOneToOne: false
            referencedRelation: "public_producer_search"
            referencedColumns: ["producer_id"]
          },
        ]
      }
      payment_confirmations: {
        Row: {
          amount_paid: number
          confirmation_type: Database["public"]["Enums"]["confirmation_type_enum"]
          confirmed_by_admin: boolean | null
          confirmed_by_user_id: string | null
          confirmer_id: string
          created_at: string | null
          id: string
          notes: string | null
          paid_by: string | null
          payment_proof_url: string | null
          payment_report_id: string
          producer_id: string | null
          updated_at: string | null
          verified: boolean | null
        }
        Insert: {
          amount_paid: number
          confirmation_type: Database["public"]["Enums"]["confirmation_type_enum"]
          confirmed_by_admin?: boolean | null
          confirmed_by_user_id?: string | null
          confirmer_id: string
          created_at?: string | null
          id?: string
          notes?: string | null
          paid_by?: string | null
          payment_proof_url?: string | null
          payment_report_id: string
          producer_id?: string | null
          updated_at?: string | null
          verified?: boolean | null
        }
        Update: {
          amount_paid?: number
          confirmation_type?: Database["public"]["Enums"]["confirmation_type_enum"]
          confirmed_by_admin?: boolean | null
          confirmed_by_user_id?: string | null
          confirmer_id?: string
          created_at?: string | null
          id?: string
          notes?: string | null
          paid_by?: string | null
          payment_proof_url?: string | null
          payment_report_id?: string
          producer_id?: string | null
          updated_at?: string | null
          verified?: boolean | null
        }
        Relationships: [
          {
            foreignKeyName: "payment_confirmations_payment_report_id_fkey"
            columns: ["payment_report_id"]
            isOneToOne: false
            referencedRelation: "payment_reports"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payment_confirmations_payment_report_id_fkey"
            columns: ["payment_report_id"]
            isOneToOne: false
            referencedRelation: "public_payment_reports"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payment_confirmations_producer_id_fkey"
            columns: ["producer_id"]
            isOneToOne: false
            referencedRelation: "producers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payment_confirmations_producer_id_fkey"
            columns: ["producer_id"]
            isOneToOne: false
            referencedRelation: "public_leaderboard"
            referencedColumns: ["producer_id"]
          },
          {
            foreignKeyName: "payment_confirmations_producer_id_fkey"
            columns: ["producer_id"]
            isOneToOne: false
            referencedRelation: "public_producer_search"
            referencedColumns: ["producer_id"]
          },
        ]
      }
      payment_reports: {
        Row: {
          admin_creator_id: string | null
          amount_owed: number
          city: string | null
          closed_date: string | null
          confirmation_count: number | null
          confirmation_deadline: string | null
          created_at: string
          created_by_admin: boolean | null
          current_liable_email: string | null
          current_liable_name: string | null
          days_overdue: number
          id: string
          invoice_date: string
          is_in_liability_chain: boolean | null
          liability_chain_length: number | null
          liability_loop_detected: boolean | null
          payment_date: string | null
          producer_email: string | null
          producer_id: string
          project_name: string
          report_id: string | null
          reporter_id: string
          reporter_type: string | null
          score_update_executed: boolean | null
          score_update_scheduled_for: string | null
          status: Database["public"]["Enums"]["payment_status"]
          total_crew: number | null
          updated_at: string
          verified: boolean | null
        }
        Insert: {
          admin_creator_id?: string | null
          amount_owed: number
          city?: string | null
          closed_date?: string | null
          confirmation_count?: number | null
          confirmation_deadline?: string | null
          created_at?: string
          created_by_admin?: boolean | null
          current_liable_email?: string | null
          current_liable_name?: string | null
          days_overdue: number
          id?: string
          invoice_date: string
          is_in_liability_chain?: boolean | null
          liability_chain_length?: number | null
          liability_loop_detected?: boolean | null
          payment_date?: string | null
          producer_email?: string | null
          producer_id: string
          project_name: string
          report_id?: string | null
          reporter_id: string
          reporter_type?: string | null
          score_update_executed?: boolean | null
          score_update_scheduled_for?: string | null
          status?: Database["public"]["Enums"]["payment_status"]
          total_crew?: number | null
          updated_at?: string
          verified?: boolean | null
        }
        Update: {
          admin_creator_id?: string | null
          amount_owed?: number
          city?: string | null
          closed_date?: string | null
          confirmation_count?: number | null
          confirmation_deadline?: string | null
          created_at?: string
          created_by_admin?: boolean | null
          current_liable_email?: string | null
          current_liable_name?: string | null
          days_overdue?: number
          id?: string
          invoice_date?: string
          is_in_liability_chain?: boolean | null
          liability_chain_length?: number | null
          liability_loop_detected?: boolean | null
          payment_date?: string | null
          producer_email?: string | null
          producer_id?: string
          project_name?: string
          report_id?: string | null
          reporter_id?: string
          reporter_type?: string | null
          score_update_executed?: boolean | null
          score_update_scheduled_for?: string | null
          status?: Database["public"]["Enums"]["payment_status"]
          total_crew?: number | null
          updated_at?: string
          verified?: boolean | null
        }
        Relationships: [
          {
            foreignKeyName: "payment_reports_producer_id_fkey"
            columns: ["producer_id"]
            isOneToOne: false
            referencedRelation: "producers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payment_reports_producer_id_fkey"
            columns: ["producer_id"]
            isOneToOne: false
            referencedRelation: "public_leaderboard"
            referencedColumns: ["producer_id"]
          },
          {
            foreignKeyName: "payment_reports_producer_id_fkey"
            columns: ["producer_id"]
            isOneToOne: false
            referencedRelation: "public_producer_search"
            referencedColumns: ["producer_id"]
          },
          {
            foreignKeyName: "payment_reports_report_id_fkey"
            columns: ["report_id"]
            isOneToOne: true
            referencedRelation: "submissions"
            referencedColumns: ["report_id"]
          },
        ]
      }
      producer_account_links: {
        Row: {
          association_type: string
          created_at: string | null
          id: string
          producer_id: string
          user_id: string
        }
        Insert: {
          association_type: string
          created_at?: string | null
          id?: string
          producer_id: string
          user_id: string
        }
        Update: {
          association_type?: string
          created_at?: string | null
          id?: string
          producer_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "producer_account_links_producer_id_fkey"
            columns: ["producer_id"]
            isOneToOne: false
            referencedRelation: "producers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "producer_account_links_producer_id_fkey"
            columns: ["producer_id"]
            isOneToOne: false
            referencedRelation: "public_leaderboard"
            referencedColumns: ["producer_id"]
          },
          {
            foreignKeyName: "producer_account_links_producer_id_fkey"
            columns: ["producer_id"]
            isOneToOne: false
            referencedRelation: "public_producer_search"
            referencedColumns: ["producer_id"]
          },
        ]
      }
      producer_self_reports: {
        Row: {
          amount_owed: number
          corroboration_count: number | null
          created_at: string | null
          evidence_url: string | null
          expires_at: string | null
          id: string
          producer_id: string
          project_title: string
          reason: string | null
          share_link: string | null
          status: string | null
        }
        Insert: {
          amount_owed: number
          corroboration_count?: number | null
          created_at?: string | null
          evidence_url?: string | null
          expires_at?: string | null
          id?: string
          producer_id: string
          project_title: string
          reason?: string | null
          share_link?: string | null
          status?: string | null
        }
        Update: {
          amount_owed?: number
          corroboration_count?: number | null
          created_at?: string | null
          evidence_url?: string | null
          expires_at?: string | null
          id?: string
          producer_id?: string
          project_title?: string
          reason?: string | null
          share_link?: string | null
          status?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "producer_self_reports_producer_id_fkey"
            columns: ["producer_id"]
            isOneToOne: false
            referencedRelation: "producers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "producer_self_reports_producer_id_fkey"
            columns: ["producer_id"]
            isOneToOne: false
            referencedRelation: "public_leaderboard"
            referencedColumns: ["producer_id"]
          },
          {
            foreignKeyName: "producer_self_reports_producer_id_fkey"
            columns: ["producer_id"]
            isOneToOne: false
            referencedRelation: "public_producer_search"
            referencedColumns: ["producer_id"]
          },
        ]
      }
      producer_subscriptions: {
        Row: {
          contribution_to_pool: number
          created_at: string
          current_period_end: string
          current_period_start: string
          id: string
          monthly_amount: number
          producer_id: string
          status: string
          stripe_customer_id: string
          stripe_subscription_id: string
          tier: string
          updated_at: string
        }
        Insert: {
          contribution_to_pool: number
          created_at?: string
          current_period_end: string
          current_period_start: string
          id?: string
          monthly_amount: number
          producer_id: string
          status?: string
          stripe_customer_id: string
          stripe_subscription_id: string
          tier: string
          updated_at?: string
        }
        Update: {
          contribution_to_pool?: number
          created_at?: string
          current_period_end?: string
          current_period_start?: string
          id?: string
          monthly_amount?: number
          producer_id?: string
          status?: string
          stripe_customer_id?: string
          stripe_subscription_id?: string
          tier?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "producer_subscriptions_producer_id_fkey"
            columns: ["producer_id"]
            isOneToOne: false
            referencedRelation: "producers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "producer_subscriptions_producer_id_fkey"
            columns: ["producer_id"]
            isOneToOne: false
            referencedRelation: "public_leaderboard"
            referencedColumns: ["producer_id"]
          },
          {
            foreignKeyName: "producer_subscriptions_producer_id_fkey"
            columns: ["producer_id"]
            isOneToOne: false
            referencedRelation: "public_producer_search"
            referencedColumns: ["producer_id"]
          },
        ]
      }
      producers: {
        Row: {
          account_status: string | null
          admin_creator_id: string | null
          auto_created: boolean | null
          average_days_to_pay: number | null
          claimed_at: string | null
          claimed_by_user_id: string | null
          company: string | null
          created_at: string
          created_by_admin: boolean | null
          email: string | null
          has_claimed_account: boolean | null
          id: string
          is_placeholder: boolean | null
          last_closed_date: string | null
          momentum_active_until: string | null
          name: string
          oldest_debt_date: string | null
          oldest_debt_days: number | null
          paid_crew_count: number | null
          paid_jobs_count: number | null
          plateau_days: number | null
          pscs_score: number | null
          stripe_verification_session_id: string | null
          stripe_verification_status: string | null
          sub_name: string | null
          subscription_status: string | null
          subscription_tier: string | null
          total_amount_owed: number | null
          total_cities_owed: number | null
          total_crew_owed: number | null
          total_jobs_owed: number | null
          total_payments: number | null
          total_pool_contributions: number | null
          total_vendor_debt: number | null
          total_vendors_owed: number | null
          updated_at: string
          verification_status: string | null
        }
        Insert: {
          account_status?: string | null
          admin_creator_id?: string | null
          auto_created?: boolean | null
          average_days_to_pay?: number | null
          claimed_at?: string | null
          claimed_by_user_id?: string | null
          company?: string | null
          created_at?: string
          created_by_admin?: boolean | null
          email?: string | null
          has_claimed_account?: boolean | null
          id?: string
          is_placeholder?: boolean | null
          last_closed_date?: string | null
          momentum_active_until?: string | null
          name: string
          oldest_debt_date?: string | null
          oldest_debt_days?: number | null
          paid_crew_count?: number | null
          paid_jobs_count?: number | null
          plateau_days?: number | null
          pscs_score?: number | null
          stripe_verification_session_id?: string | null
          stripe_verification_status?: string | null
          sub_name?: string | null
          subscription_status?: string | null
          subscription_tier?: string | null
          total_amount_owed?: number | null
          total_cities_owed?: number | null
          total_crew_owed?: number | null
          total_jobs_owed?: number | null
          total_payments?: number | null
          total_pool_contributions?: number | null
          total_vendor_debt?: number | null
          total_vendors_owed?: number | null
          updated_at?: string
          verification_status?: string | null
        }
        Update: {
          account_status?: string | null
          admin_creator_id?: string | null
          auto_created?: boolean | null
          average_days_to_pay?: number | null
          claimed_at?: string | null
          claimed_by_user_id?: string | null
          company?: string | null
          created_at?: string
          created_by_admin?: boolean | null
          email?: string | null
          has_claimed_account?: boolean | null
          id?: string
          is_placeholder?: boolean | null
          last_closed_date?: string | null
          momentum_active_until?: string | null
          name?: string
          oldest_debt_date?: string | null
          oldest_debt_days?: number | null
          paid_crew_count?: number | null
          paid_jobs_count?: number | null
          plateau_days?: number | null
          pscs_score?: number | null
          stripe_verification_session_id?: string | null
          stripe_verification_status?: string | null
          sub_name?: string | null
          subscription_status?: string | null
          subscription_tier?: string | null
          total_amount_owed?: number | null
          total_cities_owed?: number | null
          total_crew_owed?: number | null
          total_jobs_owed?: number | null
          total_payments?: number | null
          total_pool_contributions?: number | null
          total_vendor_debt?: number | null
          total_vendors_owed?: number | null
          updated_at?: string
          verification_status?: string | null
        }
        Relationships: []
      }
      profiles: {
        Row: {
          account_status: string | null
          account_type: Database["public"]["Enums"]["account_type"]
          business_name: string | null
          confirmation_cash_balance: number | null
          created_at: string
          created_by_admin: boolean | null
          created_by_admin_id: string | null
          email: string | null
          id: string
          leaderboard_report_unlock: boolean | null
          legal_first_name: string
          legal_last_name: string
          updated_at: string
          user_id: string
        }
        Insert: {
          account_status?: string | null
          account_type: Database["public"]["Enums"]["account_type"]
          business_name?: string | null
          confirmation_cash_balance?: number | null
          created_at?: string
          created_by_admin?: boolean | null
          created_by_admin_id?: string | null
          email?: string | null
          id?: string
          leaderboard_report_unlock?: boolean | null
          legal_first_name: string
          legal_last_name: string
          updated_at?: string
          user_id: string
        }
        Update: {
          account_status?: string | null
          account_type?: Database["public"]["Enums"]["account_type"]
          business_name?: string | null
          confirmation_cash_balance?: number | null
          created_at?: string
          created_by_admin?: boolean | null
          created_by_admin_id?: string | null
          email?: string | null
          id?: string
          leaderboard_report_unlock?: boolean | null
          legal_first_name?: string
          legal_last_name?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      pscs_config: {
        Row: {
          description: string | null
          key: string
          value: number
        }
        Insert: {
          description?: string | null
          key: string
          value: number
        }
        Update: {
          description?: string | null
          key?: string
          value?: number
        }
        Relationships: []
      }
      queued_producer_notifications: {
        Row: {
          amount_owed: number
          created_at: string | null
          days_overdue: number
          id: string
          payment_report_id: string
          producer_email: string
          project_name: string
          report_id: string
          sent_at: string | null
        }
        Insert: {
          amount_owed: number
          created_at?: string | null
          days_overdue: number
          id?: string
          payment_report_id: string
          producer_email: string
          project_name: string
          report_id: string
          sent_at?: string | null
        }
        Update: {
          amount_owed?: number
          created_at?: string | null
          days_overdue?: number
          id?: string
          payment_report_id?: string
          producer_email?: string
          project_name?: string
          report_id?: string
          sent_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "queued_producer_notifications_payment_report_id_fkey"
            columns: ["payment_report_id"]
            isOneToOne: false
            referencedRelation: "payment_reports"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "queued_producer_notifications_payment_report_id_fkey"
            columns: ["payment_report_id"]
            isOneToOne: false
            referencedRelation: "public_payment_reports"
            referencedColumns: ["id"]
          },
        ]
      }
      role_dictionary: {
        Row: {
          aliases: string[] | null
          created_at: string | null
          department: string
          display_name: string
          id: string
          is_custom: boolean | null
          role_name: string
          source: string | null
        }
        Insert: {
          aliases?: string[] | null
          created_at?: string | null
          department: string
          display_name: string
          id?: string
          is_custom?: boolean | null
          role_name: string
          source?: string | null
        }
        Update: {
          aliases?: string[] | null
          created_at?: string | null
          department?: string
          display_name?: string
          id?: string
          is_custom?: boolean | null
          role_name?: string
          source?: string | null
        }
        Relationships: []
      }
      search_logs: {
        Row: {
          created_at: string | null
          id: string
          matched_producer_id: string | null
          searched_name: string
          source: string | null
          user_email: string | null
          user_id: string | null
          user_ip: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          matched_producer_id?: string | null
          searched_name: string
          source?: string | null
          user_email?: string | null
          user_id?: string | null
          user_ip?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string
          matched_producer_id?: string | null
          searched_name?: string
          source?: string | null
          user_email?: string | null
          user_id?: string | null
          user_ip?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "search_logs_matched_producer_id_fkey"
            columns: ["matched_producer_id"]
            isOneToOne: false
            referencedRelation: "producers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "search_logs_matched_producer_id_fkey"
            columns: ["matched_producer_id"]
            isOneToOne: false
            referencedRelation: "public_leaderboard"
            referencedColumns: ["producer_id"]
          },
          {
            foreignKeyName: "search_logs_matched_producer_id_fkey"
            columns: ["matched_producer_id"]
            isOneToOne: false
            referencedRelation: "public_producer_search"
            referencedColumns: ["producer_id"]
          },
        ]
      }
      site_notices: {
        Row: {
          content: string
          created_at: string
          id: string
          title: string
          updated_at: string | null
          visible_to: string
        }
        Insert: {
          content: string
          created_at?: string
          id?: string
          title: string
          updated_at?: string | null
          visible_to?: string
        }
        Update: {
          content?: string
          created_at?: string
          id?: string
          title?: string
          updated_at?: string | null
          visible_to?: string
        }
        Relationships: []
      }
      site_settings: {
        Row: {
          id: string
          maintenance_message: string | null
          maintenance_mode: boolean
          public_leaderboard_ready: boolean | null
          send_producer_notifications: boolean | null
          updated_at: string | null
        }
        Insert: {
          id?: string
          maintenance_message?: string | null
          maintenance_mode?: boolean
          public_leaderboard_ready?: boolean | null
          send_producer_notifications?: boolean | null
          updated_at?: string | null
        }
        Update: {
          id?: string
          maintenance_message?: string | null
          maintenance_mode?: boolean
          public_leaderboard_ready?: boolean | null
          send_producer_notifications?: boolean | null
          updated_at?: string | null
        }
        Relationships: []
      }
      submissions: {
        Row: {
          admin_notes: string | null
          created_at: string
          document_urls: string[] | null
          email: string
          form_data: Json
          full_name: string
          id: string
          report_id: string | null
          role_department: string | null
          status: string
          submission_type: string
          updated_at: string
          user_id: string
          verified: boolean | null
        }
        Insert: {
          admin_notes?: string | null
          created_at?: string
          document_urls?: string[] | null
          email: string
          form_data?: Json
          full_name: string
          id?: string
          report_id?: string | null
          role_department?: string | null
          status?: string
          submission_type: string
          updated_at?: string
          user_id: string
          verified?: boolean | null
        }
        Update: {
          admin_notes?: string | null
          created_at?: string
          document_urls?: string[] | null
          email?: string
          form_data?: Json
          full_name?: string
          id?: string
          report_id?: string | null
          role_department?: string | null
          status?: string
          submission_type?: string
          updated_at?: string
          user_id?: string
          verified?: boolean | null
        }
        Relationships: []
      }
      suggestions: {
        Row: {
          client_ip: unknown
          created_at: string
          id: string
          meta: Json | null
          suggestion: string
          user_id: string | null
        }
        Insert: {
          client_ip?: unknown
          created_at?: string
          id?: string
          meta?: Json | null
          suggestion: string
          user_id?: string | null
        }
        Update: {
          client_ip?: unknown
          created_at?: string
          id?: string
          meta?: Json | null
          suggestion?: string
          user_id?: string | null
        }
        Relationships: []
      }
      user_entitlements: {
        Row: {
          billing_frequency: string | null
          created_at: string | null
          entitlement_type: string
          failed_attempts: number | null
          grace_period_ends_at: string | null
          id: string
          payment_failed_at: string | null
          source: string
          status: string
          stripe_customer_id: string | null
          stripe_subscription_id: string | null
          subscription_end: string | null
          subscription_tier: string | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          billing_frequency?: string | null
          created_at?: string | null
          entitlement_type?: string
          failed_attempts?: number | null
          grace_period_ends_at?: string | null
          id?: string
          payment_failed_at?: string | null
          source: string
          status?: string
          stripe_customer_id?: string | null
          stripe_subscription_id?: string | null
          subscription_end?: string | null
          subscription_tier?: string | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          billing_frequency?: string | null
          created_at?: string | null
          entitlement_type?: string
          failed_attempts?: number | null
          grace_period_ends_at?: string | null
          id?: string
          payment_failed_at?: string | null
          source?: string
          status?: string
          stripe_customer_id?: string | null
          stripe_subscription_id?: string | null
          subscription_end?: string | null
          subscription_tier?: string | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          created_at: string | null
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      app_flags: {
        Row: {
          maintenance_mode: boolean | null
          notifications_enabled: boolean | null
        }
        Relationships: []
      }
      confirmation_cash_balances: {
        Row: {
          available_balance: number | null
          total_earned: number | null
          total_redeemed: number | null
          user_id: string | null
        }
        Relationships: []
      }
      public_leaderboard: {
        Row: {
          company_name: string | null
          momentum_active_until: string | null
          oldest_debt_date: string | null
          oldest_debt_days: number | null
          paid_crew_count: number | null
          paid_jobs_count: number | null
          producer_id: string | null
          producer_name: string | null
          pscs_score: number | null
          sub_name: string | null
          total_amount_owed: number | null
          total_cities_owed: number | null
          total_crew_owed: number | null
          total_jobs_owed: number | null
          total_vendors_owed: number | null
        }
        Insert: {
          company_name?: string | null
          momentum_active_until?: string | null
          oldest_debt_date?: string | null
          oldest_debt_days?: number | null
          paid_crew_count?: number | null
          paid_jobs_count?: number | null
          producer_id?: string | null
          producer_name?: string | null
          pscs_score?: never
          sub_name?: string | null
          total_amount_owed?: number | null
          total_cities_owed?: number | null
          total_crew_owed?: number | null
          total_jobs_owed?: number | null
          total_vendors_owed?: number | null
        }
        Update: {
          company_name?: string | null
          momentum_active_until?: string | null
          oldest_debt_date?: string | null
          oldest_debt_days?: number | null
          paid_crew_count?: number | null
          paid_jobs_count?: number | null
          producer_id?: string | null
          producer_name?: string | null
          pscs_score?: never
          sub_name?: string | null
          total_amount_owed?: number | null
          total_cities_owed?: number | null
          total_crew_owed?: number | null
          total_jobs_owed?: number | null
          total_vendors_owed?: number | null
        }
        Relationships: []
      }
      public_payment_reports: {
        Row: {
          amount_owed: number | null
          city: string | null
          closed_date: string | null
          created_at: string | null
          days_overdue: number | null
          id: string | null
          invoice_date: string | null
          payment_date: string | null
          producer_id: string | null
          project_name: string | null
          report_id: string | null
          reporter_id: string | null
          reporter_type: string | null
          status: Database["public"]["Enums"]["payment_status"] | null
          updated_at: string | null
          verified: boolean | null
        }
        Insert: {
          amount_owed?: number | null
          city?: string | null
          closed_date?: string | null
          created_at?: string | null
          days_overdue?: number | null
          id?: string | null
          invoice_date?: string | null
          payment_date?: string | null
          producer_id?: string | null
          project_name?: string | null
          report_id?: string | null
          reporter_id?: string | null
          reporter_type?: string | null
          status?: Database["public"]["Enums"]["payment_status"] | null
          updated_at?: string | null
          verified?: boolean | null
        }
        Update: {
          amount_owed?: number | null
          city?: string | null
          closed_date?: string | null
          created_at?: string | null
          days_overdue?: number | null
          id?: string | null
          invoice_date?: string | null
          payment_date?: string | null
          producer_id?: string | null
          project_name?: string | null
          report_id?: string | null
          reporter_id?: string | null
          reporter_type?: string | null
          status?: Database["public"]["Enums"]["payment_status"] | null
          updated_at?: string | null
          verified?: boolean | null
        }
        Relationships: [
          {
            foreignKeyName: "payment_reports_producer_id_fkey"
            columns: ["producer_id"]
            isOneToOne: false
            referencedRelation: "producers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payment_reports_producer_id_fkey"
            columns: ["producer_id"]
            isOneToOne: false
            referencedRelation: "public_leaderboard"
            referencedColumns: ["producer_id"]
          },
          {
            foreignKeyName: "payment_reports_producer_id_fkey"
            columns: ["producer_id"]
            isOneToOne: false
            referencedRelation: "public_producer_search"
            referencedColumns: ["producer_id"]
          },
          {
            foreignKeyName: "payment_reports_report_id_fkey"
            columns: ["report_id"]
            isOneToOne: true
            referencedRelation: "submissions"
            referencedColumns: ["report_id"]
          },
        ]
      }
      public_producer_search: {
        Row: {
          claimed_by_user_id: string | null
          company_name: string | null
          has_claimed_account: boolean | null
          is_placeholder: boolean | null
          producer_id: string | null
          producer_name: string | null
          stripe_verification_status: string | null
        }
        Insert: {
          claimed_by_user_id?: string | null
          company_name?: string | null
          has_claimed_account?: boolean | null
          is_placeholder?: boolean | null
          producer_id?: string | null
          producer_name?: string | null
          stripe_verification_status?: string | null
        }
        Update: {
          claimed_by_user_id?: string | null
          company_name?: string | null
          has_claimed_account?: boolean | null
          is_placeholder?: boolean | null
          producer_id?: string | null
          producer_name?: string | null
          stripe_verification_status?: string | null
        }
        Relationships: []
      }
      suggestions_with_profile: {
        Row: {
          account_type: Database["public"]["Enums"]["account_type"] | null
          business_name: string | null
          client_ip: unknown
          created_at: string | null
          email: string | null
          id: string | null
          legal_first_name: string | null
          legal_last_name: string | null
          meta: Json | null
          suggestion: string | null
          total_suggestions_by_user: number | null
          user_id: string | null
        }
        Relationships: []
      }
    }
    Functions: {
      add_to_confirmation_pool: { Args: { amount: number }; Returns: undefined }
      ban_account: {
        Args: { _reason: string; _target_user_id: string }
        Returns: Json
      }
      calculate_pscs_score: { Args: { producer_uuid: string }; Returns: number }
      cleanup_old_past_debts: { Args: never; Returns: undefined }
      generate_payment_code: { Args: never; Returns: string }
      generate_payment_report_id: { Args: never; Returns: string }
      generate_report_id: { Args: never; Returns: string }
      get_ban_page: {
        Args: never
        Returns: {
          body: string
          title: string
        }[]
      }
      get_daily_visitor_stats: {
        Args: { start_date: string }
        Returns: {
          day: string
          unique_visitors: number
        }[]
      }
      get_geo_breakdown: {
        Args: { selected_day: string }
        Returns: {
          city: string
          country: string
          region: string
          visitor_count: number
        }[]
      }
      get_top_searches: {
        Args: never
        Returns: {
          last_searched: string
          matched_producer_name: string
          recent_searches_7d: number
          search_count: number
          searched_name: string
        }[]
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      increment_corroboration: {
        Args: { report_id: string }
        Returns: undefined
      }
      refresh_all_producer_stats: { Args: never; Returns: undefined }
      revoke_ban: { Args: { _ban_id: string; _reason: string }; Returns: Json }
      upsert_ig_handles: { Args: { handles_data: Json }; Returns: Json }
    }
    Enums: {
      account_type:
        | "crew"
        | "producer"
        | "production_company"
        | "admin"
        | "vendor"
      app_role: "admin" | "user"
      confirmation_type_enum:
        | "crew_confirmation"
        | "producer_documentation"
        | "admin_verification"
      payment_status: "pending" | "paid" | "disputed" | "verified" | "rejected"
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
      account_type: [
        "crew",
        "producer",
        "production_company",
        "admin",
        "vendor",
      ],
      app_role: ["admin", "user"],
      confirmation_type_enum: [
        "crew_confirmation",
        "producer_documentation",
        "admin_verification",
      ],
      payment_status: ["pending", "paid", "disputed", "verified", "rejected"],
    },
  },
} as const
