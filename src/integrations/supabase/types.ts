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
      admin_actions: {
        Row: {
          action_type: string
          admin_user_id: string
          created_at: string
          details: Json | null
          id: string
          target_api_key_id: string | null
          target_user_id: string | null
        }
        Insert: {
          action_type: string
          admin_user_id: string
          created_at?: string
          details?: Json | null
          id?: string
          target_api_key_id?: string | null
          target_user_id?: string | null
        }
        Update: {
          action_type?: string
          admin_user_id?: string
          created_at?: string
          details?: Json | null
          id?: string
          target_api_key_id?: string | null
          target_user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "admin_actions_target_api_key_id_fkey"
            columns: ["target_api_key_id"]
            isOneToOne: false
            referencedRelation: "api_keys"
            referencedColumns: ["id"]
          },
        ]
      }
      api_keys: {
        Row: {
          admin_notes: string | null
          api_key_type: Database["public"]["Enums"]["api_key_type"] | null
          created_at: string
          created_by_admin: boolean | null
          duration: Database["public"]["Enums"]["api_key_duration"]
          expires_at: string | null
          id: string
          is_active: boolean
          is_trial: boolean | null
          key_value: string
          last_used_at: string | null
          name: string
          paused_reason: string | null
          paused_until: string | null
          payment_id: string | null
          payment_status: string | null
          price_ksh: number | null
          status: Database["public"]["Enums"]["api_key_status"] | null
          updated_at: string
          user_id: string
        }
        Insert: {
          admin_notes?: string | null
          api_key_type?: Database["public"]["Enums"]["api_key_type"] | null
          created_at?: string
          created_by_admin?: boolean | null
          duration: Database["public"]["Enums"]["api_key_duration"]
          expires_at?: string | null
          id?: string
          is_active?: boolean
          is_trial?: boolean | null
          key_value: string
          last_used_at?: string | null
          name: string
          paused_reason?: string | null
          paused_until?: string | null
          payment_id?: string | null
          payment_status?: string | null
          price_ksh?: number | null
          status?: Database["public"]["Enums"]["api_key_status"] | null
          updated_at?: string
          user_id: string
        }
        Update: {
          admin_notes?: string | null
          api_key_type?: Database["public"]["Enums"]["api_key_type"] | null
          created_at?: string
          created_by_admin?: boolean | null
          duration?: Database["public"]["Enums"]["api_key_duration"]
          expires_at?: string | null
          id?: string
          is_active?: boolean
          is_trial?: boolean | null
          key_value?: string
          last_used_at?: string | null
          name?: string
          paused_reason?: string | null
          paused_until?: string | null
          payment_id?: string | null
          payment_status?: string | null
          price_ksh?: number | null
          status?: Database["public"]["Enums"]["api_key_status"] | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      payments: {
        Row: {
          amount: number
          checkout_request_id: string | null
          completed_at: string | null
          created_at: string
          currency: string
          id: string
          merchant_request_id: string | null
          mpesa_receipt_number: string | null
          payment_type: string
          phone_number: string
          status: Database["public"]["Enums"]["payment_status"]
          transaction_id: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          amount: number
          checkout_request_id?: string | null
          completed_at?: string | null
          created_at?: string
          currency?: string
          id?: string
          merchant_request_id?: string | null
          mpesa_receipt_number?: string | null
          payment_type: string
          phone_number: string
          status?: Database["public"]["Enums"]["payment_status"]
          transaction_id?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          amount?: number
          checkout_request_id?: string | null
          completed_at?: string | null
          created_at?: string
          currency?: string
          id?: string
          merchant_request_id?: string | null
          mpesa_receipt_number?: string | null
          payment_type?: string
          phone_number?: string
          status?: Database["public"]["Enums"]["payment_status"]
          transaction_id?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          created_at: string
          email: string
          id: string
          role: Database["public"]["Enums"]["user_role"] | null
          updated_at: string
          user_id: string
          username: string | null
        }
        Insert: {
          created_at?: string
          email: string
          id?: string
          role?: Database["public"]["Enums"]["user_role"] | null
          updated_at?: string
          user_id: string
          username?: string | null
        }
        Update: {
          created_at?: string
          email?: string
          id?: string
          role?: Database["public"]["Enums"]["user_role"] | null
          updated_at?: string
          user_id?: string
          username?: string | null
        }
        Relationships: []
      }
      notifications: {
        Row: {
          id: string
          user_id: string
          title: string
          message: string
          type: string
          priority: string
          is_read: boolean
          read_at: string | null
          created_at: string
          created_by_admin: boolean
          admin_user_id: string | null
        }
        Insert: {
          id?: string
          user_id: string
          title: string
          message: string
          type?: string
          priority?: string
          is_read?: boolean
          read_at?: string | null
          created_at?: string
          created_by_admin?: boolean
          admin_user_id?: string | null
        }
        Update: {
          id?: string
          user_id?: string
          title?: string
          message?: string
          type?: string
          priority?: string
          is_read?: boolean
          read_at?: string | null
          created_at?: string
          created_by_admin?: boolean
          admin_user_id?: string | null
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      admin_create_api_key: {
        Args: {
          p_admin_notes?: string
          p_custom_days?: number
          p_duration_type: string
          p_name: string
          p_target_user_id: string
        }
        Returns: Json
      }
      admin_get_all_users: {
        Args: Record<PropertyKey, never>
        Returns: {
          api_keys: Json
          created_at: string
          email: string
          role: Database["public"]["Enums"]["user_role"]
          user_id: string
          username: string
        }[]
      }
      admin_manage_api_key: {
        Args: {
          p_action: string
          p_api_key_id: string
          p_pause_days?: number
          p_pause_reason?: string
        }
        Returns: Json
      }
      calculate_expiration_date: {
        Args: { duration_type: Database["public"]["Enums"]["api_key_duration"] }
        Returns: string
      }
      create_trial_api_key: {
        Args: { p_user_id: string }
        Returns: Json
      }
      create_trial_for_user: {
        Args: { p_user_id: string }
        Returns: Json
      }
      fix_missing_profiles: {
        Args: Record<PropertyKey, never>
        Returns: Json
      }
      is_admin: {
        Args: { user_id?: string }
        Returns: boolean
      }
      update_expired_api_keys: {
        Args: Record<PropertyKey, never>
        Returns: number
      }
      validate_payment_and_create_api_key: {
        Args: {
          p_payment_type: string
          p_transaction_id: string
          p_user_id: string
        }
        Returns: Json
      }
      send_notification: {
        Args: {
          p_user_id: string
          p_title: string
          p_message: string
          p_type?: string
          p_priority?: string
        }
        Returns: Json
      }
      admin_create_user: {
        Args: {
          p_email: string
          p_username: string
          p_password: string
          p_role?: string
        }
        Returns: Json
      }
      admin_update_user: {
        Args: {
          p_user_id: string
          p_email: string
          p_username: string
          p_role: string
          p_new_password?: string
        }
        Returns: Json
      }
    }
    Enums: {
      api_key_duration:
        | "1_week"
        | "30_days"
        | "60_days"
        | "forever"
        | "trial_7_days"
      api_key_status: "active" | "inactive" | "paused" | "expired"
      api_key_type: "trial" | "paid"
      payment_status: "pending" | "completed" | "failed" | "cancelled"
      user_role: "user" | "admin" | "super_admin"
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
      api_key_duration: [
        "1_week",
        "30_days",
        "60_days",
        "forever",
        "trial_7_days",
      ],
      api_key_status: ["active", "inactive", "paused", "expired"],
      api_key_type: ["trial", "paid"],
      payment_status: ["pending", "completed", "failed", "cancelled"],
      user_role: ["user", "admin", "super_admin"],
    },
  },
} as const
