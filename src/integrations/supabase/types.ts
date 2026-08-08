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
    PostgrestVersion: "14.15"
  }
  public: {
    Tables: {
      activity_events: {
        Row: {
          actor_id: string
          amount_minor: number | null
          circle_id: string | null
          counterparty_id: string | null
          created_at: string
          currency: string | null
          entity_id: string | null
          entity_type: string | null
          id: string
          kind: string
          summary: string
        }
        Insert: {
          actor_id: string
          amount_minor?: number | null
          circle_id?: string | null
          counterparty_id?: string | null
          created_at?: string
          currency?: string | null
          entity_id?: string | null
          entity_type?: string | null
          id?: string
          kind: string
          summary: string
        }
        Update: {
          actor_id?: string
          amount_minor?: number | null
          circle_id?: string | null
          counterparty_id?: string | null
          created_at?: string
          currency?: string | null
          entity_id?: string | null
          entity_type?: string | null
          id?: string
          kind?: string
          summary?: string
        }
        Relationships: [
          {
            foreignKeyName: "activity_events_circle_id_fkey"
            columns: ["circle_id"]
            isOneToOne: false
            referencedRelation: "circles"
            referencedColumns: ["id"]
          },
        ]
      }
      circle_members: {
        Row: {
          circle_id: string
          created_at: string
          id: string
          role: string
          user_id: string
        }
        Insert: {
          circle_id: string
          created_at?: string
          id?: string
          role?: string
          user_id: string
        }
        Update: {
          circle_id?: string
          created_at?: string
          id?: string
          role?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "circle_members_circle_id_fkey"
            columns: ["circle_id"]
            isOneToOne: false
            referencedRelation: "circles"
            referencedColumns: ["id"]
          },
        ]
      }
      circles: {
        Row: {
          archived: boolean
          created_at: string
          currency: string
          description: string | null
          emoji: string
          id: string
          name: string
          owner_id: string
          updated_at: string
        }
        Insert: {
          archived?: boolean
          created_at?: string
          currency?: string
          description?: string | null
          emoji?: string
          id?: string
          name: string
          owner_id: string
          updated_at?: string
        }
        Update: {
          archived?: boolean
          created_at?: string
          currency?: string
          description?: string | null
          emoji?: string
          id?: string
          name?: string
          owner_id?: string
          updated_at?: string
        }
        Relationships: []
      }
      expense_participants: {
        Row: {
          created_at: string
          expense_id: string
          id: string
          share_minor: number
          user_id: string
        }
        Insert: {
          created_at?: string
          expense_id: string
          id?: string
          share_minor: number
          user_id: string
        }
        Update: {
          created_at?: string
          expense_id?: string
          id?: string
          share_minor?: number
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "expense_participants_expense_id_fkey"
            columns: ["expense_id"]
            isOneToOne: false
            referencedRelation: "expenses"
            referencedColumns: ["id"]
          },
        ]
      }
      expenses: {
        Row: {
          amount_minor: number
          category: string
          circle_id: string
          created_at: string
          created_by: string
          currency: string
          deleted_at: string | null
          id: string
          notes: string | null
          paid_by: string
          receipt_path: string | null
          spent_on: string
          split_method: string
          title: string
          updated_at: string
        }
        Insert: {
          amount_minor: number
          category?: string
          circle_id: string
          created_at?: string
          created_by: string
          currency?: string
          deleted_at?: string | null
          id?: string
          notes?: string | null
          paid_by: string
          receipt_path?: string | null
          spent_on?: string
          split_method?: string
          title: string
          updated_at?: string
        }
        Update: {
          amount_minor?: number
          category?: string
          circle_id?: string
          created_at?: string
          created_by?: string
          currency?: string
          deleted_at?: string | null
          id?: string
          notes?: string | null
          paid_by?: string
          receipt_path?: string | null
          spent_on?: string
          split_method?: string
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "expenses_circle_id_fkey"
            columns: ["circle_id"]
            isOneToOne: false
            referencedRelation: "circles"
            referencedColumns: ["id"]
          },
        ]
      }
      loan_repayments: {
        Row: {
          amount_minor: number
          created_at: string
          id: string
          loan_id: string
          note: string | null
          paid_on: string
          recorded_by: string
        }
        Insert: {
          amount_minor: number
          created_at?: string
          id?: string
          loan_id: string
          note?: string | null
          paid_on?: string
          recorded_by: string
        }
        Update: {
          amount_minor?: number
          created_at?: string
          id?: string
          loan_id?: string
          note?: string | null
          paid_on?: string
          recorded_by?: string
        }
        Relationships: [
          {
            foreignKeyName: "loan_repayments_loan_id_fkey"
            columns: ["loan_id"]
            isOneToOne: false
            referencedRelation: "loans"
            referencedColumns: ["id"]
          },
        ]
      }
      loans: {
        Row: {
          amount_minor: number
          borrower_id: string
          created_at: string
          created_by: string
          currency: string
          due_on: string | null
          id: string
          lender_id: string
          lent_on: string
          purpose: string | null
          status: string
          updated_at: string
        }
        Insert: {
          amount_minor: number
          borrower_id: string
          created_at?: string
          created_by: string
          currency?: string
          due_on?: string | null
          id?: string
          lender_id: string
          lent_on?: string
          purpose?: string | null
          status?: string
          updated_at?: string
        }
        Update: {
          amount_minor?: number
          borrower_id?: string
          created_at?: string
          created_by?: string
          currency?: string
          due_on?: string | null
          id?: string
          lender_id?: string
          lent_on?: string
          purpose?: string | null
          status?: string
          updated_at?: string
        }
        Relationships: []
      }
      notifications: {
        Row: {
          actor_id: string | null
          body: string | null
          created_at: string
          entity_id: string | null
          entity_type: string | null
          id: string
          kind: string
          read_at: string | null
          title: string
          user_id: string
        }
        Insert: {
          actor_id?: string | null
          body?: string | null
          created_at?: string
          entity_id?: string | null
          entity_type?: string | null
          id?: string
          kind: string
          read_at?: string | null
          title: string
          user_id: string
        }
        Update: {
          actor_id?: string | null
          body?: string | null
          created_at?: string
          entity_id?: string | null
          entity_type?: string | null
          id?: string
          kind?: string
          read_at?: string | null
          title?: string
          user_id?: string
        }
        Relationships: []
      }
      payment_methods: {
        Row: {
          account_identifier: string | null
          created_at: string
          id: string
          is_active: boolean
          is_preferred: boolean
          label: string | null
          provider: string
          qr_path: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          account_identifier?: string | null
          created_at?: string
          id?: string
          is_active?: boolean
          is_preferred?: boolean
          label?: string | null
          provider: string
          qr_path?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          account_identifier?: string | null
          created_at?: string
          id?: string
          is_active?: boolean
          is_preferred?: boolean
          label?: string | null
          provider?: string
          qr_path?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          avatar_url: string | null
          bio: string | null
          created_at: string
          currency: string
          email: string | null
          id: string
          name: string
          notify_in_app: boolean
          notify_push: boolean
          phone: string | null
          timezone: string
          updated_at: string
          username: string | null
        }
        Insert: {
          avatar_url?: string | null
          bio?: string | null
          created_at?: string
          currency?: string
          email?: string | null
          id: string
          name?: string
          notify_in_app?: boolean
          notify_push?: boolean
          phone?: string | null
          timezone?: string
          updated_at?: string
          username?: string | null
        }
        Update: {
          avatar_url?: string | null
          bio?: string | null
          created_at?: string
          currency?: string
          email?: string | null
          id?: string
          name?: string
          notify_in_app?: boolean
          notify_push?: boolean
          phone?: string | null
          timezone?: string
          updated_at?: string
          username?: string | null
        }
        Relationships: []
      }
      settlements: {
        Row: {
          amount_minor: number
          circle_id: string | null
          confirmed_at: string | null
          created_at: string
          currency: string
          id: string
          loan_id: string | null
          marked_paid_at: string
          method_provider: string | null
          note: string | null
          paid_on: string
          payee_id: string
          payer_id: string
          proof_path: string | null
          reference: string | null
          rejected_at: string | null
          rejection_reason: string | null
          state: string
          updated_at: string
        }
        Insert: {
          amount_minor: number
          circle_id?: string | null
          confirmed_at?: string | null
          created_at?: string
          currency?: string
          id?: string
          loan_id?: string | null
          marked_paid_at?: string
          method_provider?: string | null
          note?: string | null
          paid_on?: string
          payee_id: string
          payer_id: string
          proof_path?: string | null
          reference?: string | null
          rejected_at?: string | null
          rejection_reason?: string | null
          state?: string
          updated_at?: string
        }
        Update: {
          amount_minor?: number
          circle_id?: string | null
          confirmed_at?: string | null
          created_at?: string
          currency?: string
          id?: string
          loan_id?: string | null
          marked_paid_at?: string
          method_provider?: string | null
          note?: string | null
          paid_on?: string
          payee_id?: string
          payer_id?: string
          proof_path?: string | null
          reference?: string | null
          rejected_at?: string | null
          rejection_reason?: string | null
          state?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "settlements_circle_id_fkey"
            columns: ["circle_id"]
            isOneToOne: false
            referencedRelation: "circles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "settlements_loan_id_fkey"
            columns: ["loan_id"]
            isOneToOne: false
            referencedRelation: "loans"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      can_see_expense: {
        Args: { _expense: string; _user: string }
        Returns: boolean
      }
      is_circle_member: {
        Args: { _circle: string; _user: string }
        Returns: boolean
      }
      is_circle_owner: {
        Args: { _circle: string; _user: string }
        Returns: boolean
      }
      is_loan_party: {
        Args: { _loan: string; _user: string }
        Returns: boolean
      }
      owns_expense: {
        Args: { _expense: string; _user: string }
        Returns: boolean
      }
      shares_context: {
        Args: { _me: string; _other: string }
        Returns: boolean
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
