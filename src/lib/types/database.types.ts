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
    PostgrestVersion: "14.5"
  }
  public: {
    Tables: {
      campaign_kocs: {
        Row: {
          address_note: string | null
          address_status: Database["public"]["Enums"]["address_status"]
          campaign_id: string
          campaign_koc_id: string
          client_approval_status: Database["public"]["Enums"]["client_approval_status"]
          client_note: string | null
          client_quality_rated_at: string | null
          client_quality_rating: number | null
          client_quality_review: string | null
          client_video_feedback: string | null
          client_video_feedback_at: string | null
          completed_at: string | null
          content_status: Database["public"]["Enums"]["content_status"]
          created_at: string
          deadline_date: string | null
          final_status: Database["public"]["Enums"]["final_status"]
          internal_note: string | null
          koc_id: string
          magic_link_expires_at: string
          magic_link_token: string
          operation_status: Database["public"]["Enums"]["operation_status"]
          receiver_address: string | null
          receiver_name: string | null
          receiver_phone: string | null
          receiver_province: string | null
          revision_note: string | null
          sample_received_at: string | null
          sample_sent_at: string | null
          sample_status: Database["public"]["Enums"]["sample_status"]
          shipping_code: string | null
          shipping_provider: string | null
          updated_at: string
          video_submitted_at: string | null
          video_url: string | null
        }
        Insert: {
          address_note?: string | null
          address_status?: Database["public"]["Enums"]["address_status"]
          campaign_id: string
          campaign_koc_id?: string
          client_approval_status?: Database["public"]["Enums"]["client_approval_status"]
          client_note?: string | null
          client_quality_rated_at?: string | null
          client_quality_rating?: number | null
          client_quality_review?: string | null
          client_video_feedback?: string | null
          client_video_feedback_at?: string | null
          completed_at?: string | null
          content_status?: Database["public"]["Enums"]["content_status"]
          created_at?: string
          deadline_date?: string | null
          final_status?: Database["public"]["Enums"]["final_status"]
          internal_note?: string | null
          koc_id: string
          magic_link_expires_at?: string
          magic_link_token?: string
          operation_status?: Database["public"]["Enums"]["operation_status"]
          receiver_address?: string | null
          receiver_name?: string | null
          receiver_phone?: string | null
          receiver_province?: string | null
          revision_note?: string | null
          sample_received_at?: string | null
          sample_sent_at?: string | null
          sample_status?: Database["public"]["Enums"]["sample_status"]
          shipping_code?: string | null
          shipping_provider?: string | null
          updated_at?: string
          video_submitted_at?: string | null
          video_url?: string | null
        }
        Update: {
          address_note?: string | null
          address_status?: Database["public"]["Enums"]["address_status"]
          campaign_id?: string
          campaign_koc_id?: string
          client_approval_status?: Database["public"]["Enums"]["client_approval_status"]
          client_note?: string | null
          client_quality_rated_at?: string | null
          client_quality_rating?: number | null
          client_quality_review?: string | null
          client_video_feedback?: string | null
          client_video_feedback_at?: string | null
          completed_at?: string | null
          content_status?: Database["public"]["Enums"]["content_status"]
          created_at?: string
          deadline_date?: string | null
          final_status?: Database["public"]["Enums"]["final_status"]
          internal_note?: string | null
          koc_id?: string
          magic_link_expires_at?: string
          magic_link_token?: string
          operation_status?: Database["public"]["Enums"]["operation_status"]
          receiver_address?: string | null
          receiver_name?: string | null
          receiver_phone?: string | null
          receiver_province?: string | null
          revision_note?: string | null
          sample_received_at?: string | null
          sample_sent_at?: string | null
          sample_status?: Database["public"]["Enums"]["sample_status"]
          shipping_code?: string | null
          shipping_provider?: string | null
          updated_at?: string
          video_submitted_at?: string | null
          video_url?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "campaign_kocs_campaign_id_fkey"
            columns: ["campaign_id"]
            isOneToOne: false
            referencedRelation: "campaigns"
            referencedColumns: ["campaign_id"]
          },
          {
            foreignKeyName: "campaign_kocs_campaign_id_fkey"
            columns: ["campaign_id"]
            isOneToOne: false
            referencedRelation: "client_campaign_kocs_view"
            referencedColumns: ["campaign_id"]
          },
          {
            foreignKeyName: "campaign_kocs_koc_id_fkey"
            columns: ["koc_id"]
            isOneToOne: false
            referencedRelation: "kocs"
            referencedColumns: ["koc_id"]
          },
        ]
      }
      campaigns: {
        Row: {
          brief: string | null
          campaign_id: string
          campaign_name: string
          client_id: string
          contract_value: number
          created_at: string
          end_date: string | null
          package_size: number
          start_date: string | null
          status: Database["public"]["Enums"]["campaign_status"]
          updated_at: string
        }
        Insert: {
          brief?: string | null
          campaign_id?: string
          campaign_name: string
          client_id: string
          contract_value?: number
          created_at?: string
          end_date?: string | null
          package_size?: number
          start_date?: string | null
          status?: Database["public"]["Enums"]["campaign_status"]
          updated_at?: string
        }
        Update: {
          brief?: string | null
          campaign_id?: string
          campaign_name?: string
          client_id?: string
          contract_value?: number
          created_at?: string
          end_date?: string | null
          package_size?: number
          start_date?: string | null
          status?: Database["public"]["Enums"]["campaign_status"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "campaigns_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["client_id"]
          },
        ]
      }
      clients: {
        Row: {
          client_id: string
          company_name: string
          contact_name: string | null
          created_at: string
          email: string | null
          phone: string | null
          status: string
          updated_at: string
        }
        Insert: {
          client_id?: string
          company_name: string
          contact_name?: string | null
          created_at?: string
          email?: string | null
          phone?: string | null
          status?: string
          updated_at?: string
        }
        Update: {
          client_id?: string
          company_name?: string
          contact_name?: string | null
          created_at?: string
          email?: string | null
          phone?: string | null
          status?: string
          updated_at?: string
        }
        Relationships: []
      }
      kocs: {
        Row: {
          avatar_url: string | null
          category: string[] | null
          created_at: string
          default_address: string | null
          email: string | null
          facebook_url: string | null
          follower: number | null
          instagram_url: string | null
          koc_id: string
          location: string | null
          name: string
          note: string | null
          phone: string | null
          status: Database["public"]["Enums"]["koc_status"]
          tiktok_url: string | null
          updated_at: string
          zalo: string | null
        }
        Insert: {
          avatar_url?: string | null
          category?: string[] | null
          created_at?: string
          default_address?: string | null
          email?: string | null
          facebook_url?: string | null
          follower?: number | null
          instagram_url?: string | null
          koc_id?: string
          location?: string | null
          name: string
          note?: string | null
          phone?: string | null
          status?: Database["public"]["Enums"]["koc_status"]
          tiktok_url?: string | null
          updated_at?: string
          zalo?: string | null
        }
        Update: {
          avatar_url?: string | null
          category?: string[] | null
          created_at?: string
          default_address?: string | null
          email?: string | null
          facebook_url?: string | null
          follower?: number | null
          instagram_url?: string | null
          koc_id?: string
          location?: string | null
          name?: string
          note?: string | null
          phone?: string | null
          status?: Database["public"]["Enums"]["koc_status"]
          tiktok_url?: string | null
          updated_at?: string
          zalo?: string | null
        }
        Relationships: []
      }
      notifications: {
        Row: {
          campaign_koc_id: string
          channel: Database["public"]["Enums"]["notification_channel"]
          created_at: string
          created_by: string | null
          message: string
          notification_id: string
          sent_at: string | null
          status: Database["public"]["Enums"]["notification_status"]
          type: Database["public"]["Enums"]["notification_type"]
        }
        Insert: {
          campaign_koc_id: string
          channel?: Database["public"]["Enums"]["notification_channel"]
          created_at?: string
          created_by?: string | null
          message: string
          notification_id?: string
          sent_at?: string | null
          status?: Database["public"]["Enums"]["notification_status"]
          type: Database["public"]["Enums"]["notification_type"]
        }
        Update: {
          campaign_koc_id?: string
          channel?: Database["public"]["Enums"]["notification_channel"]
          created_at?: string
          created_by?: string | null
          message?: string
          notification_id?: string
          sent_at?: string | null
          status?: Database["public"]["Enums"]["notification_status"]
          type?: Database["public"]["Enums"]["notification_type"]
        }
        Relationships: [
          {
            foreignKeyName: "notifications_campaign_koc_id_fkey"
            columns: ["campaign_koc_id"]
            isOneToOne: false
            referencedRelation: "campaign_kocs"
            referencedColumns: ["campaign_koc_id"]
          },
          {
            foreignKeyName: "notifications_campaign_koc_id_fkey"
            columns: ["campaign_koc_id"]
            isOneToOne: false
            referencedRelation: "client_campaign_kocs_view"
            referencedColumns: ["campaign_koc_id"]
          },
        ]
      }
      profiles: {
        Row: {
          client_id: string | null
          created_at: string
          full_name: string
          id: string
          role: Database["public"]["Enums"]["user_role"]
          updated_at: string
        }
        Insert: {
          client_id?: string | null
          created_at?: string
          full_name: string
          id: string
          role?: Database["public"]["Enums"]["user_role"]
          updated_at?: string
        }
        Update: {
          client_id?: string | null
          created_at?: string
          full_name?: string
          id?: string
          role?: Database["public"]["Enums"]["user_role"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "profiles_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["client_id"]
          },
        ]
      }
    }
    Views: {
      client_campaign_kocs_view: {
        Row: {
          avatar_url: string | null
          campaign_id: string | null
          campaign_koc_id: string | null
          campaign_name: string | null
          category: string[] | null
          client_approval_status:
            | Database["public"]["Enums"]["client_approval_status"]
            | null
          client_note: string | null
          client_quality_rated_at: string | null
          client_quality_rating: number | null
          client_quality_review: string | null
          client_video_feedback: string | null
          client_video_feedback_at: string | null
          completed_at: string | null
          content_status: Database["public"]["Enums"]["content_status"] | null
          deadline_date: string | null
          facebook_url: string | null
          follower: number | null
          instagram_url: string | null
          koc_id: string | null
          location: string | null
          name: string | null
          operation_status:
            | Database["public"]["Enums"]["operation_status"]
            | null
          sample_received_at: string | null
          sample_sent_at: string | null
          tiktok_url: string | null
          video_submitted_at: string | null
          video_url: string | null
        }
        Relationships: [
          {
            foreignKeyName: "campaign_kocs_koc_id_fkey"
            columns: ["koc_id"]
            isOneToOne: false
            referencedRelation: "kocs"
            referencedColumns: ["koc_id"]
          },
        ]
      }
      koc_active_campaign_counts: {
        Row: {
          active_campaign_count: number | null
          koc_id: string | null
        }
        Relationships: [
          {
            foreignKeyName: "campaign_kocs_koc_id_fkey"
            columns: ["koc_id"]
            isOneToOne: false
            referencedRelation: "kocs"
            referencedColumns: ["koc_id"]
          },
        ]
      }
    }
    Functions: {
      admin_update_user_role: {
        Args: {
          p_client_id?: string
          p_new_role: Database["public"]["Enums"]["user_role"]
          p_user_id: string
        }
        Returns: undefined
      }
      client_approve_koc: {
        Args: {
          p_campaign_koc_id: string
          p_note?: string
          p_status: Database["public"]["Enums"]["client_approval_status"]
        }
        Returns: undefined
      }
      client_rate_koc: {
        Args: { p_campaign_koc_id: string; p_rating: number; p_review?: string }
        Returns: undefined
      }
      client_submit_video_feedback: {
        Args: { p_campaign_koc_id: string; p_feedback: string }
        Returns: undefined
      }
      current_user_client_id: { Args: never; Returns: string }
      current_user_role: {
        Args: never
        Returns: Database["public"]["Enums"]["user_role"]
      }
      get_campaign_koc_by_token: {
        Args: { p_token: string }
        Returns: {
          address_status: Database["public"]["Enums"]["address_status"]
          campaign_koc_id: string
          campaign_name: string
          content_status: Database["public"]["Enums"]["content_status"]
          deadline_date: string
          koc_name: string
          operation_status: Database["public"]["Enums"]["operation_status"]
          revision_note: string
          sample_status: Database["public"]["Enums"]["sample_status"]
        }[]
      }
      is_admin: { Args: never; Returns: boolean }
      is_admin_or_super_admin: { Args: never; Returns: boolean }
      is_client: { Args: never; Returns: boolean }
      is_internal_user: { Args: never; Returns: boolean }
      is_operator: { Args: never; Returns: boolean }
      is_super_admin: { Args: never; Returns: boolean }
      koc_confirm_sample: {
        Args: {
          p_status: Database["public"]["Enums"]["sample_status"]
          p_token: string
        }
        Returns: undefined
      }
      koc_submit_address: {
        Args: {
          p_address_note?: string
          p_receiver_address: string
          p_receiver_name: string
          p_receiver_phone: string
          p_receiver_province: string
          p_token: string
        }
        Returns: undefined
      }
      koc_submit_video: {
        Args: { p_note?: string; p_token: string; p_video_url: string }
        Returns: undefined
      }
    }
    Enums: {
      address_status: "waiting" | "submitted" | "issue"
      campaign_status: "draft" | "active" | "completed" | "paused" | "cancelled"
      client_approval_status: "pending" | "approved" | "rejected"
      content_status:
        | "waiting"
        | "submitted"
        | "need_revision"
        | "approved"
        | "invalid_link"
        | "late"
      final_status: "active" | "completed" | "failed" | "dropped"
      koc_status: "active" | "inactive" | "blacklisted"
      notification_channel:
        | "zalo_manual"
        | "telegram"
        | "email"
        | "sms"
        | "system"
      notification_status: "draft" | "copied" | "sent" | "failed"
      notification_type:
        | "address_request"
        | "address_reminder"
        | "sample_check"
        | "sample_reminder"
        | "video_brief"
        | "video_reminder"
        | "revision_request"
        | "custom"
      operation_status:
        | "draft"
        | "sent_to_client"
        | "client_approved"
        | "client_rejected"
        | "waiting_address"
        | "address_submitted"
        | "waiting_sample_sent"
        | "sample_sent"
        | "sample_received"
        | "waiting_video"
        | "video_submitted"
        | "need_revision"
        | "video_approved"
        | "completed"
        | "failed"
      sample_status: "waiting" | "sent" | "received" | "not_received" | "issue"
      user_role: "super_admin" | "admin" | "operator" | "client"
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
      address_status: ["waiting", "submitted", "issue"],
      campaign_status: ["draft", "active", "completed", "paused", "cancelled"],
      client_approval_status: ["pending", "approved", "rejected"],
      content_status: [
        "waiting",
        "submitted",
        "need_revision",
        "approved",
        "invalid_link",
        "late",
      ],
      final_status: ["active", "completed", "failed", "dropped"],
      koc_status: ["active", "inactive", "blacklisted"],
      notification_channel: [
        "zalo_manual",
        "telegram",
        "email",
        "sms",
        "system",
      ],
      notification_status: ["draft", "copied", "sent", "failed"],
      notification_type: [
        "address_request",
        "address_reminder",
        "sample_check",
        "sample_reminder",
        "video_brief",
        "video_reminder",
        "revision_request",
        "custom",
      ],
      operation_status: [
        "draft",
        "sent_to_client",
        "client_approved",
        "client_rejected",
        "waiting_address",
        "address_submitted",
        "waiting_sample_sent",
        "sample_sent",
        "sample_received",
        "waiting_video",
        "video_submitted",
        "need_revision",
        "video_approved",
        "completed",
        "failed",
      ],
      sample_status: ["waiting", "sent", "received", "not_received", "issue"],
      user_role: ["super_admin", "admin", "operator", "client"],
    },
  },
} as const
