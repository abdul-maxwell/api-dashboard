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
          created_at: string | null
          details: Json | null
          id: string
          target_api_key_id: string | null
          target_user_id: string | null
        }
        Insert: {
          action_type: string
          admin_user_id: string
          created_at?: string | null
          details?: Json | null
          id?: string
          target_api_key_id?: string | null
          target_user_id?: string | null
        }
        Update: {
          action_type?: string
          admin_user_id?: string
          created_at?: string | null
          details?: Json | null
          id?: string
          target_api_key_id?: string | null
          target_user_id?: string | null
        }
        Relationships: []
      }
      api_keys: {
        Row: {
          admin_notes: string | null
          created_at: string
          created_by_admin: boolean
          description: string | null
          duration: string | null
          expires_at: string | null
          id: string
          is_active: boolean
          is_trial: boolean
          key_value: string
          last_used_at: string | null
          name: string
          paused_reason: string | null
          paused_until: string | null
          payment_id: string | null
          price_ksh: number | null
          rate_limit_per_hour: number | null
          status: string | null
          updated_at: string
          usage_count: number | null
          user_id: string
        }
        Insert: {
          admin_notes?: string | null
          created_at?: string
          created_by_admin?: boolean
          description?: string | null
          duration?: string | null
          expires_at?: string | null
          id?: string
          is_active?: boolean
          is_trial?: boolean
          key_value: string
          last_used_at?: string | null
          name: string
          paused_reason?: string | null
          paused_until?: string | null
          payment_id?: string | null
          price_ksh?: number | null
          rate_limit_per_hour?: number | null
          status?: string | null
          updated_at?: string
          usage_count?: number | null
          user_id: string
        }
        Update: {
          admin_notes?: string | null
          created_at?: string
          created_by_admin?: boolean
          description?: string | null
          duration?: string | null
          expires_at?: string | null
          id?: string
          is_active?: boolean
          is_trial?: boolean
          key_value?: string
          last_used_at?: string | null
          name?: string
          paused_reason?: string | null
          paused_until?: string | null
          payment_id?: string | null
          price_ksh?: number | null
          rate_limit_per_hour?: number | null
          status?: string | null
          updated_at?: string
          usage_count?: number | null
          user_id?: string
        }
        Relationships: []
      }
      discounts: {
        Row: {
          applicable_packages: string[] | null
          code: string | null
          created_at: string | null
          created_by: string | null
          current_uses: number | null
          description: string | null
          discount_type: string
          discount_value: number
          expiry_date: string | null
          id: string
          is_active: boolean | null
          max_discount: number | null
          max_uses: number | null
          min_amount: number | null
          name: string
          promo_code: string
          updated_at: string | null
          updated_by: string | null
          usage_limit: number | null
          used_count: number | null
          user_limit: number | null
          valid_from: string | null
          valid_until: string | null
        }
        Insert: {
          applicable_packages?: string[] | null
          code?: string | null
          created_at?: string | null
          created_by?: string | null
          current_uses?: number | null
          description?: string | null
          discount_type: string
          discount_value: number
          expiry_date?: string | null
          id?: string
          is_active?: boolean | null
          max_discount?: number | null
          max_uses?: number | null
          min_amount?: number | null
          name: string
          promo_code: string
          updated_at?: string | null
          updated_by?: string | null
          usage_limit?: number | null
          used_count?: number | null
          user_limit?: number | null
          valid_from?: string | null
          valid_until?: string | null
        }
        Update: {
          applicable_packages?: string[] | null
          code?: string | null
          created_at?: string | null
          created_by?: string | null
          current_uses?: number | null
          description?: string | null
          discount_type?: string
          discount_value?: number
          expiry_date?: string | null
          id?: string
          is_active?: boolean | null
          max_discount?: number | null
          max_uses?: number | null
          min_amount?: number | null
          name?: string
          promo_code?: string
          updated_at?: string | null
          updated_by?: string | null
          usage_limit?: number | null
          used_count?: number | null
          user_limit?: number | null
          valid_from?: string | null
          valid_until?: string | null
        }
        Relationships: []
      }
      notifications: {
        Row: {
          action_text: string | null
          action_url: string | null
          created_at: string
          id: string
          is_read: boolean
          message: string
          metadata: Json | null
          read_at: string | null
          title: string
          type: string
          updated_at: string
          user_id: string
        }
        Insert: {
          action_text?: string | null
          action_url?: string | null
          created_at?: string
          id?: string
          is_read?: boolean
          message: string
          metadata?: Json | null
          read_at?: string | null
          title: string
          type?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          action_text?: string | null
          action_url?: string | null
          created_at?: string
          id?: string
          is_read?: boolean
          message?: string
          metadata?: Json | null
          read_at?: string | null
          title?: string
          type?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      packages: {
        Row: {
          created_at: string | null
          created_by: string | null
          current_uses: number | null
          description: string | null
          discount_percentage: number | null
          duration: string | null
          duration_days: number | null
          features: Json | null
          id: string
          is_active: boolean | null
          is_featured: boolean | null
          is_popular: boolean | null
          max_uses: number | null
          name: string
          original_price_ksh: number | null
          price_ksh: number
          sort_order: number | null
          updated_at: string | null
          updated_by: string | null
        }
        Insert: {
          created_at?: string | null
          created_by?: string | null
          current_uses?: number | null
          description?: string | null
          discount_percentage?: number | null
          duration?: string | null
          duration_days?: number | null
          features?: Json | null
          id?: string
          is_active?: boolean | null
          is_featured?: boolean | null
          is_popular?: boolean | null
          max_uses?: number | null
          name: string
          original_price_ksh?: number | null
          price_ksh: number
          sort_order?: number | null
          updated_at?: string | null
          updated_by?: string | null
        }
        Update: {
          created_at?: string | null
          created_by?: string | null
          current_uses?: number | null
          description?: string | null
          discount_percentage?: number | null
          duration?: string | null
          duration_days?: number | null
          features?: Json | null
          id?: string
          is_active?: boolean | null
          is_featured?: boolean | null
          is_popular?: boolean | null
          max_uses?: number | null
          name?: string
          original_price_ksh?: number | null
          price_ksh?: number
          sort_order?: number | null
          updated_at?: string | null
          updated_by?: string | null
        }
        Relationships: []
      }
      payments: {
        Row: {
          amount_ksh: number
          api_key_id: string | null
          created_at: string | null
          error_message: string | null
          expires_at: string | null
          id: string
          metadata: Json | null
          mpesa_checkout_request_id: string | null
          mpesa_customer_message: string | null
          mpesa_merchant_request_id: string | null
          mpesa_receipt_number: string | null
          mpesa_response_code: string | null
          mpesa_response_description: string | null
          payment_method: string
          processed_at: string | null
          success_message: string | null
          transaction_id: string | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          amount_ksh: number
          api_key_id?: string | null
          created_at?: string | null
          error_message?: string | null
          expires_at?: string | null
          id?: string
          metadata?: Json | null
          mpesa_checkout_request_id?: string | null
          mpesa_customer_message?: string | null
          mpesa_merchant_request_id?: string | null
          mpesa_receipt_number?: string | null
          mpesa_response_code?: string | null
          mpesa_response_description?: string | null
          payment_method?: string
          processed_at?: string | null
          success_message?: string | null
          transaction_id?: string | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          amount_ksh?: number
          api_key_id?: string | null
          created_at?: string | null
          error_message?: string | null
          expires_at?: string | null
          id?: string
          metadata?: Json | null
          mpesa_checkout_request_id?: string | null
          mpesa_customer_message?: string | null
          mpesa_merchant_request_id?: string | null
          mpesa_receipt_number?: string | null
          mpesa_response_code?: string | null
          mpesa_response_description?: string | null
          payment_method?: string
          processed_at?: string | null
          success_message?: string | null
          transaction_id?: string | null
          updated_at?: string | null
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
          {
            foreignKeyName: "payments_transaction_id_fkey"
            columns: ["transaction_id"]
            isOneToOne: false
            referencedRelation: "transactions"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string
          email: string
          email_verified: boolean
          first_name: string | null
          id: string
          is_active: boolean
          last_login_at: string | null
          last_name: string | null
          phone_number: string | null
          phone_verified: boolean
          role: Database["public"]["Enums"]["user_role"] | null
          updated_at: string
          user_id: string
          username: string | null
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          email: string
          email_verified?: boolean
          first_name?: string | null
          id?: string
          is_active?: boolean
          last_login_at?: string | null
          last_name?: string | null
          phone_number?: string | null
          phone_verified?: boolean
          role?: Database["public"]["Enums"]["user_role"] | null
          updated_at?: string
          user_id: string
          username?: string | null
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          email?: string
          email_verified?: boolean
          first_name?: string | null
          id?: string
          is_active?: boolean
          last_login_at?: string | null
          last_name?: string | null
          phone_number?: string | null
          phone_verified?: boolean
          role?: Database["public"]["Enums"]["user_role"] | null
          updated_at?: string
          user_id?: string
          username?: string | null
        }
        Relationships: []
      }
      transactions: {
        Row: {
          amount: number | null
          checkout_request_id: string | null
          created_at: string | null
          currency: string | null
          description: string | null
          error_message: string | null
          expires_at: string | null
          id: string
          metadata: Json | null
          mpesa_receipt_number: string | null
          payment_method: string | null
          payment_provider: string | null
          payment_reference: string | null
          processed_at: string | null
          provider_transaction_id: string | null
          status: string | null
          success_message: string | null
          transaction_id: string
          transaction_type: string | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          amount?: number | null
          checkout_request_id?: string | null
          created_at?: string | null
          currency?: string | null
          description?: string | null
          error_message?: string | null
          expires_at?: string | null
          id?: string
          metadata?: Json | null
          mpesa_receipt_number?: string | null
          payment_method?: string | null
          payment_provider?: string | null
          payment_reference?: string | null
          processed_at?: string | null
          provider_transaction_id?: string | null
          status?: string | null
          success_message?: string | null
          transaction_id: string
          transaction_type?: string | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          amount?: number | null
          checkout_request_id?: string | null
          created_at?: string | null
          currency?: string | null
          description?: string | null
          error_message?: string | null
          expires_at?: string | null
          id?: string
          metadata?: Json | null
          mpesa_receipt_number?: string | null
          payment_method?: string | null
          payment_provider?: string | null
          payment_reference?: string | null
          processed_at?: string | null
          provider_transaction_id?: string | null
          status?: string | null
          success_message?: string | null
          transaction_id?: string
          transaction_type?: string | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      user_discount_usage: {
        Row: {
          discount_id: string
          first_used_at: string | null
          id: string
          last_used_at: string | null
          usage_count: number | null
          user_id: string
        }
        Insert: {
          discount_id: string
          first_used_at?: string | null
          id?: string
          last_used_at?: string | null
          usage_count?: number | null
          user_id: string
        }
        Update: {
          discount_id?: string
          first_used_at?: string | null
          id?: string
          last_used_at?: string | null
          usage_count?: number | null
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
        Args: {
          p_admin_notes?: string
          p_duration: string
          p_name: string
          p_price_ksh?: number
          p_user_id: string
        }
        Returns: Json
      }
      admin_create_discount: {
        Args: {
          p_code: string
          p_description: string
          p_discount_type: string
          p_discount_value: number
          p_expiry_date: string
          p_is_active: boolean
          p_max_uses: number
          p_name: string
        }
        Returns: Json
      }
      admin_create_package: {
        Args: {
          p_description: string
          p_duration: string
          p_duration_days: number
          p_features: string
          p_is_featured: boolean
          p_name: string
          p_original_price_ksh: number
          p_price_ksh: number
          p_sort_order: number
        }
        Returns: Json
      }
      admin_create_user: {
        Args: {
          p_email: string
          p_first_name?: string
          p_last_name?: string
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
      admin_get_user_details: {
        Args: { p_user_id: string }
        Returns: Json
      }
      admin_manage_api_key: {
        Args: { p_action: string; p_admin_notes?: string; p_api_key_id: string }
        Returns: Json
      }
      admin_reset_user_password: {
        Args: { p_new_password: string; p_user_id: string }
        Returns: Json
      }
      admin_update_discount: {
        Args: {
          p_code: string
          p_description: string
          p_discount_id: string
          p_discount_type: string
          p_discount_value: number
          p_expiry_date: string
          p_is_active: boolean
          p_max_uses: number
          p_name: string
        }
        Returns: Json
      }
      admin_update_package: {
        Args: {
          p_description: string
          p_duration: string
          p_features: string
          p_is_featured: boolean
          p_name: string
          p_original_price_ksh: number
          p_package_id: string
          p_price_ksh: number
          p_sort_order: number
        }
        Returns: Json
      }
      admin_update_user: {
        Args: {
          p_email: string
          p_first_name?: string
          p_is_active?: boolean
          p_last_name?: string
          p_role: string
          p_user_id: string
          p_username: string
        }
        Returns: Json
      }
      apply_promo_code: {
        Args: {
          p_original_price: number
          p_promo_code: string
          p_user_id: string
        }
        Returns: Json
      }
      calculate_expiration_date: {
        Args: { p_duration: string }
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
          p_amount: number
          p_checkout_request_id?: string
          p_currency?: string
          p_description?: string
          p_payment_method?: string
          p_transaction_id: string
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
      get_discounts: {
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
        Args: { user_id?: string }
        Returns: boolean
      }
      is_admin_simple: {
        Args: Record<PropertyKey, never>
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
          p_mpesa_receipt_number?: string
          p_status: string
          p_success_message?: string
          p_transaction_id: string
        }
        Returns: Json
      }
      validate_promo_code: {
        Args: { p_promo_code: string }
        Returns: Json
      }
    }
    Enums: {
      api_key_duration: "1_week" | "30_days" | "60_days" | "forever"
      api_key_type: "trial" | "paid"
      payment_status:
        | "pending"
        | "processing"
        | "completed"
        | "failed"
        | "cancelled"
        | "refunded"
      transaction_status:
        | "attempted"
        | "pending"
        | "processing"
        | "success"
        | "failed"
        | "cancelled"
        | "refunded"
      transaction_type:
        | "payment"
        | "refund"
        | "subscription"
        | "trial"
        | "api_usage"
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
      api_key_duration: ["1_week", "30_days", "60_days", "forever"],
      api_key_type: ["trial", "paid"],
      payment_status: [
        "pending",
        "processing",
        "completed",
        "failed",
        "cancelled",
        "refunded",
      ],
      transaction_status: [
        "attempted",
        "pending",
        "processing",
        "success",
        "failed",
        "cancelled",
        "refunded",
      ],
      transaction_type: [
        "payment",
        "refund",
        "subscription",
        "trial",
        "api_usage",
      ],
      user_role: ["user", "admin", "super_admin"],
    },
  },
} as const
