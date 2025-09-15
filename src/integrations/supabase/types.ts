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
          payment_id: string | null
          payment_status: string | null
          price_ksh: number | null
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
          payment_id?: string | null
          payment_status?: string | null
          price_ksh?: number | null
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
          payment_id?: string | null
          payment_status?: string | null
          price_ksh?: number | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      discounts: {
        Row: {
          applicable_packages: Json | null
          created_at: string
          description: string | null
          discount_type: string
          discount_value: number
          id: string
          is_active: boolean
          max_discount: number | null
          min_amount: number | null
          name: string
          promo_code: string
          updated_at: string
          usage_limit: number | null
          used_count: number | null
          valid_from: string
          valid_until: string | null
        }
        Insert: {
          applicable_packages?: Json | null
          created_at?: string
          description?: string | null
          discount_type: string
          discount_value: number
          id?: string
          is_active?: boolean
          max_discount?: number | null
          min_amount?: number | null
          name: string
          promo_code: string
          updated_at?: string
          usage_limit?: number | null
          used_count?: number | null
          valid_from?: string
          valid_until?: string | null
        }
        Update: {
          applicable_packages?: Json | null
          created_at?: string
          description?: string | null
          discount_type?: string
          discount_value?: number
          id?: string
          is_active?: boolean
          max_discount?: number | null
          min_amount?: number | null
          name?: string
          promo_code?: string
          updated_at?: string
          usage_limit?: number | null
          used_count?: number | null
          valid_from?: string
          valid_until?: string | null
        }
        Relationships: []
      }
      notifications: {
        Row: {
          created_at: string
          id: string
          is_read: boolean
          message: string
          priority: string
          title: string
          type: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          is_read?: boolean
          message: string
          priority?: string
          title: string
          type?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          is_read?: boolean
          message?: string
          priority?: string
          title?: string
          type?: string
          user_id?: string
        }
        Relationships: []
      }
      packages: {
        Row: {
          created_at: string
          current_uses: number | null
          description: string | null
          discount_percentage: number | null
          duration: Database["public"]["Enums"]["api_key_duration"]
          features: Json | null
          id: string
          is_active: boolean
          is_featured: boolean
          is_popular: boolean | null
          max_uses: number | null
          name: string
          original_price_ksh: number | null
          price_ksh: number
          sort_order: number | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          current_uses?: number | null
          description?: string | null
          discount_percentage?: number | null
          duration: Database["public"]["Enums"]["api_key_duration"]
          features?: Json | null
          id?: string
          is_active?: boolean
          is_featured?: boolean
          is_popular?: boolean | null
          max_uses?: number | null
          name: string
          original_price_ksh?: number | null
          price_ksh: number
          sort_order?: number | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          current_uses?: number | null
          description?: string | null
          discount_percentage?: number | null
          duration?: Database["public"]["Enums"]["api_key_duration"]
          features?: Json | null
          id?: string
          is_active?: boolean
          is_featured?: boolean
          is_popular?: boolean | null
          max_uses?: number | null
          name?: string
          original_price_ksh?: number | null
          price_ksh?: number
          sort_order?: number | null
          updated_at?: string
        }
        Relationships: []
      }
      payments: {
        Row: {
          amount_ksh: number
          api_key_id: string | null
          created_at: string
          duration: Database["public"]["Enums"]["api_key_duration"]
          id: string
          mpesa_checkout_request_id: string | null
          mpesa_receipt_number: string | null
          payment_method: string
          status: string
          updated_at: string
          user_id: string
        }
        Insert: {
          amount_ksh: number
          api_key_id?: string | null
          created_at?: string
          duration: Database["public"]["Enums"]["api_key_duration"]
          id?: string
          mpesa_checkout_request_id?: string | null
          mpesa_receipt_number?: string | null
          payment_method?: string
          status?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          amount_ksh?: number
          api_key_id?: string | null
          created_at?: string
          duration?: Database["public"]["Enums"]["api_key_duration"]
          id?: string
          mpesa_checkout_request_id?: string | null
          mpesa_receipt_number?: string | null
          payment_method?: string
          status?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "payments_api_key_id_fkey"
            columns: ["api_key_id"]
            isOneToOne: false
            referencedRelation: "api_keys"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          created_at: string
          email: string
          id: string
          role: Database["public"]["Enums"]["user_role"] | null
          updated_at: string
          user_id: string | null
          username: string | null
        }
        Insert: {
          created_at?: string
          email: string
          id?: string
          role?: Database["public"]["Enums"]["user_role"] | null
          updated_at?: string
          user_id?: string | null
          username?: string | null
        }
        Update: {
          created_at?: string
          email?: string
          id?: string
          role?: Database["public"]["Enums"]["user_role"] | null
          updated_at?: string
          user_id?: string | null
          username?: string | null
        }
        Relationships: []
      }
      transactions: {
        Row: {
          amount: number
          created_at: string
          currency: string
          description: string | null
          error_message: string | null
          expires_at: string | null
          id: string
          metadata: Json | null
          payment_method: string
          payment_provider: string
          processed_at: string | null
          provider_transaction_id: string | null
          status: string
          success_message: string | null
          transaction_id: string
          type: string
          updated_at: string
          user_id: string
        }
        Insert: {
          amount: number
          created_at?: string
          currency?: string
          description?: string | null
          error_message?: string | null
          expires_at?: string | null
          id?: string
          metadata?: Json | null
          payment_method?: string
          payment_provider?: string
          processed_at?: string | null
          provider_transaction_id?: string | null
          status?: string
          success_message?: string | null
          transaction_id: string
          type?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          amount?: number
          created_at?: string
          currency?: string
          description?: string | null
          error_message?: string | null
          expires_at?: string | null
          id?: string
          metadata?: Json | null
          payment_method?: string
          payment_provider?: string
          processed_at?: string | null
          provider_transaction_id?: string | null
          status?: string
          success_message?: string | null
          transaction_id?: string
          type?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      user_discount_usage: {
        Row: {
          discount_id: string
          id: string
          used_at: string
          user_id: string
        }
        Insert: {
          discount_id: string
          id?: string
          used_at?: string
          user_id: string
        }
        Update: {
          discount_id?: string
          id?: string
          used_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_discount_usage_discount_id_fkey"
            columns: ["discount_id"]
            isOneToOne: false
            referencedRelation: "discounts"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      admin_create_api_key: {
        Args:
          | {
              p_admin_notes?: string
              p_duration: Database["public"]["Enums"]["api_key_duration"]
              p_expires_at?: string
              p_name: string
              p_target_user_id: string
            }
          | {
              p_admin_notes?: string
              p_duration: Database["public"]["Enums"]["api_key_duration"]
              p_name: string
              p_user_id: string
            }
        Returns: Json
      }
      admin_create_discount: {
        Args: {
          p_description: string
          p_discount_type: string
          p_discount_value: number
          p_expires_at?: string
          p_is_active?: boolean
          p_max_uses?: number
          p_name: string
          p_promo_code: string
        }
        Returns: Json
      }
      admin_create_package: {
        Args: {
          p_description: string
          p_duration: Database["public"]["Enums"]["api_key_duration"]
          p_features?: Json
          p_is_featured?: boolean
          p_is_popular?: boolean
          p_name: string
          p_original_price_ksh: number
          p_price_ksh: number
          p_sort_order?: number
        }
        Returns: Json
      }
      admin_create_user: {
        Args: {
          p_email: string
          p_password: string
          p_role?: string
          p_username: string
        }
        Returns: Json
      }
      admin_delete_discount: {
        Args: { p_discount_id: string }
        Returns: Json
      }
      admin_delete_package: {
        Args: { p_package_id: string }
        Returns: Json
      }
      admin_delete_user: {
        Args: { p_user_id: string }
        Returns: Json
      }
      admin_get_all_api_keys: {
        Args: {
          p_limit?: number
          p_offset?: number
          p_status?: string
          p_user_id?: string
        }
        Returns: Json
      }
      admin_get_all_transactions: {
        Args: {
          p_limit?: number
          p_offset?: number
          p_status?: string
          p_type?: string
          p_user_id?: string
        }
        Returns: Json
      }
      admin_get_all_users: {
        Args: { p_limit?: number; p_offset?: number; p_search?: string }
        Returns: Json
      }
      admin_get_discounts: {
        Args: Record<PropertyKey, never>
        Returns: Json
      }
      admin_get_packages: {
        Args: Record<PropertyKey, never>
        Returns: Json
      }
      admin_get_transaction_stats: {
        Args: Record<PropertyKey, never>
        Returns: Json
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
      admin_reset_user_password: {
        Args: { p_new_password: string; p_user_id: string }
        Returns: Json
      }
      admin_update_discount: {
        Args: {
          p_description: string
          p_discount_id: string
          p_discount_type: string
          p_discount_value: number
          p_expires_at?: string
          p_is_active?: boolean
          p_max_uses?: number
          p_name: string
          p_promo_code: string
        }
        Returns: Json
      }
      admin_update_package: {
        Args: {
          p_description: string
          p_duration: Database["public"]["Enums"]["api_key_duration"]
          p_features?: Json
          p_is_featured?: boolean
          p_is_popular?: boolean
          p_name: string
          p_original_price_ksh: number
          p_package_id: string
          p_price_ksh: number
          p_sort_order?: number
        }
        Returns: Json
      }
      admin_update_user: {
        Args: {
          p_email: string
          p_new_password?: string
          p_role: string
          p_user_id: string
          p_username: string
        }
        Returns: Json
      }
      apply_promo_code: {
        Args: {
          p_original_price: number
          p_package_id: string
          p_promo_code: string
          p_user_id: string
        }
        Returns: Json
      }
      calculate_expiration_date: {
        Args: { duration_type: Database["public"]["Enums"]["api_key_duration"] }
        Returns: string
      }
      check_username_availability: {
        Args: { p_username: string }
        Returns: Json
      }
      cleanup_expired_transactions: {
        Args: Record<PropertyKey, never>
        Returns: Json
      }
      create_admin_user: {
        Args:
          | Record<PropertyKey, never>
          | { p_email: string; p_username?: string }
        Returns: Json
      }
      create_transaction: {
        Args: {
          p_amount?: number
          p_currency?: string
          p_description?: string
          p_error_message?: string
          p_expires_at?: string
          p_metadata?: Json
          p_payment_method?: string
          p_payment_provider?: string
          p_provider_transaction_id?: string
          p_status: string
          p_success_message?: string
          p_transaction_id: string
          p_type: string
          p_user_id: string
        }
        Returns: Json
      }
      create_trial_for_user: {
        Args: { p_user_id: string }
        Returns: Json
      }
      ensure_google_user_profile: {
        Args: { p_user_id: string }
        Returns: Json
      }
      fix_missing_profiles: {
        Args: Record<PropertyKey, never>
        Returns: Json
      }
      get_packages: {
        Args: Record<PropertyKey, never>
        Returns: Json
      }
      get_transaction_by_checkout_id: {
        Args: { p_checkout_request_id: string }
        Returns: Json
      }
      get_user_by_username_or_email: {
        Args: { p_identifier: string }
        Returns: Json
      }
      get_user_transactions: {
        Args: {
          p_limit?: number
          p_offset?: number
          p_status?: string
          p_type?: string
        }
        Returns: Json
      }
      is_admin: {
        Args: { p_user_id?: string }
        Returns: boolean
      }
      link_profile_to_user: {
        Args: { p_auth_user_id: string; p_email: string }
        Returns: Json
      }
      send_notification: {
        Args: {
          p_message: string
          p_priority?: string
          p_title: string
          p_type?: string
          p_user_id: string
        }
        Returns: Json
      }
      update_expired_api_keys: {
        Args: Record<PropertyKey, never>
        Returns: number
      }
      update_transaction_status: {
        Args: {
          p_error_message?: string
          p_metadata?: Json
          p_provider_transaction_id?: string
          p_status: string
          p_success_message?: string
          p_transaction_id: string
        }
        Returns: Json
      }
      validate_payment_and_create_api_key: {
        Args: {
          p_payment_type: string
          p_transaction_id: string
          p_user_id: string
        }
        Returns: Json
      }
      validate_promo_code: {
        Args: { p_package_id?: string; p_promo_code: string; p_user_id: string }
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
      api_key_type: ["trial", "paid"],
      payment_status: ["pending", "completed", "failed", "cancelled"],
      user_role: ["user", "admin", "super_admin"],
    },
  },
} as const
