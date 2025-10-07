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
          created_at: string
          days_overdue: number
          id: string
          invoice_date: string
          payment_date: string | null
          producer_id: string
          project_name: string
          reporter_id: string
          status: string
          updated_at: string
          verified: boolean | null
        }
        Insert: {
          amount_owed: number
          city?: string | null
          created_at?: string
          days_overdue: number
          id?: string
          invoice_date: string
          payment_date?: string | null
          producer_id: string
          project_name: string
          reporter_id: string
          status?: string
          updated_at?: string
          verified?: boolean | null
        }
        Update: {
          amount_owed?: number
          city?: string | null
          created_at?: string
          days_overdue?: number
          id?: string
          invoice_date?: string
          payment_date?: string | null
          producer_id?: string
          project_name?: string
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
        ]
      }
      producers: {
        Row: {
          average_days_to_pay: number | null
          company: string | null
          created_at: string
          id: string
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
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      calculate_pscs_score: {
        Args: { producer_uuid: string }
        Returns: number
      }
    }
    Enums: {
      [_ in never]: never
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
    Enums: {},
  },
} as const
