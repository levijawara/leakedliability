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
      payment_confirmations: {
        Row: {
          amount_paid: number
          confirmation_type: string
          confirmer_id: string
          created_at: string | null
          id: string
          notes: string | null
          payment_proof_url: string | null
          payment_report_id: string | null
          producer_id: string | null
          updated_at: string | null
          verified: boolean | null
        }
        Insert: {
          amount_paid: number
          confirmation_type: string
          confirmer_id: string
          created_at?: string | null
          id?: string
          notes?: string | null
          payment_proof_url?: string | null
          payment_report_id?: string | null
          producer_id?: string | null
          updated_at?: string | null
          verified?: boolean | null
        }
        Update: {
          amount_paid?: number
          confirmation_type?: string
          confirmer_id?: string
          created_at?: string | null
          id?: string
          notes?: string | null
          payment_proof_url?: string | null
          payment_report_id?: string | null
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
            foreignKeyName: "payment_confirmations_producer_id_fkey"
            columns: ["producer_id"]
            isOneToOne: false
            referencedRelation: "producers"
            referencedColumns: ["id"]
          },
        ]
      }
      payment_reports: {
        Row: {
          amount_owed: number
          city: string | null
          closed_date: string | null
          created_at: string
          days_overdue: number
          id: string
          invoice_date: string
          payment_date: string | null
          producer_email: string | null
          producer_id: string
          project_name: string
          report_id: string | null
          reporter_id: string
          status: string
          updated_at: string
          verified: boolean | null
        }
        Insert: {
          amount_owed: number
          city?: string | null
          closed_date?: string | null
          created_at?: string
          days_overdue: number
          id?: string
          invoice_date: string
          payment_date?: string | null
          producer_email?: string | null
          producer_id: string
          project_name: string
          report_id?: string | null
          reporter_id: string
          status?: string
          updated_at?: string
          verified?: boolean | null
        }
        Update: {
          amount_owed?: number
          city?: string | null
          closed_date?: string | null
          created_at?: string
          days_overdue?: number
          id?: string
          invoice_date?: string
          payment_date?: string | null
          producer_email?: string | null
          producer_id?: string
          project_name?: string
          report_id?: string | null
          reporter_id?: string
          status?: string
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
        ]
      }
      producers: {
        Row: {
          average_days_to_pay: number | null
          company: string | null
          created_at: string
          id: string
          last_closed_date: string | null
          name: string
          oldest_debt_date: string | null
          oldest_debt_days: number | null
          paid_crew_count: number | null
          paid_jobs_count: number | null
          pscs_score: number | null
          total_amount_owed: number | null
          total_cities_owed: number | null
          total_crew_owed: number | null
          total_jobs_owed: number | null
          total_payments: number | null
          updated_at: string
        }
        Insert: {
          average_days_to_pay?: number | null
          company?: string | null
          created_at?: string
          id?: string
          last_closed_date?: string | null
          name: string
          oldest_debt_date?: string | null
          oldest_debt_days?: number | null
          paid_crew_count?: number | null
          paid_jobs_count?: number | null
          pscs_score?: number | null
          total_amount_owed?: number | null
          total_cities_owed?: number | null
          total_crew_owed?: number | null
          total_jobs_owed?: number | null
          total_payments?: number | null
          updated_at?: string
        }
        Update: {
          average_days_to_pay?: number | null
          company?: string | null
          created_at?: string
          id?: string
          last_closed_date?: string | null
          name?: string
          oldest_debt_date?: string | null
          oldest_debt_days?: number | null
          paid_crew_count?: number | null
          paid_jobs_count?: number | null
          pscs_score?: number | null
          total_amount_owed?: number | null
          total_cities_owed?: number | null
          total_crew_owed?: number | null
          total_jobs_owed?: number | null
          total_payments?: number | null
          updated_at?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          account_type: Database["public"]["Enums"]["account_type"]
          business_name: string | null
          created_at: string
          id: string
          legal_first_name: string
          legal_last_name: string
          updated_at: string
          user_id: string
        }
        Insert: {
          account_type: Database["public"]["Enums"]["account_type"]
          business_name?: string | null
          created_at?: string
          id?: string
          legal_first_name: string
          legal_last_name: string
          updated_at?: string
          user_id: string
        }
        Update: {
          account_type?: Database["public"]["Enums"]["account_type"]
          business_name?: string | null
          created_at?: string
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
      site_settings: {
        Row: {
          blur_names_for_public: boolean
          id: string
          maintenance_message: string | null
          maintenance_mode: boolean
          updated_at: string | null
        }
        Insert: {
          blur_names_for_public?: boolean
          id?: string
          maintenance_message?: string | null
          maintenance_mode?: boolean
          updated_at?: string | null
        }
        Update: {
          blur_names_for_public?: boolean
          id?: string
          maintenance_message?: string | null
          maintenance_mode?: boolean
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
      [_ in never]: never
    }
    Functions: {
      calculate_pscs_score: {
        Args: { producer_uuid: string }
        Returns: number
      }
      generate_report_id: {
        Args: Record<PropertyKey, never>
        Returns: string
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      refresh_all_producer_stats: {
        Args: Record<PropertyKey, never>
        Returns: undefined
      }
    }
    Enums: {
      account_type: "crew" | "producer" | "production_company" | "admin"
      app_role: "admin" | "user"
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
      account_type: ["crew", "producer", "production_company", "admin"],
      app_role: ["admin", "user"],
    },
  },
} as const
