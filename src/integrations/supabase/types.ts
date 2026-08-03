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
      ab_assignments: {
        Row: {
          assigned_at: string
          experiment_key: string
          user_id: string
          variant: string
        }
        Insert: {
          assigned_at?: string
          experiment_key: string
          user_id: string
          variant: string
        }
        Update: {
          assigned_at?: string
          experiment_key?: string
          user_id?: string
          variant?: string
        }
        Relationships: [
          {
            foreignKeyName: "ab_assignments_experiment_key_fkey"
            columns: ["experiment_key"]
            isOneToOne: false
            referencedRelation: "ab_experiments"
            referencedColumns: ["key"]
          },
        ]
      }
      ab_experiments: {
        Row: {
          active: boolean
          created_at: string
          key: string
          variants: string[]
          weights: number[] | null
        }
        Insert: {
          active?: boolean
          created_at?: string
          key: string
          variants: string[]
          weights?: number[] | null
        }
        Update: {
          active?: boolean
          created_at?: string
          key?: string
          variants?: string[]
          weights?: number[] | null
        }
        Relationships: []
      }
      achievements: {
        Row: {
          category: string | null
          created_at: string | null
          description_ar: string | null
          icon: string | null
          id: string
          name_ar: string
          name_en: string | null
          points: number | null
          tier: string | null
        }
        Insert: {
          category?: string | null
          created_at?: string | null
          description_ar?: string | null
          icon?: string | null
          id: string
          name_ar: string
          name_en?: string | null
          points?: number | null
          tier?: string | null
        }
        Update: {
          category?: string | null
          created_at?: string | null
          description_ar?: string | null
          icon?: string | null
          id?: string
          name_ar?: string
          name_en?: string | null
          points?: number | null
          tier?: string | null
        }
        Relationships: []
      }
      ad_audit_log: {
        Row: {
          action: string
          actor_id: string | null
          campaign_id: string
          created_at: string
          diff: Json
          id: string
        }
        Insert: {
          action: string
          actor_id?: string | null
          campaign_id: string
          created_at?: string
          diff?: Json
          id?: string
        }
        Update: {
          action?: string
          actor_id?: string | null
          campaign_id?: string
          created_at?: string
          diff?: Json
          id?: string
        }
        Relationships: [
          {
            foreignKeyName: "ad_audit_log_campaign_id_fkey"
            columns: ["campaign_id"]
            isOneToOne: false
            referencedRelation: "ad_campaigns"
            referencedColumns: ["id"]
          },
        ]
      }
      ad_blocked_keywords: {
        Row: {
          created_at: string
          created_by: string | null
          id: string
          keyword: string
          reason: string | null
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          id?: string
          keyword: string
          reason?: string | null
        }
        Update: {
          created_at?: string
          created_by?: string | null
          id?: string
          keyword?: string
          reason?: string | null
        }
        Relationships: []
      }
      ad_campaigns: {
        Row: {
          bid_amount: number | null
          bid_strategy: string
          body: string | null
          budget_alert_sent_at: string | null
          city_targeting: string[]
          clicks: number
          conversions_count: number
          created_at: string
          cta_label: string
          cta_url: string
          currency: string
          daily_budget: number
          daypart: Json
          device_targeting: Json
          duration_days: number
          end_at: string | null
          headline: string
          id: string
          impressions: number
          interests: string[]
          marketplace_link_id: string | null
          marketplace_link_type: string | null
          media_type: string | null
          media_url: string | null
          objective: string
          owner_id: string
          project_id: string | null
          quality_score: number
          rejection_reason: string | null
          review_state: string
          schedule_end: string | null
          schedule_start: string | null
          spent: number
          start_at: string | null
          status: Database["public"]["Enums"]["ad_status"]
          targeting: Json
          total_budget: number
          updated_at: string
        }
        Insert: {
          bid_amount?: number | null
          bid_strategy?: string
          body?: string | null
          budget_alert_sent_at?: string | null
          city_targeting?: string[]
          clicks?: number
          conversions_count?: number
          created_at?: string
          cta_label?: string
          cta_url: string
          currency?: string
          daily_budget: number
          daypart?: Json
          device_targeting?: Json
          duration_days: number
          end_at?: string | null
          headline: string
          id?: string
          impressions?: number
          interests?: string[]
          marketplace_link_id?: string | null
          marketplace_link_type?: string | null
          media_type?: string | null
          media_url?: string | null
          objective?: string
          owner_id: string
          project_id?: string | null
          quality_score?: number
          rejection_reason?: string | null
          review_state?: string
          schedule_end?: string | null
          schedule_start?: string | null
          spent?: number
          start_at?: string | null
          status?: Database["public"]["Enums"]["ad_status"]
          targeting?: Json
          total_budget: number
          updated_at?: string
        }
        Update: {
          bid_amount?: number | null
          bid_strategy?: string
          body?: string | null
          budget_alert_sent_at?: string | null
          city_targeting?: string[]
          clicks?: number
          conversions_count?: number
          created_at?: string
          cta_label?: string
          cta_url?: string
          currency?: string
          daily_budget?: number
          daypart?: Json
          device_targeting?: Json
          duration_days?: number
          end_at?: string | null
          headline?: string
          id?: string
          impressions?: number
          interests?: string[]
          marketplace_link_id?: string | null
          marketplace_link_type?: string | null
          media_type?: string | null
          media_url?: string | null
          objective?: string
          owner_id?: string
          project_id?: string | null
          quality_score?: number
          rejection_reason?: string | null
          review_state?: string
          schedule_end?: string | null
          schedule_start?: string | null
          spent?: number
          start_at?: string | null
          status?: Database["public"]["Enums"]["ad_status"]
          targeting?: Json
          total_budget?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "ad_campaigns_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ad_campaigns_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects_public"
            referencedColumns: ["id"]
          },
        ]
      }
      ad_conversions: {
        Row: {
          campaign_id: string
          created_at: string
          currency: string
          id: string
          kind: string
          metadata: Json
          user_id: string | null
          value: number
        }
        Insert: {
          campaign_id: string
          created_at?: string
          currency?: string
          id?: string
          kind: string
          metadata?: Json
          user_id?: string | null
          value?: number
        }
        Update: {
          campaign_id?: string
          created_at?: string
          currency?: string
          id?: string
          kind?: string
          metadata?: Json
          user_id?: string | null
          value?: number
        }
        Relationships: [
          {
            foreignKeyName: "ad_conversions_campaign_id_fkey"
            columns: ["campaign_id"]
            isOneToOne: false
            referencedRelation: "ad_campaigns"
            referencedColumns: ["id"]
          },
        ]
      }
      ad_events: {
        Row: {
          age_bracket: string | null
          campaign_id: string
          country: string | null
          created_at: string
          id: number
          kind: string
          viewer_id: string | null
        }
        Insert: {
          age_bracket?: string | null
          campaign_id: string
          country?: string | null
          created_at?: string
          id?: number
          kind: string
          viewer_id?: string | null
        }
        Update: {
          age_bracket?: string | null
          campaign_id?: string
          country?: string | null
          created_at?: string
          id?: number
          kind?: string
          viewer_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "ad_events_campaign_id_fkey"
            columns: ["campaign_id"]
            isOneToOne: false
            referencedRelation: "ad_campaigns"
            referencedColumns: ["id"]
          },
        ]
      }
      ad_support_tickets: {
        Row: {
          admin_id: string | null
          admin_reply: string | null
          campaign_id: string | null
          created_at: string
          id: string
          message: string
          status: string
          subject: string
          updated_at: string
          user_id: string
        }
        Insert: {
          admin_id?: string | null
          admin_reply?: string | null
          campaign_id?: string | null
          created_at?: string
          id?: string
          message: string
          status?: string
          subject: string
          updated_at?: string
          user_id: string
        }
        Update: {
          admin_id?: string | null
          admin_reply?: string | null
          campaign_id?: string | null
          created_at?: string
          id?: string
          message?: string
          status?: string
          subject?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "ad_support_tickets_campaign_id_fkey"
            columns: ["campaign_id"]
            isOneToOne: false
            referencedRelation: "ad_campaigns"
            referencedColumns: ["id"]
          },
        ]
      }
      admin_ai_conversations: {
        Row: {
          created_at: string
          id: string
          title: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          title?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          title?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      admin_ai_memory: {
        Row: {
          id: string
          key: string
          updated_at: string
          user_id: string
          value: Json
        }
        Insert: {
          id?: string
          key: string
          updated_at?: string
          user_id: string
          value: Json
        }
        Update: {
          id?: string
          key?: string
          updated_at?: string
          user_id?: string
          value?: Json
        }
        Relationships: []
      }
      admin_ai_messages: {
        Row: {
          conversation_id: string
          created_at: string
          id: string
          parts: Json
          role: string
          user_id: string
        }
        Insert: {
          conversation_id: string
          created_at?: string
          id?: string
          parts: Json
          role: string
          user_id: string
        }
        Update: {
          conversation_id?: string
          created_at?: string
          id?: string
          parts?: Json
          role?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "admin_ai_messages_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "admin_ai_conversations"
            referencedColumns: ["id"]
          },
        ]
      }
      admin_ai_pending_actions: {
        Row: {
          args: Json
          created_at: string
          decided_at: string | null
          expires_at: string
          id: string
          result: Json | null
          status: string
          summary: string
          tool_name: string
          user_id: string
        }
        Insert: {
          args: Json
          created_at?: string
          decided_at?: string | null
          expires_at?: string
          id?: string
          result?: Json | null
          status?: string
          summary: string
          tool_name: string
          user_id: string
        }
        Update: {
          args?: Json
          created_at?: string
          decided_at?: string | null
          expires_at?: string
          id?: string
          result?: Json | null
          status?: string
          summary?: string
          tool_name?: string
          user_id?: string
        }
        Relationships: []
      }
      admin_ai_usage: {
        Row: {
          completion_tokens: number | null
          created_at: string
          duration_ms: number | null
          id: string
          model: string | null
          prompt_tokens: number | null
          role: string | null
          tools_used: string[] | null
          total_tokens: number | null
          user_id: string
        }
        Insert: {
          completion_tokens?: number | null
          created_at?: string
          duration_ms?: number | null
          id?: string
          model?: string | null
          prompt_tokens?: number | null
          role?: string | null
          tools_used?: string[] | null
          total_tokens?: number | null
          user_id: string
        }
        Update: {
          completion_tokens?: number | null
          created_at?: string
          duration_ms?: number | null
          id?: string
          model?: string | null
          prompt_tokens?: number | null
          role?: string | null
          tools_used?: string[] | null
          total_tokens?: number | null
          user_id?: string
        }
        Relationships: []
      }
      admin_audit_log: {
        Row: {
          action: string
          actor_id: string
          created_at: string
          diff: Json | null
          id: string
          ip: string | null
          target_id: string | null
          target_table: string | null
        }
        Insert: {
          action: string
          actor_id: string
          created_at?: string
          diff?: Json | null
          id?: string
          ip?: string | null
          target_id?: string | null
          target_table?: string | null
        }
        Update: {
          action?: string
          actor_id?: string
          created_at?: string
          diff?: Json | null
          id?: string
          ip?: string | null
          target_id?: string | null
          target_table?: string | null
        }
        Relationships: []
      }
      agents_membership_permissions: {
        Row: {
          agent_id: string
          allowed_tools: string[]
          created_at: string
          daily_quota: number
          enabled: boolean
          id: string
          membership: Database["public"]["Enums"]["membership_tier"]
          updated_at: string
        }
        Insert: {
          agent_id: string
          allowed_tools?: string[]
          created_at?: string
          daily_quota?: number
          enabled?: boolean
          id?: string
          membership: Database["public"]["Enums"]["membership_tier"]
          updated_at?: string
        }
        Update: {
          agent_id?: string
          allowed_tools?: string[]
          created_at?: string
          daily_quota?: number
          enabled?: boolean
          id?: string
          membership?: Database["public"]["Enums"]["membership_tier"]
          updated_at?: string
        }
        Relationships: []
      }
      agents_runs: {
        Row: {
          agent_id: string
          agent_scope: string
          created_at: string
          duration_ms: number | null
          error: string | null
          id: string
          input: Json | null
          membership_snapshot:
            | Database["public"]["Enums"]["membership_tier"]
            | null
          output: Json | null
          session_id: string | null
          success: boolean
          tool_name: string | null
          user_id: string
        }
        Insert: {
          agent_id: string
          agent_scope?: string
          created_at?: string
          duration_ms?: number | null
          error?: string | null
          id?: string
          input?: Json | null
          membership_snapshot?:
            | Database["public"]["Enums"]["membership_tier"]
            | null
          output?: Json | null
          session_id?: string | null
          success?: boolean
          tool_name?: string | null
          user_id: string
        }
        Update: {
          agent_id?: string
          agent_scope?: string
          created_at?: string
          duration_ms?: number | null
          error?: string | null
          id?: string
          input?: Json | null
          membership_snapshot?:
            | Database["public"]["Enums"]["membership_tier"]
            | null
          output?: Json | null
          session_id?: string | null
          success?: boolean
          tool_name?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "agents_runs_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "agents_sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      agents_sessions: {
        Row: {
          agent_id: string
          agent_scope: string
          created_at: string
          id: string
          last_message_at: string | null
          message_count: number
          title: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          agent_id: string
          agent_scope?: string
          created_at?: string
          id?: string
          last_message_at?: string | null
          message_count?: number
          title?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          agent_id?: string
          agent_scope?: string
          created_at?: string
          id?: string
          last_message_at?: string | null
          message_count?: number
          title?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      ai_agent_logs: {
        Row: {
          agent_id: string
          created_at: string
          duration_ms: number | null
          id: string
          metadata: Json
          result: string | null
          status: string
          task: string
          triggered_by: string
        }
        Insert: {
          agent_id: string
          created_at?: string
          duration_ms?: number | null
          id?: string
          metadata?: Json
          result?: string | null
          status?: string
          task: string
          triggered_by?: string
        }
        Update: {
          agent_id?: string
          created_at?: string
          duration_ms?: number | null
          id?: string
          metadata?: Json
          result?: string | null
          status?: string
          task?: string
          triggered_by?: string
        }
        Relationships: [
          {
            foreignKeyName: "ai_agent_logs_agent_id_fkey"
            columns: ["agent_id"]
            isOneToOne: false
            referencedRelation: "ai_agents"
            referencedColumns: ["id"]
          },
        ]
      }
      ai_agents: {
        Row: {
          created_at: string
          enabled: boolean
          id: string
          last_run_at: string | null
          name: string
          rank: number
          role: string
          status: string
          system_prompt: string
          total_runs: number
          updated_at: string
        }
        Insert: {
          created_at?: string
          enabled?: boolean
          id: string
          last_run_at?: string | null
          name: string
          rank?: number
          role: string
          status?: string
          system_prompt: string
          total_runs?: number
          updated_at?: string
        }
        Update: {
          created_at?: string
          enabled?: boolean
          id?: string
          last_run_at?: string | null
          name?: string
          rank?: number
          role?: string
          status?: string
          system_prompt?: string
          total_runs?: number
          updated_at?: string
        }
        Relationships: []
      }
      ai_directives: {
        Row: {
          content: string
          created_at: string
          executed_at: string | null
          from_agent: string
          id: string
          priority: string
          result: string | null
          status: string
          to_agent: string
        }
        Insert: {
          content: string
          created_at?: string
          executed_at?: string | null
          from_agent: string
          id?: string
          priority?: string
          result?: string | null
          status?: string
          to_agent: string
        }
        Update: {
          content?: string
          created_at?: string
          executed_at?: string | null
          from_agent?: string
          id?: string
          priority?: string
          result?: string | null
          status?: string
          to_agent?: string
        }
        Relationships: [
          {
            foreignKeyName: "ai_directives_from_agent_fkey"
            columns: ["from_agent"]
            isOneToOne: false
            referencedRelation: "ai_agents"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ai_directives_to_agent_fkey"
            columns: ["to_agent"]
            isOneToOne: false
            referencedRelation: "ai_agents"
            referencedColumns: ["id"]
          },
        ]
      }
      aml_flags: {
        Row: {
          auto_detected_at: string
          details: Json
          flag_type: string
          id: string
          resolution: string | null
          reviewed_at: string | null
          reviewed_by: string | null
          severity: string
          status: string
          transaction_ref: string | null
          wallet_user_id: string
        }
        Insert: {
          auto_detected_at?: string
          details?: Json
          flag_type: string
          id?: string
          resolution?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          severity?: string
          status?: string
          transaction_ref?: string | null
          wallet_user_id: string
        }
        Update: {
          auto_detected_at?: string
          details?: Json
          flag_type?: string
          id?: string
          resolution?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          severity?: string
          status?: string
          transaction_ref?: string | null
          wallet_user_id?: string
        }
        Relationships: []
      }
      archive_log: {
        Row: {
          archived_table: string
          created_at: string
          id: string
          notes: string | null
          rows_archived: number
          rows_deleted: number
        }
        Insert: {
          archived_table: string
          created_at?: string
          id?: string
          notes?: string | null
          rows_archived?: number
          rows_deleted?: number
        }
        Update: {
          archived_table?: string
          created_at?: string
          id?: string
          notes?: string | null
          rows_archived?: number
          rows_deleted?: number
        }
        Relationships: []
      }
      articles: {
        Row: {
          ai_generated: boolean
          author_id: string | null
          category: string
          content: string
          cover_image_url: string | null
          created_at: string
          event_ref_id: string | null
          event_type: string | null
          excerpt: string | null
          focus_keyword: string | null
          generation_model: string | null
          id: string
          indexed_bing_at: string | null
          indexed_google_at: string | null
          is_featured: boolean | null
          language: string
          meta_description: string | null
          published: boolean
          published_at: string | null
          reading_time_minutes: number | null
          seo_score: number | null
          slug: string
          tags: string[] | null
          title: string
          updated_at: string
          views_count: number
          word_count: number | null
        }
        Insert: {
          ai_generated?: boolean
          author_id?: string | null
          category?: string
          content: string
          cover_image_url?: string | null
          created_at?: string
          event_ref_id?: string | null
          event_type?: string | null
          excerpt?: string | null
          focus_keyword?: string | null
          generation_model?: string | null
          id?: string
          indexed_bing_at?: string | null
          indexed_google_at?: string | null
          is_featured?: boolean | null
          language?: string
          meta_description?: string | null
          published?: boolean
          published_at?: string | null
          reading_time_minutes?: number | null
          seo_score?: number | null
          slug: string
          tags?: string[] | null
          title: string
          updated_at?: string
          views_count?: number
          word_count?: number | null
        }
        Update: {
          ai_generated?: boolean
          author_id?: string | null
          category?: string
          content?: string
          cover_image_url?: string | null
          created_at?: string
          event_ref_id?: string | null
          event_type?: string | null
          excerpt?: string | null
          focus_keyword?: string | null
          generation_model?: string | null
          id?: string
          indexed_bing_at?: string | null
          indexed_google_at?: string | null
          is_featured?: boolean | null
          language?: string
          meta_description?: string | null
          published?: boolean
          published_at?: string | null
          reading_time_minutes?: number | null
          seo_score?: number | null
          slug?: string
          tags?: string[] | null
          title?: string
          updated_at?: string
          views_count?: number
          word_count?: number | null
        }
        Relationships: []
      }
      assistant_invocations: {
        Row: {
          agent_id: string
          attempt: number
          created_at: string
          error_code: string | null
          error_message: string | null
          id: string
          latency_ms: number | null
          payload: Json
          session_id: string | null
          status: string
          user_id: string | null
        }
        Insert: {
          agent_id: string
          attempt?: number
          created_at?: string
          error_code?: string | null
          error_message?: string | null
          id?: string
          latency_ms?: number | null
          payload?: Json
          session_id?: string | null
          status: string
          user_id?: string | null
        }
        Update: {
          agent_id?: string
          attempt?: number
          created_at?: string
          error_code?: string | null
          error_message?: string | null
          id?: string
          latency_ms?: number | null
          payload?: Json
          session_id?: string | null
          status?: string
          user_id?: string | null
        }
        Relationships: []
      }
      assistant_messages: {
        Row: {
          agent_id: string
          content: string
          created_at: string
          id: string
          parts: Json
          role: string
          user_id: string
        }
        Insert: {
          agent_id: string
          content?: string
          created_at?: string
          id?: string
          parts?: Json
          role: string
          user_id: string
        }
        Update: {
          agent_id?: string
          content?: string
          created_at?: string
          id?: string
          parts?: Json
          role?: string
          user_id?: string
        }
        Relationships: []
      }
      auctions: {
        Row: {
          auto_extend_minutes: number
          bids_count: number
          buy_now_price: number | null
          completed_at: string | null
          created_at: string
          currency: string
          current_price: number
          current_winner_id: string | null
          deposit_required_pct: number
          ends_at: string
          final_price: number | null
          id: string
          metadata: Json
          min_increment: number
          owner_id: string
          project_id: string
          reserve_price: number | null
          service_key: string | null
          start_price: number
          starts_at: string
          status: Database["public"]["Enums"]["auction_status"]
          type: Database["public"]["Enums"]["auction_type"]
          updated_at: string
          winner_id: string | null
        }
        Insert: {
          auto_extend_minutes?: number
          bids_count?: number
          buy_now_price?: number | null
          completed_at?: string | null
          created_at?: string
          currency?: string
          current_price: number
          current_winner_id?: string | null
          deposit_required_pct?: number
          ends_at: string
          final_price?: number | null
          id?: string
          metadata?: Json
          min_increment?: number
          owner_id: string
          project_id: string
          reserve_price?: number | null
          service_key?: string | null
          start_price: number
          starts_at?: string
          status?: Database["public"]["Enums"]["auction_status"]
          type?: Database["public"]["Enums"]["auction_type"]
          updated_at?: string
          winner_id?: string | null
        }
        Update: {
          auto_extend_minutes?: number
          bids_count?: number
          buy_now_price?: number | null
          completed_at?: string | null
          created_at?: string
          currency?: string
          current_price?: number
          current_winner_id?: string | null
          deposit_required_pct?: number
          ends_at?: string
          final_price?: number | null
          id?: string
          metadata?: Json
          min_increment?: number
          owner_id?: string
          project_id?: string
          reserve_price?: number | null
          service_key?: string | null
          start_price?: number
          starts_at?: string
          status?: Database["public"]["Enums"]["auction_status"]
          type?: Database["public"]["Enums"]["auction_type"]
          updated_at?: string
          winner_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "auctions_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "auctions_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects_public"
            referencedColumns: ["id"]
          },
        ]
      }
      automation_rules: {
        Row: {
          actions: Json
          conditions: Json
          created_at: string
          created_by: string | null
          description: string | null
          enabled: boolean
          id: string
          last_run_at: string | null
          name: string
          run_count: number
          trigger_event: string
          updated_at: string
        }
        Insert: {
          actions?: Json
          conditions?: Json
          created_at?: string
          created_by?: string | null
          description?: string | null
          enabled?: boolean
          id?: string
          last_run_at?: string | null
          name: string
          run_count?: number
          trigger_event: string
          updated_at?: string
        }
        Update: {
          actions?: Json
          conditions?: Json
          created_at?: string
          created_by?: string | null
          description?: string | null
          enabled?: boolean
          id?: string
          last_run_at?: string | null
          name?: string
          run_count?: number
          trigger_event?: string
          updated_at?: string
        }
        Relationships: []
      }
      automation_runs: {
        Row: {
          created_at: string
          duration_ms: number | null
          error: string | null
          id: string
          input: Json | null
          output: Json | null
          rule_id: string | null
          status: string
        }
        Insert: {
          created_at?: string
          duration_ms?: number | null
          error?: string | null
          id?: string
          input?: Json | null
          output?: Json | null
          rule_id?: string | null
          status: string
        }
        Update: {
          created_at?: string
          duration_ms?: number | null
          error?: string | null
          id?: string
          input?: Json | null
          output?: Json | null
          rule_id?: string | null
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "automation_runs_rule_id_fkey"
            columns: ["rule_id"]
            isOneToOne: false
            referencedRelation: "automation_rules"
            referencedColumns: ["id"]
          },
        ]
      }
      backup_snapshots: {
        Row: {
          id: string
          stats: Json
          taken_at: string
        }
        Insert: {
          id?: string
          stats?: Json
          taken_at?: string
        }
        Update: {
          id?: string
          stats?: Json
          taken_at?: string
        }
        Relationships: []
      }
      badges: {
        Row: {
          code: string
          created_at: string
          description: string
          icon_emoji: string
          icon_url: string | null
          id: string
          name_ar: string
          points_reward: number
        }
        Insert: {
          code: string
          created_at?: string
          description: string
          icon_emoji: string
          icon_url?: string | null
          id?: string
          name_ar: string
          points_reward: number
        }
        Update: {
          code?: string
          created_at?: string
          description?: string
          icon_emoji?: string
          icon_url?: string | null
          id?: string
          name_ar?: string
          points_reward?: number
        }
        Relationships: []
      }
      bids: {
        Row: {
          amount: number
          auction_id: string
          bidder_id: string
          created_at: string
          deposit_held: number
          id: string
          is_auto_bid: boolean
          max_auto_amount: number | null
          outbid_at: string | null
          sealed: boolean
          status: Database["public"]["Enums"]["bid_status"]
        }
        Insert: {
          amount: number
          auction_id: string
          bidder_id: string
          created_at?: string
          deposit_held?: number
          id?: string
          is_auto_bid?: boolean
          max_auto_amount?: number | null
          outbid_at?: string | null
          sealed?: boolean
          status?: Database["public"]["Enums"]["bid_status"]
        }
        Update: {
          amount?: number
          auction_id?: string
          bidder_id?: string
          created_at?: string
          deposit_held?: number
          id?: string
          is_auto_bid?: boolean
          max_auto_amount?: number | null
          outbid_at?: string | null
          sealed?: boolean
          status?: Database["public"]["Enums"]["bid_status"]
        }
        Relationships: [
          {
            foreignKeyName: "bids_auction_id_fkey"
            columns: ["auction_id"]
            isOneToOne: false
            referencedRelation: "auctions"
            referencedColumns: ["id"]
          },
        ]
      }
      broadcast_campaigns: {
        Row: {
          channel: string
          content: string
          created_at: string
          created_by: string | null
          id: string
          name: string
          scheduled_at: string | null
          segment: Json
          sent_at: string | null
          stats: Json
          status: string
          subject: string | null
          updated_at: string
        }
        Insert: {
          channel: string
          content: string
          created_at?: string
          created_by?: string | null
          id?: string
          name: string
          scheduled_at?: string | null
          segment?: Json
          sent_at?: string | null
          stats?: Json
          status?: string
          subject?: string | null
          updated_at?: string
        }
        Update: {
          channel?: string
          content?: string
          created_at?: string
          created_by?: string | null
          id?: string
          name?: string
          scheduled_at?: string | null
          segment?: Json
          sent_at?: string | null
          stats?: Json
          status?: string
          subject?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      buyer_protection_claims: {
        Row: {
          amount: number
          buyer_id: string
          created_at: string
          currency: string
          evidence_urls: string[] | null
          filed_at: string
          id: string
          project_id: string
          protection_window_days: number
          reason: string
          refund_amount: number | null
          resolution_notes: string | null
          resolved_at: string | null
          reviewed_by: string | null
          seller_id: string
          status: string
          updated_at: string
        }
        Insert: {
          amount: number
          buyer_id: string
          created_at?: string
          currency?: string
          evidence_urls?: string[] | null
          filed_at?: string
          id?: string
          project_id: string
          protection_window_days?: number
          reason: string
          refund_amount?: number | null
          resolution_notes?: string | null
          resolved_at?: string | null
          reviewed_by?: string | null
          seller_id: string
          status?: string
          updated_at?: string
        }
        Update: {
          amount?: number
          buyer_id?: string
          created_at?: string
          currency?: string
          evidence_urls?: string[] | null
          filed_at?: string
          id?: string
          project_id?: string
          protection_window_days?: number
          reason?: string
          refund_amount?: number | null
          resolution_notes?: string | null
          resolved_at?: string | null
          reviewed_by?: string | null
          seller_id?: string
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "buyer_protection_claims_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "buyer_protection_claims_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects_public"
            referencedColumns: ["id"]
          },
        ]
      }
      client_events: {
        Row: {
          created_at: string
          event_type: string
          id: string
          path: string | null
          payload: Json
          session_id: string | null
          source: string
          user_agent: string | null
          user_id: string | null
        }
        Insert: {
          created_at?: string
          event_type: string
          id?: string
          path?: string | null
          payload?: Json
          session_id?: string | null
          source: string
          user_agent?: string | null
          user_id?: string | null
        }
        Update: {
          created_at?: string
          event_type?: string
          id?: string
          path?: string | null
          payload?: Json
          session_id?: string | null
          source?: string
          user_agent?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      cms_banners: {
        Row: {
          created_at: string
          cta_label: string | null
          ends_at: string | null
          id: string
          image_url: string | null
          is_active: boolean
          link_url: string | null
          placement: string
          sort_order: number
          starts_at: string | null
          subtitle: string | null
          title: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          cta_label?: string | null
          ends_at?: string | null
          id?: string
          image_url?: string | null
          is_active?: boolean
          link_url?: string | null
          placement: string
          sort_order?: number
          starts_at?: string | null
          subtitle?: string | null
          title?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          cta_label?: string | null
          ends_at?: string | null
          id?: string
          image_url?: string | null
          is_active?: boolean
          link_url?: string | null
          placement?: string
          sort_order?: number
          starts_at?: string | null
          subtitle?: string | null
          title?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      cms_pages: {
        Row: {
          content: Json
          created_at: string
          id: string
          is_published: boolean
          meta_description: string | null
          slug: string
          title: string
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          content?: Json
          created_at?: string
          id?: string
          is_published?: boolean
          meta_description?: string | null
          slug: string
          title: string
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          content?: Json
          created_at?: string
          id?: string
          is_published?: boolean
          meta_description?: string | null
          slug?: string
          title?: string
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: []
      }
      co_investment_contributions: {
        Row: {
          amount: number
          co_investment_id: string
          contributor_id: string
          created_at: string
          id: string
        }
        Insert: {
          amount: number
          co_investment_id: string
          contributor_id: string
          created_at?: string
          id?: string
        }
        Update: {
          amount?: number
          co_investment_id?: string
          contributor_id?: string
          created_at?: string
          id?: string
        }
        Relationships: [
          {
            foreignKeyName: "co_investment_contributions_co_investment_id_fkey"
            columns: ["co_investment_id"]
            isOneToOne: false
            referencedRelation: "co_investments"
            referencedColumns: ["id"]
          },
        ]
      }
      co_investments: {
        Row: {
          collected_amount: number
          created_at: string
          expires_at: string
          id: string
          min_contribution: number
          organizer_id: string
          project_id: string
          status: string
          target_amount: number
        }
        Insert: {
          collected_amount?: number
          created_at?: string
          expires_at?: string
          id?: string
          min_contribution?: number
          organizer_id: string
          project_id: string
          status?: string
          target_amount: number
        }
        Update: {
          collected_amount?: number
          created_at?: string
          expires_at?: string
          id?: string
          min_contribution?: number
          organizer_id?: string
          project_id?: string
          status?: string
          target_amount?: number
        }
        Relationships: [
          {
            foreignKeyName: "co_investments_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "co_investments_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects_public"
            referencedColumns: ["id"]
          },
        ]
      }
      comment_likes: {
        Row: {
          comment_id: string
          user_id: string
        }
        Insert: {
          comment_id: string
          user_id: string
        }
        Update: {
          comment_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "comment_likes_comment_id_fkey"
            columns: ["comment_id"]
            isOneToOne: false
            referencedRelation: "comments"
            referencedColumns: ["id"]
          },
        ]
      }
      comments: {
        Row: {
          content: string
          created_at: string
          deleted_at: string | null
          id: string
          likes_count: number
          parent_id: string | null
          project_id: string | null
          user_id: string
        }
        Insert: {
          content: string
          created_at?: string
          deleted_at?: string | null
          id?: string
          likes_count?: number
          parent_id?: string | null
          project_id?: string | null
          user_id: string
        }
        Update: {
          content?: string
          created_at?: string
          deleted_at?: string | null
          id?: string
          likes_count?: number
          parent_id?: string | null
          project_id?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "comments_parent_id_fkey"
            columns: ["parent_id"]
            isOneToOne: false
            referencedRelation: "comments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "comments_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "comments_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects_public"
            referencedColumns: ["id"]
          },
        ]
      }
      commission_ledger: {
        Row: {
          amount: number
          created_at: string
          currency: string
          id: string
          payer_id: string | null
          source_id: string | null
          source_type: string
        }
        Insert: {
          amount: number
          created_at?: string
          currency?: string
          id?: string
          payer_id?: string | null
          source_id?: string | null
          source_type: string
        }
        Update: {
          amount?: number
          created_at?: string
          currency?: string
          id?: string
          payer_id?: string | null
          source_id?: string | null
          source_type?: string
        }
        Relationships: []
      }
      community_follows: {
        Row: {
          created_at: string
          followee_id: string
          follower_id: string
        }
        Insert: {
          created_at?: string
          followee_id: string
          follower_id: string
        }
        Update: {
          created_at?: string
          followee_id?: string
          follower_id?: string
        }
        Relationships: []
      }
      community_poll_options: {
        Row: {
          id: string
          label: string
          poll_id: string
          position: number
          votes_count: number
        }
        Insert: {
          id?: string
          label: string
          poll_id: string
          position?: number
          votes_count?: number
        }
        Update: {
          id?: string
          label?: string
          poll_id?: string
          position?: number
          votes_count?: number
        }
        Relationships: [
          {
            foreignKeyName: "community_poll_options_poll_id_fkey"
            columns: ["poll_id"]
            isOneToOne: false
            referencedRelation: "community_polls"
            referencedColumns: ["id"]
          },
        ]
      }
      community_poll_votes: {
        Row: {
          created_at: string
          option_id: string
          poll_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          option_id: string
          poll_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          option_id?: string
          poll_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "community_poll_votes_option_id_fkey"
            columns: ["option_id"]
            isOneToOne: false
            referencedRelation: "community_poll_options"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "community_poll_votes_poll_id_fkey"
            columns: ["poll_id"]
            isOneToOne: false
            referencedRelation: "community_polls"
            referencedColumns: ["id"]
          },
        ]
      }
      community_polls: {
        Row: {
          created_at: string
          expires_at: string | null
          id: string
          multi: boolean
          post_id: string
          question: string
        }
        Insert: {
          created_at?: string
          expires_at?: string | null
          id?: string
          multi?: boolean
          post_id: string
          question: string
        }
        Update: {
          created_at?: string
          expires_at?: string | null
          id?: string
          multi?: boolean
          post_id?: string
          question?: string
        }
        Relationships: [
          {
            foreignKeyName: "community_polls_post_id_fkey"
            columns: ["post_id"]
            isOneToOne: true
            referencedRelation: "community_posts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "community_polls_post_id_fkey"
            columns: ["post_id"]
            isOneToOne: true
            referencedRelation: "community_posts_public"
            referencedColumns: ["id"]
          },
        ]
      }
      community_portals: {
        Row: {
          category: string
          created_at: string
          description: string
          id: string
          package: string
          status: string
          title: string
          updated_at: string
          user_id: string
          votes_count: number
        }
        Insert: {
          category: string
          created_at?: string
          description: string
          id?: string
          package?: string
          status?: string
          title: string
          updated_at?: string
          user_id: string
          votes_count?: number
        }
        Update: {
          category?: string
          created_at?: string
          description?: string
          id?: string
          package?: string
          status?: string
          title?: string
          updated_at?: string
          user_id?: string
          votes_count?: number
        }
        Relationships: []
      }
      community_post_bookmarks: {
        Row: {
          created_at: string
          post_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          post_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          post_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "community_post_bookmarks_post_id_fkey"
            columns: ["post_id"]
            isOneToOne: false
            referencedRelation: "community_posts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "community_post_bookmarks_post_id_fkey"
            columns: ["post_id"]
            isOneToOne: false
            referencedRelation: "community_posts_public"
            referencedColumns: ["id"]
          },
        ]
      }
      community_post_comments: {
        Row: {
          content: string
          created_at: string
          id: string
          likes_count: number
          parent_id: string | null
          post_id: string
          user_id: string
        }
        Insert: {
          content: string
          created_at?: string
          id?: string
          likes_count?: number
          parent_id?: string | null
          post_id: string
          user_id: string
        }
        Update: {
          content?: string
          created_at?: string
          id?: string
          likes_count?: number
          parent_id?: string | null
          post_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "community_post_comments_parent_id_fkey"
            columns: ["parent_id"]
            isOneToOne: false
            referencedRelation: "community_post_comments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "community_post_comments_post_id_fkey"
            columns: ["post_id"]
            isOneToOne: false
            referencedRelation: "community_posts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "community_post_comments_post_id_fkey"
            columns: ["post_id"]
            isOneToOne: false
            referencedRelation: "community_posts_public"
            referencedColumns: ["id"]
          },
        ]
      }
      community_post_likes: {
        Row: {
          created_at: string
          post_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          post_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          post_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "community_post_likes_post_id_fkey"
            columns: ["post_id"]
            isOneToOne: false
            referencedRelation: "community_posts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "community_post_likes_post_id_fkey"
            columns: ["post_id"]
            isOneToOne: false
            referencedRelation: "community_posts_public"
            referencedColumns: ["id"]
          },
        ]
      }
      community_post_reactions: {
        Row: {
          created_at: string
          kind: string
          post_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          kind: string
          post_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          kind?: string
          post_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "community_post_reactions_post_id_fkey"
            columns: ["post_id"]
            isOneToOne: false
            referencedRelation: "community_posts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "community_post_reactions_post_id_fkey"
            columns: ["post_id"]
            isOneToOne: false
            referencedRelation: "community_posts_public"
            referencedColumns: ["id"]
          },
        ]
      }
      community_post_reposts: {
        Row: {
          created_at: string
          id: string
          post_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          post_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          post_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "community_post_reposts_post_id_fkey"
            columns: ["post_id"]
            isOneToOne: false
            referencedRelation: "community_posts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "community_post_reposts_post_id_fkey"
            columns: ["post_id"]
            isOneToOne: false
            referencedRelation: "community_posts_public"
            referencedColumns: ["id"]
          },
        ]
      }
      community_posts: {
        Row: {
          category: string | null
          comments_count: number
          content: string
          created_at: string
          deleted_at: string | null
          display_as_alias: boolean
          hashtags: string[]
          id: string
          likes_count: number
          linked_project_id: string | null
          media_urls: string[] | null
          mentions: string[]
          pinned: boolean
          post_type: string
          quote_content: string | null
          repost_of: string | null
          reposts_count: number
          shares_count: number
          status: string
          title: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          category?: string | null
          comments_count?: number
          content: string
          created_at?: string
          deleted_at?: string | null
          display_as_alias?: boolean
          hashtags?: string[]
          id?: string
          likes_count?: number
          linked_project_id?: string | null
          media_urls?: string[] | null
          mentions?: string[]
          pinned?: boolean
          post_type?: string
          quote_content?: string | null
          repost_of?: string | null
          reposts_count?: number
          shares_count?: number
          status?: string
          title?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          category?: string | null
          comments_count?: number
          content?: string
          created_at?: string
          deleted_at?: string | null
          display_as_alias?: boolean
          hashtags?: string[]
          id?: string
          likes_count?: number
          linked_project_id?: string | null
          media_urls?: string[] | null
          mentions?: string[]
          pinned?: boolean
          post_type?: string
          quote_content?: string | null
          repost_of?: string | null
          reposts_count?: number
          shares_count?: number
          status?: string
          title?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "community_posts_linked_project_id_fkey"
            columns: ["linked_project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "community_posts_linked_project_id_fkey"
            columns: ["linked_project_id"]
            isOneToOne: false
            referencedRelation: "projects_public"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "community_posts_repost_of_fkey"
            columns: ["repost_of"]
            isOneToOne: false
            referencedRelation: "community_posts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "community_posts_repost_of_fkey"
            columns: ["repost_of"]
            isOneToOne: false
            referencedRelation: "community_posts_public"
            referencedColumns: ["id"]
          },
        ]
      }
      conversation_participants: {
        Row: {
          conversation_id: string
          joined_at: string
          user_id: string
        }
        Insert: {
          conversation_id: string
          joined_at?: string
          user_id: string
        }
        Update: {
          conversation_id?: string
          joined_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "conversation_participants_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "conversations"
            referencedColumns: ["id"]
          },
        ]
      }
      conversation_state: {
        Row: {
          archived: boolean
          conversation_id: string
          deleted_at: string | null
          last_read_at: string | null
          muted: boolean
          pinned: boolean
          updated_at: string
          user_id: string
        }
        Insert: {
          archived?: boolean
          conversation_id: string
          deleted_at?: string | null
          last_read_at?: string | null
          muted?: boolean
          pinned?: boolean
          updated_at?: string
          user_id: string
        }
        Update: {
          archived?: boolean
          conversation_id?: string
          deleted_at?: string | null
          last_read_at?: string | null
          muted?: boolean
          pinned?: boolean
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "conversation_state_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "conversations"
            referencedColumns: ["id"]
          },
        ]
      }
      conversations: {
        Row: {
          created_at: string
          id: string
          last_message_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          last_message_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          last_message_at?: string
        }
        Relationships: []
      }
      copy_trading: {
        Row: {
          follower_id: string
          is_active: boolean
          max_amount_per_trade: number
          started_at: string
          stop_loss_pct: number
          total_copied_trades: number
          total_pnl: number
          trader_id: string
        }
        Insert: {
          follower_id: string
          is_active?: boolean
          max_amount_per_trade?: number
          started_at?: string
          stop_loss_pct?: number
          total_copied_trades?: number
          total_pnl?: number
          trader_id: string
        }
        Update: {
          follower_id?: string
          is_active?: boolean
          max_amount_per_trade?: number
          started_at?: string
          stop_loss_pct?: number
          total_copied_trades?: number
          total_pnl?: number
          trader_id?: string
        }
        Relationships: []
      }
      crm_leads: {
        Row: {
          channel: string | null
          consent: boolean
          created_at: string
          email: string | null
          full_name: string | null
          id: string
          metadata: Json
          notes: string | null
          owner_id: string | null
          phone: string | null
          referral_code: string | null
          source: string
          status: string
          updated_at: string
        }
        Insert: {
          channel?: string | null
          consent?: boolean
          created_at?: string
          email?: string | null
          full_name?: string | null
          id?: string
          metadata?: Json
          notes?: string | null
          owner_id?: string | null
          phone?: string | null
          referral_code?: string | null
          source?: string
          status?: string
          updated_at?: string
        }
        Update: {
          channel?: string | null
          consent?: boolean
          created_at?: string
          email?: string | null
          full_name?: string | null
          id?: string
          metadata?: Json
          notes?: string | null
          owner_id?: string | null
          phone?: string | null
          referral_code?: string | null
          source?: string
          status?: string
          updated_at?: string
        }
        Relationships: []
      }
      currency_config: {
        Row: {
          code: string
          country_code: string | null
          created_at: string
          decimal_places: number
          flag_emoji: string | null
          is_active: boolean
          min_deposit_minor: number
          min_transfer_minor: number
          min_withdrawal_minor: number
          name_ar: string
          name_en: string
          rate_refresh_minutes: number
          receive_only: boolean
          symbol: string
          tier: number
          updated_at: string
          withdrawal_fee_flat_minor: number
          withdrawal_fee_pct: number
        }
        Insert: {
          code: string
          country_code?: string | null
          created_at?: string
          decimal_places?: number
          flag_emoji?: string | null
          is_active?: boolean
          min_deposit_minor?: number
          min_transfer_minor?: number
          min_withdrawal_minor?: number
          name_ar: string
          name_en: string
          rate_refresh_minutes?: number
          receive_only?: boolean
          symbol: string
          tier?: number
          updated_at?: string
          withdrawal_fee_flat_minor?: number
          withdrawal_fee_pct?: number
        }
        Update: {
          code?: string
          country_code?: string | null
          created_at?: string
          decimal_places?: number
          flag_emoji?: string | null
          is_active?: boolean
          min_deposit_minor?: number
          min_transfer_minor?: number
          min_withdrawal_minor?: number
          name_ar?: string
          name_en?: string
          rate_refresh_minutes?: number
          receive_only?: boolean
          symbol?: string
          tier?: number
          updated_at?: string
          withdrawal_fee_flat_minor?: number
          withdrawal_fee_pct?: number
        }
        Relationships: []
      }
      currency_pair_config: {
        Row: {
          from_currency: string
          fx_fee_pct: number
          is_enabled: boolean
          spread_pct: number
          to_currency: string
          updated_at: string
        }
        Insert: {
          from_currency: string
          fx_fee_pct?: number
          is_enabled?: boolean
          spread_pct?: number
          to_currency: string
          updated_at?: string
        }
        Update: {
          from_currency?: string
          fx_fee_pct?: number
          is_enabled?: boolean
          spread_pct?: number
          to_currency?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "currency_pair_config_from_currency_fkey"
            columns: ["from_currency"]
            isOneToOne: false
            referencedRelation: "currency_config"
            referencedColumns: ["code"]
          },
          {
            foreignKeyName: "currency_pair_config_to_currency_fkey"
            columns: ["to_currency"]
            isOneToOne: false
            referencedRelation: "currency_config"
            referencedColumns: ["code"]
          },
        ]
      }
      deposit_requests: {
        Row: {
          amount_minor: number
          confirmed_at: string | null
          confirmed_by: string | null
          created_at: string
          currency: string
          expires_at: string
          gateway_intent_id: string | null
          gateway_provider: string | null
          id: string
          method: string
          reference_code: string
          rejection_reason: string | null
          sender_iban_masked: string | null
          status: string
          wallet_user_id: string
        }
        Insert: {
          amount_minor: number
          confirmed_at?: string | null
          confirmed_by?: string | null
          created_at?: string
          currency?: string
          expires_at?: string
          gateway_intent_id?: string | null
          gateway_provider?: string | null
          id?: string
          method?: string
          reference_code: string
          rejection_reason?: string | null
          sender_iban_masked?: string | null
          status?: string
          wallet_user_id: string
        }
        Update: {
          amount_minor?: number
          confirmed_at?: string | null
          confirmed_by?: string | null
          created_at?: string
          currency?: string
          expires_at?: string
          gateway_intent_id?: string | null
          gateway_provider?: string | null
          id?: string
          method?: string
          reference_code?: string
          rejection_reason?: string | null
          sender_iban_masked?: string | null
          status?: string
          wallet_user_id?: string
        }
        Relationships: []
      }
      developer_webhooks: {
        Row: {
          created_at: string
          enabled: boolean
          events: string[]
          id: string
          secret: string
          url: string
          user_id: string
        }
        Insert: {
          created_at?: string
          enabled?: boolean
          events?: string[]
          id?: string
          secret: string
          url: string
          user_id: string
        }
        Update: {
          created_at?: string
          enabled?: boolean
          events?: string[]
          id?: string
          secret?: string
          url?: string
          user_id?: string
        }
        Relationships: []
      }
      digital_contracts: {
        Row: {
          amount: number | null
          contract_type: string
          created_at: string
          created_by: string
          currency: string | null
          id: string
          parties: Json
          pdf_url: string | null
          project_id: string | null
          signature_a_url: string | null
          signature_b_url: string | null
          signed_by_a_at: string | null
          signed_by_b_at: string | null
          status: string
          terms: Json
          updated_at: string
        }
        Insert: {
          amount?: number | null
          contract_type: string
          created_at?: string
          created_by: string
          currency?: string | null
          id?: string
          parties: Json
          pdf_url?: string | null
          project_id?: string | null
          signature_a_url?: string | null
          signature_b_url?: string | null
          signed_by_a_at?: string | null
          signed_by_b_at?: string | null
          status?: string
          terms?: Json
          updated_at?: string
        }
        Update: {
          amount?: number | null
          contract_type?: string
          created_at?: string
          created_by?: string
          currency?: string | null
          id?: string
          parties?: Json
          pdf_url?: string | null
          project_id?: string | null
          signature_a_url?: string | null
          signature_b_url?: string | null
          signed_by_a_at?: string | null
          signed_by_b_at?: string | null
          status?: string
          terms?: Json
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "digital_contracts_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "digital_contracts_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects_public"
            referencedColumns: ["id"]
          },
        ]
      }
      digital_twins: {
        Row: {
          created_at: string
          holdings: Json
          last_lesson: string | null
          performance_pct: number
          strategy: string
          updated_at: string
          user_id: string
          virtual_balance: number
        }
        Insert: {
          created_at?: string
          holdings?: Json
          last_lesson?: string | null
          performance_pct?: number
          strategy?: string
          updated_at?: string
          user_id: string
          virtual_balance?: number
        }
        Update: {
          created_at?: string
          holdings?: Json
          last_lesson?: string | null
          performance_pct?: number
          strategy?: string
          updated_at?: string
          user_id?: string
          virtual_balance?: number
        }
        Relationships: []
      }
      disputes: {
        Row: {
          amount_claimed: number | null
          claimant_id: string
          created_at: string
          fee_amount: number
          fee_currency: string
          fee_paid: boolean
          id: string
          lawyer_country: string | null
          lawyer_name: string | null
          project_id: string
          reason: string
          resolution: string | null
          status: Database["public"]["Enums"]["dispute_status"]
          updated_at: string
        }
        Insert: {
          amount_claimed?: number | null
          claimant_id: string
          created_at?: string
          fee_amount?: number
          fee_currency?: string
          fee_paid?: boolean
          id?: string
          lawyer_country?: string | null
          lawyer_name?: string | null
          project_id: string
          reason: string
          resolution?: string | null
          status?: Database["public"]["Enums"]["dispute_status"]
          updated_at?: string
        }
        Update: {
          amount_claimed?: number | null
          claimant_id?: string
          created_at?: string
          fee_amount?: number
          fee_currency?: string
          fee_paid?: boolean
          id?: string
          lawyer_country?: string | null
          lawyer_name?: string | null
          project_id?: string
          reason?: string
          resolution?: string | null
          status?: Database["public"]["Enums"]["dispute_status"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "disputes_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "disputes_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects_public"
            referencedColumns: ["id"]
          },
        ]
      }
      distribution_log: {
        Row: {
          article_id: string
          channel: string
          error: string | null
          id: string
          post_url: string | null
          sent_at: string
          status: string
        }
        Insert: {
          article_id: string
          channel: string
          error?: string | null
          id?: string
          post_url?: string | null
          sent_at?: string
          status?: string
        }
        Update: {
          article_id?: string
          channel?: string
          error?: string | null
          id?: string
          post_url?: string | null
          sent_at?: string
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "distribution_log_article_id_fkey"
            columns: ["article_id"]
            isOneToOne: false
            referencedRelation: "articles"
            referencedColumns: ["id"]
          },
        ]
      }
      email_send_log: {
        Row: {
          created_at: string
          error_message: string | null
          id: string
          message_id: string | null
          metadata: Json | null
          recipient_email: string
          status: string
          template_name: string
        }
        Insert: {
          created_at?: string
          error_message?: string | null
          id?: string
          message_id?: string | null
          metadata?: Json | null
          recipient_email: string
          status: string
          template_name: string
        }
        Update: {
          created_at?: string
          error_message?: string | null
          id?: string
          message_id?: string | null
          metadata?: Json | null
          recipient_email?: string
          status?: string
          template_name?: string
        }
        Relationships: []
      }
      email_send_state: {
        Row: {
          auth_email_ttl_minutes: number
          batch_size: number
          id: number
          retry_after_until: string | null
          send_delay_ms: number
          transactional_email_ttl_minutes: number
          updated_at: string
        }
        Insert: {
          auth_email_ttl_minutes?: number
          batch_size?: number
          id?: number
          retry_after_until?: string | null
          send_delay_ms?: number
          transactional_email_ttl_minutes?: number
          updated_at?: string
        }
        Update: {
          auth_email_ttl_minutes?: number
          batch_size?: number
          id?: number
          retry_after_until?: string | null
          send_delay_ms?: number
          transactional_email_ttl_minutes?: number
          updated_at?: string
        }
        Relationships: []
      }
      email_unsubscribe_tokens: {
        Row: {
          created_at: string
          email: string
          id: string
          token: string
          used_at: string | null
        }
        Insert: {
          created_at?: string
          email: string
          id?: string
          token: string
          used_at?: string | null
        }
        Update: {
          created_at?: string
          email?: string
          id?: string
          token?: string
          used_at?: string | null
        }
        Relationships: []
      }
      emi_partner_events: {
        Row: {
          error: string | null
          event_id: string
          event_type: string
          id: string
          payload: Json
          processed: boolean
          processed_at: string | null
          provider: string
          received_at: string
          signature: string | null
          source_ip: string | null
        }
        Insert: {
          error?: string | null
          event_id: string
          event_type: string
          id?: string
          payload: Json
          processed?: boolean
          processed_at?: string | null
          provider: string
          received_at?: string
          signature?: string | null
          source_ip?: string | null
        }
        Update: {
          error?: string | null
          event_id?: string
          event_type?: string
          id?: string
          payload?: Json
          processed?: boolean
          processed_at?: string | null
          provider?: string
          received_at?: string
          signature?: string | null
          source_ip?: string | null
        }
        Relationships: []
      }
      escrow_accounts: {
        Row: {
          amount: number
          buyer_id: string
          conditions: Json
          created_at: string
          currency: string
          id: string
          notes: string | null
          project_id: string
          refunded_at: string | null
          release_at: string | null
          released_at: string | null
          released_by: string | null
          seller_id: string
          status: string
          updated_at: string
        }
        Insert: {
          amount: number
          buyer_id: string
          conditions?: Json
          created_at?: string
          currency?: string
          id?: string
          notes?: string | null
          project_id: string
          refunded_at?: string | null
          release_at?: string | null
          released_at?: string | null
          released_by?: string | null
          seller_id: string
          status?: string
          updated_at?: string
        }
        Update: {
          amount?: number
          buyer_id?: string
          conditions?: Json
          created_at?: string
          currency?: string
          id?: string
          notes?: string | null
          project_id?: string
          refunded_at?: string | null
          release_at?: string | null
          released_at?: string | null
          released_by?: string | null
          seller_id?: string
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "escrow_accounts_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "escrow_accounts_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects_public"
            referencedColumns: ["id"]
          },
        ]
      }
      escrow_holds: {
        Row: {
          amount_sar: number
          client_id: string
          created_at: string
          held_at: string
          id: string
          net_provider_sar: number
          order_id: string
          platform_fee_sar: number
          provider_user_id: string
          refund_txn_id: string | null
          refunded_at: string | null
          release_txn_id: string | null
          released_at: string | null
          status: string
          updated_at: string
        }
        Insert: {
          amount_sar: number
          client_id: string
          created_at?: string
          held_at?: string
          id?: string
          net_provider_sar: number
          order_id: string
          platform_fee_sar?: number
          provider_user_id: string
          refund_txn_id?: string | null
          refunded_at?: string | null
          release_txn_id?: string | null
          released_at?: string | null
          status?: string
          updated_at?: string
        }
        Update: {
          amount_sar?: number
          client_id?: string
          created_at?: string
          held_at?: string
          id?: string
          net_provider_sar?: number
          order_id?: string
          platform_fee_sar?: number
          provider_user_id?: string
          refund_txn_id?: string | null
          refunded_at?: string | null
          release_txn_id?: string | null
          released_at?: string | null
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "escrow_holds_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: true
            referencedRelation: "service_orders"
            referencedColumns: ["id"]
          },
        ]
      }
      exchange_rates_live: {
        Row: {
          buy_rate: number
          expires_at: string | null
          fetched_at: string
          from_currency: string
          id: number
          mid_rate: number
          sell_rate: number
          source: string
          to_currency: string
        }
        Insert: {
          buy_rate: number
          expires_at?: string | null
          fetched_at?: string
          from_currency: string
          id?: number
          mid_rate: number
          sell_rate: number
          source?: string
          to_currency: string
        }
        Update: {
          buy_rate?: number
          expires_at?: string | null
          fetched_at?: string
          from_currency?: string
          id?: number
          mid_rate?: number
          sell_rate?: number
          source?: string
          to_currency?: string
        }
        Relationships: []
      }
      fatora_logs: {
        Row: {
          amount: number | null
          created_at: string
          currency: string | null
          error_message: string | null
          http_status: number | null
          id: string
          ip_address: string | null
          kind: string
          order_id: string | null
          request_payload: Json | null
          response_payload: Json | null
          signature_valid: boolean | null
          status: string | null
          trace_id: string
          transaction_id: string | null
          user_id: string | null
        }
        Insert: {
          amount?: number | null
          created_at?: string
          currency?: string | null
          error_message?: string | null
          http_status?: number | null
          id?: string
          ip_address?: string | null
          kind: string
          order_id?: string | null
          request_payload?: Json | null
          response_payload?: Json | null
          signature_valid?: boolean | null
          status?: string | null
          trace_id?: string
          transaction_id?: string | null
          user_id?: string | null
        }
        Update: {
          amount?: number | null
          created_at?: string
          currency?: string | null
          error_message?: string | null
          http_status?: number | null
          id?: string
          ip_address?: string | null
          kind?: string
          order_id?: string | null
          request_payload?: Json | null
          response_payload?: Json | null
          signature_valid?: boolean | null
          status?: string | null
          trace_id?: string
          transaction_id?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      feature_flags: {
        Row: {
          audience: Json
          description: string | null
          enabled: boolean
          key: string
          rollout_percent: number
          updated_at: string
        }
        Insert: {
          audience?: Json
          description?: string | null
          enabled?: boolean
          key: string
          rollout_percent?: number
          updated_at?: string
        }
        Update: {
          audience?: Json
          description?: string | null
          enabled?: boolean
          key?: string
          rollout_percent?: number
          updated_at?: string
        }
        Relationships: []
      }
      future_lab_history: {
        Row: {
          created_at: string
          id: string
          payload: Json
          summary: string | null
          title: string
          tool: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          payload?: Json
          summary?: string | null
          title: string
          tool: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          payload?: Json
          summary?: string | null
          title?: string
          tool?: string
          user_id?: string
        }
        Relationships: []
      }
      fx_rate_locks: {
        Row: {
          consumed_at: string | null
          created_at: string
          expires_at: string
          fee_minor: number
          from_amount_minor: number
          from_currency: string
          id: string
          locked_rate: number
          to_amount_minor: number
          to_currency: string
          user_id: string
        }
        Insert: {
          consumed_at?: string | null
          created_at?: string
          expires_at: string
          fee_minor?: number
          from_amount_minor: number
          from_currency: string
          id?: string
          locked_rate: number
          to_amount_minor: number
          to_currency: string
          user_id: string
        }
        Update: {
          consumed_at?: string | null
          created_at?: string
          expires_at?: string
          fee_minor?: number
          from_amount_minor?: number
          from_currency?: string
          id?: string
          locked_rate?: number
          to_amount_minor?: number
          to_currency?: string
          user_id?: string
        }
        Relationships: []
      }
      fx_rates: {
        Row: {
          base_currency: string
          fetched_at: string
          id: string
          quote_currency: string
          rate: number
        }
        Insert: {
          base_currency?: string
          fetched_at?: string
          id?: string
          quote_currency: string
          rate: number
        }
        Update: {
          base_currency?: string
          fetched_at?: string
          id?: string
          quote_currency?: string
          rate?: number
        }
        Relationships: []
      }
      fx_reconciliation_log: {
        Row: {
          currency: string
          discrepancy_minor: number | null
          id: number
          notes: string | null
          partner_balance_minor: number | null
          run_at: string
          status: string
          sum_user_balances_minor: number
        }
        Insert: {
          currency: string
          discrepancy_minor?: number | null
          id?: number
          notes?: string | null
          partner_balance_minor?: number | null
          run_at?: string
          status?: string
          sum_user_balances_minor: number
        }
        Update: {
          currency?: string
          discrepancy_minor?: number | null
          id?: number
          notes?: string | null
          partner_balance_minor?: number | null
          run_at?: string
          status?: string
          sum_user_balances_minor?: number
        }
        Relationships: []
      }
      fx_transactions: {
        Row: {
          counterparty_id: string | null
          executed_at: string
          fee_charged_minor: number
          from_amount_minor: number
          from_currency: string
          id: string
          kind: string
          rate_applied: number
          reference: string | null
          spread_earned_minor: number
          to_amount_minor: number
          to_currency: string
          user_id: string
        }
        Insert: {
          counterparty_id?: string | null
          executed_at?: string
          fee_charged_minor?: number
          from_amount_minor: number
          from_currency: string
          id?: string
          kind: string
          rate_applied: number
          reference?: string | null
          spread_earned_minor?: number
          to_amount_minor: number
          to_currency: string
          user_id: string
        }
        Update: {
          counterparty_id?: string | null
          executed_at?: string
          fee_charged_minor?: number
          from_amount_minor?: number
          from_currency?: string
          id?: string
          kind?: string
          rate_applied?: number
          reference?: string | null
          spread_earned_minor?: number
          to_amount_minor?: number
          to_currency?: string
          user_id?: string
        }
        Relationships: []
      }
      geo_intelligence: {
        Row: {
          asn: string | null
          city: string | null
          country: string | null
          ip: unknown
          is_proxy: boolean | null
          is_tor: boolean | null
          last_seen: string
          risk_score: number | null
        }
        Insert: {
          asn?: string | null
          city?: string | null
          country?: string | null
          ip: unknown
          is_proxy?: boolean | null
          is_tor?: boolean | null
          last_seen?: string
          risk_score?: number | null
        }
        Update: {
          asn?: string | null
          city?: string | null
          country?: string | null
          ip?: unknown
          is_proxy?: boolean | null
          is_tor?: boolean | null
          last_seen?: string
          risk_score?: number | null
        }
        Relationships: []
      }
      idempotency_keys: {
        Row: {
          created_at: string
          endpoint: string
          expires_at: string
          key: string
          response: Json | null
          status_code: number | null
          user_id: string | null
        }
        Insert: {
          created_at?: string
          endpoint: string
          expires_at?: string
          key: string
          response?: Json | null
          status_code?: number | null
          user_id?: string | null
        }
        Update: {
          created_at?: string
          endpoint?: string
          expires_at?: string
          key?: string
          response?: Json | null
          status_code?: number | null
          user_id?: string | null
        }
        Relationships: []
      }
      indexing_log: {
        Row: {
          article_id: string
          article_url: string
          confirmed_at: string | null
          engine: string
          id: string
          response_body: string | null
          response_code: number | null
          sent_at: string
          status: string
        }
        Insert: {
          article_id: string
          article_url: string
          confirmed_at?: string | null
          engine: string
          id?: string
          response_body?: string | null
          response_code?: number | null
          sent_at?: string
          status?: string
        }
        Update: {
          article_id?: string
          article_url?: string
          confirmed_at?: string | null
          engine?: string
          id?: string
          response_body?: string | null
          response_code?: number | null
          sent_at?: string
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "indexing_log_article_id_fkey"
            columns: ["article_id"]
            isOneToOne: false
            referencedRelation: "articles"
            referencedColumns: ["id"]
          },
        ]
      }
      integration_configs: {
        Row: {
          category: string
          config: Json | null
          enabled: boolean | null
          id: string
          last_test_message: string | null
          last_test_ok: boolean | null
          last_tested_at: string | null
          name_ar: string
          updated_at: string | null
          updated_by: string | null
        }
        Insert: {
          category: string
          config?: Json | null
          enabled?: boolean | null
          id: string
          last_test_message?: string | null
          last_test_ok?: boolean | null
          last_tested_at?: string | null
          name_ar: string
          updated_at?: string | null
          updated_by?: string | null
        }
        Update: {
          category?: string
          config?: Json | null
          enabled?: boolean | null
          id?: string
          last_test_message?: string | null
          last_test_ok?: boolean | null
          last_tested_at?: string | null
          name_ar?: string
          updated_at?: string | null
          updated_by?: string | null
        }
        Relationships: []
      }
      integration_logs: {
        Row: {
          action: string
          created_at: string
          error: string | null
          id: string
          payload: Json | null
          provider: string
          recipient: string | null
          response: Json | null
          status: string
          triggered_by: string | null
        }
        Insert: {
          action: string
          created_at?: string
          error?: string | null
          id?: string
          payload?: Json | null
          provider: string
          recipient?: string | null
          response?: Json | null
          status: string
          triggered_by?: string | null
        }
        Update: {
          action?: string
          created_at?: string
          error?: string | null
          id?: string
          payload?: Json | null
          provider?: string
          recipient?: string | null
          response?: Json | null
          status?: string
          triggered_by?: string | null
        }
        Relationships: []
      }
      integration_settings: {
        Row: {
          category: string
          config: Json
          created_at: string
          display_name: string
          enabled: boolean
          id: string
          last_test_at: string | null
          last_test_error: string | null
          last_test_status: string | null
          provider: string
          updated_at: string
        }
        Insert: {
          category: string
          config?: Json
          created_at?: string
          display_name: string
          enabled?: boolean
          id?: string
          last_test_at?: string | null
          last_test_error?: string | null
          last_test_status?: string | null
          provider: string
          updated_at?: string
        }
        Update: {
          category?: string
          config?: Json
          created_at?: string
          display_name?: string
          enabled?: boolean
          id?: string
          last_test_at?: string | null
          last_test_error?: string | null
          last_test_status?: string | null
          provider?: string
          updated_at?: string
        }
        Relationships: []
      }
      investment_offer_messages: {
        Row: {
          body: string
          created_at: string
          id: string
          offer_id: string
          sender_id: string
        }
        Insert: {
          body: string
          created_at?: string
          id?: string
          offer_id: string
          sender_id: string
        }
        Update: {
          body?: string
          created_at?: string
          id?: string
          offer_id?: string
          sender_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "investment_offer_messages_offer_id_fkey"
            columns: ["offer_id"]
            isOneToOne: false
            referencedRelation: "investment_offers"
            referencedColumns: ["id"]
          },
        ]
      }
      investment_offers: {
        Row: {
          amount: number
          created_at: string
          currency: string
          id: string
          investor_id: string
          is_partnership_request: boolean
          message: string | null
          owner_id: string
          parent_offer_id: string | null
          price_per_share: number
          project_id: string
          responded_at: string | null
          response_note: string | null
          shares: number
          status: Database["public"]["Enums"]["offer_status"]
          updated_at: string
        }
        Insert: {
          amount: number
          created_at?: string
          currency?: string
          id?: string
          investor_id: string
          is_partnership_request?: boolean
          message?: string | null
          owner_id: string
          parent_offer_id?: string | null
          price_per_share: number
          project_id: string
          responded_at?: string | null
          response_note?: string | null
          shares: number
          status?: Database["public"]["Enums"]["offer_status"]
          updated_at?: string
        }
        Update: {
          amount?: number
          created_at?: string
          currency?: string
          id?: string
          investor_id?: string
          is_partnership_request?: boolean
          message?: string | null
          owner_id?: string
          parent_offer_id?: string | null
          price_per_share?: number
          project_id?: string
          responded_at?: string | null
          response_note?: string | null
          shares?: number
          status?: Database["public"]["Enums"]["offer_status"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "investment_offers_parent_offer_id_fkey"
            columns: ["parent_offer_id"]
            isOneToOne: false
            referencedRelation: "investment_offers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "investment_offers_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "investment_offers_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects_public"
            referencedColumns: ["id"]
          },
        ]
      }
      invoices: {
        Row: {
          amount: number
          created_at: string
          currency: string
          id: string
          invoice_number: string
          issued_at: string
          metadata: Json | null
          order_id: string | null
          payment_intent_id: string | null
          provider: string | null
          purpose: string | null
          status: string
          transaction_id: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          amount: number
          created_at?: string
          currency?: string
          id?: string
          invoice_number: string
          issued_at?: string
          metadata?: Json | null
          order_id?: string | null
          payment_intent_id?: string | null
          provider?: string | null
          purpose?: string | null
          status?: string
          transaction_id?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          amount?: number
          created_at?: string
          currency?: string
          id?: string
          invoice_number?: string
          issued_at?: string
          metadata?: Json | null
          order_id?: string | null
          payment_intent_id?: string | null
          provider?: string | null
          purpose?: string | null
          status?: string
          transaction_id?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "invoices_payment_intent_id_fkey"
            columns: ["payment_intent_id"]
            isOneToOne: false
            referencedRelation: "payment_intents"
            referencedColumns: ["id"]
          },
        ]
      }
      ip_blocklist: {
        Row: {
          blocked_by: string | null
          blocked_until: string | null
          created_at: string
          id: string
          ip: string
          reason: string | null
        }
        Insert: {
          blocked_by?: string | null
          blocked_until?: string | null
          created_at?: string
          id?: string
          ip: string
          reason?: string | null
        }
        Update: {
          blocked_by?: string | null
          blocked_until?: string | null
          created_at?: string
          id?: string
          ip?: string
          reason?: string | null
        }
        Relationships: []
      }
      job_queue: {
        Row: {
          attempts: number
          completed_at: string | null
          created_at: string
          error: string | null
          id: number
          job_type: string
          max_attempts: number
          payload: Json
          scheduled_for: string
          started_at: string | null
          status: string
        }
        Insert: {
          attempts?: number
          completed_at?: string | null
          created_at?: string
          error?: string | null
          id?: number
          job_type: string
          max_attempts?: number
          payload?: Json
          scheduled_for?: string
          started_at?: string | null
          status?: string
        }
        Update: {
          attempts?: number
          completed_at?: string | null
          created_at?: string
          error?: string | null
          id?: number
          job_type?: string
          max_attempts?: number
          payload?: Json
          scheduled_for?: string
          started_at?: string | null
          status?: string
        }
        Relationships: []
      }
      keyword_queue: {
        Row: {
          article_id: string | null
          article_type: string
          attempts: number
          created_at: string
          id: string
          keyword: string
          last_error: string | null
          last_used_at: string | null
          priority: number
          scheduled_for: string | null
          status: string
        }
        Insert: {
          article_id?: string | null
          article_type?: string
          attempts?: number
          created_at?: string
          id?: string
          keyword: string
          last_error?: string | null
          last_used_at?: string | null
          priority?: number
          scheduled_for?: string | null
          status?: string
        }
        Update: {
          article_id?: string | null
          article_type?: string
          attempts?: number
          created_at?: string
          id?: string
          keyword?: string
          last_error?: string | null
          last_used_at?: string | null
          priority?: number
          scheduled_for?: string | null
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "keyword_queue_article_id_fkey"
            columns: ["article_id"]
            isOneToOne: false
            referencedRelation: "articles"
            referencedColumns: ["id"]
          },
        ]
      }
      kyc_verifications: {
        Row: {
          ai_decision: string | null
          ai_reasoning: string | null
          ai_score: number | null
          aml_status: string | null
          arbitration_accepted: boolean
          authenticity_score: number | null
          country_code: string | null
          created_at: string
          document_back_url: string | null
          document_expiry: string | null
          document_meta: Json | null
          document_type: string | null
          document_url: string
          document_url_enc: string | null
          extracted_dob: string | null
          extracted_id_number: string | null
          extracted_name: string | null
          extracted_nationality: string | null
          face_match_score: number | null
          id: string
          liveness_challenge: Json | null
          liveness_score: number | null
          national_id_enc: string | null
          pledge_accepted: boolean
          pledge_full_name: string | null
          pledge_signature_url: string | null
          pledge_signed_at: string | null
          pledge_text_version: string | null
          rejection_reason: string | null
          reviewed_at: string | null
          selfie_url: string | null
          status: string
          updated_at: string
          user_id: string
        }
        Insert: {
          ai_decision?: string | null
          ai_reasoning?: string | null
          ai_score?: number | null
          aml_status?: string | null
          arbitration_accepted?: boolean
          authenticity_score?: number | null
          country_code?: string | null
          created_at?: string
          document_back_url?: string | null
          document_expiry?: string | null
          document_meta?: Json | null
          document_type?: string | null
          document_url: string
          document_url_enc?: string | null
          extracted_dob?: string | null
          extracted_id_number?: string | null
          extracted_name?: string | null
          extracted_nationality?: string | null
          face_match_score?: number | null
          id?: string
          liveness_challenge?: Json | null
          liveness_score?: number | null
          national_id_enc?: string | null
          pledge_accepted?: boolean
          pledge_full_name?: string | null
          pledge_signature_url?: string | null
          pledge_signed_at?: string | null
          pledge_text_version?: string | null
          rejection_reason?: string | null
          reviewed_at?: string | null
          selfie_url?: string | null
          status?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          ai_decision?: string | null
          ai_reasoning?: string | null
          ai_score?: number | null
          aml_status?: string | null
          arbitration_accepted?: boolean
          authenticity_score?: number | null
          country_code?: string | null
          created_at?: string
          document_back_url?: string | null
          document_expiry?: string | null
          document_meta?: Json | null
          document_type?: string | null
          document_url?: string
          document_url_enc?: string | null
          extracted_dob?: string | null
          extracted_id_number?: string | null
          extracted_name?: string | null
          extracted_nationality?: string | null
          face_match_score?: number | null
          id?: string
          liveness_challenge?: Json | null
          liveness_score?: number | null
          national_id_enc?: string | null
          pledge_accepted?: boolean
          pledge_full_name?: string | null
          pledge_signature_url?: string | null
          pledge_signed_at?: string | null
          pledge_text_version?: string | null
          rejection_reason?: string | null
          reviewed_at?: string | null
          selfie_url?: string | null
          status?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      ledger: {
        Row: {
          amount: number
          balance_after: number
          balance_before: number
          counterparty_id: string | null
          created_at: string
          current_hash: string | null
          id: string
          metadata: Json | null
          prev_hash: string | null
          reference: string | null
          status: string
          type: string
          user_id: string
        }
        Insert: {
          amount: number
          balance_after?: number
          balance_before?: number
          counterparty_id?: string | null
          created_at?: string
          current_hash?: string | null
          id?: string
          metadata?: Json | null
          prev_hash?: string | null
          reference?: string | null
          status?: string
          type: string
          user_id: string
        }
        Update: {
          amount?: number
          balance_after?: number
          balance_before?: number
          counterparty_id?: string | null
          created_at?: string
          current_hash?: string | null
          id?: string
          metadata?: Json | null
          prev_hash?: string | null
          reference?: string | null
          status?: string
          type?: string
          user_id?: string
        }
        Relationships: []
      }
      market_audit_trail: {
        Row: {
          action: string
          actor_id: string | null
          created_at: string
          entity_id: string | null
          entity_type: string
          id: number
          ip: unknown
          metadata: Json
          user_agent: string | null
        }
        Insert: {
          action: string
          actor_id?: string | null
          created_at?: string
          entity_id?: string | null
          entity_type: string
          id?: number
          ip?: unknown
          metadata?: Json
          user_agent?: string | null
        }
        Update: {
          action?: string
          actor_id?: string | null
          created_at?: string
          entity_id?: string | null
          entity_type?: string
          id?: number
          ip?: unknown
          metadata?: Json
          user_agent?: string | null
        }
        Relationships: []
      }
      market_rate_limits: {
        Row: {
          bucket_start: string
          count: number
          id: number
          key: string
        }
        Insert: {
          bucket_start: string
          count?: number
          id?: number
          key: string
        }
        Update: {
          bucket_start?: string
          count?: number
          id?: number
          key?: string
        }
        Relationships: []
      }
      membership_plans: {
        Row: {
          active: boolean
          ai_advanced: boolean
          comments_cap: number
          created_at: string
          dedicated_manager: boolean
          likes_cap: number
          name_ar: string
          name_en: string
          other_cap: number
          price_sar: number
          priority_support: boolean
          projects_cap: number
          sort_order: number
          tier: string
          updated_at: string
          verified_badge: boolean
        }
        Insert: {
          active?: boolean
          ai_advanced?: boolean
          comments_cap?: number
          created_at?: string
          dedicated_manager?: boolean
          likes_cap?: number
          name_ar: string
          name_en: string
          other_cap?: number
          price_sar?: number
          priority_support?: boolean
          projects_cap?: number
          sort_order?: number
          tier: string
          updated_at?: string
          verified_badge?: boolean
        }
        Update: {
          active?: boolean
          ai_advanced?: boolean
          comments_cap?: number
          created_at?: string
          dedicated_manager?: boolean
          likes_cap?: number
          name_ar?: string
          name_en?: string
          other_cap?: number
          price_sar?: number
          priority_support?: boolean
          projects_cap?: number
          sort_order?: number
          tier?: string
          updated_at?: string
          verified_badge?: boolean
        }
        Relationships: []
      }
      membership_usage: {
        Row: {
          comments_given: number
          created_at: string
          id: string
          likes_given: number
          other_interactions: number
          period: string
          projects_created: number
          updated_at: string
          user_id: string
        }
        Insert: {
          comments_given?: number
          created_at?: string
          id?: string
          likes_given?: number
          other_interactions?: number
          period: string
          projects_created?: number
          updated_at?: string
          user_id: string
        }
        Update: {
          comments_given?: number
          created_at?: string
          id?: string
          likes_given?: number
          other_interactions?: number
          period?: string
          projects_created?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      mena_currencies: {
        Row: {
          code: string
          country_ar: string
          country_code: string
          country_en: string
          decimals: number | null
          flag_emoji: string | null
          is_active: boolean | null
          name_ar: string
          name_en: string
          sort_order: number | null
          symbol: string
          symbol_new: string | null
        }
        Insert: {
          code: string
          country_ar: string
          country_code: string
          country_en: string
          decimals?: number | null
          flag_emoji?: string | null
          is_active?: boolean | null
          name_ar: string
          name_en: string
          sort_order?: number | null
          symbol: string
          symbol_new?: string | null
        }
        Update: {
          code?: string
          country_ar?: string
          country_code?: string
          country_en?: string
          decimals?: number | null
          flag_emoji?: string | null
          is_active?: boolean | null
          name_ar?: string
          name_en?: string
          sort_order?: number | null
          symbol?: string
          symbol_new?: string | null
        }
        Relationships: []
      }
      message_reports: {
        Row: {
          conversation_id: string
          created_at: string
          id: string
          notes: string | null
          reason: Database["public"]["Enums"]["message_report_reason"]
          reported_user_id: string
          reporter_id: string
          resolved_at: string | null
          resolved_by: string | null
          status: Database["public"]["Enums"]["message_report_status"]
        }
        Insert: {
          conversation_id: string
          created_at?: string
          id?: string
          notes?: string | null
          reason: Database["public"]["Enums"]["message_report_reason"]
          reported_user_id: string
          reporter_id: string
          resolved_at?: string | null
          resolved_by?: string | null
          status?: Database["public"]["Enums"]["message_report_status"]
        }
        Update: {
          conversation_id?: string
          created_at?: string
          id?: string
          notes?: string | null
          reason?: Database["public"]["Enums"]["message_report_reason"]
          reported_user_id?: string
          reporter_id?: string
          resolved_at?: string | null
          resolved_by?: string | null
          status?: Database["public"]["Enums"]["message_report_status"]
        }
        Relationships: [
          {
            foreignKeyName: "message_reports_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "conversations"
            referencedColumns: ["id"]
          },
        ]
      }
      messages: {
        Row: {
          attachment_type: string | null
          attachment_url: string | null
          content: string
          conversation_id: string
          created_at: string
          id: string
          read_at: string | null
          sender_id: string
        }
        Insert: {
          attachment_type?: string | null
          attachment_url?: string | null
          content: string
          conversation_id: string
          created_at?: string
          id?: string
          read_at?: string | null
          sender_id: string
        }
        Update: {
          attachment_type?: string | null
          attachment_url?: string | null
          content?: string
          conversation_id?: string
          created_at?: string
          id?: string
          read_at?: string | null
          sender_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "messages_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "conversations"
            referencedColumns: ["id"]
          },
        ]
      }
      messages_archive: {
        Row: {
          content: string
          conversation_id: string
          created_at: string
          id: string
          read_at: string | null
          sender_id: string
        }
        Insert: {
          content: string
          conversation_id: string
          created_at?: string
          id?: string
          read_at?: string | null
          sender_id: string
        }
        Update: {
          content?: string
          conversation_id?: string
          created_at?: string
          id?: string
          read_at?: string | null
          sender_id?: string
        }
        Relationships: []
      }
      negotiations: {
        Row: {
          created_at: string
          current_offer_amount: number
          current_offer_by: string
          expires_at: string
          id: string
          investor_id: string
          last_updated_at: string
          owner_id: string
          project_id: string
          proposed_equity_pct: number | null
          round_number: number
          status: Database["public"]["Enums"]["negotiation_status"]
          terms_text: string | null
        }
        Insert: {
          created_at?: string
          current_offer_amount: number
          current_offer_by: string
          expires_at?: string
          id?: string
          investor_id: string
          last_updated_at?: string
          owner_id: string
          project_id: string
          proposed_equity_pct?: number | null
          round_number?: number
          status?: Database["public"]["Enums"]["negotiation_status"]
          terms_text?: string | null
        }
        Update: {
          created_at?: string
          current_offer_amount?: number
          current_offer_by?: string
          expires_at?: string
          id?: string
          investor_id?: string
          last_updated_at?: string
          owner_id?: string
          project_id?: string
          proposed_equity_pct?: number | null
          round_number?: number
          status?: Database["public"]["Enums"]["negotiation_status"]
          terms_text?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "negotiations_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "negotiations_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects_public"
            referencedColumns: ["id"]
          },
        ]
      }
      news_subscribers: {
        Row: {
          confirm_token: string | null
          confirmed_at: string | null
          created_at: string
          email: string
          id: string
          unsubscribed: boolean
          user_id: string | null
        }
        Insert: {
          confirm_token?: string | null
          confirmed_at?: string | null
          created_at?: string
          email: string
          id?: string
          unsubscribed?: boolean
          user_id?: string | null
        }
        Update: {
          confirm_token?: string | null
          confirmed_at?: string | null
          created_at?: string
          email?: string
          id?: string
          unsubscribed?: boolean
          user_id?: string | null
        }
        Relationships: []
      }
      notification_prefs: {
        Row: {
          dm_enabled: boolean
          email_enabled: boolean
          inapp_enabled: boolean
          journalist_digest: boolean
          updated_at: string
          user_id: string
        }
        Insert: {
          dm_enabled?: boolean
          email_enabled?: boolean
          inapp_enabled?: boolean
          journalist_digest?: boolean
          updated_at?: string
          user_id: string
        }
        Update: {
          dm_enabled?: boolean
          email_enabled?: boolean
          inapp_enabled?: boolean
          journalist_digest?: boolean
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      notifications: {
        Row: {
          body: string | null
          created_at: string
          href: string | null
          id: string
          kind: string
          read_at: string | null
          title: string
          user_id: string
        }
        Insert: {
          body?: string | null
          created_at?: string
          href?: string | null
          id?: string
          kind: string
          read_at?: string | null
          title: string
          user_id: string
        }
        Update: {
          body?: string | null
          created_at?: string
          href?: string | null
          id?: string
          kind?: string
          read_at?: string | null
          title?: string
          user_id?: string
        }
        Relationships: []
      }
      notifications_archive: {
        Row: {
          body: string | null
          created_at: string
          href: string | null
          id: string
          kind: string
          read_at: string | null
          title: string
          user_id: string
        }
        Insert: {
          body?: string | null
          created_at?: string
          href?: string | null
          id?: string
          kind: string
          read_at?: string | null
          title: string
          user_id: string
        }
        Update: {
          body?: string | null
          created_at?: string
          href?: string | null
          id?: string
          kind?: string
          read_at?: string | null
          title?: string
          user_id?: string
        }
        Relationships: []
      }
      offer_history: {
        Row: {
          amount: number
          created_at: string
          equity_pct: number | null
          id: string
          made_by_id: string
          negotiation_id: string
          response: string | null
          terms_text: string | null
        }
        Insert: {
          amount: number
          created_at?: string
          equity_pct?: number | null
          id?: string
          made_by_id: string
          negotiation_id: string
          response?: string | null
          terms_text?: string | null
        }
        Update: {
          amount?: number
          created_at?: string
          equity_pct?: number | null
          id?: string
          made_by_id?: string
          negotiation_id?: string
          response?: string | null
          terms_text?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "offer_history_negotiation_id_fkey"
            columns: ["negotiation_id"]
            isOneToOne: false
            referencedRelation: "negotiations"
            referencedColumns: ["id"]
          },
        ]
      }
      oracle_signals: {
        Row: {
          computed_at: string
          created_at: string
          dna: Json
          fair_value: number | null
          id: string
          market_price: number | null
          model: string | null
          project_id: string
          reasoning: string | null
          signal: string | null
          success_probability: number | null
        }
        Insert: {
          computed_at?: string
          created_at?: string
          dna?: Json
          fair_value?: number | null
          id?: string
          market_price?: number | null
          model?: string | null
          project_id: string
          reasoning?: string | null
          signal?: string | null
          success_probability?: number | null
        }
        Update: {
          computed_at?: string
          created_at?: string
          dna?: Json
          fair_value?: number | null
          id?: string
          market_price?: number | null
          model?: string | null
          project_id?: string
          reasoning?: string | null
          signal?: string | null
          success_probability?: number | null
        }
        Relationships: []
      }
      otp_codes: {
        Row: {
          attempts: number
          code_hash: string
          created_at: string
          expires_at: string
          id: string
          phone: string
          purpose: string
          user_id: string | null
          verified: boolean
        }
        Insert: {
          attempts?: number
          code_hash: string
          created_at?: string
          expires_at: string
          id?: string
          phone: string
          purpose?: string
          user_id?: string | null
          verified?: boolean
        }
        Update: {
          attempts?: number
          code_hash?: string
          created_at?: string
          expires_at?: string
          id?: string
          phone?: string
          purpose?: string
          user_id?: string | null
          verified?: boolean
        }
        Relationships: []
      }
      ownership_certificate_signatures: {
        Row: {
          certificate_no: string
          created_at: string
          id: string
          ip_address: string | null
          project_id: string
          signature_data_url: string
          signed_at: string
          user_agent: string | null
          user_id: string
        }
        Insert: {
          certificate_no: string
          created_at?: string
          id?: string
          ip_address?: string | null
          project_id: string
          signature_data_url: string
          signed_at?: string
          user_agent?: string | null
          user_id: string
        }
        Update: {
          certificate_no?: string
          created_at?: string
          id?: string
          ip_address?: string | null
          project_id?: string
          signature_data_url?: string
          signed_at?: string
          user_agent?: string | null
          user_id?: string
        }
        Relationships: []
      }
      page_views: {
        Row: {
          country: string | null
          created_at: string | null
          device: string | null
          id: number
          path: string
          referrer: string | null
          session_hash: string | null
          user_id: string | null
        }
        Insert: {
          country?: string | null
          created_at?: string | null
          device?: string | null
          id?: number
          path: string
          referrer?: string | null
          session_hash?: string | null
          user_id?: string | null
        }
        Update: {
          country?: string | null
          created_at?: string | null
          device?: string | null
          id?: number
          path?: string
          referrer?: string | null
          session_hash?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      partner_api_keys: {
        Row: {
          created_at: string
          expires_at: string | null
          id: string
          key_hash: string
          last_used_at: string | null
          name: string
          prefix: string
          revoked_at: string | null
          scopes: string[]
          user_id: string
        }
        Insert: {
          created_at?: string
          expires_at?: string | null
          id?: string
          key_hash: string
          last_used_at?: string | null
          name: string
          prefix: string
          revoked_at?: string | null
          scopes?: string[]
          user_id: string
        }
        Update: {
          created_at?: string
          expires_at?: string | null
          id?: string
          key_hash?: string
          last_used_at?: string | null
          name?: string
          prefix?: string
          revoked_at?: string | null
          scopes?: string[]
          user_id?: string
        }
        Relationships: []
      }
      password_reset_tokens: {
        Row: {
          created_at: string
          expires_at: string
          id: string
          ip_address: unknown
          token_hash: string
          used_at: string | null
          user_id: string
        }
        Insert: {
          created_at?: string
          expires_at: string
          id?: string
          ip_address?: unknown
          token_hash: string
          used_at?: string | null
          user_id: string
        }
        Update: {
          created_at?: string
          expires_at?: string
          id?: string
          ip_address?: unknown
          token_hash?: string
          used_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      payment_intents: {
        Row: {
          amount: number
          checkout_url: string | null
          created_at: string
          currency: string
          id: string
          metadata: Json | null
          order_id: string
          provider: string
          purpose: string
          status: string
          transaction_id: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          amount: number
          checkout_url?: string | null
          created_at?: string
          currency?: string
          id?: string
          metadata?: Json | null
          order_id: string
          provider?: string
          purpose?: string
          status?: string
          transaction_id?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          amount?: number
          checkout_url?: string | null
          created_at?: string
          currency?: string
          id?: string
          metadata?: Json | null
          order_id?: string
          provider?: string
          purpose?: string
          status?: string
          transaction_id?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      payout_requests: {
        Row: {
          admin_notes: string | null
          amount_minor: number
          channel: string
          created_at: string
          currency: string
          destination_enc: string
          destination_masked: string
          eta_release_at: string | null
          id: string
          reason: string | null
          reference: string
          status: string
          support_ticket_id: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          admin_notes?: string | null
          amount_minor: number
          channel: string
          created_at?: string
          currency?: string
          destination_enc: string
          destination_masked: string
          eta_release_at?: string | null
          id?: string
          reason?: string | null
          reference: string
          status?: string
          support_ticket_id?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          admin_notes?: string | null
          amount_minor?: number
          channel?: string
          created_at?: string
          currency?: string
          destination_enc?: string
          destination_masked?: string
          eta_release_at?: string | null
          id?: string
          reason?: string | null
          reference?: string
          status?: string
          support_ticket_id?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "payout_requests_support_ticket_id_fkey"
            columns: ["support_ticket_id"]
            isOneToOne: false
            referencedRelation: "support_tickets"
            referencedColumns: ["id"]
          },
        ]
      }
      platform_settings: {
        Row: {
          category: string
          description: string | null
          key: string
          label: string
          updated_at: string
          updated_by: string | null
          value: Json
          value_type: string
        }
        Insert: {
          category: string
          description?: string | null
          key: string
          label: string
          updated_at?: string
          updated_by?: string | null
          value: Json
          value_type?: string
        }
        Update: {
          category?: string
          description?: string | null
          key?: string
          label?: string
          updated_at?: string
          updated_by?: string | null
          value?: Json
          value_type?: string
        }
        Relationships: []
      }
      portal_votes: {
        Row: {
          created_at: string
          id: string
          portal_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          portal_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          portal_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "portal_votes_portal_id_fkey"
            columns: ["portal_id"]
            isOneToOne: false
            referencedRelation: "community_portals"
            referencedColumns: ["id"]
          },
        ]
      }
      price_alerts: {
        Row: {
          condition: string
          created_at: string
          id: string
          is_triggered: boolean
          project_id: string
          target_value: number
          triggered_at: string | null
          user_id: string
        }
        Insert: {
          condition: string
          created_at?: string
          id?: string
          is_triggered?: boolean
          project_id: string
          target_value: number
          triggered_at?: string | null
          user_id: string
        }
        Update: {
          condition?: string
          created_at?: string
          id?: string
          is_triggered?: boolean
          project_id?: string
          target_value?: number
          triggered_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "price_alerts_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "price_alerts_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects_public"
            referencedColumns: ["id"]
          },
        ]
      }
      price_history: {
        Row: {
          created_at: string
          id: number
          price: number
          project_id: string
          volume: number
        }
        Insert: {
          created_at?: string
          id?: number
          price: number
          project_id: string
          volume?: number
        }
        Update: {
          created_at?: string
          id?: number
          price?: number
          project_id?: string
          volume?: number
        }
        Relationships: [
          {
            foreignKeyName: "price_history_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "price_history_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects_public"
            referencedColumns: ["id"]
          },
        ]
      }
      price_watch_rules: {
        Row: {
          active: boolean
          condition: string
          created_at: string
          id: string
          last_triggered_at: string | null
          project_id: string | null
          threshold: number
          triggered_count: number
          user_id: string
        }
        Insert: {
          active?: boolean
          condition: string
          created_at?: string
          id?: string
          last_triggered_at?: string | null
          project_id?: string | null
          threshold: number
          triggered_count?: number
          user_id: string
        }
        Update: {
          active?: boolean
          condition?: string
          created_at?: string
          id?: string
          last_triggered_at?: string | null
          project_id?: string | null
          threshold?: number
          triggered_count?: number
          user_id?: string
        }
        Relationships: []
      }
      product_categories: {
        Row: {
          created_at: string
          description: string | null
          id: string
          image_url: string | null
          is_active: boolean
          name: string
          parent_id: string | null
          slug: string
          sort_order: number
          updated_at: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          image_url?: string | null
          is_active?: boolean
          name: string
          parent_id?: string | null
          slug: string
          sort_order?: number
          updated_at?: string
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          image_url?: string | null
          is_active?: boolean
          name?: string
          parent_id?: string | null
          slug?: string
          sort_order?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "product_categories_parent_id_fkey"
            columns: ["parent_id"]
            isOneToOne: false
            referencedRelation: "product_categories"
            referencedColumns: ["id"]
          },
        ]
      }
      product_order_items: {
        Row: {
          created_at: string
          id: string
          metadata: Json
          name: string
          order_id: string
          product_id: string | null
          quantity: number
          sku: string | null
          total_price: number
          unit_price: number
        }
        Insert: {
          created_at?: string
          id?: string
          metadata?: Json
          name: string
          order_id: string
          product_id?: string | null
          quantity?: number
          sku?: string | null
          total_price: number
          unit_price: number
        }
        Update: {
          created_at?: string
          id?: string
          metadata?: Json
          name?: string
          order_id?: string
          product_id?: string | null
          quantity?: number
          sku?: string | null
          total_price?: number
          unit_price?: number
        }
        Relationships: [
          {
            foreignKeyName: "product_order_items_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "product_orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "product_order_items_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      product_orders: {
        Row: {
          billing_address: Json | null
          created_at: string
          currency: string
          customer_address_enc: string | null
          customer_email: string | null
          customer_name: string | null
          customer_phone: string | null
          customer_phone_enc: string | null
          discount_amount: number
          id: string
          metadata: Json
          notes: string | null
          order_number: string
          payment_method: string | null
          payment_status: string
          shipping_address: Json | null
          shipping_amount: number
          status: string
          subtotal: number
          tax_amount: number
          total: number
          tracking_number: string | null
          updated_at: string
          user_id: string | null
        }
        Insert: {
          billing_address?: Json | null
          created_at?: string
          currency?: string
          customer_address_enc?: string | null
          customer_email?: string | null
          customer_name?: string | null
          customer_phone?: string | null
          customer_phone_enc?: string | null
          discount_amount?: number
          id?: string
          metadata?: Json
          notes?: string | null
          order_number?: string
          payment_method?: string | null
          payment_status?: string
          shipping_address?: Json | null
          shipping_amount?: number
          status?: string
          subtotal?: number
          tax_amount?: number
          total?: number
          tracking_number?: string | null
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          billing_address?: Json | null
          created_at?: string
          currency?: string
          customer_address_enc?: string | null
          customer_email?: string | null
          customer_name?: string | null
          customer_phone?: string | null
          customer_phone_enc?: string | null
          discount_amount?: number
          id?: string
          metadata?: Json
          notes?: string | null
          order_number?: string
          payment_method?: string | null
          payment_status?: string
          shipping_address?: Json | null
          shipping_amount?: number
          status?: string
          subtotal?: number
          tax_amount?: number
          total?: number
          tracking_number?: string | null
          updated_at?: string
          user_id?: string | null
        }
        Relationships: []
      }
      products: {
        Row: {
          attributes: Json
          category_id: string | null
          compare_at_price: number | null
          created_at: string
          currency: string
          description: string | null
          id: string
          images: Json
          is_active: boolean
          is_featured: boolean
          name: string
          price: number
          short_description: string | null
          sku: string | null
          slug: string
          sort_order: number
          stock: number | null
          tags: string[]
          tax_rate: number
          type: string
          unlimited_stock: boolean
          updated_at: string
        }
        Insert: {
          attributes?: Json
          category_id?: string | null
          compare_at_price?: number | null
          created_at?: string
          currency?: string
          description?: string | null
          id?: string
          images?: Json
          is_active?: boolean
          is_featured?: boolean
          name: string
          price?: number
          short_description?: string | null
          sku?: string | null
          slug: string
          sort_order?: number
          stock?: number | null
          tags?: string[]
          tax_rate?: number
          type?: string
          unlimited_stock?: boolean
          updated_at?: string
        }
        Update: {
          attributes?: Json
          category_id?: string | null
          compare_at_price?: number | null
          created_at?: string
          currency?: string
          description?: string | null
          id?: string
          images?: Json
          is_active?: boolean
          is_featured?: boolean
          name?: string
          price?: number
          short_description?: string | null
          sku?: string | null
          slug?: string
          sort_order?: number
          stock?: number | null
          tags?: string[]
          tax_rate?: number
          type?: string
          unlimited_stock?: boolean
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "products_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "product_categories"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          alias_name: string | null
          avatar_url: string | null
          bio: string | null
          business_bio: string | null
          city: string | null
          country: string | null
          cover_image_url: string | null
          created_at: string
          date_of_birth: string | null
          deals_completed: number
          display_name: string | null
          dob_enc: string | null
          followers_count: number
          id: string
          investment_volume_visible: boolean
          is_public_profile: boolean
          kyc_document_url: string | null
          kyc_selfie_url: string | null
          kyc_status: Database["public"]["Enums"]["kyc_status"]
          last_seen_at: string | null
          legal_full_name: string | null
          membership: Database["public"]["Enums"]["membership_tier"]
          membership_expires_at: string | null
          monthly_income: number | null
          monthly_obligations: number | null
          national_id_enc: string | null
          nationality: string | null
          net_worth: number | null
          occupation: string | null
          phone: string | null
          phone_enc: string | null
          points: number
          pseudonym: string | null
          referred_by: string | null
          reputation_score: number
          response_rate_pct: number
          show_whatsapp: boolean
          updated_at: string
          use_alias_default: boolean
          username: string | null
          verified_blue: boolean
          verified_diamond: boolean
          verified_gold: boolean
          verified_green: boolean
          whatsapp: string | null
        }
        Insert: {
          alias_name?: string | null
          avatar_url?: string | null
          bio?: string | null
          business_bio?: string | null
          city?: string | null
          country?: string | null
          cover_image_url?: string | null
          created_at?: string
          date_of_birth?: string | null
          deals_completed?: number
          display_name?: string | null
          dob_enc?: string | null
          followers_count?: number
          id: string
          investment_volume_visible?: boolean
          is_public_profile?: boolean
          kyc_document_url?: string | null
          kyc_selfie_url?: string | null
          kyc_status?: Database["public"]["Enums"]["kyc_status"]
          last_seen_at?: string | null
          legal_full_name?: string | null
          membership?: Database["public"]["Enums"]["membership_tier"]
          membership_expires_at?: string | null
          monthly_income?: number | null
          monthly_obligations?: number | null
          national_id_enc?: string | null
          nationality?: string | null
          net_worth?: number | null
          occupation?: string | null
          phone?: string | null
          phone_enc?: string | null
          points?: number
          pseudonym?: string | null
          referred_by?: string | null
          reputation_score?: number
          response_rate_pct?: number
          show_whatsapp?: boolean
          updated_at?: string
          use_alias_default?: boolean
          username?: string | null
          verified_blue?: boolean
          verified_diamond?: boolean
          verified_gold?: boolean
          verified_green?: boolean
          whatsapp?: string | null
        }
        Update: {
          alias_name?: string | null
          avatar_url?: string | null
          bio?: string | null
          business_bio?: string | null
          city?: string | null
          country?: string | null
          cover_image_url?: string | null
          created_at?: string
          date_of_birth?: string | null
          deals_completed?: number
          display_name?: string | null
          dob_enc?: string | null
          followers_count?: number
          id?: string
          investment_volume_visible?: boolean
          is_public_profile?: boolean
          kyc_document_url?: string | null
          kyc_selfie_url?: string | null
          kyc_status?: Database["public"]["Enums"]["kyc_status"]
          last_seen_at?: string | null
          legal_full_name?: string | null
          membership?: Database["public"]["Enums"]["membership_tier"]
          membership_expires_at?: string | null
          monthly_income?: number | null
          monthly_obligations?: number | null
          national_id_enc?: string | null
          nationality?: string | null
          net_worth?: number | null
          occupation?: string | null
          phone?: string | null
          phone_enc?: string | null
          points?: number
          pseudonym?: string | null
          referred_by?: string | null
          reputation_score?: number
          response_rate_pct?: number
          show_whatsapp?: boolean
          updated_at?: string
          use_alias_default?: boolean
          username?: string | null
          verified_blue?: boolean
          verified_diamond?: boolean
          verified_gold?: boolean
          verified_green?: boolean
          whatsapp?: string | null
        }
        Relationships: []
      }
      project_ai_analysis: {
        Row: {
          ai_summary: string | null
          competitors: Json | null
          generated_at: string
          market_fit_score: number | null
          model_version: string | null
          opportunities: string[] | null
          project_id: string
          risk_score: number | null
          roi_estimate: number | null
          strengths: string[] | null
          threats: string[] | null
          weaknesses: string[] | null
        }
        Insert: {
          ai_summary?: string | null
          competitors?: Json | null
          generated_at?: string
          market_fit_score?: number | null
          model_version?: string | null
          opportunities?: string[] | null
          project_id: string
          risk_score?: number | null
          roi_estimate?: number | null
          strengths?: string[] | null
          threats?: string[] | null
          weaknesses?: string[] | null
        }
        Update: {
          ai_summary?: string | null
          competitors?: Json | null
          generated_at?: string
          market_fit_score?: number | null
          model_version?: string | null
          opportunities?: string[] | null
          project_id?: string
          risk_score?: number | null
          roi_estimate?: number | null
          strengths?: string[] | null
          threats?: string[] | null
          weaknesses?: string[] | null
        }
        Relationships: [
          {
            foreignKeyName: "project_ai_analysis_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: true
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "project_ai_analysis_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: true
            referencedRelation: "projects_public"
            referencedColumns: ["id"]
          },
        ]
      }
      project_comparisons: {
        Row: {
          created_at: string
          id: string
          name: string | null
          project_ids: string[]
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          name?: string | null
          project_ids?: string[]
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          name?: string | null
          project_ids?: string[]
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      project_guarantee_documents: {
        Row: {
          amount_minor: number
          created_at: string
          currency: string
          guarantee_type: string
          guarantor_full_name: string | null
          guarantor_id_number: string | null
          id: string
          notes: string | null
          owner_id: string
          project_id: string
          signed_document_url: string | null
          status: string
          updated_at: string
        }
        Insert: {
          amount_minor: number
          created_at?: string
          currency?: string
          guarantee_type: string
          guarantor_full_name?: string | null
          guarantor_id_number?: string | null
          id?: string
          notes?: string | null
          owner_id: string
          project_id: string
          signed_document_url?: string | null
          status?: string
          updated_at?: string
        }
        Update: {
          amount_minor?: number
          created_at?: string
          currency?: string
          guarantee_type?: string
          guarantor_full_name?: string | null
          guarantor_id_number?: string | null
          id?: string
          notes?: string | null
          owner_id?: string
          project_id?: string
          signed_document_url?: string | null
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "project_guarantee_documents_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "project_guarantee_documents_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects_public"
            referencedColumns: ["id"]
          },
        ]
      }
      project_guarantees: {
        Row: {
          amount: number | null
          created_at: string
          document_url: string | null
          guarantee_type: string
          guarantor_id: string | null
          guarantor_name: string | null
          guarantor_nationality: string | null
          guarantor_passport_enc: string | null
          guarantor_phone: string | null
          guarantor_phone_enc: string | null
          id: string
          notes: string | null
          project_id: string
          signed_to_id: string | null
          signed_to_name: string | null
          signed_to_passport: string | null
        }
        Insert: {
          amount?: number | null
          created_at?: string
          document_url?: string | null
          guarantee_type: string
          guarantor_id?: string | null
          guarantor_name?: string | null
          guarantor_nationality?: string | null
          guarantor_passport_enc?: string | null
          guarantor_phone?: string | null
          guarantor_phone_enc?: string | null
          id?: string
          notes?: string | null
          project_id: string
          signed_to_id?: string | null
          signed_to_name?: string | null
          signed_to_passport?: string | null
        }
        Update: {
          amount?: number | null
          created_at?: string
          document_url?: string | null
          guarantee_type?: string
          guarantor_id?: string | null
          guarantor_name?: string | null
          guarantor_nationality?: string | null
          guarantor_passport_enc?: string | null
          guarantor_phone?: string | null
          guarantor_phone_enc?: string | null
          id?: string
          notes?: string | null
          project_id?: string
          signed_to_id?: string | null
          signed_to_name?: string | null
          signed_to_passport?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "project_guarantees_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "project_guarantees_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects_public"
            referencedColumns: ["id"]
          },
        ]
      }
      project_purchase_requests: {
        Row: {
          buyer_id: string
          created_at: string
          currency: string
          id: string
          message: string | null
          owner_id: string
          paid_at: string | null
          price_per_share: number
          project_id: string
          responded_at: string | null
          response_note: string | null
          shares: number
          status: string
          total_amount: number
          updated_at: string
        }
        Insert: {
          buyer_id: string
          created_at?: string
          currency?: string
          id?: string
          message?: string | null
          owner_id: string
          paid_at?: string | null
          price_per_share: number
          project_id: string
          responded_at?: string | null
          response_note?: string | null
          shares: number
          status?: string
          total_amount: number
          updated_at?: string
        }
        Update: {
          buyer_id?: string
          created_at?: string
          currency?: string
          id?: string
          message?: string | null
          owner_id?: string
          paid_at?: string | null
          price_per_share?: number
          project_id?: string
          responded_at?: string | null
          response_note?: string | null
          shares?: number
          status?: string
          total_amount?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "project_purchase_requests_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "project_purchase_requests_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects_public"
            referencedColumns: ["id"]
          },
        ]
      }
      project_questions: {
        Row: {
          answer: string | null
          answered_at: string | null
          answered_by: string | null
          asker_id: string
          created_at: string
          id: string
          project_id: string
          question: string
          upvotes: number
        }
        Insert: {
          answer?: string | null
          answered_at?: string | null
          answered_by?: string | null
          asker_id: string
          created_at?: string
          id?: string
          project_id: string
          question: string
          upvotes?: number
        }
        Update: {
          answer?: string | null
          answered_at?: string | null
          answered_by?: string | null
          asker_id?: string
          created_at?: string
          id?: string
          project_id?: string
          question?: string
          upvotes?: number
        }
        Relationships: [
          {
            foreignKeyName: "project_questions_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "project_questions_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects_public"
            referencedColumns: ["id"]
          },
        ]
      }
      project_reviews: {
        Row: {
          comment: string | null
          created_at: string
          id: string
          project_id: string
          reviewer_id: string
          stars: number
        }
        Insert: {
          comment?: string | null
          created_at?: string
          id?: string
          project_id: string
          reviewer_id: string
          stars: number
        }
        Update: {
          comment?: string | null
          created_at?: string
          id?: string
          project_id?: string
          reviewer_id?: string
          stars?: number
        }
        Relationships: [
          {
            foreignKeyName: "project_reviews_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "project_reviews_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects_public"
            referencedColumns: ["id"]
          },
        ]
      }
      project_shares: {
        Row: {
          avg_price: number
          created_at: string
          id: string
          project_id: string
          shares: number
          updated_at: string
          user_id: string
        }
        Insert: {
          avg_price?: number
          created_at?: string
          id?: string
          project_id: string
          shares?: number
          updated_at?: string
          user_id: string
        }
        Update: {
          avg_price?: number
          created_at?: string
          id?: string
          project_id?: string
          shares?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "project_shares_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "project_shares_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects_public"
            referencedColumns: ["id"]
          },
        ]
      }
      project_updates: {
        Row: {
          author_id: string
          body: string
          created_at: string
          id: string
          media_urls: string[]
          project_id: string
          title: string
        }
        Insert: {
          author_id: string
          body: string
          created_at?: string
          id?: string
          media_urls?: string[]
          project_id: string
          title: string
        }
        Update: {
          author_id?: string
          body?: string
          created_at?: string
          id?: string
          media_urls?: string[]
          project_id?: string
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "project_updates_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "project_updates_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects_public"
            referencedColumns: ["id"]
          },
        ]
      }
      projects: {
        Row: {
          ai_score: number | null
          ai_score_at: string | null
          ai_score_summary: string | null
          boost_expires_at: string | null
          boost_score: number | null
          business_plan_pdf_url: string | null
          city: string | null
          contract_duration_months: number | null
          conversion_count: number | null
          country: string
          cover_image_url: string | null
          created_at: string
          currency: string
          current_price: number
          deleted_at: string | null
          description: string | null
          distribution_frequency: string
          equity_offered_pct: number | null
          expected_profit: number | null
          expected_return_pct: number | null
          expected_revenue: number | null
          expense_assets: string | null
          expense_fixed: string | null
          expense_movables: string | null
          expense_variable: string | null
          funding_mode: string
          funding_use_breakdown: Json | null
          gallery_urls: string[]
          guarantee_amount: number | null
          has_guarantee: boolean
          id: string
          is_existing: boolean
          last_bumped_at: string | null
          likes_count: number
          marketplace_listed: boolean
          media_urls: string[]
          min_share_lot: number
          name: string
          offer_types: string[]
          owner_contribution_pct: number
          owner_id: string
          phone: string | null
          profit_frequency: string | null
          quality_badges: string[] | null
          revenue_frequency: string | null
          search_tsv: unknown
          sector: string | null
          services_enabled: Json
          share_price: number
          shares_sold: number
          shares_total: number
          show_whatsapp: boolean
          status: Database["public"]["Enums"]["project_status"]
          target_investment: number | null
          target_roi_pct: number | null
          ticker: string | null
          total_cost: number
          trust_score: number
          updated_at: string
          valuation: number | null
          video_url: string | null
          view_count: number | null
          views_count: number
          whatsapp: string | null
        }
        Insert: {
          ai_score?: number | null
          ai_score_at?: string | null
          ai_score_summary?: string | null
          boost_expires_at?: string | null
          boost_score?: number | null
          business_plan_pdf_url?: string | null
          city?: string | null
          contract_duration_months?: number | null
          conversion_count?: number | null
          country: string
          cover_image_url?: string | null
          created_at?: string
          currency?: string
          current_price: number
          deleted_at?: string | null
          description?: string | null
          distribution_frequency?: string
          equity_offered_pct?: number | null
          expected_profit?: number | null
          expected_return_pct?: number | null
          expected_revenue?: number | null
          expense_assets?: string | null
          expense_fixed?: string | null
          expense_movables?: string | null
          expense_variable?: string | null
          funding_mode?: string
          funding_use_breakdown?: Json | null
          gallery_urls?: string[]
          guarantee_amount?: number | null
          has_guarantee?: boolean
          id?: string
          is_existing?: boolean
          last_bumped_at?: string | null
          likes_count?: number
          marketplace_listed?: boolean
          media_urls?: string[]
          min_share_lot?: number
          name: string
          offer_types?: string[]
          owner_contribution_pct?: number
          owner_id: string
          phone?: string | null
          profit_frequency?: string | null
          quality_badges?: string[] | null
          revenue_frequency?: string | null
          search_tsv?: unknown
          sector?: string | null
          services_enabled?: Json
          share_price: number
          shares_sold?: number
          shares_total?: number
          show_whatsapp?: boolean
          status?: Database["public"]["Enums"]["project_status"]
          target_investment?: number | null
          target_roi_pct?: number | null
          ticker?: string | null
          total_cost: number
          trust_score?: number
          updated_at?: string
          valuation?: number | null
          video_url?: string | null
          view_count?: number | null
          views_count?: number
          whatsapp?: string | null
        }
        Update: {
          ai_score?: number | null
          ai_score_at?: string | null
          ai_score_summary?: string | null
          boost_expires_at?: string | null
          boost_score?: number | null
          business_plan_pdf_url?: string | null
          city?: string | null
          contract_duration_months?: number | null
          conversion_count?: number | null
          country?: string
          cover_image_url?: string | null
          created_at?: string
          currency?: string
          current_price?: number
          deleted_at?: string | null
          description?: string | null
          distribution_frequency?: string
          equity_offered_pct?: number | null
          expected_profit?: number | null
          expected_return_pct?: number | null
          expected_revenue?: number | null
          expense_assets?: string | null
          expense_fixed?: string | null
          expense_movables?: string | null
          expense_variable?: string | null
          funding_mode?: string
          funding_use_breakdown?: Json | null
          gallery_urls?: string[]
          guarantee_amount?: number | null
          has_guarantee?: boolean
          id?: string
          is_existing?: boolean
          last_bumped_at?: string | null
          likes_count?: number
          marketplace_listed?: boolean
          media_urls?: string[]
          min_share_lot?: number
          name?: string
          offer_types?: string[]
          owner_contribution_pct?: number
          owner_id?: string
          phone?: string | null
          profit_frequency?: string | null
          quality_badges?: string[] | null
          revenue_frequency?: string | null
          search_tsv?: unknown
          sector?: string | null
          services_enabled?: Json
          share_price?: number
          shares_sold?: number
          shares_total?: number
          show_whatsapp?: boolean
          status?: Database["public"]["Enums"]["project_status"]
          target_investment?: number | null
          target_roi_pct?: number | null
          ticker?: string | null
          total_cost?: number
          trust_score?: number
          updated_at?: string
          valuation?: number | null
          video_url?: string | null
          view_count?: number | null
          views_count?: number
          whatsapp?: string | null
        }
        Relationships: []
      }
      provider_webhook_logs: {
        Row: {
          error: string | null
          event_type: string | null
          id: string
          payload: Json
          provider_id: string | null
          received_at: string
          status: string
          tenant_id: string | null
        }
        Insert: {
          error?: string | null
          event_type?: string | null
          id?: string
          payload?: Json
          provider_id?: string | null
          received_at?: string
          status?: string
          tenant_id?: string | null
        }
        Update: {
          error?: string | null
          event_type?: string | null
          id?: string
          payload?: Json
          provider_id?: string | null
          received_at?: string
          status?: string
          tenant_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "provider_webhook_logs_provider_id_fkey"
            columns: ["provider_id"]
            isOneToOne: false
            referencedRelation: "providers"
            referencedColumns: ["id"]
          },
        ]
      }
      providers: {
        Row: {
          category: string
          config_schema: Json
          created_at: string
          description: string | null
          docs_url: string | null
          id: string
          is_active: boolean
          logo_url: string | null
          name: string
          requires_oauth: boolean
          slug: string
          sort_order: number
          updated_at: string
        }
        Insert: {
          category: string
          config_schema?: Json
          created_at?: string
          description?: string | null
          docs_url?: string | null
          id?: string
          is_active?: boolean
          logo_url?: string | null
          name: string
          requires_oauth?: boolean
          slug: string
          sort_order?: number
          updated_at?: string
        }
        Update: {
          category?: string
          config_schema?: Json
          created_at?: string
          description?: string | null
          docs_url?: string | null
          id?: string
          is_active?: boolean
          logo_url?: string | null
          name?: string
          requires_oauth?: boolean
          slug?: string
          sort_order?: number
          updated_at?: string
        }
        Relationships: []
      }
      push_subscriptions: {
        Row: {
          auth: string
          categories: Json | null
          created_at: string | null
          enabled: boolean | null
          endpoint: string
          id: string
          last_used_at: string | null
          p256dh: string
          user_agent: string | null
          user_id: string
        }
        Insert: {
          auth: string
          categories?: Json | null
          created_at?: string | null
          enabled?: boolean | null
          endpoint: string
          id?: string
          last_used_at?: string | null
          p256dh: string
          user_agent?: string | null
          user_id: string
        }
        Update: {
          auth?: string
          categories?: Json | null
          created_at?: string | null
          enabled?: boolean | null
          endpoint?: string
          id?: string
          last_used_at?: string | null
          p256dh?: string
          user_agent?: string | null
          user_id?: string
        }
        Relationships: []
      }
      quick_replies: {
        Row: {
          body: string
          created_at: string
          id: string
          sort_order: number
          title: string
          user_id: string
        }
        Insert: {
          body: string
          created_at?: string
          id?: string
          sort_order?: number
          title: string
          user_id: string
        }
        Update: {
          body?: string
          created_at?: string
          id?: string
          sort_order?: number
          title?: string
          user_id?: string
        }
        Relationships: []
      }
      rate_limit_events: {
        Row: {
          action: string
          created_at: string
          id: string
          ip: string | null
          user_id: string | null
        }
        Insert: {
          action: string
          created_at?: string
          id?: string
          ip?: string | null
          user_id?: string | null
        }
        Update: {
          action?: string
          created_at?: string
          id?: string
          ip?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      realtime_events: {
        Row: {
          channel: string
          created_at: string
          event: string
          id: number
          payload: Json
          user_id: string | null
        }
        Insert: {
          channel: string
          created_at?: string
          event: string
          id?: number
          payload?: Json
          user_id?: string | null
        }
        Update: {
          channel?: string
          created_at?: string
          event?: string
          id?: number
          payload?: Json
          user_id?: string | null
        }
        Relationships: []
      }
      referral_clicks: {
        Row: {
          clicked_at: string
          code: string
          converted: boolean
          converted_user: string | null
          id: string
          ip_hash: string | null
          referer: string | null
          ua_hash: string | null
          utm: Json | null
        }
        Insert: {
          clicked_at?: string
          code: string
          converted?: boolean
          converted_user?: string | null
          id?: string
          ip_hash?: string | null
          referer?: string | null
          ua_hash?: string | null
          utm?: Json | null
        }
        Update: {
          clicked_at?: string
          code?: string
          converted?: boolean
          converted_user?: string | null
          id?: string
          ip_hash?: string | null
          referer?: string | null
          ua_hash?: string | null
          utm?: Json | null
        }
        Relationships: []
      }
      referral_tiers: {
        Row: {
          badge_color: string | null
          commission_pct: number
          created_at: string
          id: string
          max_referrals: number | null
          min_referrals: number
          name_ar: string
          name_en: string
          perks: Json | null
          reward_per_referral_sar: number
          sort_order: number | null
          tier_key: string
        }
        Insert: {
          badge_color?: string | null
          commission_pct?: number
          created_at?: string
          id?: string
          max_referrals?: number | null
          min_referrals: number
          name_ar: string
          name_en: string
          perks?: Json | null
          reward_per_referral_sar?: number
          sort_order?: number | null
          tier_key: string
        }
        Update: {
          badge_color?: string | null
          commission_pct?: number
          created_at?: string
          id?: string
          max_referrals?: number | null
          min_referrals?: number
          name_ar?: string
          name_en?: string
          perks?: Json | null
          reward_per_referral_sar?: number
          sort_order?: number | null
          tier_key?: string
        }
        Relationships: []
      }
      referral_verifications: {
        Row: {
          code: string
          created_at: string
          fraud_reason: string | null
          fraud_score: number
          id: string
          ip_hash: string | null
          referred_id: string
          referrer_id: string
          rewarded_at: string | null
          status: Database["public"]["Enums"]["referral_status"]
          ua_hash: string | null
          verified_at: string | null
        }
        Insert: {
          code: string
          created_at?: string
          fraud_reason?: string | null
          fraud_score?: number
          id?: string
          ip_hash?: string | null
          referred_id: string
          referrer_id: string
          rewarded_at?: string | null
          status?: Database["public"]["Enums"]["referral_status"]
          ua_hash?: string | null
          verified_at?: string | null
        }
        Update: {
          code?: string
          created_at?: string
          fraud_reason?: string | null
          fraud_score?: number
          id?: string
          ip_hash?: string | null
          referred_id?: string
          referrer_id?: string
          rewarded_at?: string | null
          status?: Database["public"]["Enums"]["referral_status"]
          ua_hash?: string | null
          verified_at?: string | null
        }
        Relationships: []
      }
      referrals: {
        Row: {
          code: string
          created_at: string
          id: string
          referrer_id: string
          reward_total: number
          uses_count: number
        }
        Insert: {
          code: string
          created_at?: string
          id?: string
          referrer_id: string
          reward_total?: number
          uses_count?: number
        }
        Update: {
          code?: string
          created_at?: string
          id?: string
          referrer_id?: string
          reward_total?: number
          uses_count?: number
        }
        Relationships: []
      }
      reputation_events: {
        Row: {
          balance_after: number
          created_at: string
          event_type: string
          id: string
          points_change: number
          reference_id: string | null
          reference_type: string | null
          user_id: string
        }
        Insert: {
          balance_after: number
          created_at?: string
          event_type: string
          id?: string
          points_change: number
          reference_id?: string | null
          reference_type?: string | null
          user_id: string
        }
        Update: {
          balance_after?: number
          created_at?: string
          event_type?: string
          id?: string
          points_change?: number
          reference_id?: string | null
          reference_type?: string | null
          user_id?: string
        }
        Relationships: []
      }
      role_permissions: {
        Row: {
          created_at: string
          permission: string
          role: Database["public"]["Enums"]["app_role"]
        }
        Insert: {
          created_at?: string
          permission: string
          role: Database["public"]["Enums"]["app_role"]
        }
        Update: {
          created_at?: string
          permission?: string
          role?: Database["public"]["Enums"]["app_role"]
        }
        Relationships: []
      }
      search_queries: {
        Row: {
          created_at: string | null
          id: number
          query: string
          results_count: number | null
          user_id: string | null
        }
        Insert: {
          created_at?: string | null
          id?: number
          query: string
          results_count?: number | null
          user_id?: string | null
        }
        Update: {
          created_at?: string | null
          id?: number
          query?: string
          results_count?: number | null
          user_id?: string | null
        }
        Relationships: []
      }
      secondary_market_listings: {
        Row: {
          ask_price: number
          buyer_id: string | null
          created_at: string
          id: string
          offer_type: string
          project_id: string
          seller_id: string
          shares: number
          sold_at: string | null
          status: string
        }
        Insert: {
          ask_price: number
          buyer_id?: string | null
          created_at?: string
          id?: string
          offer_type?: string
          project_id: string
          seller_id: string
          shares: number
          sold_at?: string | null
          status?: string
        }
        Update: {
          ask_price?: number
          buyer_id?: string | null
          created_at?: string
          id?: string
          offer_type?: string
          project_id?: string
          seller_id?: string
          shares?: number
          sold_at?: string | null
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "secondary_market_listings_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "secondary_market_listings_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects_public"
            referencedColumns: ["id"]
          },
        ]
      }
      sector_follows: {
        Row: {
          created_at: string
          id: string
          sector: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          sector: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          sector?: string
          user_id?: string
        }
        Relationships: []
      }
      security_events: {
        Row: {
          blocked: boolean
          country: string | null
          created_at: string
          details: Json
          event_type: string
          id: string
          ip: string | null
          resource: string | null
          severity: string
          user_agent: string | null
          user_id: string | null
        }
        Insert: {
          blocked?: boolean
          country?: string | null
          created_at?: string
          details?: Json
          event_type: string
          id?: string
          ip?: string | null
          resource?: string | null
          severity?: string
          user_agent?: string | null
          user_id?: string | null
        }
        Update: {
          blocked?: boolean
          country?: string | null
          created_at?: string
          details?: Json
          event_type?: string
          id?: string
          ip?: string | null
          resource?: string | null
          severity?: string
          user_agent?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      seo_ai_generations: {
        Row: {
          created_at: string
          created_by: string | null
          id: string
          kind: string
          model: string
          output: string | null
          prompt: string
          tokens_used: number | null
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          id?: string
          kind?: string
          model: string
          output?: string | null
          prompt: string
          tokens_used?: number | null
        }
        Update: {
          created_at?: string
          created_by?: string | null
          id?: string
          kind?: string
          model?: string
          output?: string | null
          prompt?: string
          tokens_used?: number | null
        }
        Relationships: []
      }
      seo_archive_jobs: {
        Row: {
          finished_at: string | null
          http_status: number | null
          id: string
          items_count: number | null
          kind: string
          response_excerpt: string | null
          started_at: string
          status: string
          triggered_by: string | null
          url: string | null
        }
        Insert: {
          finished_at?: string | null
          http_status?: number | null
          id?: string
          items_count?: number | null
          kind?: string
          response_excerpt?: string | null
          started_at?: string
          status?: string
          triggered_by?: string | null
          url?: string | null
        }
        Update: {
          finished_at?: string | null
          http_status?: number | null
          id?: string
          items_count?: number | null
          kind?: string
          response_excerpt?: string | null
          started_at?: string
          status?: string
          triggered_by?: string | null
          url?: string | null
        }
        Relationships: []
      }
      seo_keyword_research: {
        Row: {
          created_at: string
          created_by: string | null
          id: string
          ideas: Json
          locale: string
          seed_keyword: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          id?: string
          ideas?: Json
          locale?: string
          seed_keyword: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          id?: string
          ideas?: Json
          locale?: string
          seed_keyword?: string
        }
        Relationships: []
      }
      seo_meta_overrides: {
        Row: {
          canonical_url: string | null
          created_at: string
          description: string | null
          json_ld: Json | null
          keywords: string | null
          noindex: boolean
          notes: string | null
          og_description: string | null
          og_image: string | null
          og_title: string | null
          route_path: string
          title: string | null
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          canonical_url?: string | null
          created_at?: string
          description?: string | null
          json_ld?: Json | null
          keywords?: string | null
          noindex?: boolean
          notes?: string | null
          og_description?: string | null
          og_image?: string | null
          og_title?: string | null
          route_path: string
          title?: string | null
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          canonical_url?: string | null
          created_at?: string
          description?: string | null
          json_ld?: Json | null
          keywords?: string | null
          noindex?: boolean
          notes?: string | null
          og_description?: string | null
          og_image?: string | null
          og_title?: string | null
          route_path?: string
          title?: string | null
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: []
      }
      service_orders: {
        Row: {
          accepted_at: string | null
          amount: number
          amount_sar: number
          auto_release_at: string | null
          cancelled_at: string | null
          client_id: string
          completed_at: string | null
          created_at: string
          currency: string
          delivered_at: string | null
          delivery_days: number | null
          id: string
          notes: string | null
          provider_id: string
          service_description: string | null
          service_title: string
          status: string
          updated_at: string
        }
        Insert: {
          accepted_at?: string | null
          amount: number
          amount_sar: number
          auto_release_at?: string | null
          cancelled_at?: string | null
          client_id: string
          completed_at?: string | null
          created_at?: string
          currency?: string
          delivered_at?: string | null
          delivery_days?: number | null
          id?: string
          notes?: string | null
          provider_id: string
          service_description?: string | null
          service_title: string
          status?: string
          updated_at?: string
        }
        Update: {
          accepted_at?: string | null
          amount?: number
          amount_sar?: number
          auto_release_at?: string | null
          cancelled_at?: string | null
          client_id?: string
          completed_at?: string | null
          created_at?: string
          currency?: string
          delivered_at?: string | null
          delivery_days?: number | null
          id?: string
          notes?: string | null
          provider_id?: string
          service_description?: string | null
          service_title?: string
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "service_orders_provider_id_fkey"
            columns: ["provider_id"]
            isOneToOne: false
            referencedRelation: "service_providers"
            referencedColumns: ["id"]
          },
        ]
      }
      service_provider_kyc: {
        Row: {
          business_license_url: string | null
          created_at: string
          id: string
          id_document_url: string | null
          portfolio_docs: string[] | null
          provider_id: string
          rejection_reason: string | null
          reviewed_at: string | null
          reviewer_id: string | null
          selfie_url: string | null
          status: string
          submitted_at: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          business_license_url?: string | null
          created_at?: string
          id?: string
          id_document_url?: string | null
          portfolio_docs?: string[] | null
          provider_id: string
          rejection_reason?: string | null
          reviewed_at?: string | null
          reviewer_id?: string | null
          selfie_url?: string | null
          status?: string
          submitted_at?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          business_license_url?: string | null
          created_at?: string
          id?: string
          id_document_url?: string | null
          portfolio_docs?: string[] | null
          provider_id?: string
          rejection_reason?: string | null
          reviewed_at?: string | null
          reviewer_id?: string | null
          selfie_url?: string | null
          status?: string
          submitted_at?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "service_provider_kyc_provider_id_fkey"
            columns: ["provider_id"]
            isOneToOne: true
            referencedRelation: "service_providers"
            referencedColumns: ["id"]
          },
        ]
      }
      service_providers: {
        Row: {
          avatar_url: string | null
          bio: string | null
          category: string
          city: string | null
          country: string | null
          cover_url: string | null
          created_at: string
          currency: string | null
          display_name: string
          headline: string | null
          hourly_rate: number | null
          id: string
          kyc_status: string
          languages: string[] | null
          orders_completed: number | null
          portfolio_urls: string[] | null
          rating_avg: number | null
          rating_count: number | null
          response_time_hours: number | null
          status: string
          subcategories: string[] | null
          updated_at: string
          user_id: string
        }
        Insert: {
          avatar_url?: string | null
          bio?: string | null
          category: string
          city?: string | null
          country?: string | null
          cover_url?: string | null
          created_at?: string
          currency?: string | null
          display_name: string
          headline?: string | null
          hourly_rate?: number | null
          id?: string
          kyc_status?: string
          languages?: string[] | null
          orders_completed?: number | null
          portfolio_urls?: string[] | null
          rating_avg?: number | null
          rating_count?: number | null
          response_time_hours?: number | null
          status?: string
          subcategories?: string[] | null
          updated_at?: string
          user_id: string
        }
        Update: {
          avatar_url?: string | null
          bio?: string | null
          category?: string
          city?: string | null
          country?: string | null
          cover_url?: string | null
          created_at?: string
          currency?: string | null
          display_name?: string
          headline?: string | null
          hourly_rate?: number | null
          id?: string
          kyc_status?: string
          languages?: string[] | null
          orders_completed?: number | null
          portfolio_urls?: string[] | null
          rating_avg?: number | null
          rating_count?: number | null
          response_time_hours?: number | null
          status?: string
          subcategories?: string[] | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      service_reviews: {
        Row: {
          body: string | null
          created_at: string
          id: string
          is_public: boolean | null
          order_id: string
          provider_id: string
          provider_response: string | null
          provider_response_at: string | null
          rating: number
          reviewer_id: string
          title: string | null
          updated_at: string
        }
        Insert: {
          body?: string | null
          created_at?: string
          id?: string
          is_public?: boolean | null
          order_id: string
          provider_id: string
          provider_response?: string | null
          provider_response_at?: string | null
          rating: number
          reviewer_id: string
          title?: string | null
          updated_at?: string
        }
        Update: {
          body?: string | null
          created_at?: string
          id?: string
          is_public?: boolean | null
          order_id?: string
          provider_id?: string
          provider_response?: string | null
          provider_response_at?: string | null
          rating?: number
          reviewer_id?: string
          title?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "service_reviews_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: true
            referencedRelation: "service_orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "service_reviews_provider_id_fkey"
            columns: ["provider_id"]
            isOneToOne: false
            referencedRelation: "service_providers"
            referencedColumns: ["id"]
          },
        ]
      }
      share_events: {
        Row: {
          channel: string
          created_at: string
          id: string
          metadata: Json
          recipients_count: number
          referral_code: string | null
          user_id: string | null
        }
        Insert: {
          channel: string
          created_at?: string
          id?: string
          metadata?: Json
          recipients_count?: number
          referral_code?: string | null
          user_id?: string | null
        }
        Update: {
          channel?: string
          created_at?: string
          id?: string
          metadata?: Json
          recipients_count?: number
          referral_code?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      share_holdings: {
        Row: {
          avg_buy_price: number
          last_updated_at: string
          project_id: string
          quantity: number
          total_invested: number
          user_id: string
        }
        Insert: {
          avg_buy_price?: number
          last_updated_at?: string
          project_id: string
          quantity?: number
          total_invested?: number
          user_id: string
        }
        Update: {
          avg_buy_price?: number
          last_updated_at?: string
          project_id?: string
          quantity?: number
          total_invested?: number
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "share_holdings_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "share_holdings_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects_public"
            referencedColumns: ["id"]
          },
        ]
      }
      share_lot_bids: {
        Row: {
          bidder_id: string
          created_at: string
          currency: string
          deposit_amount: number
          expires_at: string
          id: string
          kind: string
          message: string | null
          owner_id: string
          price_per_share: number
          project_id: string
          reply: string | null
          responded_at: string | null
          shares: number
          status: string
          total_amount: number | null
          updated_at: string
        }
        Insert: {
          bidder_id: string
          created_at?: string
          currency?: string
          deposit_amount?: number
          expires_at?: string
          id?: string
          kind: string
          message?: string | null
          owner_id: string
          price_per_share: number
          project_id: string
          reply?: string | null
          responded_at?: string | null
          shares: number
          status?: string
          total_amount?: number | null
          updated_at?: string
        }
        Update: {
          bidder_id?: string
          created_at?: string
          currency?: string
          deposit_amount?: number
          expires_at?: string
          id?: string
          kind?: string
          message?: string | null
          owner_id?: string
          price_per_share?: number
          project_id?: string
          reply?: string | null
          responded_at?: string | null
          shares?: number
          status?: string
          total_amount?: number | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "share_lot_bids_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "share_lot_bids_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects_public"
            referencedColumns: ["id"]
          },
        ]
      }
      share_orders: {
        Row: {
          created_at: string
          filled: number
          id: string
          price: number
          project_id: string
          shares: number
          side: Database["public"]["Enums"]["order_side"]
          status: Database["public"]["Enums"]["order_status"]
          user_id: string
        }
        Insert: {
          created_at?: string
          filled?: number
          id?: string
          price: number
          project_id: string
          shares: number
          side: Database["public"]["Enums"]["order_side"]
          status?: Database["public"]["Enums"]["order_status"]
          user_id: string
        }
        Update: {
          created_at?: string
          filled?: number
          id?: string
          price?: number
          project_id?: string
          shares?: number
          side?: Database["public"]["Enums"]["order_side"]
          status?: Database["public"]["Enums"]["order_status"]
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "share_orders_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "share_orders_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects_public"
            referencedColumns: ["id"]
          },
        ]
      }
      share_orders_v2: {
        Row: {
          avg_fill_price: number | null
          created_at: string
          expires_at: string | null
          filled_at: string | null
          filled_quantity: number
          id: string
          leverage: number
          price: number | null
          project_id: string
          quantity: number
          side: string
          status: string
          stop_price: number | null
          time_in_force: string
          type: string
          user_id: string
        }
        Insert: {
          avg_fill_price?: number | null
          created_at?: string
          expires_at?: string | null
          filled_at?: string | null
          filled_quantity?: number
          id?: string
          leverage?: number
          price?: number | null
          project_id: string
          quantity: number
          side: string
          status?: string
          stop_price?: number | null
          time_in_force?: string
          type: string
          user_id: string
        }
        Update: {
          avg_fill_price?: number | null
          created_at?: string
          expires_at?: string | null
          filled_at?: string | null
          filled_quantity?: number
          id?: string
          leverage?: number
          price?: number | null
          project_id?: string
          quantity?: number
          side?: string
          status?: string
          stop_price?: number | null
          time_in_force?: string
          type?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "share_orders_v2_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "share_orders_v2_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects_public"
            referencedColumns: ["id"]
          },
        ]
      }
      share_price_history: {
        Row: {
          close: number
          high: number
          id: string
          interval: string
          low: number
          open: number
          project_id: string
          ts: string
          volume: number
        }
        Insert: {
          close: number
          high: number
          id?: string
          interval?: string
          low: number
          open: number
          project_id: string
          ts?: string
          volume?: number
        }
        Update: {
          close?: number
          high?: number
          id?: string
          interval?: string
          low?: number
          open?: number
          project_id?: string
          ts?: string
          volume?: number
        }
        Relationships: [
          {
            foreignKeyName: "share_price_history_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "share_price_history_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects_public"
            referencedColumns: ["id"]
          },
        ]
      }
      share_trades: {
        Row: {
          buy_order_id: string | null
          buyer_fee: number
          buyer_id: string
          executed_at: string
          id: string
          price: number
          project_id: string
          quantity: number
          sell_order_id: string | null
          seller_fee: number
          seller_id: string
        }
        Insert: {
          buy_order_id?: string | null
          buyer_fee?: number
          buyer_id: string
          executed_at?: string
          id?: string
          price: number
          project_id: string
          quantity: number
          sell_order_id?: string | null
          seller_fee?: number
          seller_id: string
        }
        Update: {
          buy_order_id?: string | null
          buyer_fee?: number
          buyer_id?: string
          executed_at?: string
          id?: string
          price?: number
          project_id?: string
          quantity?: number
          sell_order_id?: string | null
          seller_fee?: number
          seller_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "share_trades_buy_order_id_fkey"
            columns: ["buy_order_id"]
            isOneToOne: false
            referencedRelation: "share_orders_v2"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "share_trades_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "share_trades_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects_public"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "share_trades_sell_order_id_fkey"
            columns: ["sell_order_id"]
            isOneToOne: false
            referencedRelation: "share_orders_v2"
            referencedColumns: ["id"]
          },
        ]
      }
      sim_runs: {
        Row: {
          created_at: string
          id: string
          project_id: string | null
          result: Json
          scenario: Json
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          project_id?: string | null
          result: Json
          scenario: Json
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          project_id?: string | null
          result?: Json
          scenario?: Json
          user_id?: string
        }
        Relationships: []
      }
      sm_accounts: {
        Row: {
          country_code: string
          created_at: string
          id: string
          kyc_tier: Database["public"]["Enums"]["sm_kyc_tier"]
          kyc_verified_at: string | null
          max_investment_cap: number
          status: Database["public"]["Enums"]["sm_account_status"]
          updated_at: string
          user_id: string
        }
        Insert: {
          country_code?: string
          created_at?: string
          id?: string
          kyc_tier?: Database["public"]["Enums"]["sm_kyc_tier"]
          kyc_verified_at?: string | null
          max_investment_cap?: number
          status?: Database["public"]["Enums"]["sm_account_status"]
          updated_at?: string
          user_id: string
        }
        Update: {
          country_code?: string
          created_at?: string
          id?: string
          kyc_tier?: Database["public"]["Enums"]["sm_kyc_tier"]
          kyc_verified_at?: string | null
          max_investment_cap?: number
          status?: Database["public"]["Enums"]["sm_account_status"]
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      sm_audit_log: {
        Row: {
          action: string
          actor_id: string | null
          created_at: string
          entity_id: string | null
          entity_type: string
          id: number
          ip_address: unknown
          payload: Json | null
        }
        Insert: {
          action: string
          actor_id?: string | null
          created_at?: string
          entity_id?: string | null
          entity_type: string
          id?: number
          ip_address?: unknown
          payload?: Json | null
        }
        Update: {
          action?: string
          actor_id?: string | null
          created_at?: string
          entity_id?: string | null
          entity_type?: string
          id?: number
          ip_address?: unknown
          payload?: Json | null
        }
        Relationships: []
      }
      sm_cap_table: {
        Row: {
          account_id: string
          id: string
          listing_id: string
          shares_held: number
          shares_pledged: number
          updated_at: string
        }
        Insert: {
          account_id: string
          id?: string
          listing_id: string
          shares_held?: number
          shares_pledged?: number
          updated_at?: string
        }
        Update: {
          account_id?: string
          id?: string
          listing_id?: string
          shares_held?: number
          shares_pledged?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "sm_cap_table_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: false
            referencedRelation: "sm_accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sm_cap_table_listing_id_fkey"
            columns: ["listing_id"]
            isOneToOne: false
            referencedRelation: "sm_listings"
            referencedColumns: ["id"]
          },
        ]
      }
      sm_compliance_flags: {
        Row: {
          account_id: string | null
          created_at: string
          details: Json
          flag_type: string
          id: string
          listing_id: string | null
          resolved: boolean
          resolved_by: string | null
          severity: Database["public"]["Enums"]["sm_flag_severity"]
        }
        Insert: {
          account_id?: string | null
          created_at?: string
          details?: Json
          flag_type: string
          id?: string
          listing_id?: string | null
          resolved?: boolean
          resolved_by?: string | null
          severity: Database["public"]["Enums"]["sm_flag_severity"]
        }
        Update: {
          account_id?: string | null
          created_at?: string
          details?: Json
          flag_type?: string
          id?: string
          listing_id?: string | null
          resolved?: boolean
          resolved_by?: string | null
          severity?: Database["public"]["Enums"]["sm_flag_severity"]
        }
        Relationships: [
          {
            foreignKeyName: "sm_compliance_flags_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: false
            referencedRelation: "sm_accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sm_compliance_flags_listing_id_fkey"
            columns: ["listing_id"]
            isOneToOne: false
            referencedRelation: "sm_listings"
            referencedColumns: ["id"]
          },
        ]
      }
      sm_financing_requests: {
        Row: {
          account_id: string | null
          admin_notes: string | null
          auto_reasons: string[]
          created_at: string
          deposit_amount: number
          id: string
          leverage_pct: number
          requested_loan: number
          reviewed_at: string | null
          reviewed_by: string | null
          status: Database["public"]["Enums"]["sm_financing_status"]
          updated_at: string
          user_id: string
        }
        Insert: {
          account_id?: string | null
          admin_notes?: string | null
          auto_reasons?: string[]
          created_at?: string
          deposit_amount: number
          id?: string
          leverage_pct?: number
          requested_loan: number
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: Database["public"]["Enums"]["sm_financing_status"]
          updated_at?: string
          user_id: string
        }
        Update: {
          account_id?: string | null
          admin_notes?: string | null
          auto_reasons?: string[]
          created_at?: string
          deposit_amount?: number
          id?: string
          leverage_pct?: number
          requested_loan?: number
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: Database["public"]["Enums"]["sm_financing_status"]
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "sm_financing_requests_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: false
            referencedRelation: "sm_accounts"
            referencedColumns: ["id"]
          },
        ]
      }
      sm_kyc_documents: {
        Row: {
          account_id: string
          doc_type: string
          id: string
          reviewed_by: string | null
          storage_ref: string
          uploaded_at: string
          verified: boolean
        }
        Insert: {
          account_id: string
          doc_type: string
          id?: string
          reviewed_by?: string | null
          storage_ref: string
          uploaded_at?: string
          verified?: boolean
        }
        Update: {
          account_id?: string
          doc_type?: string
          id?: string
          reviewed_by?: string | null
          storage_ref?: string
          uploaded_at?: string
          verified?: boolean
        }
        Relationships: [
          {
            foreignKeyName: "sm_kyc_documents_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: false
            referencedRelation: "sm_accounts"
            referencedColumns: ["id"]
          },
        ]
      }
      sm_liquidation_events: {
        Row: {
          executed_at: string
          id: string
          loan_id: string
          proceeds: number
          resulting_ratio: number | null
          shares_sold: number
          trigger_ratio: number
        }
        Insert: {
          executed_at?: string
          id?: string
          loan_id: string
          proceeds: number
          resulting_ratio?: number | null
          shares_sold: number
          trigger_ratio: number
        }
        Update: {
          executed_at?: string
          id?: string
          loan_id?: string
          proceeds?: number
          resulting_ratio?: number | null
          shares_sold?: number
          trigger_ratio?: number
        }
        Relationships: [
          {
            foreignKeyName: "sm_liquidation_events_loan_id_fkey"
            columns: ["loan_id"]
            isOneToOne: false
            referencedRelation: "sm_margin_loans"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sm_liquidation_events_loan_id_fkey"
            columns: ["loan_id"]
            isOneToOne: false
            referencedRelation: "sm_v_active_margin"
            referencedColumns: ["loan_id"]
          },
        ]
      }
      sm_listings: {
        Row: {
          annual_revenue: number | null
          collateral_value: number
          created_at: string
          daily_limit_pct: number
          id: string
          last_price_update_at: string
          max_valuation: number
          name: string
          owner_account_id: string
          platform_shares: number
          project_id: string | null
          reference_price: number
          solvency_score: number | null
          stage: Database["public"]["Enums"]["sm_listing_stage"]
          status: Database["public"]["Enums"]["sm_listing_status"]
          symbol: string
          total_shares: number
        }
        Insert: {
          annual_revenue?: number | null
          collateral_value?: number
          created_at?: string
          daily_limit_pct?: number
          id?: string
          last_price_update_at?: string
          max_valuation?: number
          name: string
          owner_account_id: string
          platform_shares?: number
          project_id?: string | null
          reference_price: number
          solvency_score?: number | null
          stage: Database["public"]["Enums"]["sm_listing_stage"]
          status?: Database["public"]["Enums"]["sm_listing_status"]
          symbol: string
          total_shares: number
        }
        Update: {
          annual_revenue?: number | null
          collateral_value?: number
          created_at?: string
          daily_limit_pct?: number
          id?: string
          last_price_update_at?: string
          max_valuation?: number
          name?: string
          owner_account_id?: string
          platform_shares?: number
          project_id?: string | null
          reference_price?: number
          solvency_score?: number | null
          stage?: Database["public"]["Enums"]["sm_listing_stage"]
          status?: Database["public"]["Enums"]["sm_listing_status"]
          symbol?: string
          total_shares?: number
        }
        Relationships: [
          {
            foreignKeyName: "sm_listings_owner_account_id_fkey"
            columns: ["owner_account_id"]
            isOneToOne: false
            referencedRelation: "sm_accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sm_listings_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sm_listings_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects_public"
            referencedColumns: ["id"]
          },
        ]
      }
      sm_margin_interest_accruals: {
        Row: {
          accrual_date: string
          created_at: string
          daily_rate: number
          id: number
          interest_amount: number
          loan_id: string
          principal_at_accrual: number
        }
        Insert: {
          accrual_date: string
          created_at?: string
          daily_rate: number
          id?: number
          interest_amount: number
          loan_id: string
          principal_at_accrual: number
        }
        Update: {
          accrual_date?: string
          created_at?: string
          daily_rate?: number
          id?: number
          interest_amount?: number
          loan_id?: string
          principal_at_accrual?: number
        }
        Relationships: [
          {
            foreignKeyName: "sm_margin_interest_accruals_loan_id_fkey"
            columns: ["loan_id"]
            isOneToOne: false
            referencedRelation: "sm_margin_loans"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sm_margin_interest_accruals_loan_id_fkey"
            columns: ["loan_id"]
            isOneToOne: false
            referencedRelation: "sm_v_active_margin"
            referencedColumns: ["loan_id"]
          },
        ]
      }
      sm_margin_loans: {
        Row: {
          account_id: string
          annual_interest_rate: number
          closed_at: string | null
          collateral_required_pct: number
          disbursed_at: string
          id: string
          last_interest_accrual_at: string
          liquidation_pct: number
          maintenance_pct: number
          outstanding_balance: number
          principal_amount: number
          status: Database["public"]["Enums"]["sm_margin_status"]
        }
        Insert: {
          account_id: string
          annual_interest_rate?: number
          closed_at?: string | null
          collateral_required_pct?: number
          disbursed_at?: string
          id?: string
          last_interest_accrual_at?: string
          liquidation_pct?: number
          maintenance_pct?: number
          outstanding_balance: number
          principal_amount: number
          status?: Database["public"]["Enums"]["sm_margin_status"]
        }
        Update: {
          account_id?: string
          annual_interest_rate?: number
          closed_at?: string | null
          collateral_required_pct?: number
          disbursed_at?: string
          id?: string
          last_interest_accrual_at?: string
          liquidation_pct?: number
          maintenance_pct?: number
          outstanding_balance?: number
          principal_amount?: number
          status?: Database["public"]["Enums"]["sm_margin_status"]
        }
        Relationships: [
          {
            foreignKeyName: "sm_margin_loans_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: false
            referencedRelation: "sm_accounts"
            referencedColumns: ["id"]
          },
        ]
      }
      sm_margin_snapshots: {
        Row: {
          account_value: number
          id: number
          loan_balance: number
          loan_id: string
          margin_ratio: number | null
          snapshot_at: string
        }
        Insert: {
          account_value: number
          id?: number
          loan_balance: number
          loan_id: string
          margin_ratio?: number | null
          snapshot_at?: string
        }
        Update: {
          account_value?: number
          id?: number
          loan_balance?: number
          loan_id?: string
          margin_ratio?: number | null
          snapshot_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "sm_margin_snapshots_loan_id_fkey"
            columns: ["loan_id"]
            isOneToOne: false
            referencedRelation: "sm_margin_loans"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sm_margin_snapshots_loan_id_fkey"
            columns: ["loan_id"]
            isOneToOne: false
            referencedRelation: "sm_v_active_margin"
            referencedColumns: ["loan_id"]
          },
        ]
      }
      sm_market_audit_log: {
        Row: {
          action: string
          created_at: string
          id: string
          ip_address: string | null
          listing_id: string | null
          metadata: Json | null
          reason: string | null
          success: boolean
          user_id: string | null
        }
        Insert: {
          action: string
          created_at?: string
          id?: string
          ip_address?: string | null
          listing_id?: string | null
          metadata?: Json | null
          reason?: string | null
          success?: boolean
          user_id?: string | null
        }
        Update: {
          action?: string
          created_at?: string
          id?: string
          ip_address?: string | null
          listing_id?: string | null
          metadata?: Json | null
          reason?: string | null
          success?: boolean
          user_id?: string | null
        }
        Relationships: []
      }
      sm_orders: {
        Row: {
          account_id: string
          created_at: string
          funded_by_margin_loan_id: string | null
          id: string
          listing_id: string
          price: number | null
          quantity: number
          remaining: number
          side: Database["public"]["Enums"]["sm_order_side"]
          status: Database["public"]["Enums"]["sm_order_status"]
          type: Database["public"]["Enums"]["sm_order_type"]
        }
        Insert: {
          account_id: string
          created_at?: string
          funded_by_margin_loan_id?: string | null
          id?: string
          listing_id: string
          price?: number | null
          quantity: number
          remaining: number
          side: Database["public"]["Enums"]["sm_order_side"]
          status?: Database["public"]["Enums"]["sm_order_status"]
          type: Database["public"]["Enums"]["sm_order_type"]
        }
        Update: {
          account_id?: string
          created_at?: string
          funded_by_margin_loan_id?: string | null
          id?: string
          listing_id?: string
          price?: number | null
          quantity?: number
          remaining?: number
          side?: Database["public"]["Enums"]["sm_order_side"]
          status?: Database["public"]["Enums"]["sm_order_status"]
          type?: Database["public"]["Enums"]["sm_order_type"]
        }
        Relationships: [
          {
            foreignKeyName: "sm_orders_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: false
            referencedRelation: "sm_accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sm_orders_listing_id_fkey"
            columns: ["listing_id"]
            isOneToOne: false
            referencedRelation: "sm_listings"
            referencedColumns: ["id"]
          },
        ]
      }
      sm_price_events: {
        Row: {
          delta_value: number
          event_type: string
          id: number
          listing_id: string
          occurred_at: string
          price_after: number
          price_before: number
        }
        Insert: {
          delta_value: number
          event_type: string
          id?: number
          listing_id: string
          occurred_at?: string
          price_after: number
          price_before: number
        }
        Update: {
          delta_value?: number
          event_type?: string
          id?: number
          listing_id?: string
          occurred_at?: string
          price_after?: number
          price_before?: number
        }
        Relationships: [
          {
            foreignKeyName: "sm_price_events_listing_id_fkey"
            columns: ["listing_id"]
            isOneToOne: false
            referencedRelation: "sm_listings"
            referencedColumns: ["id"]
          },
        ]
      }
      sm_trades: {
        Row: {
          buy_order_id: string
          buyer_account_id: string
          executed_at: string
          id: string
          listing_id: string
          price: number
          quantity: number
          sell_order_id: string
          seller_account_id: string
        }
        Insert: {
          buy_order_id: string
          buyer_account_id: string
          executed_at?: string
          id?: string
          listing_id: string
          price: number
          quantity: number
          sell_order_id: string
          seller_account_id: string
        }
        Update: {
          buy_order_id?: string
          buyer_account_id?: string
          executed_at?: string
          id?: string
          listing_id?: string
          price?: number
          quantity?: number
          sell_order_id?: string
          seller_account_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "sm_trades_buy_order_id_fkey"
            columns: ["buy_order_id"]
            isOneToOne: false
            referencedRelation: "sm_orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sm_trades_buyer_account_id_fkey"
            columns: ["buyer_account_id"]
            isOneToOne: false
            referencedRelation: "sm_accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sm_trades_listing_id_fkey"
            columns: ["listing_id"]
            isOneToOne: false
            referencedRelation: "sm_listings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sm_trades_sell_order_id_fkey"
            columns: ["sell_order_id"]
            isOneToOne: false
            referencedRelation: "sm_orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sm_trades_seller_account_id_fkey"
            columns: ["seller_account_id"]
            isOneToOne: false
            referencedRelation: "sm_accounts"
            referencedColumns: ["id"]
          },
        ]
      }
      sm_wallet_ledger: {
        Row: {
          amount: number
          balance_after: number
          created_at: string
          entry_type: Database["public"]["Enums"]["sm_ledger_entry"]
          id: number
          memo: string | null
          reference_id: string | null
          wallet_id: string
        }
        Insert: {
          amount: number
          balance_after: number
          created_at?: string
          entry_type: Database["public"]["Enums"]["sm_ledger_entry"]
          id?: number
          memo?: string | null
          reference_id?: string | null
          wallet_id: string
        }
        Update: {
          amount?: number
          balance_after?: number
          created_at?: string
          entry_type?: Database["public"]["Enums"]["sm_ledger_entry"]
          id?: number
          memo?: string | null
          reference_id?: string | null
          wallet_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "sm_wallet_ledger_wallet_id_fkey"
            columns: ["wallet_id"]
            isOneToOne: false
            referencedRelation: "sm_wallets"
            referencedColumns: ["id"]
          },
        ]
      }
      sm_wallets: {
        Row: {
          account_id: string
          balance: number
          currency: string
          id: string
          updated_at: string
          wallet_type: Database["public"]["Enums"]["sm_wallet_type"]
          withdraw_locked: boolean
        }
        Insert: {
          account_id: string
          balance?: number
          currency?: string
          id?: string
          updated_at?: string
          wallet_type: Database["public"]["Enums"]["sm_wallet_type"]
          withdraw_locked?: boolean
        }
        Update: {
          account_id?: string
          balance?: number
          currency?: string
          id?: string
          updated_at?: string
          wallet_type?: Database["public"]["Enums"]["sm_wallet_type"]
          withdraw_locked?: boolean
        }
        Relationships: [
          {
            foreignKeyName: "sm_wallets_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: false
            referencedRelation: "sm_accounts"
            referencedColumns: ["id"]
          },
        ]
      }
      stripe_event_log: {
        Row: {
          event_id: string
          received_at: string
        }
        Insert: {
          event_id: string
          received_at?: string
        }
        Update: {
          event_id?: string
          received_at?: string
        }
        Relationships: []
      }
      supervisor_subscriptions: {
        Row: {
          currency: string
          id: string
          investor_id: string
          monthly_fee: number
          next_billing_at: string
          project_id: string
          started_at: string
          status: string
          supervisor_name: string | null
        }
        Insert: {
          currency?: string
          id?: string
          investor_id: string
          monthly_fee?: number
          next_billing_at?: string
          project_id: string
          started_at?: string
          status?: string
          supervisor_name?: string | null
        }
        Update: {
          currency?: string
          id?: string
          investor_id?: string
          monthly_fee?: number
          next_billing_at?: string
          project_id?: string
          started_at?: string
          status?: string
          supervisor_name?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "supervisor_subscriptions_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "supervisor_subscriptions_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects_public"
            referencedColumns: ["id"]
          },
        ]
      }
      support_tickets: {
        Row: {
          access_token: string
          admin_reply: string | null
          attachment_url: string | null
          created_at: string
          email: string | null
          id: string
          message: string
          name: string | null
          replied_at: string | null
          resolved_at: string | null
          status: Database["public"]["Enums"]["ticket_status"]
          subject: string
          user_id: string | null
          whatsapp: string | null
        }
        Insert: {
          access_token?: string
          admin_reply?: string | null
          attachment_url?: string | null
          created_at?: string
          email?: string | null
          id?: string
          message: string
          name?: string | null
          replied_at?: string | null
          resolved_at?: string | null
          status?: Database["public"]["Enums"]["ticket_status"]
          subject: string
          user_id?: string | null
          whatsapp?: string | null
        }
        Update: {
          access_token?: string
          admin_reply?: string | null
          attachment_url?: string | null
          created_at?: string
          email?: string | null
          id?: string
          message?: string
          name?: string | null
          replied_at?: string | null
          resolved_at?: string | null
          status?: Database["public"]["Enums"]["ticket_status"]
          subject?: string
          user_id?: string | null
          whatsapp?: string | null
        }
        Relationships: []
      }
      suppressed_emails: {
        Row: {
          created_at: string
          email: string
          id: string
          metadata: Json | null
          reason: string
        }
        Insert: {
          created_at?: string
          email: string
          id?: string
          metadata?: Json | null
          reason: string
        }
        Update: {
          created_at?: string
          email?: string
          id?: string
          metadata?: Json | null
          reason?: string
        }
        Relationships: []
      }
      swarm_sentiment: {
        Row: {
          bids_24h: number
          buys_24h: number
          contrarian_alert: boolean
          project_id: string
          sells_24h: number
          sentiment_score: number
          updated_at: string
          watchers: number
        }
        Insert: {
          bids_24h?: number
          buys_24h?: number
          contrarian_alert?: boolean
          project_id: string
          sells_24h?: number
          sentiment_score?: number
          updated_at?: string
          watchers?: number
        }
        Update: {
          bids_24h?: number
          buys_24h?: number
          contrarian_alert?: boolean
          project_id?: string
          sells_24h?: number
          sentiment_score?: number
          updated_at?: string
          watchers?: number
        }
        Relationships: []
      }
      system_health_checks: {
        Row: {
          checked_at: string
          detail: Json | null
          id: number
          latency_ms: number | null
          service: string
          status: string
        }
        Insert: {
          checked_at?: string
          detail?: Json | null
          id?: number
          latency_ms?: number | null
          service: string
          status: string
        }
        Update: {
          checked_at?: string
          detail?: Json | null
          id?: number
          latency_ms?: number | null
          service?: string
          status?: string
        }
        Relationships: []
      }
      tenant_provider_configs: {
        Row: {
          connected_at: string | null
          created_at: string
          credentials: Json
          id: string
          last_error: string | null
          last_verified_at: string | null
          provider_id: string
          settings: Json
          status: string
          tenant_id: string | null
          updated_at: string
        }
        Insert: {
          connected_at?: string | null
          created_at?: string
          credentials?: Json
          id?: string
          last_error?: string | null
          last_verified_at?: string | null
          provider_id: string
          settings?: Json
          status?: string
          tenant_id?: string | null
          updated_at?: string
        }
        Update: {
          connected_at?: string | null
          created_at?: string
          credentials?: Json
          id?: string
          last_error?: string | null
          last_verified_at?: string | null
          provider_id?: string
          settings?: Json
          status?: string
          tenant_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "tenant_provider_configs_provider_id_fkey"
            columns: ["provider_id"]
            isOneToOne: false
            referencedRelation: "providers"
            referencedColumns: ["id"]
          },
        ]
      }
      transactions: {
        Row: {
          amount: number
          created_at: string
          currency: string
          description: string | null
          id: string
          metadata: Json | null
          project_id: string | null
          related_user_id: string | null
          type: Database["public"]["Enums"]["txn_type"]
          user_id: string
        }
        Insert: {
          amount: number
          created_at?: string
          currency?: string
          description?: string | null
          id?: string
          metadata?: Json | null
          project_id?: string | null
          related_user_id?: string | null
          type: Database["public"]["Enums"]["txn_type"]
          user_id: string
        }
        Update: {
          amount?: number
          created_at?: string
          currency?: string
          description?: string | null
          id?: string
          metadata?: Json | null
          project_id?: string | null
          related_user_id?: string | null
          type?: Database["public"]["Enums"]["txn_type"]
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "transactions_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "transactions_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects_public"
            referencedColumns: ["id"]
          },
        ]
      }
      trust_chain_blocks: {
        Row: {
          block_hash: string
          event_count: number
          height: number
          merkle_root: string
          prev_hash: string | null
          sealed_at: string
        }
        Insert: {
          block_hash: string
          event_count: number
          height?: number
          merkle_root: string
          prev_hash?: string | null
          sealed_at?: string
        }
        Update: {
          block_hash?: string
          event_count?: number
          height?: number
          merkle_root?: string
          prev_hash?: string | null
          sealed_at?: string
        }
        Relationships: []
      }
      two_factor_auth: {
        Row: {
          backup_codes_hash: string[] | null
          created_at: string
          enabled_at: string | null
          id: string
          is_enabled: boolean
          method: string
          secret_encrypted: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          backup_codes_hash?: string[] | null
          created_at?: string
          enabled_at?: string | null
          id?: string
          is_enabled?: boolean
          method: string
          secret_encrypted?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          backup_codes_hash?: string[] | null
          created_at?: string
          enabled_at?: string | null
          id?: string
          is_enabled?: boolean
          method?: string
          secret_encrypted?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      user_achievements: {
        Row: {
          achievement_id: string
          id: string
          unlocked_at: string | null
          user_id: string
        }
        Insert: {
          achievement_id: string
          id?: string
          unlocked_at?: string | null
          user_id: string
        }
        Update: {
          achievement_id?: string
          id?: string
          unlocked_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_achievements_achievement_id_fkey"
            columns: ["achievement_id"]
            isOneToOne: false
            referencedRelation: "achievements"
            referencedColumns: ["id"]
          },
        ]
      }
      user_badges: {
        Row: {
          awarded_at: string
          awarded_by: string
          badge_id: string
          id: string
          scoring_snapshot: Json
          user_id: string
        }
        Insert: {
          awarded_at?: string
          awarded_by?: string
          badge_id: string
          id?: string
          scoring_snapshot?: Json
          user_id: string
        }
        Update: {
          awarded_at?: string
          awarded_by?: string
          badge_id?: string
          id?: string
          scoring_snapshot?: Json
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_badges_badge_id_fkey"
            columns: ["badge_id"]
            isOneToOne: false
            referencedRelation: "badges"
            referencedColumns: ["id"]
          },
        ]
      }
      user_bank_accounts: {
        Row: {
          account_holder_name: string
          account_number: string | null
          bank_name: string
          country_code: string
          created_at: string
          currency: string
          iban: string | null
          id: string
          is_default: boolean
          is_verified: boolean
          nickname: string | null
          swift_code: string | null
          updated_at: string
          user_id: string
          verification_method: string | null
        }
        Insert: {
          account_holder_name: string
          account_number?: string | null
          bank_name: string
          country_code: string
          created_at?: string
          currency: string
          iban?: string | null
          id?: string
          is_default?: boolean
          is_verified?: boolean
          nickname?: string | null
          swift_code?: string | null
          updated_at?: string
          user_id: string
          verification_method?: string | null
        }
        Update: {
          account_holder_name?: string
          account_number?: string | null
          bank_name?: string
          country_code?: string
          created_at?: string
          currency?: string
          iban?: string | null
          id?: string
          is_default?: boolean
          is_verified?: boolean
          nickname?: string | null
          swift_code?: string | null
          updated_at?: string
          user_id?: string
          verification_method?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "user_bank_accounts_currency_fkey"
            columns: ["currency"]
            isOneToOne: false
            referencedRelation: "currency_config"
            referencedColumns: ["code"]
          },
        ]
      }
      user_blocks: {
        Row: {
          blocked_id: string
          blocker_id: string
          created_at: string
          reason: string | null
        }
        Insert: {
          blocked_id: string
          blocker_id: string
          created_at?: string
          reason?: string | null
        }
        Update: {
          blocked_id?: string
          blocker_id?: string
          created_at?: string
          reason?: string | null
        }
        Relationships: []
      }
      user_journey: {
        Row: {
          auto_stage: string | null
          created_at: string
          last_detected_at: string | null
          marked_stages: string[]
          metadata: Json
          updated_at: string
          user_id: string
        }
        Insert: {
          auto_stage?: string | null
          created_at?: string
          last_detected_at?: string | null
          marked_stages?: string[]
          metadata?: Json
          updated_at?: string
          user_id: string
        }
        Update: {
          auto_stage?: string | null
          created_at?: string
          last_detected_at?: string | null
          marked_stages?: string[]
          metadata?: Json
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      user_points_log: {
        Row: {
          created_at: string | null
          id: string
          points: number
          reason: string
          ref_id: string | null
          ref_type: string | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          points: number
          reason: string
          ref_id?: string | null
          ref_type?: string | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          points?: number
          reason?: string
          ref_id?: string | null
          ref_type?: string | null
          user_id?: string
        }
        Relationships: []
      }
      user_preferences: {
        Row: {
          email_alerts: boolean
          hide_read_receipts: boolean
          locale: string
          messages_email: boolean
          messages_push: boolean
          messages_silent: boolean
          push_alerts: boolean
          theme: string
          twofa_enabled: boolean
          updated_at: string
          user_id: string
        }
        Insert: {
          email_alerts?: boolean
          hide_read_receipts?: boolean
          locale?: string
          messages_email?: boolean
          messages_push?: boolean
          messages_silent?: boolean
          push_alerts?: boolean
          theme?: string
          twofa_enabled?: boolean
          updated_at?: string
          user_id: string
        }
        Update: {
          email_alerts?: boolean
          hide_read_receipts?: boolean
          locale?: string
          messages_email?: boolean
          messages_push?: boolean
          messages_silent?: boolean
          push_alerts?: boolean
          theme?: string
          twofa_enabled?: boolean
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      user_ratings: {
        Row: {
          comment: string | null
          created_at: string
          deal_ref_id: string
          deal_ref_type: string
          id: string
          rated_id: string
          rater_id: string
          stars_commitment: number
          stars_communication: number
          stars_overall: number
          stars_professionalism: number
          stars_speed: number
          stars_transparency: number
        }
        Insert: {
          comment?: string | null
          created_at?: string
          deal_ref_id: string
          deal_ref_type: string
          id?: string
          rated_id: string
          rater_id: string
          stars_commitment: number
          stars_communication: number
          stars_overall: number
          stars_professionalism: number
          stars_speed: number
          stars_transparency: number
        }
        Update: {
          comment?: string | null
          created_at?: string
          deal_ref_id?: string
          deal_ref_type?: string
          id?: string
          rated_id?: string
          rater_id?: string
          stars_commitment?: number
          stars_communication?: number
          stars_overall?: number
          stars_professionalism?: number
          stars_speed?: number
          stars_transparency?: number
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
      user_security_profiles: {
        Row: {
          created_at: string
          device_fingerprint: string | null
          last_ip: string | null
          last_seen: string
          suspended_until: string | null
          trust_score: number
          user_id: string
        }
        Insert: {
          created_at?: string
          device_fingerprint?: string | null
          last_ip?: string | null
          last_seen?: string
          suspended_until?: string | null
          trust_score?: number
          user_id: string
        }
        Update: {
          created_at?: string
          device_fingerprint?: string | null
          last_ip?: string | null
          last_seen?: string
          suspended_until?: string | null
          trust_score?: number
          user_id?: string
        }
        Relationships: []
      }
      user_sessions: {
        Row: {
          created_at: string
          device_info: Json | null
          expires_at: string
          id: string
          ip_address: unknown
          is_active: boolean
          last_used_at: string
          revoked_at: string | null
          token_hash: string
          user_agent: string | null
          user_id: string
        }
        Insert: {
          created_at?: string
          device_info?: Json | null
          expires_at: string
          id?: string
          ip_address?: unknown
          is_active?: boolean
          last_used_at?: string
          revoked_at?: string | null
          token_hash: string
          user_agent?: string | null
          user_id: string
        }
        Update: {
          created_at?: string
          device_info?: Json | null
          expires_at?: string
          id?: string
          ip_address?: unknown
          is_active?: boolean
          last_used_at?: string
          revoked_at?: string | null
          token_hash?: string
          user_agent?: string | null
          user_id?: string
        }
        Relationships: []
      }
      voice_commands_log: {
        Row: {
          created_at: string
          id: string
          parsed: Json | null
          status: string
          transcript: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          parsed?: Json | null
          status?: string
          transcript: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          parsed?: Json | null
          status?: string
          transcript?: string
          user_id?: string
        }
        Relationships: []
      }
      wallet_security_policies: {
        Row: {
          created_at: string
          daily_limit_minor: number
          lockdown: boolean
          lockdown_reason: string | null
          per_tx_limit_minor: number
          require_otp_above_minor: number
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          daily_limit_minor?: number
          lockdown?: boolean
          lockdown_reason?: string | null
          per_tx_limit_minor?: number
          require_otp_above_minor?: number
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          daily_limit_minor?: number
          lockdown?: boolean
          lockdown_reason?: string | null
          per_tx_limit_minor?: number
          require_otp_above_minor?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      wallet_sub_accounts: {
        Row: {
          available_minor: number
          created_at: string
          currency: string
          held_minor: number
          id: string
          is_primary: boolean
          status: string
          sub_wallet_code: string
          updated_at: string
          user_id: string
          virtual_account_number: string | null
        }
        Insert: {
          available_minor?: number
          created_at?: string
          currency: string
          held_minor?: number
          id?: string
          is_primary?: boolean
          status?: string
          sub_wallet_code: string
          updated_at?: string
          user_id: string
          virtual_account_number?: string | null
        }
        Update: {
          available_minor?: number
          created_at?: string
          currency?: string
          held_minor?: number
          id?: string
          is_primary?: boolean
          status?: string
          sub_wallet_code?: string
          updated_at?: string
          user_id?: string
          virtual_account_number?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "wallet_sub_accounts_currency_fkey"
            columns: ["currency"]
            isOneToOne: false
            referencedRelation: "currency_config"
            referencedColumns: ["code"]
          },
        ]
      }
      wallets: {
        Row: {
          balance: number
          bank_account_id: string | null
          bank_iban: string | null
          bank_iban_created_at: string | null
          created_at: string
          currency: string
          held: number
          kyc_tier: string
          last_activity_at: string
          pin_failed_count: number
          pin_hash: string | null
          pin_locked_until: string | null
          self_frozen: boolean
          self_frozen_at: string | null
          status: string
          user_id: string
          virtual_iban: string | null
          wallet_code: string | null
        }
        Insert: {
          balance?: number
          bank_account_id?: string | null
          bank_iban?: string | null
          bank_iban_created_at?: string | null
          created_at?: string
          currency?: string
          held?: number
          kyc_tier?: string
          last_activity_at?: string
          pin_failed_count?: number
          pin_hash?: string | null
          pin_locked_until?: string | null
          self_frozen?: boolean
          self_frozen_at?: string | null
          status?: string
          user_id: string
          virtual_iban?: string | null
          wallet_code?: string | null
        }
        Update: {
          balance?: number
          bank_account_id?: string | null
          bank_iban?: string | null
          bank_iban_created_at?: string | null
          created_at?: string
          currency?: string
          held?: number
          kyc_tier?: string
          last_activity_at?: string
          pin_failed_count?: number
          pin_hash?: string | null
          pin_locked_until?: string | null
          self_frozen?: boolean
          self_frozen_at?: string | null
          status?: string
          user_id?: string
          virtual_iban?: string | null
          wallet_code?: string | null
        }
        Relationships: []
      }
      watchlist: {
        Row: {
          created_at: string
          id: string
          note: string | null
          project_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          note?: string | null
          project_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          note?: string | null
          project_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "watchlist_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "watchlist_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects_public"
            referencedColumns: ["id"]
          },
        ]
      }
      web4_activations: {
        Row: {
          activated: boolean
          created_at: string
          geo_granted: boolean
          last_accuracy_m: number | null
          last_lat: number | null
          last_lng: number | null
          mic_granted: boolean
          reality_dim: number
          updated_at: string
          user_agent: string | null
          user_id: string
        }
        Insert: {
          activated?: boolean
          created_at?: string
          geo_granted?: boolean
          last_accuracy_m?: number | null
          last_lat?: number | null
          last_lng?: number | null
          mic_granted?: boolean
          reality_dim?: number
          updated_at?: string
          user_agent?: string | null
          user_id: string
        }
        Update: {
          activated?: boolean
          created_at?: string
          geo_granted?: boolean
          last_accuracy_m?: number | null
          last_lat?: number | null
          last_lng?: number | null
          mic_granted?: boolean
          reality_dim?: number
          updated_at?: string
          user_agent?: string | null
          user_id?: string
        }
        Relationships: []
      }
      web4_audit_log: {
        Row: {
          broadcast_agents: boolean
          created_at: string
          error_message: string | null
          geo_state: string | null
          id: number
          mic_state: string | null
          outcome: string
          reality_dim: number | null
          user_agent: string | null
          user_id: string | null
        }
        Insert: {
          broadcast_agents?: boolean
          created_at?: string
          error_message?: string | null
          geo_state?: string | null
          id?: number
          mic_state?: string | null
          outcome: string
          reality_dim?: number | null
          user_agent?: string | null
          user_id?: string | null
        }
        Update: {
          broadcast_agents?: boolean
          created_at?: string
          error_message?: string | null
          geo_state?: string | null
          id?: number
          mic_state?: string | null
          outcome?: string
          reality_dim?: number | null
          user_agent?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      webhook_deliveries: {
        Row: {
          attempts: number
          created_at: string
          delivered_at: string | null
          event: string
          id: number
          payload: Json
          response: string | null
          status_code: number | null
          webhook_id: string
        }
        Insert: {
          attempts?: number
          created_at?: string
          delivered_at?: string | null
          event: string
          id?: number
          payload: Json
          response?: string | null
          status_code?: number | null
          webhook_id: string
        }
        Update: {
          attempts?: number
          created_at?: string
          delivered_at?: string | null
          event?: string
          id?: number
          payload?: Json
          response?: string | null
          status_code?: number | null
          webhook_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "webhook_deliveries_webhook_id_fkey"
            columns: ["webhook_id"]
            isOneToOne: false
            referencedRelation: "developer_webhooks"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      community_posts_public: {
        Row: {
          category: string | null
          comments_count: number | null
          content: string | null
          created_at: string | null
          display_as_alias: boolean | null
          id: string | null
          likes_count: number | null
          linked_project_id: string | null
          media_urls: string[] | null
          post_type: string | null
          repost_of: string | null
          reposts_count: number | null
          status: string | null
          title: string | null
          updated_at: string | null
          user_id: string | null
        }
        Insert: {
          category?: string | null
          comments_count?: number | null
          content?: string | null
          created_at?: string | null
          display_as_alias?: boolean | null
          id?: string | null
          likes_count?: number | null
          linked_project_id?: string | null
          media_urls?: string[] | null
          post_type?: string | null
          repost_of?: string | null
          reposts_count?: number | null
          status?: string | null
          title?: string | null
          updated_at?: string | null
          user_id?: never
        }
        Update: {
          category?: string | null
          comments_count?: number | null
          content?: string | null
          created_at?: string | null
          display_as_alias?: boolean | null
          id?: string | null
          likes_count?: number | null
          linked_project_id?: string | null
          media_urls?: string[] | null
          post_type?: string | null
          repost_of?: string | null
          reposts_count?: number | null
          status?: string | null
          title?: string | null
          updated_at?: string | null
          user_id?: never
        }
        Relationships: [
          {
            foreignKeyName: "community_posts_linked_project_id_fkey"
            columns: ["linked_project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "community_posts_linked_project_id_fkey"
            columns: ["linked_project_id"]
            isOneToOne: false
            referencedRelation: "projects_public"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "community_posts_repost_of_fkey"
            columns: ["repost_of"]
            isOneToOne: false
            referencedRelation: "community_posts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "community_posts_repost_of_fkey"
            columns: ["repost_of"]
            isOneToOne: false
            referencedRelation: "community_posts_public"
            referencedColumns: ["id"]
          },
        ]
      }
      market_stats_mv: {
        Row: {
          active_projects: number | null
          avg_ai_score: number | null
          avg_share_price: number | null
          new_24h: number | null
          refreshed_at: string | null
          total_projects: number | null
          unique_owners: number | null
        }
        Relationships: []
      }
      mv_sm_project_daily_stats: {
        Row: {
          close: number | null
          high: number | null
          listing_id: string | null
          low: number | null
          open: number | null
          trading_day: string | null
          volatility: number | null
          volume: number | null
        }
        Relationships: [
          {
            foreignKeyName: "sm_trades_listing_id_fkey"
            columns: ["listing_id"]
            isOneToOne: false
            referencedRelation: "sm_listings"
            referencedColumns: ["id"]
          },
        ]
      }
      projects_public: {
        Row: {
          ai_score: number | null
          city: string | null
          country: string | null
          cover_image_url: string | null
          created_at: string | null
          currency: string | null
          current_price: number | null
          description: string | null
          id: string | null
          likes_count: number | null
          name: string | null
          owner_id: string | null
          sector: string | null
          shares_sold: number | null
          shares_total: number | null
          status: Database["public"]["Enums"]["project_status"] | null
          target_investment: number | null
          ticker: string | null
          updated_at: string | null
          views_count: number | null
          whatsapp_visible: string | null
        }
        Insert: {
          ai_score?: number | null
          city?: string | null
          country?: string | null
          cover_image_url?: string | null
          created_at?: string | null
          currency?: string | null
          current_price?: number | null
          description?: string | null
          id?: string | null
          likes_count?: number | null
          name?: string | null
          owner_id?: string | null
          sector?: string | null
          shares_sold?: number | null
          shares_total?: number | null
          status?: Database["public"]["Enums"]["project_status"] | null
          target_investment?: number | null
          ticker?: string | null
          updated_at?: string | null
          views_count?: number | null
          whatsapp_visible?: never
        }
        Update: {
          ai_score?: number | null
          city?: string | null
          country?: string | null
          cover_image_url?: string | null
          created_at?: string | null
          currency?: string | null
          current_price?: number | null
          description?: string | null
          id?: string | null
          likes_count?: number | null
          name?: string | null
          owner_id?: string | null
          sector?: string | null
          shares_sold?: number | null
          shares_total?: number | null
          status?: Database["public"]["Enums"]["project_status"] | null
          target_investment?: number | null
          ticker?: string | null
          updated_at?: string | null
          views_count?: number | null
          whatsapp_visible?: never
        }
        Relationships: []
      }
      public_profiles: {
        Row: {
          alias_name: string | null
          avatar_url: string | null
          bio: string | null
          city: string | null
          country: string | null
          created_at: string | null
          display_name: string | null
          followers_count: number | null
          id: string | null
          membership: Database["public"]["Enums"]["membership_tier"] | null
          pseudonym: string | null
          verified_blue: boolean | null
          verified_green: boolean | null
        }
        Insert: {
          alias_name?: string | null
          avatar_url?: string | null
          bio?: string | null
          city?: string | null
          country?: string | null
          created_at?: string | null
          display_name?: string | null
          followers_count?: number | null
          id?: string | null
          membership?: Database["public"]["Enums"]["membership_tier"] | null
          pseudonym?: string | null
          verified_blue?: boolean | null
          verified_green?: boolean | null
        }
        Update: {
          alias_name?: string | null
          avatar_url?: string | null
          bio?: string | null
          city?: string | null
          country?: string | null
          created_at?: string | null
          display_name?: string | null
          followers_count?: number | null
          id?: string | null
          membership?: Database["public"]["Enums"]["membership_tier"] | null
          pseudonym?: string | null
          verified_blue?: boolean | null
          verified_green?: boolean | null
        }
        Relationships: []
      }
      referral_leaderboard_v: {
        Row: {
          avatar_url: string | null
          clicks: number | null
          conversion_rate: number | null
          pseudonym: string | null
          referrer_id: string | null
          reward_total: number | null
          uses_count: number | null
        }
        Relationships: []
      }
      sm_mv_daily_stats: {
        Row: {
          close_p: number | null
          high: number | null
          listing_id: string | null
          low: number | null
          open_p: number | null
          trading_day: string | null
          volatility: number | null
          volume: number | null
        }
        Relationships: [
          {
            foreignKeyName: "sm_trades_listing_id_fkey"
            columns: ["listing_id"]
            isOneToOne: false
            referencedRelation: "sm_listings"
            referencedColumns: ["id"]
          },
        ]
      }
      sm_v_active_margin: {
        Row: {
          account_id: string | null
          account_value: number | null
          loan_balance: number | null
          loan_id: string | null
          margin_ratio: number | null
          outstanding_balance: number | null
          snapshot_at: string | null
          status: Database["public"]["Enums"]["sm_margin_status"] | null
        }
        Relationships: [
          {
            foreignKeyName: "sm_margin_loans_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: false
            referencedRelation: "sm_accounts"
            referencedColumns: ["id"]
          },
        ]
      }
      user_trust_stats: {
        Row: {
          funded_projects_count: number | null
          investments_count: number | null
          projects_count: number | null
          trust_level: string | null
          user_id: string | null
        }
        Insert: {
          funded_projects_count?: never
          investments_count?: never
          projects_count?: never
          trust_level?: never
          user_id?: string | null
        }
        Update: {
          funded_projects_count?: never
          investments_count?: never
          projects_count?: never
          trust_level?: never
          user_id?: string | null
        }
        Relationships: []
      }
    }
    Functions: {
      _ad_price_click: { Args: never; Returns: number }
      _ad_price_impression: { Args: never; Returns: number }
      activate_membership_paid: { Args: { p_user_id: string }; Returns: string }
      admin_block_ip: {
        Args: { p_ip: string; p_minutes?: number; p_reason: string }
        Returns: string
      }
      admin_get_profile: {
        Args: { _user_id: string }
        Returns: {
          alias_name: string | null
          avatar_url: string | null
          bio: string | null
          business_bio: string | null
          city: string | null
          country: string | null
          cover_image_url: string | null
          created_at: string
          date_of_birth: string | null
          deals_completed: number
          display_name: string | null
          dob_enc: string | null
          followers_count: number
          id: string
          investment_volume_visible: boolean
          is_public_profile: boolean
          kyc_document_url: string | null
          kyc_selfie_url: string | null
          kyc_status: Database["public"]["Enums"]["kyc_status"]
          last_seen_at: string | null
          legal_full_name: string | null
          membership: Database["public"]["Enums"]["membership_tier"]
          membership_expires_at: string | null
          monthly_income: number | null
          monthly_obligations: number | null
          national_id_enc: string | null
          nationality: string | null
          net_worth: number | null
          occupation: string | null
          phone: string | null
          phone_enc: string | null
          points: number
          pseudonym: string | null
          referred_by: string | null
          reputation_score: number
          response_rate_pct: number
          show_whatsapp: boolean
          updated_at: string
          use_alias_default: boolean
          username: string | null
          verified_blue: boolean
          verified_diamond: boolean
          verified_gold: boolean
          verified_green: boolean
          whatsapp: string | null
        }[]
        SetofOptions: {
          from: "*"
          to: "profiles"
          isOneToOne: false
          isSetofReturn: true
        }
      }
      admin_unblock_ip: { Args: { p_ip: string }; Returns: undefined }
      admin_wallet_lockdown: {
        Args: { p_locked: boolean; p_reason?: string; p_user_id: string }
        Returns: undefined
      }
      agents_can_use_tool: {
        Args: { _agent_id: string; _tool: string; _user_id: string }
        Returns: boolean
      }
      agents_today_usage: {
        Args: { _agent_id: string; _user_id: string }
        Returns: number
      }
      archive_old_data: { Args: never; Returns: Json }
      assign_self_iban: {
        Args: { p_country?: string; p_user_id: string }
        Returns: string
      }
      attach_referral_on_signup: {
        Args: { p_code: string; p_new_user_id: string }
        Returns: boolean
      }
      award_points:
        | {
            Args: {
              _points: number
              _reason: string
              _ref_id?: string
              _ref_type?: string
              _user: string
            }
            Returns: undefined
          }
        | { Args: { _delta: number; _user_id: string }; Returns: undefined }
      award_reputation: {
        Args: {
          _delta: number
          _event_type: string
          _ref_id?: string
          _ref_type?: string
          _user_id: string
        }
        Returns: number
      }
      bump_my_project: {
        Args: { p_project_id: string }
        Returns: {
          last_bumped_at: string
          message: string
          next_allowed_at: string
          ok: boolean
        }[]
      }
      bump_post_share: { Args: { _post_id: string }; Returns: undefined }
      buy_shares: {
        Args: { _project_id: string; _shares: number }
        Returns: string
      }
      cancel_share_order: { Args: { p_order_id: string }; Returns: undefined }
      charge_commission: {
        Args: {
          p_base_amount: number
          p_currency?: string
          p_source_id: string
          p_source_type: string
          p_user_id: string
        }
        Returns: number
      }
      check_ad_content_blocked: { Args: { p_text: string }; Returns: string }
      check_and_consume_quota: { Args: { _action: string }; Returns: boolean }
      check_rate_limit:
        | {
            Args: {
              _action: string
              _max_count: number
              _window_seconds: number
            }
            Returns: undefined
          }
        | {
            Args: {
              p_action: string
              p_ip: string
              p_max: number
              p_user_id: string
              p_window_seconds: number
            }
            Returns: boolean
          }
      claim_referral: { Args: { p_code: string }; Returns: Json }
      cleanup_old_backup_snapshots: { Args: never; Returns: number }
      close_expired_auctions: { Args: never; Returns: number }
      complete_payout: {
        Args: { p_payout_id: string; p_reason?: string; p_success: boolean }
        Returns: {
          admin_notes: string | null
          amount_minor: number
          channel: string
          created_at: string
          currency: string
          destination_enc: string
          destination_masked: string
          eta_release_at: string | null
          id: string
          reason: string | null
          reference: string
          status: string
          support_ticket_id: string | null
          updated_at: string
          user_id: string
        }
        SetofOptions: {
          from: "*"
          to: "payout_requests"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      compute_ad_quality_score: {
        Args: { p_campaign_id: string }
        Returns: number
      }
      compute_trust_level: { Args: { _user_id: string }; Returns: string }
      create_backup_snapshot: { Args: never; Returns: string }
      create_project_from_wizard: { Args: { _payload: Json }; Returns: Json }
      debit_wallet: {
        Args: { p_amount: number; p_reference?: string; p_user_id: string }
        Returns: number
      }
      decrypt_my_profile_pii: {
        Args: never
        Returns: {
          date_of_birth: string
          national_id: string
          phone: string
        }[]
      }
      decrypt_pii: { Args: { p_cipher: string }; Returns: string }
      delete_email: {
        Args: { message_id: number; queue_name: string }
        Returns: boolean
      }
      delete_ticket_by_token: { Args: { p_token: string }; Returns: boolean }
      duplicate_ad_campaign: { Args: { p_source_id: string }; Returns: string }
      email_queue_dispatch: { Args: never; Returns: undefined }
      encrypt_pii: { Args: { p_plain: string }; Returns: string }
      enforce_wallet_guard: {
        Args: {
          p_action: string
          p_amount_minor: number
          p_ip?: string
          p_user_id: string
        }
        Returns: Json
      }
      enqueue_email: {
        Args: { payload: Json; queue_name: string }
        Returns: number
      }
      ensure_referral_code: { Args: never; Returns: string }
      escrow_hold_for_order: {
        Args: { p_order_id: string; p_platform_fee_pct?: number }
        Returns: string
      }
      escrow_refund_for_order: {
        Args: { p_order_id: string; p_reason?: string }
        Returns: boolean
      }
      escrow_release_for_order: {
        Args: { p_order_id: string }
        Returns: boolean
      }
      evaluate_fraud_risk: {
        Args: { p_amount_minor: number; p_ip?: string; p_user_id: string }
        Returns: {
          decision: string
          score: number
        }[]
      }
      evaluate_weekly_badges: {
        Args: never
        Returns: {
          code: string
          score: number
          user_id: string
        }[]
      }
      fx_create_rate_lock: {
        Args: {
          p_from: string
          p_from_amount_minor: number
          p_to: string
          p_user: string
        }
        Returns: {
          consumed_at: string | null
          created_at: string
          expires_at: string
          fee_minor: number
          from_amount_minor: number
          from_currency: string
          id: string
          locked_rate: number
          to_amount_minor: number
          to_currency: string
          user_id: string
        }
        SetofOptions: {
          from: "*"
          to: "fx_rate_locks"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      fx_execute_lock: {
        Args: { p_lock_id: string; p_recipient?: string; p_user: string }
        Returns: {
          counterparty_id: string | null
          executed_at: string
          fee_charged_minor: number
          from_amount_minor: number
          from_currency: string
          id: string
          kind: string
          rate_applied: number
          reference: string | null
          spread_earned_minor: number
          to_amount_minor: number
          to_currency: string
          user_id: string
        }
        SetofOptions: {
          from: "*"
          to: "fx_transactions"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      fx_run_reconciliation: {
        Args: never
        Returns: {
          currency: string
          discrepancy_minor: number | null
          id: number
          notes: string | null
          partner_balance_minor: number | null
          run_at: string
          status: string
          sum_user_balances_minor: number
        }[]
        SetofOptions: {
          from: "*"
          to: "fx_reconciliation_log"
          isOneToOne: false
          isSetofReturn: true
        }
      }
      generate_self_iban: { Args: { p_country?: string }; Returns: string }
      generate_sub_wallet_code: { Args: { p_country: string }; Returns: string }
      get_membership_caps: { Args: never; Returns: Json }
      get_my_guarantee_masked: {
        Args: { p_project_id: string }
        Returns: {
          amount: number
          created_at: string
          currency: string
          document_url: string
          guarantee_type: string
          guarantor_id_masked: string
          guarantor_name: string
          guarantor_passport_masked: string
          guarantor_phone_masked: string
          id: string
          notes: string
          project_id: string
          signed_to_id_masked: string
          signed_to_name: string
          signed_to_passport_masked: string
        }[]
      }
      get_my_profile: {
        Args: never
        Returns: {
          alias_name: string | null
          avatar_url: string | null
          bio: string | null
          business_bio: string | null
          city: string | null
          country: string | null
          cover_image_url: string | null
          created_at: string
          date_of_birth: string | null
          deals_completed: number
          display_name: string | null
          dob_enc: string | null
          followers_count: number
          id: string
          investment_volume_visible: boolean
          is_public_profile: boolean
          kyc_document_url: string | null
          kyc_selfie_url: string | null
          kyc_status: Database["public"]["Enums"]["kyc_status"]
          last_seen_at: string | null
          legal_full_name: string | null
          membership: Database["public"]["Enums"]["membership_tier"]
          membership_expires_at: string | null
          monthly_income: number | null
          monthly_obligations: number | null
          national_id_enc: string | null
          nationality: string | null
          net_worth: number | null
          occupation: string | null
          phone: string | null
          phone_enc: string | null
          points: number
          pseudonym: string | null
          referred_by: string | null
          reputation_score: number
          response_rate_pct: number
          show_whatsapp: boolean
          updated_at: string
          use_alias_default: boolean
          username: string | null
          verified_blue: boolean
          verified_diamond: boolean
          verified_gold: boolean
          verified_green: boolean
          whatsapp: string | null
        }[]
        SetofOptions: {
          from: "*"
          to: "profiles"
          isOneToOne: false
          isSetofReturn: true
        }
      }
      get_or_create_direct_conversation: {
        Args: { _other_user: string }
        Returns: string
      }
      get_order_book: {
        Args: { _project_id: string }
        Returns: {
          created_at: string
          filled_quantity: number
          price: number
          quantity: number
          side: string
          status: string
        }[]
      }
      get_profile_whatsapp: { Args: { _user_id: string }; Returns: string }
      get_project_contact: {
        Args: { _project_id: string }
        Returns: {
          show_whatsapp: boolean
          whatsapp: string
        }[]
      }
      get_project_owner_insights: {
        Args: { p_project_id: string }
        Returns: Json
      }
      get_project_whatsapp: { Args: { _project_id: string }; Returns: string }
      get_public_profile: {
        Args: { _user_id: string }
        Returns: {
          avatar_url: string
          bio: string
          city: string
          country: string
          created_at: string
          display_name: string
          followers_count: number
          id: string
          membership: string
          nationality: string
          occupation: string
          points: number
          pseudonym: string
          verified_blue: boolean
          verified_green: boolean
        }[]
      }
      get_public_profiles: {
        Args: { _ids: string[] }
        Returns: {
          alias_name: string
          avatar_url: string
          bio: string
          business_bio: string
          country: string
          display_name: string
          id: string
          membership: string
          nationality: string
          reputation_score: number
          use_alias_default: boolean
          username: string
          verified_blue: boolean
          verified_green: boolean
        }[]
      }
      get_setting: { Args: { _key: string }; Returns: Json }
      get_ticket_by_token: {
        Args: { p_token: string }
        Returns: {
          admin_reply: string
          created_at: string
          id: string
          message: string
          replied_at: string
          resolved_at: string
          status: string
          subject: string
        }[]
      }
      get_user_public_projects: {
        Args: { _user_id: string }
        Returns: {
          city: string
          country: string
          cover_image_url: string
          created_at: string
          currency: string
          current_price: number
          description: string
          funding_mode: string
          id: string
          likes_count: number
          name: string
          sector: string
          share_price: number
          shares_sold: number
          shares_total: number
          status: string
          target_investment: number
          ticker: string
          views_count: number
        }[]
      }
      get_user_recent_posts: {
        Args: { _limit?: number; _user_id: string }
        Returns: {
          comments_count: number
          content: string
          created_at: string
          hashtags: string[]
          id: string
          likes_count: number
          media_urls: string[]
          shares_count: number
        }[]
      }
      get_user_referral_progress: {
        Args: { p_user_id: string }
        Returns: {
          current_commission: number
          current_reward: number
          current_tier: string
          current_tier_ar: string
          next_tier: string
          next_tier_ar: string
          next_tier_needed: number
          pending_count: number
          progress_pct: number
          total_reward_sar: number
          verified_count: number
        }[]
      }
      get_user_trust_metrics: { Args: { _user_id: string }; Returns: Json }
      has_any_role: {
        Args: {
          _roles: Database["public"]["Enums"]["app_role"][]
          _user_id: string
        }
        Returns: boolean
      }
      has_permission: {
        Args: { _perm: string; _user_id: string }
        Returns: boolean
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      iban_letter_to_digits: { Args: { p_iban: string }; Returns: string }
      is_admin_staff: { Args: { _user_id: string }; Returns: boolean }
      is_blocked_between: { Args: { _a: string; _b: string }; Returns: boolean }
      is_contract_party: {
        Args: { _parties: Json; _user_id: string }
        Returns: boolean
      }
      is_conversation_participant: {
        Args: { _cid: string; _uid: string }
        Returns: boolean
      }
      is_ip_blocked: { Args: { p_ip: string }; Returns: boolean }
      is_staff: { Args: { _user_id: string }; Returns: boolean }
      launch_ad_campaign: {
        Args: { p_campaign_id: string }
        Returns: {
          balance: number
          needed: number
          status: Database["public"]["Enums"]["ad_status"]
        }[]
      }
      list_featured_projects: {
        Args: { _limit?: number }
        Returns: {
          country: string
          cover_image_url: string
          current_price: number
          id: string
          name: string
          owner_avatar: string
          owner_id: string
          owner_name: string
          owner_verified: boolean
          sector: string
          share_price: number
          shares_sold: number
          shares_total: number
          ticker: string
        }[]
      }
      list_project_shares: {
        Args: {
          p_initial_price: number
          p_lockup_days?: number
          p_min_purchase?: number
          p_project_id: string
          p_total_supply: number
        }
        Returns: string
      }
      log_admin_action: {
        Args: { _action: string; _diff: Json; _table: string; _target: string }
        Returns: string
      }
      log_referral_click: {
        Args: {
          p_code: string
          p_ip_hash: string
          p_referer?: string
          p_ua_hash: string
          p_utm?: Json
        }
        Returns: undefined
      }
      log_security_event: {
        Args: {
          p_blocked: boolean
          p_details: Json
          p_event_type: string
          p_ip: string
          p_resource: string
          p_severity: string
          p_user_agent: string
        }
        Returns: string
      }
      mask_tail4: { Args: { input: string }; Returns: string }
      move_to_dlq: {
        Args: {
          dlq_name: string
          message_id: number
          payload: Json
          source_queue: string
        }
        Returns: number
      }
      notify_message_recipients: {
        Args: { _conversation_id: string; _preview: string }
        Returns: undefined
      }
      pause_ad_campaign: { Args: { p_campaign_id: string }; Returns: undefined }
      pick_active_ads: {
        Args: { p_limit?: number }
        Returns: {
          body: string
          cta_label: string
          cta_url: string
          headline: string
          id: string
          media_type: string
          media_url: string
          owner_id: string
          project_id: string
        }[]
      }
      place_bid: {
        Args: {
          p_amount: number
          p_auction_id: string
          p_is_auto?: boolean
          p_max_auto?: number
        }
        Returns: Json
      }
      place_share_order: {
        Args: {
          p_price?: number
          p_project_id: string
          p_quantity: number
          p_side: string
          p_type: string
        }
        Returns: Json
      }
      post_live_event: {
        Args: {
          _content: string
          _event_type: string
          _excerpt: string
          _ref_id: string
          _title: string
        }
        Returns: undefined
      }
      process_fatora_deposit: {
        Args: {
          p_amount_minor: number
          p_currency?: string
          p_order_id: string
          p_transaction_id: string
          p_user_id: string
        }
        Returns: Json
      }
      read_email_batch: {
        Args: { batch_size: number; queue_name: string; vt: number }
        Returns: {
          message: Json
          msg_id: number
          read_ct: number
        }[]
      }
      record_ad_conversion: {
        Args: {
          p_campaign_id: string
          p_kind: string
          p_metadata?: Json
          p_value?: number
        }
        Returns: string
      }
      record_ad_event: {
        Args: { p_campaign_id: string; p_kind: string }
        Returns: undefined
      }
      referral_leaderboard: {
        Args: {
          country_filter?: string
          period?: string
          program_filter?: string
          row_limit?: number
        }
        Returns: {
          avatar_url: string
          country: string
          display_name: string
          membership: string
          rank: number
          referrals_count: number
          referrer_id: string
          reward_total: number
          username: string
          verified_diamond: boolean
          verified_gold: boolean
        }[]
      }
      referral_leaderboard_countries: {
        Args: never
        Returns: {
          cnt: number
          country: string
        }[]
      }
      refresh_market_stats: { Args: never; Returns: undefined }
      refresh_project_quality_badges: {
        Args: { p_project_id: string }
        Returns: undefined
      }
      renew_memberships_daily: { Args: never; Returns: Json }
      request_payout: {
        Args: {
          p_amount_minor: number
          p_channel: string
          p_currency?: string
          p_destination_enc: string
          p_destination_masked: string
          p_ip?: string
          p_user_id: string
        }
        Returns: {
          fraud_score: number
          payout_id: string
          status: string
        }[]
      }
      resolve_user_tier: { Args: { _uid: string }; Returns: string }
      resume_ad_campaign: {
        Args: { p_campaign_id: string }
        Returns: undefined
      }
      rl_check: {
        Args: { _key: string; _limit: number; _window_seconds: number }
        Returns: boolean
      }
      search_mentionable_users: {
        Args: { _limit?: number; _q: string }
        Returns: {
          avatar_url: string
          display_name: string
          id: string
        }[]
      }
      security_stats_overview: { Args: never; Returns: Json }
      show_limit: { Args: never; Returns: number }
      show_trgm: { Args: { "": string }; Returns: string[] }
      sm_accrue_daily_margin_interest: { Args: never; Returns: number }
      sm_calc_max_valuation: {
        Args: {
          p_annual_revenue: number
          p_collateral: number
          p_solvency: number
          p_stage: Database["public"]["Enums"]["sm_listing_stage"]
        }
        Returns: number
      }
      sm_check_daily_limit: {
        Args: { p_listing_id: string; p_price: number }
        Returns: boolean
      }
      sm_compute_account_value: {
        Args: { p_account_id: string }
        Returns: number
      }
      sm_evaluate_margin_loan: {
        Args: { p_loan_id: string }
        Returns: {
          current_ratio: number
          liquidation_amount: number
          new_status: Database["public"]["Enums"]["sm_margin_status"]
        }[]
      }
      sm_match_order: {
        Args: { p_order_id: string }
        Returns: {
          total_qty: number
          trades_created: number
        }[]
      }
      sm_open_financed_position: {
        Args: {
          p_limit_price: number
          p_listing_id: string
          p_loan_amount: number
          p_shares: number
          p_user_id: string
        }
        Returns: {
          loan_id: string
          order_id: string
        }[]
      }
      sm_request_withdraw_cash: { Args: { _amount: number }; Returns: Json }
      snapshot_new_analytics_tables: { Args: never; Returns: undefined }
      submit_project_guarantee: {
        Args: {
          p_amount: number
          p_currency?: string
          p_guarantor_name?: string
          p_notes?: string
          p_project_id: string
        }
        Returns: string
      }
      subscribe_membership_from_wallet: { Args: never; Returns: Json }
      subscribe_membership_tier: { Args: { p_tier: string }; Returns: Json }
      take_backup_snapshot: { Args: never; Returns: string }
      trending_hashtags: {
        Args: { _hours?: number; _limit?: number }
        Returns: {
          post_count: number
          tag: string
        }[]
      }
      unified_search: {
        Args: { lim?: number; q: string }
        Returns: {
          id: string
          kind: string
          score: number
          snippet: string
          title: string
          url: string
        }[]
      }
      unlock_achievement: {
        Args: { _achievement: string; _user: string }
        Returns: boolean
      }
      update_project_ai_score: {
        Args: { p_project_id: string; p_score: number; p_summary: string }
        Returns: undefined
      }
      validate_iban_mod97: { Args: { p_iban: string }; Returns: boolean }
      verify_ledger_integrity: {
        Args: { p_user_id: string }
        Returns: {
          secure: boolean
          tampered_id: string
        }[]
      }
      verify_referral: { Args: { p_referred_id: string }; Returns: Json }
      wallet_admin_confirm_deposit: {
        Args: { p_request_id: string; p_sender_iban_masked?: string }
        Returns: Json
      }
      wallet_aml_scan: { Args: { p_user_id: string }; Returns: number }
      wallet_create_deposit_request: {
        Args: { p_amount_minor: number; p_method?: string }
        Returns: {
          amount_minor: number
          confirmed_at: string | null
          confirmed_by: string | null
          created_at: string
          currency: string
          expires_at: string
          gateway_intent_id: string | null
          gateway_provider: string | null
          id: string
          method: string
          reference_code: string
          rejection_reason: string | null
          sender_iban_masked: string | null
          status: string
          wallet_user_id: string
        }
        SetofOptions: {
          from: "*"
          to: "deposit_requests"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      wallet_deposit: {
        Args: { p_amount_minor: number; p_reference: string; p_user_id: string }
        Returns: {
          balance: number
          bank_account_id: string | null
          bank_iban: string | null
          bank_iban_created_at: string | null
          created_at: string
          currency: string
          held: number
          kyc_tier: string
          last_activity_at: string
          pin_failed_count: number
          pin_hash: string | null
          pin_locked_until: string | null
          self_frozen: boolean
          self_frozen_at: string | null
          status: string
          user_id: string
          virtual_iban: string | null
          wallet_code: string | null
        }
        SetofOptions: {
          from: "*"
          to: "wallets"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      wallet_freeze_self: { Args: { p_reason?: string }; Returns: Json }
      wallet_generate_iban: { Args: never; Returns: string }
      wallet_get_or_create_sub: {
        Args: { p_currency: string; p_user: string }
        Returns: {
          available_minor: number
          created_at: string
          currency: string
          held_minor: number
          id: string
          is_primary: boolean
          status: string
          sub_wallet_code: string
          updated_at: string
          user_id: string
          virtual_account_number: string | null
        }
        SetofOptions: {
          from: "*"
          to: "wallet_sub_accounts"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      wallet_open_support_ticket: {
        Args: { p_category?: string; p_message: string; p_subject: string }
        Returns: Json
      }
      wallet_p2p_transfer: {
        Args: {
          p_amount_minor: number
          p_note?: string
          p_pin: string
          p_to_user: string
        }
        Returns: Json
      }
      wallet_request_smart_payout: {
        Args: {
          p_amount_minor: number
          p_channel: string
          p_currency?: string
          p_destination: string
        }
        Returns: Json
      }
      wallet_set_pin: {
        Args: { p_new_pin: string; p_old_pin: string }
        Returns: Json
      }
      wallet_suggest_topup_amounts: { Args: never; Returns: Json }
      wallet_transfer: {
        Args: {
          p_amount_minor: number
          p_from_user: string
          p_reference: string
          p_to_user: string
          p_type: string
        }
        Returns: {
          balance: number
          bank_account_id: string | null
          bank_iban: string | null
          bank_iban_created_at: string | null
          created_at: string
          currency: string
          held: number
          kyc_tier: string
          last_activity_at: string
          pin_failed_count: number
          pin_hash: string | null
          pin_locked_until: string | null
          self_frozen: boolean
          self_frozen_at: string | null
          status: string
          user_id: string
          virtual_iban: string | null
          wallet_code: string | null
        }
        SetofOptions: {
          from: "*"
          to: "wallets"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      wallet_unfreeze_self: { Args: { p_otp: string }; Returns: Json }
      wallet_verify_pin: { Args: { p_pin: string }; Returns: boolean }
    }
    Enums: {
      ad_status:
        | "draft"
        | "pending_payment"
        | "active"
        | "paused"
        | "completed"
        | "rejected"
      app_role:
        | "admin"
        | "moderator"
        | "seo"
        | "user"
        | "accountant"
        | "support"
        | "kyc_admin"
        | "compliance_officer"
        | "idea_owner"
        | "lawyer"
      auction_status:
        | "scheduled"
        | "live"
        | "ended"
        | "cancelled"
        | "awarded"
        | "expired"
      auction_type: "english" | "sealed" | "dutch" | "reserve" | "buynow"
      bid_status:
        | "active"
        | "outbid"
        | "winning"
        | "won"
        | "lost"
        | "refunded"
        | "forfeited"
      dispute_status:
        | "open"
        | "in_review"
        | "lawyer_assigned"
        | "resolved"
        | "escalated"
        | "closed"
      kyc_status:
        | "pending"
        | "submitted"
        | "verified"
        | "rejected"
        | "unverified"
      membership_tier: "basic" | "full" | "silver" | "gold" | "platinum"
      message_report_reason:
        | "harassment"
        | "scam"
        | "spam"
        | "inappropriate"
        | "other"
      message_report_status: "open" | "reviewing" | "resolved" | "dismissed"
      negotiation_status:
        | "open"
        | "accepted"
        | "rejected"
        | "expired"
        | "cancelled"
      offer_status:
        | "pending"
        | "accepted"
        | "rejected"
        | "countered"
        | "withdrawn"
        | "expired"
      order_side: "buy" | "sell"
      order_status: "open" | "filled" | "cancelled" | "partial"
      project_status:
        | "draft"
        | "pending_review"
        | "active"
        | "halted"
        | "closed"
      referral_status: "pending" | "verified" | "rewarded" | "flagged"
      sm_account_status: "active" | "suspended" | "frozen" | "closed"
      sm_financing_status:
        | "pending"
        | "auto_rejected"
        | "approved"
        | "rejected"
        | "cancelled"
      sm_flag_severity: "low" | "medium" | "high" | "critical"
      sm_kyc_tier: "unverified" | "basic" | "verified" | "accredited"
      sm_ledger_entry:
        | "deposit"
        | "withdrawal"
        | "trade_debit"
        | "trade_credit"
        | "margin_loan_disbursement"
        | "margin_repayment"
        | "liquidation_proceeds"
        | "listing_fee"
        | "dividend"
        | "platform_grant"
      sm_listing_stage: "idea" | "project"
      sm_listing_status: "pending_review" | "active" | "halted" | "delisted"
      sm_margin_status: "healthy" | "margin_call" | "liquidating" | "closed"
      sm_order_side: "BUY" | "SELL"
      sm_order_status:
        | "OPEN"
        | "PARTIALLY_FILLED"
        | "FILLED"
        | "CANCELLED"
        | "REJECTED"
      sm_order_type: "LIMIT" | "MARKET"
      sm_wallet_type: "trading_cash" | "reserved_margin" | "platform_treasury"
      ticket_status: "open" | "in_progress" | "closed"
      txn_type:
        | "deposit"
        | "withdrawal"
        | "share_buy"
        | "share_sell"
        | "commission"
        | "dispute_fee"
        | "supervisor_fee"
        | "membership_fee"
        | "transfer_in"
        | "transfer_out"
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
      ad_status: [
        "draft",
        "pending_payment",
        "active",
        "paused",
        "completed",
        "rejected",
      ],
      app_role: [
        "admin",
        "moderator",
        "seo",
        "user",
        "accountant",
        "support",
        "kyc_admin",
        "compliance_officer",
        "idea_owner",
        "lawyer",
      ],
      auction_status: [
        "scheduled",
        "live",
        "ended",
        "cancelled",
        "awarded",
        "expired",
      ],
      auction_type: ["english", "sealed", "dutch", "reserve", "buynow"],
      bid_status: [
        "active",
        "outbid",
        "winning",
        "won",
        "lost",
        "refunded",
        "forfeited",
      ],
      dispute_status: [
        "open",
        "in_review",
        "lawyer_assigned",
        "resolved",
        "escalated",
        "closed",
      ],
      kyc_status: [
        "pending",
        "submitted",
        "verified",
        "rejected",
        "unverified",
      ],
      membership_tier: ["basic", "full", "silver", "gold", "platinum"],
      message_report_reason: [
        "harassment",
        "scam",
        "spam",
        "inappropriate",
        "other",
      ],
      message_report_status: ["open", "reviewing", "resolved", "dismissed"],
      negotiation_status: [
        "open",
        "accepted",
        "rejected",
        "expired",
        "cancelled",
      ],
      offer_status: [
        "pending",
        "accepted",
        "rejected",
        "countered",
        "withdrawn",
        "expired",
      ],
      order_side: ["buy", "sell"],
      order_status: ["open", "filled", "cancelled", "partial"],
      project_status: ["draft", "pending_review", "active", "halted", "closed"],
      referral_status: ["pending", "verified", "rewarded", "flagged"],
      sm_account_status: ["active", "suspended", "frozen", "closed"],
      sm_financing_status: [
        "pending",
        "auto_rejected",
        "approved",
        "rejected",
        "cancelled",
      ],
      sm_flag_severity: ["low", "medium", "high", "critical"],
      sm_kyc_tier: ["unverified", "basic", "verified", "accredited"],
      sm_ledger_entry: [
        "deposit",
        "withdrawal",
        "trade_debit",
        "trade_credit",
        "margin_loan_disbursement",
        "margin_repayment",
        "liquidation_proceeds",
        "listing_fee",
        "dividend",
        "platform_grant",
      ],
      sm_listing_stage: ["idea", "project"],
      sm_listing_status: ["pending_review", "active", "halted", "delisted"],
      sm_margin_status: ["healthy", "margin_call", "liquidating", "closed"],
      sm_order_side: ["BUY", "SELL"],
      sm_order_status: [
        "OPEN",
        "PARTIALLY_FILLED",
        "FILLED",
        "CANCELLED",
        "REJECTED",
      ],
      sm_order_type: ["LIMIT", "MARKET"],
      sm_wallet_type: ["trading_cash", "reserved_margin", "platform_treasury"],
      ticket_status: ["open", "in_progress", "closed"],
      txn_type: [
        "deposit",
        "withdrawal",
        "share_buy",
        "share_sell",
        "commission",
        "dispute_fee",
        "supervisor_fee",
        "membership_fee",
        "transfer_in",
        "transfer_out",
      ],
    },
  },
} as const
