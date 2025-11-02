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
      alert_queue: {
        Row: {
          alert_id: string
          enqueued_at: string | null
          finished_at: string | null
          id: number
          is_test: boolean | null
          payload: Json | null
          started_at: string | null
          status: string
          streamer_id: string
          transaction_id: string | null
        }
        Insert: {
          alert_id: string
          enqueued_at?: string | null
          finished_at?: string | null
          id?: number
          is_test?: boolean | null
          payload?: Json | null
          started_at?: string | null
          status?: string
          streamer_id: string
          transaction_id?: string | null
        }
        Update: {
          alert_id?: string
          enqueued_at?: string | null
          finished_at?: string | null
          id?: number
          is_test?: boolean | null
          payload?: Json | null
          started_at?: string | null
          status?: string
          streamer_id?: string
          transaction_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "alert_queue_alert_id_fkey"
            columns: ["alert_id"]
            isOneToOne: false
            referencedRelation: "alerts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "alert_queue_streamer_id_fkey"
            columns: ["streamer_id"]
            isOneToOne: false
            referencedRelation: "public_streamer_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "alert_queue_streamer_id_fkey"
            columns: ["streamer_id"]
            isOneToOne: false
            referencedRelation: "streamers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "alert_queue_transaction_id_fkey"
            columns: ["transaction_id"]
            isOneToOne: false
            referencedRelation: "transactions"
            referencedColumns: ["id"]
          },
        ]
      }
      alerts: {
        Row: {
          created_at: string | null
          description: string | null
          id: string
          media_path: string
          media_type: string
          price_cents: number
          status: string
          streamer_id: string
          thumb_path: string | null
          title: string
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          description?: string | null
          id?: string
          media_path: string
          media_type: string
          price_cents: number
          status?: string
          streamer_id: string
          thumb_path?: string | null
          title: string
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          description?: string | null
          id?: string
          media_path?: string
          media_type?: string
          price_cents?: number
          status?: string
          streamer_id?: string
          thumb_path?: string | null
          title?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "alerts_streamer_id_fkey"
            columns: ["streamer_id"]
            isOneToOne: false
            referencedRelation: "public_streamer_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "alerts_streamer_id_fkey"
            columns: ["streamer_id"]
            isOneToOne: false
            referencedRelation: "streamers"
            referencedColumns: ["id"]
          },
        ]
      }
      settings: {
        Row: {
          overlay_image_duration_seconds: number | null
          show_prices: boolean | null
          streamer_id: string
          theme: string | null
        }
        Insert: {
          overlay_image_duration_seconds?: number | null
          show_prices?: boolean | null
          streamer_id: string
          theme?: string | null
        }
        Update: {
          overlay_image_duration_seconds?: number | null
          show_prices?: boolean | null
          streamer_id?: string
          theme?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "settings_streamer_id_fkey"
            columns: ["streamer_id"]
            isOneToOne: true
            referencedRelation: "public_streamer_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "settings_streamer_id_fkey"
            columns: ["streamer_id"]
            isOneToOne: true
            referencedRelation: "streamers"
            referencedColumns: ["id"]
          },
        ]
      }
      streamers: {
        Row: {
          auth_user_id: string
          bio: string | null
          created_at: string | null
          display_name: string
          email: string
          email_verified: boolean | null
          handle: string
          id: string
          photo_url: string | null
          public_key: string
          updated_at: string | null
        }
        Insert: {
          auth_user_id: string
          bio?: string | null
          created_at?: string | null
          display_name: string
          email: string
          email_verified?: boolean | null
          handle: string
          id?: string
          photo_url?: string | null
          public_key?: string
          updated_at?: string | null
        }
        Update: {
          auth_user_id?: string
          bio?: string | null
          created_at?: string | null
          display_name?: string
          email?: string
          email_verified?: boolean | null
          handle?: string
          id?: string
          photo_url?: string | null
          public_key?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      transactions: {
        Row: {
          alert_id: string
          amount_cents: number
          amount_streamer_cents: number
          buyer_note: string | null
          created_at: string | null
          currency: string
          fee_streala_cents: number
          fee_stripe_cents: number
          id: string
          status: string
          streamer_id: string
          stripe_payment_id: string | null
        }
        Insert: {
          alert_id: string
          amount_cents: number
          amount_streamer_cents?: number
          buyer_note?: string | null
          created_at?: string | null
          currency?: string
          fee_streala_cents?: number
          fee_stripe_cents?: number
          id?: string
          status?: string
          streamer_id: string
          stripe_payment_id?: string | null
        }
        Update: {
          alert_id?: string
          amount_cents?: number
          amount_streamer_cents?: number
          buyer_note?: string | null
          created_at?: string | null
          currency?: string
          fee_streala_cents?: number
          fee_stripe_cents?: number
          id?: string
          status?: string
          streamer_id?: string
          stripe_payment_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "transactions_alert_id_fkey"
            columns: ["alert_id"]
            isOneToOne: false
            referencedRelation: "alerts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "transactions_streamer_id_fkey"
            columns: ["streamer_id"]
            isOneToOne: false
            referencedRelation: "public_streamer_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "transactions_streamer_id_fkey"
            columns: ["streamer_id"]
            isOneToOne: false
            referencedRelation: "streamers"
            referencedColumns: ["id"]
          },
        ]
      }
      user_roles: {
        Row: {
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
      withdrawals: {
        Row: {
          amount_cents: number
          created_at: string
          id: string
          notes: string | null
          pix_key: string
          processed_at: string | null
          requested_at: string
          status: string
          streamer_id: string
          updated_at: string
        }
        Insert: {
          amount_cents: number
          created_at?: string
          id?: string
          notes?: string | null
          pix_key: string
          processed_at?: string | null
          requested_at?: string
          status?: string
          streamer_id: string
          updated_at?: string
        }
        Update: {
          amount_cents?: number
          created_at?: string
          id?: string
          notes?: string | null
          pix_key?: string
          processed_at?: string | null
          requested_at?: string
          status?: string
          streamer_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "withdrawals_streamer_id_fkey"
            columns: ["streamer_id"]
            isOneToOne: false
            referencedRelation: "public_streamer_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "withdrawals_streamer_id_fkey"
            columns: ["streamer_id"]
            isOneToOne: false
            referencedRelation: "streamers"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      public_streamer_profiles: {
        Row: {
          bio: string | null
          created_at: string | null
          display_name: string | null
          handle: string | null
          id: string | null
          photo_url: string | null
          updated_at: string | null
        }
        Insert: {
          bio?: string | null
          created_at?: string | null
          display_name?: string | null
          handle?: string | null
          id?: string | null
          photo_url?: string | null
          updated_at?: string | null
        }
        Update: {
          bio?: string | null
          created_at?: string | null
          display_name?: string | null
          handle?: string | null
          id?: string | null
          photo_url?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
    }
    Functions: {
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
    }
    Enums: {
      app_role: "admin" | "streamer" | "user"
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
      app_role: ["admin", "streamer", "user"],
    },
  },
} as const
