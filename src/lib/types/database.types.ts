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
      advertisers: {
        Row: {
          company_id: string | null
          contact_email: string | null
          contact_name: string | null
          created_at: string | null
          id: string
          is_active: boolean | null
          name: string
          notes: string | null
          payment_terms: number | null
          updated_at: string | null
        }
        Insert: {
          company_id?: string | null
          contact_email?: string | null
          contact_name?: string | null
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          name: string
          notes?: string | null
          payment_terms?: number | null
          updated_at?: string | null
        }
        Update: {
          company_id?: string | null
          contact_email?: string | null
          contact_name?: string | null
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          name?: string
          notes?: string | null
          payment_terms?: number | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "advertisers_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      api_connections: {
        Row: {
          api_key: string
          base_url: string
          company_id: string | null
          created_at: string | null
          field_mapping: Json | null
          id: string
          is_active: boolean | null
          last_sync_at: string | null
          name: string
          type: string
        }
        Insert: {
          api_key: string
          base_url: string
          company_id?: string | null
          created_at?: string | null
          field_mapping?: Json | null
          id?: string
          is_active?: boolean | null
          last_sync_at?: string | null
          name: string
          type: string
        }
        Update: {
          api_key?: string
          base_url?: string
          company_id?: string | null
          created_at?: string | null
          field_mapping?: Json | null
          id?: string
          is_active?: boolean | null
          last_sync_at?: string | null
          name?: string
          type?: string
        }
        Relationships: [
          {
            foreignKeyName: "api_connections_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
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
          metrics_updated_at: string | null
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
          video_comments: number | null
          video_gmv: number | null
          video_likes: number | null
          video_shares: number | null
          video_submitted_at: string | null
          video_url: string | null
          video_views: number | null
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
          metrics_updated_at?: string | null
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
          video_comments?: number | null
          video_gmv?: number | null
          video_likes?: number | null
          video_shares?: number | null
          video_submitted_at?: string | null
          video_url?: string | null
          video_views?: number | null
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
          metrics_updated_at?: string | null
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
          video_comments?: number | null
          video_gmv?: number | null
          video_likes?: number | null
          video_shares?: number | null
          video_submitted_at?: string | null
          video_url?: string | null
          video_views?: number | null
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
            referencedRelation: "koc_performance_summary"
            referencedColumns: ["koc_id"]
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
      campaign_pl: {
        Row: {
          campaign_id: string | null
          created_at: string | null
          id: string
          period_month: string
          publisher_cost: number | null
          revenue: number | null
          updated_at: string | null
        }
        Insert: {
          campaign_id?: string | null
          created_at?: string | null
          id?: string
          period_month: string
          publisher_cost?: number | null
          revenue?: number | null
          updated_at?: string | null
        }
        Update: {
          campaign_id?: string | null
          created_at?: string | null
          id?: string
          period_month?: string
          publisher_cost?: number | null
          revenue?: number | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "campaign_pl_campaign_id_fkey"
            columns: ["campaign_id"]
            isOneToOne: false
            referencedRelation: "crm_campaigns"
            referencedColumns: ["id"]
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
          report_notes: string | null
          report_published_at: string | null
          report_share_token: string | null
          source: string
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
          report_notes?: string | null
          report_published_at?: string | null
          report_share_token?: string | null
          source?: string
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
          report_notes?: string | null
          report_published_at?: string | null
          report_share_token?: string | null
          source?: string
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
      companies: {
        Row: {
          admin_pct: number | null
          am_pct: number | null
          bd_pct: number | null
          bonus_forfeit_policy: string | null
          bonus_pool_pct: number | null
          created_at: string | null
          fraud_bronze_threshold: number | null
          fraud_gold_threshold: number | null
          fraud_platinum_threshold: number | null
          fraud_silver_threshold: number | null
          id: string
          logo_url: string | null
          min_kpi_threshold: number | null
          name: string
          pm_pct: number | null
          profit_target: number | null
          traffic_clicks_drop_pct: number | null
          traffic_cr_crash_pct: number | null
          traffic_cr_spike_pct: number | null
          traffic_revenue_crash_pct: number | null
          traffic_revenue_drop_pct: number | null
          updated_at: string | null
        }
        Insert: {
          admin_pct?: number | null
          am_pct?: number | null
          bd_pct?: number | null
          bonus_forfeit_policy?: string | null
          bonus_pool_pct?: number | null
          created_at?: string | null
          fraud_bronze_threshold?: number | null
          fraud_gold_threshold?: number | null
          fraud_platinum_threshold?: number | null
          fraud_silver_threshold?: number | null
          id?: string
          logo_url?: string | null
          min_kpi_threshold?: number | null
          name: string
          pm_pct?: number | null
          profit_target?: number | null
          traffic_clicks_drop_pct?: number | null
          traffic_cr_crash_pct?: number | null
          traffic_cr_spike_pct?: number | null
          traffic_revenue_crash_pct?: number | null
          traffic_revenue_drop_pct?: number | null
          updated_at?: string | null
        }
        Update: {
          admin_pct?: number | null
          am_pct?: number | null
          bd_pct?: number | null
          bonus_forfeit_policy?: string | null
          bonus_pool_pct?: number | null
          created_at?: string | null
          fraud_bronze_threshold?: number | null
          fraud_gold_threshold?: number | null
          fraud_platinum_threshold?: number | null
          fraud_silver_threshold?: number | null
          id?: string
          logo_url?: string | null
          min_kpi_threshold?: number | null
          name?: string
          pm_pct?: number | null
          profit_target?: number | null
          traffic_clicks_drop_pct?: number | null
          traffic_cr_crash_pct?: number | null
          traffic_cr_spike_pct?: number | null
          traffic_revenue_crash_pct?: number | null
          traffic_revenue_drop_pct?: number | null
          updated_at?: string | null
        }
        Relationships: []
      }
      contracts: {
        Row: {
          ai_analysis: Json | null
          company_id: string | null
          created_at: string | null
          expiry_date: string | null
          file_url: string | null
          id: string
          notes: string | null
          party_name: string
          party_type: string
          signed_date: string | null
          updated_at: string | null
        }
        Insert: {
          ai_analysis?: Json | null
          company_id?: string | null
          created_at?: string | null
          expiry_date?: string | null
          file_url?: string | null
          id?: string
          notes?: string | null
          party_name: string
          party_type: string
          signed_date?: string | null
          updated_at?: string | null
        }
        Update: {
          ai_analysis?: Json | null
          company_id?: string | null
          created_at?: string | null
          expiry_date?: string | null
          file_url?: string | null
          id?: string
          notes?: string | null
          party_name?: string
          party_type?: string
          signed_date?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "contracts_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      crm_campaigns: {
        Row: {
          advertiser_id: string | null
          company_id: string | null
          created_at: string | null
          id: string
          name: string
          offer_id: string | null
          status: string | null
          updated_at: string | null
        }
        Insert: {
          advertiser_id?: string | null
          company_id?: string | null
          created_at?: string | null
          id?: string
          name: string
          offer_id?: string | null
          status?: string | null
          updated_at?: string | null
        }
        Update: {
          advertiser_id?: string | null
          company_id?: string | null
          created_at?: string | null
          id?: string
          name?: string
          offer_id?: string | null
          status?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "crm_campaigns_advertiser_id_fkey"
            columns: ["advertiser_id"]
            isOneToOne: false
            referencedRelation: "advertisers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "crm_campaigns_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "crm_campaigns_offer_id_fkey"
            columns: ["offer_id"]
            isOneToOne: false
            referencedRelation: "offers"
            referencedColumns: ["id"]
          },
        ]
      }
      daily_metrics: {
        Row: {
          campaign_id: string | null
          clicks: number | null
          company_id: string | null
          conversions: number | null
          cr: number | null
          created_at: string | null
          date: string
          epc: number | null
          id: string
          publisher_id: string | null
          revenue: number | null
        }
        Insert: {
          campaign_id?: string | null
          clicks?: number | null
          company_id?: string | null
          conversions?: number | null
          cr?: number | null
          created_at?: string | null
          date: string
          epc?: number | null
          id?: string
          publisher_id?: string | null
          revenue?: number | null
        }
        Update: {
          campaign_id?: string | null
          clicks?: number | null
          company_id?: string | null
          conversions?: number | null
          cr?: number | null
          created_at?: string | null
          date?: string
          epc?: number | null
          id?: string
          publisher_id?: string | null
          revenue?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "daily_metrics_campaign_id_fkey"
            columns: ["campaign_id"]
            isOneToOne: false
            referencedRelation: "crm_campaigns"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "daily_metrics_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "daily_metrics_publisher_id_fkey"
            columns: ["publisher_id"]
            isOneToOne: false
            referencedRelation: "publishers"
            referencedColumns: ["id"]
          },
        ]
      }
      employees: {
        Row: {
          base_salary: number | null
          company_id: string | null
          created_at: string | null
          custom_role_name: string | null
          email: string | null
          id: string
          is_active: boolean | null
          name: string
          role: string
          telegram_chat_id: string | null
          updated_at: string | null
        }
        Insert: {
          base_salary?: number | null
          company_id?: string | null
          created_at?: string | null
          custom_role_name?: string | null
          email?: string | null
          id?: string
          is_active?: boolean | null
          name: string
          role: string
          telegram_chat_id?: string | null
          updated_at?: string | null
        }
        Update: {
          base_salary?: number | null
          company_id?: string | null
          created_at?: string | null
          custom_role_name?: string | null
          email?: string | null
          id?: string
          is_active?: boolean | null
          name?: string
          role?: string
          telegram_chat_id?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "employees_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      fraud_flags: {
        Row: {
          campaign_id: string | null
          company_id: string | null
          created_at: string | null
          details: Json | null
          flag_type: string
          id: string
          publisher_id: string | null
          resolved_at: string | null
          severity: string
          status: string | null
          updated_at: string | null
        }
        Insert: {
          campaign_id?: string | null
          company_id?: string | null
          created_at?: string | null
          details?: Json | null
          flag_type: string
          id?: string
          publisher_id?: string | null
          resolved_at?: string | null
          severity: string
          status?: string | null
          updated_at?: string | null
        }
        Update: {
          campaign_id?: string | null
          company_id?: string | null
          created_at?: string | null
          details?: Json | null
          flag_type?: string
          id?: string
          publisher_id?: string | null
          resolved_at?: string | null
          severity?: string
          status?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "fraud_flags_campaign_id_fkey"
            columns: ["campaign_id"]
            isOneToOne: false
            referencedRelation: "crm_campaigns"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fraud_flags_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fraud_flags_publisher_id_fkey"
            columns: ["publisher_id"]
            isOneToOne: false
            referencedRelation: "publishers"
            referencedColumns: ["id"]
          },
        ]
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
      kpi_records: {
        Row: {
          activity_notes: string | null
          created_at: string | null
          employee_id: string | null
          id: string
          kpi_1_actual: number | null
          kpi_1_label: string | null
          kpi_1_target: number | null
          kpi_2_actual: number | null
          kpi_2_label: string | null
          kpi_2_target: number | null
          kpi_3_actual: number | null
          kpi_3_label: string | null
          kpi_3_target: number | null
          period_month: string
          updated_at: string | null
        }
        Insert: {
          activity_notes?: string | null
          created_at?: string | null
          employee_id?: string | null
          id?: string
          kpi_1_actual?: number | null
          kpi_1_label?: string | null
          kpi_1_target?: number | null
          kpi_2_actual?: number | null
          kpi_2_label?: string | null
          kpi_2_target?: number | null
          kpi_3_actual?: number | null
          kpi_3_label?: string | null
          kpi_3_target?: number | null
          period_month: string
          updated_at?: string | null
        }
        Update: {
          activity_notes?: string | null
          created_at?: string | null
          employee_id?: string | null
          id?: string
          kpi_1_actual?: number | null
          kpi_1_label?: string | null
          kpi_1_target?: number | null
          kpi_2_actual?: number | null
          kpi_2_label?: string | null
          kpi_2_target?: number | null
          kpi_3_actual?: number | null
          kpi_3_label?: string | null
          kpi_3_target?: number | null
          period_month?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "kpi_records_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
        ]
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
      offers: {
        Row: {
          advertiser_id: string | null
          budget_spent: number | null
          budget_total: number | null
          created_at: string | null
          geo: string[] | null
          id: string
          model: string
          name: string
          payout: number
          status: string | null
          updated_at: string | null
        }
        Insert: {
          advertiser_id?: string | null
          budget_spent?: number | null
          budget_total?: number | null
          created_at?: string | null
          geo?: string[] | null
          id?: string
          model: string
          name: string
          payout: number
          status?: string | null
          updated_at?: string | null
        }
        Update: {
          advertiser_id?: string | null
          budget_spent?: number | null
          budget_total?: number | null
          created_at?: string | null
          geo?: string[] | null
          id?: string
          model?: string
          name?: string
          payout?: number
          status?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "offers_advertiser_id_fkey"
            columns: ["advertiser_id"]
            isOneToOne: false
            referencedRelation: "advertisers"
            referencedColumns: ["id"]
          },
        ]
      }
      pipeline_activities: {
        Row: {
          activity_date: string | null
          created_at: string | null
          id: string
          notes: string | null
          outcome: string | null
          pipeline_contact_id: string | null
          title: string
          type: string
        }
        Insert: {
          activity_date?: string | null
          created_at?: string | null
          id?: string
          notes?: string | null
          outcome?: string | null
          pipeline_contact_id?: string | null
          title: string
          type: string
        }
        Update: {
          activity_date?: string | null
          created_at?: string | null
          id?: string
          notes?: string | null
          outcome?: string | null
          pipeline_contact_id?: string | null
          title?: string
          type?: string
        }
        Relationships: [
          {
            foreignKeyName: "pipeline_activities_pipeline_contact_id_fkey"
            columns: ["pipeline_contact_id"]
            isOneToOne: false
            referencedRelation: "pipeline_contacts"
            referencedColumns: ["id"]
          },
        ]
      }
      pipeline_contacts: {
        Row: {
          company_id: string | null
          contact_email: string | null
          contact_name: string | null
          contact_phone: string | null
          created_at: string | null
          estimated_value: number | null
          expected_close_date: string | null
          id: string
          is_active: boolean | null
          name: string
          notes: string | null
          owner_id: string | null
          stage: string
          type: string
          updated_at: string | null
        }
        Insert: {
          company_id?: string | null
          contact_email?: string | null
          contact_name?: string | null
          contact_phone?: string | null
          created_at?: string | null
          estimated_value?: number | null
          expected_close_date?: string | null
          id?: string
          is_active?: boolean | null
          name: string
          notes?: string | null
          owner_id?: string | null
          stage?: string
          type: string
          updated_at?: string | null
        }
        Update: {
          company_id?: string | null
          contact_email?: string | null
          contact_name?: string | null
          contact_phone?: string | null
          created_at?: string | null
          estimated_value?: number | null
          expected_close_date?: string | null
          id?: string
          is_active?: boolean | null
          name?: string
          notes?: string | null
          owner_id?: string | null
          stage?: string
          type?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "pipeline_contacts_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pipeline_contacts_owner_id_fkey"
            columns: ["owner_id"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
        ]
      }
      pl_monthly: {
        Row: {
          bonus_cost: number | null
          company_id: string | null
          created_at: string | null
          id: string
          notes: string | null
          other_cost: number | null
          period_month: string
          publisher_cost: number | null
          revenue: number | null
          salary_cost: number | null
          updated_at: string | null
        }
        Insert: {
          bonus_cost?: number | null
          company_id?: string | null
          created_at?: string | null
          id?: string
          notes?: string | null
          other_cost?: number | null
          period_month: string
          publisher_cost?: number | null
          revenue?: number | null
          salary_cost?: number | null
          updated_at?: string | null
        }
        Update: {
          bonus_cost?: number | null
          company_id?: string | null
          created_at?: string | null
          id?: string
          notes?: string | null
          other_cost?: number | null
          period_month?: string
          publisher_cost?: number | null
          revenue?: number | null
          salary_cost?: number | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "pl_monthly_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
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
      proposal_kocs: {
        Row: {
          client_comment: string | null
          client_reviewed_at: string | null
          client_status: string
          created_at: string
          koc_id: string
          notes: string | null
          ordering: number
          proposal_id: string
          proposal_koc_id: string
        }
        Insert: {
          client_comment?: string | null
          client_reviewed_at?: string | null
          client_status?: string
          created_at?: string
          koc_id: string
          notes?: string | null
          ordering?: number
          proposal_id: string
          proposal_koc_id?: string
        }
        Update: {
          client_comment?: string | null
          client_reviewed_at?: string | null
          client_status?: string
          created_at?: string
          koc_id?: string
          notes?: string | null
          ordering?: number
          proposal_id?: string
          proposal_koc_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "proposal_kocs_koc_id_fkey"
            columns: ["koc_id"]
            isOneToOne: false
            referencedRelation: "koc_performance_summary"
            referencedColumns: ["koc_id"]
          },
          {
            foreignKeyName: "proposal_kocs_koc_id_fkey"
            columns: ["koc_id"]
            isOneToOne: false
            referencedRelation: "kocs"
            referencedColumns: ["koc_id"]
          },
          {
            foreignKeyName: "proposal_kocs_proposal_id_fkey"
            columns: ["proposal_id"]
            isOneToOne: false
            referencedRelation: "proposals"
            referencedColumns: ["proposal_id"]
          },
        ]
      }
      proposals: {
        Row: {
          client_id: string | null
          client_overall_comment: string | null
          created_at: string
          created_by: string | null
          linked_campaign_id: string | null
          notes: string | null
          proposal_id: string
          prospect_name: string | null
          share_token: string
          status: string
          title: string
          updated_at: string
        }
        Insert: {
          client_id?: string | null
          client_overall_comment?: string | null
          created_at?: string
          created_by?: string | null
          linked_campaign_id?: string | null
          notes?: string | null
          proposal_id?: string
          prospect_name?: string | null
          share_token?: string
          status?: string
          title: string
          updated_at?: string
        }
        Update: {
          client_id?: string | null
          client_overall_comment?: string | null
          created_at?: string
          created_by?: string | null
          linked_campaign_id?: string | null
          notes?: string | null
          proposal_id?: string
          prospect_name?: string | null
          share_token?: string
          status?: string
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "proposals_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["client_id"]
          },
          {
            foreignKeyName: "proposals_linked_campaign_id_fkey"
            columns: ["linked_campaign_id"]
            isOneToOne: false
            referencedRelation: "campaigns"
            referencedColumns: ["campaign_id"]
          },
          {
            foreignKeyName: "proposals_linked_campaign_id_fkey"
            columns: ["linked_campaign_id"]
            isOneToOne: false
            referencedRelation: "client_campaign_kocs_view"
            referencedColumns: ["campaign_id"]
          },
        ]
      }
      publisher_contact_log: {
        Row: {
          created_at: string | null
          created_by: string | null
          event_type: string
          id: string
          note: string
          publisher_id: string | null
        }
        Insert: {
          created_at?: string | null
          created_by?: string | null
          event_type: string
          id?: string
          note: string
          publisher_id?: string | null
        }
        Update: {
          created_at?: string | null
          created_by?: string | null
          event_type?: string
          id?: string
          note?: string
          publisher_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "publisher_contact_log_publisher_id_fkey"
            columns: ["publisher_id"]
            isOneToOne: false
            referencedRelation: "publishers"
            referencedColumns: ["id"]
          },
        ]
      }
      publishers: {
        Row: {
          bank_info: string | null
          company_id: string | null
          created_at: string | null
          email: string | null
          id: string
          is_active: boolean | null
          name: string
          notes: string | null
          payment_method: string | null
          tier: string | null
          traffic_sources: string[] | null
          updated_at: string | null
        }
        Insert: {
          bank_info?: string | null
          company_id?: string | null
          created_at?: string | null
          email?: string | null
          id?: string
          is_active?: boolean | null
          name: string
          notes?: string | null
          payment_method?: string | null
          tier?: string | null
          traffic_sources?: string[] | null
          updated_at?: string | null
        }
        Update: {
          bank_info?: string | null
          company_id?: string | null
          created_at?: string | null
          email?: string | null
          id?: string
          is_active?: boolean | null
          name?: string
          notes?: string | null
          payment_method?: string | null
          tier?: string | null
          traffic_sources?: string[] | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "publishers_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      recon_records: {
        Row: {
          adv_amount: number | null
          click_id: string | null
          conversion_id: string | null
          created_at: string | null
          dispute_note: string | null
          id: string
          match_status: string
          our_amount: number | null
          publisher_id: string | null
          raw_data: Json | null
          session_id: string | null
          transaction_date: string | null
        }
        Insert: {
          adv_amount?: number | null
          click_id?: string | null
          conversion_id?: string | null
          created_at?: string | null
          dispute_note?: string | null
          id?: string
          match_status: string
          our_amount?: number | null
          publisher_id?: string | null
          raw_data?: Json | null
          session_id?: string | null
          transaction_date?: string | null
        }
        Update: {
          adv_amount?: number | null
          click_id?: string | null
          conversion_id?: string | null
          created_at?: string | null
          dispute_note?: string | null
          id?: string
          match_status?: string
          our_amount?: number | null
          publisher_id?: string | null
          raw_data?: Json | null
          session_id?: string | null
          transaction_date?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "recon_records_publisher_id_fkey"
            columns: ["publisher_id"]
            isOneToOne: false
            referencedRelation: "publishers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "recon_records_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "recon_sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      recon_sessions: {
        Row: {
          adv_file_url: string | null
          advertiser_id: string | null
          approved_at: string | null
          company_id: string | null
          created_at: string | null
          dispute_note: string | null
          id: string
          match_rate: number | null
          our_file_url: string | null
          paid_at: string | null
          period_month: string
          status: string | null
          updated_at: string | null
        }
        Insert: {
          adv_file_url?: string | null
          advertiser_id?: string | null
          approved_at?: string | null
          company_id?: string | null
          created_at?: string | null
          dispute_note?: string | null
          id?: string
          match_rate?: number | null
          our_file_url?: string | null
          paid_at?: string | null
          period_month: string
          status?: string | null
          updated_at?: string | null
        }
        Update: {
          adv_file_url?: string | null
          advertiser_id?: string | null
          approved_at?: string | null
          company_id?: string | null
          created_at?: string | null
          dispute_note?: string | null
          id?: string
          match_rate?: number | null
          our_file_url?: string | null
          paid_at?: string | null
          period_month?: string
          status?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "recon_sessions_advertiser_id_fkey"
            columns: ["advertiser_id"]
            isOneToOne: false
            referencedRelation: "advertisers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "recon_sessions_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      tasks: {
        Row: {
          assigned_to: string | null
          company_id: string | null
          created_at: string | null
          description: string | null
          due_date: string | null
          id: string
          priority: string
          related_id: string | null
          related_name: string | null
          related_type: string | null
          status: string
          supervisor_id: string | null
          title: string
          updated_at: string | null
        }
        Insert: {
          assigned_to?: string | null
          company_id?: string | null
          created_at?: string | null
          description?: string | null
          due_date?: string | null
          id?: string
          priority?: string
          related_id?: string | null
          related_name?: string | null
          related_type?: string | null
          status?: string
          supervisor_id?: string | null
          title: string
          updated_at?: string | null
        }
        Update: {
          assigned_to?: string | null
          company_id?: string | null
          created_at?: string | null
          description?: string | null
          due_date?: string | null
          id?: string
          priority?: string
          related_id?: string | null
          related_name?: string | null
          related_type?: string | null
          status?: string
          supervisor_id?: string | null
          title?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "tasks_assigned_to_fkey"
            columns: ["assigned_to"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tasks_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tasks_supervisor_id_fkey"
            columns: ["supervisor_id"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
        ]
      }
      user_permissions: {
        Row: {
          allowed_modules: string[] | null
          created_at: string | null
          display_name: string | null
          email: string
          id: string
          is_super_admin: boolean | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          allowed_modules?: string[] | null
          created_at?: string | null
          display_name?: string | null
          email: string
          id?: string
          is_super_admin?: boolean | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          allowed_modules?: string[] | null
          created_at?: string | null
          display_name?: string | null
          email?: string
          id?: string
          is_super_admin?: boolean | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
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
            referencedRelation: "koc_performance_summary"
            referencedColumns: ["koc_id"]
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
            referencedRelation: "koc_performance_summary"
            referencedColumns: ["koc_id"]
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
      koc_performance_summary: {
        Row: {
          avg_rating: number | null
          completed_campaigns: number | null
          koc_id: string | null
          rating_count: number | null
          total_campaigns: number | null
          video_count: number | null
        }
        Relationships: []
      }
    }
    Functions: {
      admin_list_users: {
        Args: never
        Returns: {
          banned_until: string
          client_id: string
          client_name: string
          created_at: string
          email: string
          full_name: string
          id: string
          role: string
        }[]
      }
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
      get_proposal_by_token: { Args: { p_token: string }; Returns: Json }
      get_report_by_token: { Args: { p_token: string }; Returns: Json }
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
      submit_koc_review: {
        Args: {
          p_comment?: string
          p_koc_entry: string
          p_status: string
          p_token: string
        }
        Returns: Json
      }
      submit_proposal_comment: {
        Args: { p_comment: string; p_token: string }
        Returns: Json
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

