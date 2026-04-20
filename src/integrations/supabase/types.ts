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
    PostgrestVersion: "14.4"
  }
  public: {
    Tables: {
      audit_logs: {
        Row: {
          action_type: string
          admin_id: string
          after_snapshot: Json | null
          before_snapshot: Json | null
          created_at: string
          entity_id: string | null
          entity_type: string
          id: string
        }
        Insert: {
          action_type: string
          admin_id: string
          after_snapshot?: Json | null
          before_snapshot?: Json | null
          created_at?: string
          entity_id?: string | null
          entity_type: string
          id?: string
        }
        Update: {
          action_type?: string
          admin_id?: string
          after_snapshot?: Json | null
          before_snapshot?: Json | null
          created_at?: string
          entity_id?: string | null
          entity_type?: string
          id?: string
        }
        Relationships: []
      }
      gifts: {
        Row: {
          created_at: string
          id: string
          image_url: string | null
          is_active: boolean
          name: string
          product_ids: string[] | null
          sku: string
          sort_order: number
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          image_url?: string | null
          is_active?: boolean
          name: string
          product_ids?: string[] | null
          sku: string
          sort_order?: number
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          image_url?: string | null
          is_active?: boolean
          name?: string
          product_ids?: string[] | null
          sku?: string
          sort_order?: number
          updated_at?: string
        }
        Relationships: []
      }
      order_items: {
        Row: {
          created_at: string
          id: string
          order_id: string
          product_id: string | null
          product_name: string
          quantity: number
          total_price: number
          unit_price: number
        }
        Insert: {
          created_at?: string
          id?: string
          order_id: string
          product_id?: string | null
          product_name: string
          quantity?: number
          total_price: number
          unit_price: number
        }
        Update: {
          created_at?: string
          id?: string
          order_id?: string
          product_id?: string | null
          product_name?: string
          quantity?: number
          total_price?: number
          unit_price?: number
        }
        Relationships: [
          {
            foreignKeyName: "order_items_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "order_items_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      orders: {
        Row: {
          address: string | null
          city: string | null
          cod_network_data: Json | null
          cod_network_lead_id: string | null
          cod_network_status: string | null
          confirmation_response: string | null
          confirmed: boolean
          confirmed_at: string | null
          created_at: string
          customer_email: string | null
          customer_name: string
          customer_phone: string
          gift_name: string | null
          gift_selected_at: string | null
          gift_sku: string | null
          id: string
          ip_address: string | null
          ip_city: string | null
          ip_country: string | null
          lead_quality: string | null
          lead_score: number | null
          notes: string | null
          order_number: number
          payment_method: Database["public"]["Enums"]["payment_method"]
          shipping_cost: number
          shipping_method: Database["public"]["Enums"]["shipping_method"]
          status: Database["public"]["Enums"]["order_status"]
          subtotal: number
          total: number
          updated_at: string
          user_id: string | null
        }
        Insert: {
          address?: string | null
          city?: string | null
          cod_network_data?: Json | null
          cod_network_lead_id?: string | null
          cod_network_status?: string | null
          confirmation_response?: string | null
          confirmed?: boolean
          confirmed_at?: string | null
          created_at?: string
          customer_email?: string | null
          customer_name: string
          customer_phone: string
          gift_name?: string | null
          gift_selected_at?: string | null
          gift_sku?: string | null
          id?: string
          ip_address?: string | null
          ip_city?: string | null
          ip_country?: string | null
          lead_quality?: string | null
          lead_score?: number | null
          notes?: string | null
          order_number?: number
          payment_method?: Database["public"]["Enums"]["payment_method"]
          shipping_cost?: number
          shipping_method?: Database["public"]["Enums"]["shipping_method"]
          status?: Database["public"]["Enums"]["order_status"]
          subtotal?: number
          total?: number
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          address?: string | null
          city?: string | null
          cod_network_data?: Json | null
          cod_network_lead_id?: string | null
          cod_network_status?: string | null
          confirmation_response?: string | null
          confirmed?: boolean
          confirmed_at?: string | null
          created_at?: string
          customer_email?: string | null
          customer_name?: string
          customer_phone?: string
          gift_name?: string | null
          gift_selected_at?: string | null
          gift_sku?: string | null
          id?: string
          ip_address?: string | null
          ip_city?: string | null
          ip_country?: string | null
          lead_quality?: string | null
          lead_score?: number | null
          notes?: string | null
          order_number?: number
          payment_method?: Database["public"]["Enums"]["payment_method"]
          shipping_cost?: number
          shipping_method?: Database["public"]["Enums"]["shipping_method"]
          status?: Database["public"]["Enums"]["order_status"]
          subtotal?: number
          total?: number
          updated_at?: string
          user_id?: string | null
        }
        Relationships: []
      }
      page_visits: {
        Row: {
          created_at: string
          id: string
          page_path: string
          visitor_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          page_path?: string
          visitor_id: string
        }
        Update: {
          created_at?: string
          id?: string
          page_path?: string
          visitor_id?: string
        }
        Relationships: []
      }
      product_images: {
        Row: {
          created_at: string
          id: string
          is_main: boolean
          product_id: string
          sort_order: number
          storage_path: string | null
          url: string
        }
        Insert: {
          created_at?: string
          id?: string
          is_main?: boolean
          product_id: string
          sort_order?: number
          storage_path?: string | null
          url: string
        }
        Update: {
          created_at?: string
          id?: string
          is_main?: boolean
          product_id?: string
          sort_order?: number
          storage_path?: string | null
          url?: string
        }
        Relationships: [
          {
            foreignKeyName: "product_images_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      product_reviews: {
        Row: {
          badge_type: string | null
          comment: string
          created_at: string
          dialect: string | null
          highlight_label: string | null
          id: string
          is_highlighted: boolean
          product_id: string
          rating: number
          review_date: string
          reviewer_gender: string
          reviewer_name: string
          sort_order: number
        }
        Insert: {
          badge_type?: string | null
          comment: string
          created_at?: string
          dialect?: string | null
          highlight_label?: string | null
          id?: string
          is_highlighted?: boolean
          product_id: string
          rating?: number
          review_date?: string
          reviewer_gender?: string
          reviewer_name: string
          sort_order?: number
        }
        Update: {
          badge_type?: string | null
          comment?: string
          created_at?: string
          dialect?: string | null
          highlight_label?: string | null
          id?: string
          is_highlighted?: boolean
          product_id?: string
          rating?: number
          review_date?: string
          reviewer_gender?: string
          reviewer_name?: string
          sort_order?: number
        }
        Relationships: [
          {
            foreignKeyName: "product_reviews_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      product_revisions: {
        Row: {
          admin_id: string
          created_at: string
          id: string
          product_id: string
          snapshot: Json
        }
        Insert: {
          admin_id: string
          created_at?: string
          id?: string
          product_id: string
          snapshot: Json
        }
        Update: {
          admin_id?: string
          created_at?: string
          id?: string
          product_id?: string
          snapshot?: Json
        }
        Relationships: [
          {
            foreignKeyName: "product_revisions_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      products: {
        Row: {
          category: string | null
          compare_at_price: number | null
          cost: number | null
          created_at: string
          currency_code: string | null
          currency_enabled: boolean
          description_ar: string | null
          description_en: string | null
          has_gift: boolean
          hidden_from_home: boolean
          id: string
          inventory: number
          name_ar: string
          name_en: string | null
          price: number
          requires_confirmation: boolean
          sku: string | null
          slug: string | null
          snapchat_conversion_value: number | null
          status: string
          tags: string[] | null
          updated_at: string
        }
        Insert: {
          category?: string | null
          compare_at_price?: number | null
          cost?: number | null
          created_at?: string
          currency_code?: string | null
          currency_enabled?: boolean
          description_ar?: string | null
          description_en?: string | null
          has_gift?: boolean
          hidden_from_home?: boolean
          id?: string
          inventory?: number
          name_ar: string
          name_en?: string | null
          price?: number
          requires_confirmation?: boolean
          sku?: string | null
          slug?: string | null
          snapchat_conversion_value?: number | null
          status?: string
          tags?: string[] | null
          updated_at?: string
        }
        Update: {
          category?: string | null
          compare_at_price?: number | null
          cost?: number | null
          created_at?: string
          currency_code?: string | null
          currency_enabled?: boolean
          description_ar?: string | null
          description_en?: string | null
          has_gift?: boolean
          hidden_from_home?: boolean
          id?: string
          inventory?: number
          name_ar?: string
          name_en?: string | null
          price?: number
          requires_confirmation?: boolean
          sku?: string | null
          slug?: string | null
          snapchat_conversion_value?: number | null
          status?: string
          tags?: string[] | null
          updated_at?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          country_code: string | null
          created_at: string
          email: string | null
          first_name: string | null
          id: string
          last_name: string | null
          phone: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          country_code?: string | null
          created_at?: string
          email?: string | null
          first_name?: string | null
          id?: string
          last_name?: string | null
          phone?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          country_code?: string | null
          created_at?: string
          email?: string | null
          first_name?: string | null
          id?: string
          last_name?: string | null
          phone?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      store_settings: {
        Row: {
          id: string
          key: string
          updated_at: string
          updated_by: string | null
          value: Json
        }
        Insert: {
          id?: string
          key: string
          updated_at?: string
          updated_by?: string | null
          value?: Json
        }
        Update: {
          id?: string
          key?: string
          updated_at?: string
          updated_by?: string | null
          value?: Json
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          created_at: string
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
      whatsapp_message_logs: {
        Row: {
          created_at: string
          error_message: string | null
          id: string
          message_body: string
          order_id: string | null
          phone: string
          status: string
          template_id: string | null
        }
        Insert: {
          created_at?: string
          error_message?: string | null
          id?: string
          message_body: string
          order_id?: string | null
          phone: string
          status?: string
          template_id?: string | null
        }
        Update: {
          created_at?: string
          error_message?: string | null
          id?: string
          message_body?: string
          order_id?: string | null
          phone?: string
          status?: string
          template_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "whatsapp_message_logs_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "whatsapp_message_logs_template_id_fkey"
            columns: ["template_id"]
            isOneToOne: false
            referencedRelation: "whatsapp_templates"
            referencedColumns: ["id"]
          },
        ]
      }
      whatsapp_templates: {
        Row: {
          body: string
          created_at: string
          event: string
          id: string
          is_active: boolean
          name: string
          updated_at: string
        }
        Insert: {
          body: string
          created_at?: string
          event: string
          id?: string
          is_active?: boolean
          name: string
          updated_at?: string
        }
        Update: {
          body?: string
          created_at?: string
          event?: string
          id?: string
          is_active?: boolean
          name?: string
          updated_at?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      cleanup_old_visits: { Args: never; Returns: undefined }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
    }
    Enums: {
      app_role: "admin" | "moderator" | "user"
      order_status:
        | "pending"
        | "confirmed"
        | "shipped"
        | "delivered"
        | "cancelled"
        | "refunded"
      payment_method: "cod" | "bank_transfer" | "apple_pay" | "card"
      shipping_method: "standard" | "express"
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
      app_role: ["admin", "moderator", "user"],
      order_status: [
        "pending",
        "confirmed",
        "shipped",
        "delivered",
        "cancelled",
        "refunded",
      ],
      payment_method: ["cod", "bank_transfer", "apple_pay", "card"],
      shipping_method: ["standard", "express"],
    },
  },
} as const
