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
      disputes: {
        Row: {
          created_at: string | null
          dispute_type: string
          disputer_id: string
          evidence_url: string | null
          explanation: string
          id: string
          payment_report_id: string | null
          resolution_notes: string | null
          status: string | null
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          dispute_type: string
          disputer_id: string
          evidence_url?: string | null
          explanation: string
          id?: string
          payment_report_id?: string | null
          resolution_notes?: string | null
          status?: string | null
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          dispute_type?: string
          disputer_id?: string
          evidence_url?: string | null
          explanation?: string
          id?: string
          payment_report_id?: string | null
          resolution_notes?: string | null
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
      leaderboard_config: {
        Row: {
          created_at: string | null
          id: string
          locked_at: string | null
          producer_count_at_lock: number | null
          threshold_locked: boolean
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          locked_at?: string | null
          producer_count_at_lock?: number | null
          threshold_locked?: boolean
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string
          locked_at?: string | null
          producer_count_at_lock?: number | null
          threshold_locked?: boolean
          updated_at?: string | null
        }
        Relationships: []
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
        ]
      }
      payment_confirmations: {
        Row: {
          amount_paid: number
          confirmation_type: Database["public"]["Enums"]["confirmation_type_enum"]
          confirmer_id: string
          created_at: string | null
          id: string
          notes: string | null
          payment_proof_url: string | null
          payment_report_id: string
          producer_id: string | null
          updated_at: string | null
          verified: boolean | null
        }
        Insert: {
          amount_paid: number
          confirmation_type: Database["public"]["Enums"]["confirmation_type_enum"]
          confirmer_id: string
          created_at?: string | null
          id?: string
          notes?: string | null
          payment_proof_url?: string | null
          payment_report_id: string
          producer_id?: string | null
          updated_at?: string | null
          verified?: boolean | null
        }
        Update: {
          amount_paid?: number
          confirmation_type?: Database["public"]["Enums"]["confirmation_type_enum"]
          confirmer_id?: string
          created_at?: string | null
          id?: string
          notes?: string | null
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
          days_overdue: number
          id: string
          invoice_date: string
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
          days_overdue: number
          id?: string
          invoice_date: string
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
          days_overdue?: number
          id?: string
          invoice_date?: string
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
            foreignKeyName: "payment_reports_report_id_fkey"
            columns: ["report_id"]
            isOneToOne: false
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
        ]
      }
      producers: {
        Row: {
          account_status: string | null
          average_days_to_pay: number | null
          company: string | null
          created_at: string
          id: string
          last_closed_date: string | null
          momentum_active_until: string | null
          name: string
          oldest_debt_date: string | null
          oldest_debt_days: number | null
          paid_crew_count: number | null
          paid_jobs_count: number | null
          pscs_score: number | null
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
        }
        Insert: {
          account_status?: string | null
          average_days_to_pay?: number | null
          company?: string | null
          created_at?: string
          id?: string
          last_closed_date?: string | null
          momentum_active_until?: string | null
          name: string
          oldest_debt_date?: string | null
          oldest_debt_days?: number | null
          paid_crew_count?: number | null
          paid_jobs_count?: number | null
          pscs_score?: number | null
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
        }
        Update: {
          account_status?: string | null
          average_days_to_pay?: number | null
          company?: string | null
          created_at?: string
          id?: string
          last_closed_date?: string | null
          momentum_active_until?: string | null
          name?: string
          oldest_debt_date?: string | null
          oldest_debt_days?: number | null
          paid_crew_count?: number | null
          paid_jobs_count?: number | null
          pscs_score?: number | null
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
          blur_names_for_public: boolean
          id: string
          maintenance_message: string | null
          maintenance_mode: boolean
          public_leaderboard_ready: boolean | null
          send_producer_notifications: boolean | null
          updated_at: string | null
        }
        Insert: {
          blur_names_for_public?: boolean
          id?: string
          maintenance_message?: string | null
          maintenance_mode?: boolean
          public_leaderboard_ready?: boolean | null
          send_producer_notifications?: boolean | null
          updated_at?: string | null
        }
        Update: {
          blur_names_for_public?: boolean
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
          created_at: string | null
          entitlement_type: string
          id: string
          source: string
          status: string
          stripe_customer_id: string | null
          stripe_subscription_id: string | null
          subscription_end: string | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          entitlement_type?: string
          id?: string
          source: string
          status?: string
          stripe_customer_id?: string | null
          stripe_subscription_id?: string | null
          subscription_end?: string | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          entitlement_type?: string
          id?: string
          source?: string
          status?: string
          stripe_customer_id?: string | null
          stripe_subscription_id?: string | null
          subscription_end?: string | null
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
          pscs_score?: number | null
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
          pscs_score?: number | null
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
            foreignKeyName: "payment_reports_report_id_fkey"
            columns: ["report_id"]
            isOneToOne: false
            referencedRelation: "submissions"
            referencedColumns: ["report_id"]
          },
        ]
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
      generate_report_id: { Args: never; Returns: string }
      get_ban_page: {
        Args: never
        Returns: {
          body: string
          title: string
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
