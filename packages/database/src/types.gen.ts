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
      ad_creatives: {
        Row: {
          asset_document_id: string | null
          audience: string | null
          campaign_id: string | null
          channel: string
          client_id: string
          concept: string
          content_item_id: string | null
          created_at: string
          created_by: string | null
          cta: string | null
          deleted_at: string | null
          description: string | null
          fatigue_flagged_at: string | null
          format: string
          headline: string | null
          id: string
          launched_at: string | null
          name: string
          notes: string | null
          organisation_id: string
          primary_text: string | null
          retired_at: string | null
          status: string
          updated_at: string
          variant_label: string
        }
        Insert: {
          asset_document_id?: string | null
          audience?: string | null
          campaign_id?: string | null
          channel?: string
          client_id: string
          concept: string
          content_item_id?: string | null
          created_at?: string
          created_by?: string | null
          cta?: string | null
          deleted_at?: string | null
          description?: string | null
          fatigue_flagged_at?: string | null
          format?: string
          headline?: string | null
          id?: string
          launched_at?: string | null
          name: string
          notes?: string | null
          organisation_id: string
          primary_text?: string | null
          retired_at?: string | null
          status?: string
          updated_at?: string
          variant_label?: string
        }
        Update: {
          asset_document_id?: string | null
          audience?: string | null
          campaign_id?: string | null
          channel?: string
          client_id?: string
          concept?: string
          content_item_id?: string | null
          created_at?: string
          created_by?: string | null
          cta?: string | null
          deleted_at?: string | null
          description?: string | null
          fatigue_flagged_at?: string | null
          format?: string
          headline?: string | null
          id?: string
          launched_at?: string | null
          name?: string
          notes?: string | null
          organisation_id?: string
          primary_text?: string | null
          retired_at?: string | null
          status?: string
          updated_at?: string
          variant_label?: string
        }
        Relationships: [
          {
            foreignKeyName: "ad_creatives_asset_document_id_fkey"
            columns: ["asset_document_id"]
            isOneToOne: false
            referencedRelation: "documents"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ad_creatives_campaign_id_fkey"
            columns: ["campaign_id"]
            isOneToOne: false
            referencedRelation: "campaigns"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ad_creatives_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ad_creatives_content_item_id_fkey"
            columns: ["content_item_id"]
            isOneToOne: false
            referencedRelation: "content_items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ad_creatives_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ad_creatives_organisation_id_fkey"
            columns: ["organisation_id"]
            isOneToOne: false
            referencedRelation: "organisations"
            referencedColumns: ["id"]
          },
        ]
      }
      ai_action_proposals: {
        Row: {
          ai_run_id: string
          created_at: string
          decided_at: string | null
          decided_by: string | null
          id: string
          organisation_id: string
          payload: Json
          proposed_action: string
          status: string
        }
        Insert: {
          ai_run_id: string
          created_at?: string
          decided_at?: string | null
          decided_by?: string | null
          id?: string
          organisation_id: string
          payload?: Json
          proposed_action: string
          status?: string
        }
        Update: {
          ai_run_id?: string
          created_at?: string
          decided_at?: string | null
          decided_by?: string | null
          id?: string
          organisation_id?: string
          payload?: Json
          proposed_action?: string
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "ai_action_proposals_ai_run_id_fkey"
            columns: ["ai_run_id"]
            isOneToOne: false
            referencedRelation: "ai_runs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ai_action_proposals_decided_by_fkey"
            columns: ["decided_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ai_action_proposals_organisation_id_fkey"
            columns: ["organisation_id"]
            isOneToOne: false
            referencedRelation: "organisations"
            referencedColumns: ["id"]
          },
        ]
      }
      ai_knowledge_citations: {
        Row: {
          ai_run_id: string
          created_at: string
          id: string
          knowledge_entry_id: string
          organisation_id: string
        }
        Insert: {
          ai_run_id: string
          created_at?: string
          id?: string
          knowledge_entry_id: string
          organisation_id: string
        }
        Update: {
          ai_run_id?: string
          created_at?: string
          id?: string
          knowledge_entry_id?: string
          organisation_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "ai_knowledge_citations_ai_run_id_fkey"
            columns: ["ai_run_id"]
            isOneToOne: false
            referencedRelation: "ai_runs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ai_knowledge_citations_knowledge_entry_id_fkey"
            columns: ["knowledge_entry_id"]
            isOneToOne: false
            referencedRelation: "knowledge_entries"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ai_knowledge_citations_organisation_id_fkey"
            columns: ["organisation_id"]
            isOneToOne: false
            referencedRelation: "organisations"
            referencedColumns: ["id"]
          },
        ]
      }
      ai_model_configs: {
        Row: {
          ai_provider_id: string
          capability_tags: string[]
          cost_per_1k_input_tokens: number
          cost_per_1k_output_tokens: number
          id: string
          is_active: boolean
          model_name: string
        }
        Insert: {
          ai_provider_id: string
          capability_tags?: string[]
          cost_per_1k_input_tokens?: number
          cost_per_1k_output_tokens?: number
          id?: string
          is_active?: boolean
          model_name: string
        }
        Update: {
          ai_provider_id?: string
          capability_tags?: string[]
          cost_per_1k_input_tokens?: number
          cost_per_1k_output_tokens?: number
          id?: string
          is_active?: boolean
          model_name?: string
        }
        Relationships: [
          {
            foreignKeyName: "ai_model_configs_ai_provider_id_fkey"
            columns: ["ai_provider_id"]
            isOneToOne: false
            referencedRelation: "ai_providers"
            referencedColumns: ["id"]
          },
        ]
      }
      ai_prompt_templates: {
        Row: {
          created_at: string
          created_by: string | null
          id: string
          key: string
          organisation_id: string | null
          task_type: string
          template: string
          version: number
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          id?: string
          key: string
          organisation_id?: string | null
          task_type: string
          template: string
          version?: number
        }
        Update: {
          created_at?: string
          created_by?: string | null
          id?: string
          key?: string
          organisation_id?: string | null
          task_type?: string
          template?: string
          version?: number
        }
        Relationships: [
          {
            foreignKeyName: "ai_prompt_templates_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ai_prompt_templates_organisation_id_fkey"
            columns: ["organisation_id"]
            isOneToOne: false
            referencedRelation: "organisations"
            referencedColumns: ["id"]
          },
        ]
      }
      ai_providers: {
        Row: {
          id: string
          is_enabled_globally: boolean
          name: string
          slug: string
        }
        Insert: {
          id?: string
          is_enabled_globally?: boolean
          name: string
          slug: string
        }
        Update: {
          id?: string
          is_enabled_globally?: boolean
          name?: string
          slug?: string
        }
        Relationships: []
      }
      ai_runs: {
        Row: {
          ai_provider_id: string | null
          approval_result: string | null
          client_id: string | null
          created_at: string
          error_message: string | null
          estimated_cost: number | null
          id: string
          mode: string
          model_name: string | null
          organisation_id: string
          output: string | null
          prompt: string | null
          prompt_template_id: string | null
          status: string
          task_type: string
          user_id: string | null
        }
        Insert: {
          ai_provider_id?: string | null
          approval_result?: string | null
          client_id?: string | null
          created_at?: string
          error_message?: string | null
          estimated_cost?: number | null
          id?: string
          mode?: string
          model_name?: string | null
          organisation_id: string
          output?: string | null
          prompt?: string | null
          prompt_template_id?: string | null
          status?: string
          task_type: string
          user_id?: string | null
        }
        Update: {
          ai_provider_id?: string | null
          approval_result?: string | null
          client_id?: string | null
          created_at?: string
          error_message?: string | null
          estimated_cost?: number | null
          id?: string
          mode?: string
          model_name?: string | null
          organisation_id?: string
          output?: string | null
          prompt?: string | null
          prompt_template_id?: string | null
          status?: string
          task_type?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "ai_runs_ai_provider_id_fkey"
            columns: ["ai_provider_id"]
            isOneToOne: false
            referencedRelation: "ai_providers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ai_runs_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ai_runs_organisation_id_fkey"
            columns: ["organisation_id"]
            isOneToOne: false
            referencedRelation: "organisations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ai_runs_prompt_template_id_fkey"
            columns: ["prompt_template_id"]
            isOneToOne: false
            referencedRelation: "ai_prompt_templates"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ai_runs_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      ai_source_citations: {
        Row: {
          ai_run_id: string
          document_id: string | null
          document_type: string
          excerpt: string | null
          id: string
          title: string | null
        }
        Insert: {
          ai_run_id: string
          document_id?: string | null
          document_type: string
          excerpt?: string | null
          id?: string
          title?: string | null
        }
        Update: {
          ai_run_id?: string
          document_id?: string | null
          document_type?: string
          excerpt?: string | null
          id?: string
          title?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "ai_source_citations_ai_run_id_fkey"
            columns: ["ai_run_id"]
            isOneToOne: false
            referencedRelation: "ai_runs"
            referencedColumns: ["id"]
          },
        ]
      }
      ai_usage: {
        Row: {
          ai_provider_id: string | null
          client_id: string | null
          id: string
          organisation_id: string
          period_end: string
          period_start: string
          total_cost: number
          total_input_tokens: number
          total_output_tokens: number
          user_id: string | null
        }
        Insert: {
          ai_provider_id?: string | null
          client_id?: string | null
          id?: string
          organisation_id: string
          period_end: string
          period_start: string
          total_cost?: number
          total_input_tokens?: number
          total_output_tokens?: number
          user_id?: string | null
        }
        Update: {
          ai_provider_id?: string | null
          client_id?: string | null
          id?: string
          organisation_id?: string
          period_end?: string
          period_start?: string
          total_cost?: number
          total_input_tokens?: number
          total_output_tokens?: number
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "ai_usage_ai_provider_id_fkey"
            columns: ["ai_provider_id"]
            isOneToOne: false
            referencedRelation: "ai_providers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ai_usage_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ai_usage_organisation_id_fkey"
            columns: ["organisation_id"]
            isOneToOne: false
            referencedRelation: "organisations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ai_usage_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      approvals: {
        Row: {
          client_id: string
          decided_at: string | null
          decided_by: string | null
          decision_notes: string | null
          id: string
          landing_page_version_id: string | null
          organisation_id: string
          requested_at: string
          requested_by: string | null
          status: string
          subject_id: string
          subject_type: string
        }
        Insert: {
          client_id: string
          decided_at?: string | null
          decided_by?: string | null
          decision_notes?: string | null
          id?: string
          landing_page_version_id?: string | null
          organisation_id: string
          requested_at?: string
          requested_by?: string | null
          status?: string
          subject_id: string
          subject_type: string
        }
        Update: {
          client_id?: string
          decided_at?: string | null
          decided_by?: string | null
          decision_notes?: string | null
          id?: string
          landing_page_version_id?: string | null
          organisation_id?: string
          requested_at?: string
          requested_by?: string | null
          status?: string
          subject_id?: string
          subject_type?: string
        }
        Relationships: [
          {
            foreignKeyName: "approvals_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "approvals_decided_by_fkey"
            columns: ["decided_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "approvals_landing_page_version_id_fkey"
            columns: ["landing_page_version_id"]
            isOneToOne: false
            referencedRelation: "landing_page_versions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "approvals_organisation_id_fkey"
            columns: ["organisation_id"]
            isOneToOne: false
            referencedRelation: "organisations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "approvals_requested_by_fkey"
            columns: ["requested_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      audit_logs: {
        Row: {
          action: string
          actor_type: string
          actor_user_id: string | null
          client_id: string | null
          created_at: string
          id: string
          ip_address: string | null
          metadata: Json
          organisation_id: string
          resource: string
          resource_id: string | null
          user_agent: string | null
        }
        Insert: {
          action: string
          actor_type?: string
          actor_user_id?: string | null
          client_id?: string | null
          created_at?: string
          id?: string
          ip_address?: string | null
          metadata?: Json
          organisation_id: string
          resource: string
          resource_id?: string | null
          user_agent?: string | null
        }
        Update: {
          action?: string
          actor_type?: string
          actor_user_id?: string | null
          client_id?: string | null
          created_at?: string
          id?: string
          ip_address?: string | null
          metadata?: Json
          organisation_id?: string
          resource?: string
          resource_id?: string | null
          user_agent?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "audit_logs_actor_user_id_fkey"
            columns: ["actor_user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "audit_logs_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "audit_logs_organisation_id_fkey"
            columns: ["organisation_id"]
            isOneToOne: false
            referencedRelation: "organisations"
            referencedColumns: ["id"]
          },
        ]
      }
      automation_rules: {
        Row: {
          config: Json
          created_at: string
          description: string | null
          id: string
          is_enabled: boolean
          last_run_at: string | null
          name: string
          organisation_id: string
          rule_key: string
          trigger_type: string
          updated_at: string
        }
        Insert: {
          config?: Json
          created_at?: string
          description?: string | null
          id?: string
          is_enabled?: boolean
          last_run_at?: string | null
          name: string
          organisation_id: string
          rule_key: string
          trigger_type: string
          updated_at?: string
        }
        Update: {
          config?: Json
          created_at?: string
          description?: string | null
          id?: string
          is_enabled?: boolean
          last_run_at?: string | null
          name?: string
          organisation_id?: string
          rule_key?: string
          trigger_type?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "automation_rules_organisation_id_fkey"
            columns: ["organisation_id"]
            isOneToOne: false
            referencedRelation: "organisations"
            referencedColumns: ["id"]
          },
        ]
      }
      automation_runs: {
        Row: {
          created_at: string
          dedupe_key: string
          id: string
          organisation_id: string
          rule_key: string
          status: string
          summary: string | null
        }
        Insert: {
          created_at?: string
          dedupe_key: string
          id?: string
          organisation_id: string
          rule_key: string
          status?: string
          summary?: string | null
        }
        Update: {
          created_at?: string
          dedupe_key?: string
          id?: string
          organisation_id?: string
          rule_key?: string
          status?: string
          summary?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "automation_runs_organisation_id_fkey"
            columns: ["organisation_id"]
            isOneToOne: false
            referencedRelation: "organisations"
            referencedColumns: ["id"]
          },
        ]
      }
      bookings: {
        Row: {
          client_id: string | null
          created_at: string
          deal_id: string | null
          deleted_at: string | null
          deposit_amount: number | null
          deposit_provider: string | null
          deposit_status: string
          duration_minutes: number | null
          external_ref: string | null
          id: string
          lead_id: string | null
          organisation_id: string
          outcome: string | null
          owner_id: string | null
          revenue: number | null
          scheduled_at: string
          source: string
          status: string
          title: string
          updated_at: string
        }
        Insert: {
          client_id?: string | null
          created_at?: string
          deal_id?: string | null
          deleted_at?: string | null
          deposit_amount?: number | null
          deposit_provider?: string | null
          deposit_status?: string
          duration_minutes?: number | null
          external_ref?: string | null
          id?: string
          lead_id?: string | null
          organisation_id: string
          outcome?: string | null
          owner_id?: string | null
          revenue?: number | null
          scheduled_at: string
          source?: string
          status?: string
          title: string
          updated_at?: string
        }
        Update: {
          client_id?: string | null
          created_at?: string
          deal_id?: string | null
          deleted_at?: string | null
          deposit_amount?: number | null
          deposit_provider?: string | null
          deposit_status?: string
          duration_minutes?: number | null
          external_ref?: string | null
          id?: string
          lead_id?: string | null
          organisation_id?: string
          outcome?: string | null
          owner_id?: string | null
          revenue?: number | null
          scheduled_at?: string
          source?: string
          status?: string
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "bookings_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bookings_deal_id_fkey"
            columns: ["deal_id"]
            isOneToOne: false
            referencedRelation: "deals"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bookings_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "leads"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bookings_organisation_id_fkey"
            columns: ["organisation_id"]
            isOneToOne: false
            referencedRelation: "organisations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bookings_owner_id_fkey"
            columns: ["owner_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      build_library_projects: {
        Row: {
          asset_rights: string | null
          branch: string | null
          client_id: string | null
          client_restrictions: string | null
          components_detected: string[]
          conversion_goal: string | null
          conversion_rate: number | null
          created_at: string
          deleted_at: string | null
          deployment_url: string | null
          design_style_tags: string[]
          form_system: string | null
          funnel_type: string | null
          id: string
          industry: string | null
          leads: number | null
          learnings: string | null
          offer_type: string | null
          organisation_id: string
          page_type: string | null
          project_name: string
          replit_url: string | null
          repository_url: string | null
          reuse_permitted: boolean
          revenue: number | null
          roas: number | null
          screenshot_document_id: string | null
          source_ownership: string
          source_provider: string
          status: string
          target_audience: string | null
          technology_stack: string[]
          tracking_detected: string[]
          traffic_source: string | null
          updated_at: string
        }
        Insert: {
          asset_rights?: string | null
          branch?: string | null
          client_id?: string | null
          client_restrictions?: string | null
          components_detected?: string[]
          conversion_goal?: string | null
          conversion_rate?: number | null
          created_at?: string
          deleted_at?: string | null
          deployment_url?: string | null
          design_style_tags?: string[]
          form_system?: string | null
          funnel_type?: string | null
          id?: string
          industry?: string | null
          leads?: number | null
          learnings?: string | null
          offer_type?: string | null
          organisation_id: string
          page_type?: string | null
          project_name: string
          replit_url?: string | null
          repository_url?: string | null
          reuse_permitted?: boolean
          revenue?: number | null
          roas?: number | null
          screenshot_document_id?: string | null
          source_ownership?: string
          source_provider?: string
          status?: string
          target_audience?: string | null
          technology_stack?: string[]
          tracking_detected?: string[]
          traffic_source?: string | null
          updated_at?: string
        }
        Update: {
          asset_rights?: string | null
          branch?: string | null
          client_id?: string | null
          client_restrictions?: string | null
          components_detected?: string[]
          conversion_goal?: string | null
          conversion_rate?: number | null
          created_at?: string
          deleted_at?: string | null
          deployment_url?: string | null
          design_style_tags?: string[]
          form_system?: string | null
          funnel_type?: string | null
          id?: string
          industry?: string | null
          leads?: number | null
          learnings?: string | null
          offer_type?: string | null
          organisation_id?: string
          page_type?: string | null
          project_name?: string
          replit_url?: string | null
          repository_url?: string | null
          reuse_permitted?: boolean
          revenue?: number | null
          roas?: number | null
          screenshot_document_id?: string | null
          source_ownership?: string
          source_provider?: string
          status?: string
          target_audience?: string | null
          technology_stack?: string[]
          tracking_detected?: string[]
          traffic_source?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "build_library_projects_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "build_library_projects_organisation_id_fkey"
            columns: ["organisation_id"]
            isOneToOne: false
            referencedRelation: "organisations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "build_library_projects_screenshot_document_id_fkey"
            columns: ["screenshot_document_id"]
            isOneToOne: false
            referencedRelation: "documents"
            referencedColumns: ["id"]
          },
        ]
      }
      campaign_metrics: {
        Row: {
          ad_creative_id: string | null
          campaign_id: string | null
          channel: string
          clicks: number
          client_id: string
          conversions: number
          created_at: string
          created_by: string | null
          extras: Json
          id: string
          impressions: number
          leads: number
          metric_date: string
          organisation_id: string
          revenue: number
          source: string
          spend: number
        }
        Insert: {
          ad_creative_id?: string | null
          campaign_id?: string | null
          channel: string
          clicks?: number
          client_id: string
          conversions?: number
          created_at?: string
          created_by?: string | null
          extras?: Json
          id?: string
          impressions?: number
          leads?: number
          metric_date: string
          organisation_id: string
          revenue?: number
          source?: string
          spend?: number
        }
        Update: {
          ad_creative_id?: string | null
          campaign_id?: string | null
          channel?: string
          clicks?: number
          client_id?: string
          conversions?: number
          created_at?: string
          created_by?: string | null
          extras?: Json
          id?: string
          impressions?: number
          leads?: number
          metric_date?: string
          organisation_id?: string
          revenue?: number
          source?: string
          spend?: number
        }
        Relationships: [
          {
            foreignKeyName: "campaign_metrics_ad_creative_id_fkey"
            columns: ["ad_creative_id"]
            isOneToOne: false
            referencedRelation: "ad_creatives"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "campaign_metrics_campaign_id_fkey"
            columns: ["campaign_id"]
            isOneToOne: false
            referencedRelation: "campaigns"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "campaign_metrics_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "campaign_metrics_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "campaign_metrics_organisation_id_fkey"
            columns: ["organisation_id"]
            isOneToOne: false
            referencedRelation: "organisations"
            referencedColumns: ["id"]
          },
        ]
      }
      campaigns: {
        Row: {
          audience: string | null
          budget: number | null
          channels: string[]
          client_id: string
          client_visible: boolean
          created_at: string
          deleted_at: string | null
          end_date: string | null
          id: string
          kpis: string | null
          learnings: string | null
          name: string
          objective: string | null
          offer: string | null
          organisation_id: string
          owner_id: string | null
          results: string | null
          start_date: string | null
          status: string
          updated_at: string
        }
        Insert: {
          audience?: string | null
          budget?: number | null
          channels?: string[]
          client_id: string
          client_visible?: boolean
          created_at?: string
          deleted_at?: string | null
          end_date?: string | null
          id?: string
          kpis?: string | null
          learnings?: string | null
          name: string
          objective?: string | null
          offer?: string | null
          organisation_id: string
          owner_id?: string | null
          results?: string | null
          start_date?: string | null
          status?: string
          updated_at?: string
        }
        Update: {
          audience?: string | null
          budget?: number | null
          channels?: string[]
          client_id?: string
          client_visible?: boolean
          created_at?: string
          deleted_at?: string | null
          end_date?: string | null
          id?: string
          kpis?: string | null
          learnings?: string | null
          name?: string
          objective?: string | null
          offer?: string | null
          organisation_id?: string
          owner_id?: string | null
          results?: string | null
          start_date?: string | null
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "campaigns_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "campaigns_organisation_id_fkey"
            columns: ["organisation_id"]
            isOneToOne: false
            referencedRelation: "organisations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "campaigns_owner_id_fkey"
            columns: ["owner_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      client_adapters: {
        Row: {
          approval_owner_ids: Json
          approved_by: string | null
          approved_source_locations: Json
          audience_identity_ids: Json
          brand_identity_id: string | null
          business_rules: Json
          claim_policy: Json
          client_configuration: Json
          client_id: string
          connected_tools: Json
          created_at: string
          current_operating_mode: string
          data_boundaries: Json
          deleted_at: string | null
          enabled_apps: Json
          enabled_plugins: Json
          founder_identity_ids: Json
          id: string
          last_approved_at: string | null
          name: string
          organisation_id: string
          permission_policy: Json
          review_status: string
          stable_key: string
          team_identity_ids: Json
          updated_at: string
          version: string
        }
        Insert: {
          approval_owner_ids?: Json
          approved_by?: string | null
          approved_source_locations?: Json
          audience_identity_ids?: Json
          brand_identity_id?: string | null
          business_rules?: Json
          claim_policy?: Json
          client_configuration?: Json
          client_id: string
          connected_tools?: Json
          created_at?: string
          current_operating_mode?: string
          data_boundaries?: Json
          deleted_at?: string | null
          enabled_apps?: Json
          enabled_plugins?: Json
          founder_identity_ids?: Json
          id?: string
          last_approved_at?: string | null
          name: string
          organisation_id: string
          permission_policy?: Json
          review_status?: string
          stable_key: string
          team_identity_ids?: Json
          updated_at?: string
          version?: string
        }
        Update: {
          approval_owner_ids?: Json
          approved_by?: string | null
          approved_source_locations?: Json
          audience_identity_ids?: Json
          brand_identity_id?: string | null
          business_rules?: Json
          claim_policy?: Json
          client_configuration?: Json
          client_id?: string
          connected_tools?: Json
          created_at?: string
          current_operating_mode?: string
          data_boundaries?: Json
          deleted_at?: string | null
          enabled_apps?: Json
          enabled_plugins?: Json
          founder_identity_ids?: Json
          id?: string
          last_approved_at?: string | null
          name?: string
          organisation_id?: string
          permission_policy?: Json
          review_status?: string
          stable_key?: string
          team_identity_ids?: Json
          updated_at?: string
          version?: string
        }
        Relationships: [
          {
            foreignKeyName: "client_adapters_approved_by_fkey"
            columns: ["approved_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "client_adapters_brand_identity_id_fkey"
            columns: ["brand_identity_id"]
            isOneToOne: false
            referencedRelation: "identity_registry"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "client_adapters_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: true
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "client_adapters_organisation_id_fkey"
            columns: ["organisation_id"]
            isOneToOne: false
            referencedRelation: "organisations"
            referencedColumns: ["id"]
          },
        ]
      }
      client_assignments: {
        Row: {
          assigned_by: string | null
          client_id: string
          created_at: string
          id: string
          organisation_id: string
          user_id: string
        }
        Insert: {
          assigned_by?: string | null
          client_id: string
          created_at?: string
          id?: string
          organisation_id: string
          user_id: string
        }
        Update: {
          assigned_by?: string | null
          client_id?: string
          created_at?: string
          id?: string
          organisation_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "client_assignments_assigned_by_fkey"
            columns: ["assigned_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "client_assignments_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "client_assignments_organisation_id_fkey"
            columns: ["organisation_id"]
            isOneToOne: false
            referencedRelation: "organisations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "client_assignments_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      client_services: {
        Row: {
          cadence: string | null
          client_id: string
          created_at: string
          deleted_at: string | null
          end_date: string | null
          id: string
          included_hours: number | null
          last_fulfilled_period: string | null
          notes: string | null
          organisation_id: string
          owner_id: string | null
          price: number | null
          retainer_id: string | null
          service_package_id: string
          start_date: string
          status: string
          updated_at: string
        }
        Insert: {
          cadence?: string | null
          client_id: string
          created_at?: string
          deleted_at?: string | null
          end_date?: string | null
          id?: string
          included_hours?: number | null
          last_fulfilled_period?: string | null
          notes?: string | null
          organisation_id: string
          owner_id?: string | null
          price?: number | null
          retainer_id?: string | null
          service_package_id: string
          start_date?: string
          status?: string
          updated_at?: string
        }
        Update: {
          cadence?: string | null
          client_id?: string
          created_at?: string
          deleted_at?: string | null
          end_date?: string | null
          id?: string
          included_hours?: number | null
          last_fulfilled_period?: string | null
          notes?: string | null
          organisation_id?: string
          owner_id?: string | null
          price?: number | null
          retainer_id?: string | null
          service_package_id?: string
          start_date?: string
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "client_services_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "client_services_organisation_id_fkey"
            columns: ["organisation_id"]
            isOneToOne: false
            referencedRelation: "organisations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "client_services_owner_id_fkey"
            columns: ["owner_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "client_services_retainer_id_fkey"
            columns: ["retainer_id"]
            isOneToOne: false
            referencedRelation: "retainers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "client_services_service_package_id_fkey"
            columns: ["service_package_id"]
            isOneToOne: false
            referencedRelation: "service_packages"
            referencedColumns: ["id"]
          },
        ]
      }
      clients: {
        Row: {
          account_manager_id: string | null
          ai_enabled: boolean
          ai_settings: Json
          brand_kit: Json
          contract_end_date: string | null
          contract_start_date: string | null
          created_at: string
          deleted_at: string | null
          gohighlevel_mode: string
          health_score: number | null
          health_score_explanation: string | null
          health_score_updated_at: string | null
          id: string
          industry: string | null
          name: string
          organisation_id: string
          renewal_notice_days: number | null
          retainer_amount: number | null
          slug: string
          social_handles: Json
          status: string
          updated_at: string
          website: string | null
        }
        Insert: {
          account_manager_id?: string | null
          ai_enabled?: boolean
          ai_settings?: Json
          brand_kit?: Json
          contract_end_date?: string | null
          contract_start_date?: string | null
          created_at?: string
          deleted_at?: string | null
          gohighlevel_mode?: string
          health_score?: number | null
          health_score_explanation?: string | null
          health_score_updated_at?: string | null
          id?: string
          industry?: string | null
          name: string
          organisation_id: string
          renewal_notice_days?: number | null
          retainer_amount?: number | null
          slug: string
          social_handles?: Json
          status?: string
          updated_at?: string
          website?: string | null
        }
        Update: {
          account_manager_id?: string | null
          ai_enabled?: boolean
          ai_settings?: Json
          brand_kit?: Json
          contract_end_date?: string | null
          contract_start_date?: string | null
          created_at?: string
          deleted_at?: string | null
          gohighlevel_mode?: string
          health_score?: number | null
          health_score_explanation?: string | null
          health_score_updated_at?: string | null
          id?: string
          industry?: string | null
          name?: string
          organisation_id?: string
          renewal_notice_days?: number | null
          retainer_amount?: number | null
          slug?: string
          social_handles?: Json
          status?: string
          updated_at?: string
          website?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "clients_account_manager_id_fkey"
            columns: ["account_manager_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "clients_organisation_id_fkey"
            columns: ["organisation_id"]
            isOneToOne: false
            referencedRelation: "organisations"
            referencedColumns: ["id"]
          },
        ]
      }
      contacts: {
        Row: {
          client_id: string | null
          company_name: string | null
          created_at: string
          deleted_at: string | null
          email: string | null
          full_name: string
          id: string
          is_primary: boolean
          job_title: string | null
          organisation_id: string
          phone: string | null
          updated_at: string
        }
        Insert: {
          client_id?: string | null
          company_name?: string | null
          created_at?: string
          deleted_at?: string | null
          email?: string | null
          full_name: string
          id?: string
          is_primary?: boolean
          job_title?: string | null
          organisation_id: string
          phone?: string | null
          updated_at?: string
        }
        Update: {
          client_id?: string | null
          company_name?: string | null
          created_at?: string
          deleted_at?: string | null
          email?: string | null
          full_name?: string
          id?: string
          is_primary?: boolean
          job_title?: string | null
          organisation_id?: string
          phone?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "contacts_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "contacts_organisation_id_fkey"
            columns: ["organisation_id"]
            isOneToOne: false
            referencedRelation: "organisations"
            referencedColumns: ["id"]
          },
        ]
      }
      content_items: {
        Row: {
          approver_id: string | null
          brief: string | null
          caption: string | null
          client_id: string
          client_visible: boolean
          content_type: string | null
          created_at: string
          cta: string | null
          deleted_at: string | null
          due_date: string | null
          hook: string | null
          id: string
          objective: string | null
          organisation_id: string
          owner_id: string | null
          platform: string | null
          publish_date: string | null
          reviewer_id: string | null
          status: string
          updated_at: string
        }
        Insert: {
          approver_id?: string | null
          brief?: string | null
          caption?: string | null
          client_id: string
          client_visible?: boolean
          content_type?: string | null
          created_at?: string
          cta?: string | null
          deleted_at?: string | null
          due_date?: string | null
          hook?: string | null
          id?: string
          objective?: string | null
          organisation_id: string
          owner_id?: string | null
          platform?: string | null
          publish_date?: string | null
          reviewer_id?: string | null
          status?: string
          updated_at?: string
        }
        Update: {
          approver_id?: string | null
          brief?: string | null
          caption?: string | null
          client_id?: string
          client_visible?: boolean
          content_type?: string | null
          created_at?: string
          cta?: string | null
          deleted_at?: string | null
          due_date?: string | null
          hook?: string | null
          id?: string
          objective?: string | null
          organisation_id?: string
          owner_id?: string | null
          platform?: string | null
          publish_date?: string | null
          reviewer_id?: string | null
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "content_items_approver_id_fkey"
            columns: ["approver_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "content_items_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "content_items_organisation_id_fkey"
            columns: ["organisation_id"]
            isOneToOne: false
            referencedRelation: "organisations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "content_items_owner_id_fkey"
            columns: ["owner_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "content_items_reviewer_id_fkey"
            columns: ["reviewer_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      contracts: {
        Row: {
          auto_renews: boolean
          client_id: string
          created_at: string
          currency: string
          deleted_at: string | null
          document_id: string | null
          end_date: string | null
          id: string
          name: string
          organisation_id: string
          renewal_notice_days: number
          start_date: string | null
          status: string
          updated_at: string
          value: number | null
        }
        Insert: {
          auto_renews?: boolean
          client_id: string
          created_at?: string
          currency?: string
          deleted_at?: string | null
          document_id?: string | null
          end_date?: string | null
          id?: string
          name: string
          organisation_id: string
          renewal_notice_days?: number
          start_date?: string | null
          status?: string
          updated_at?: string
          value?: number | null
        }
        Update: {
          auto_renews?: boolean
          client_id?: string
          created_at?: string
          currency?: string
          deleted_at?: string | null
          document_id?: string | null
          end_date?: string | null
          id?: string
          name?: string
          organisation_id?: string
          renewal_notice_days?: number
          start_date?: string | null
          status?: string
          updated_at?: string
          value?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "contracts_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "contracts_document_id_fkey"
            columns: ["document_id"]
            isOneToOne: false
            referencedRelation: "documents"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "contracts_organisation_id_fkey"
            columns: ["organisation_id"]
            isOneToOne: false
            referencedRelation: "organisations"
            referencedColumns: ["id"]
          },
        ]
      }
      creative_assets: {
        Row: {
          client_id: string | null
          created_at: string
          created_by: string | null
          deleted_at: string | null
          depicts_real_client_result: boolean
          generation_cost: number | null
          generation_model: string | null
          generation_prompt: string | null
          generation_provider: string | null
          height: number | null
          id: string
          mime_type: string | null
          name: string
          organisation_id: string
          origin: string
          reviewed_at: string | null
          reviewed_by: string | null
          size_bytes: number | null
          storage_path: string
          usage_restrictions: string | null
          width: number | null
        }
        Insert: {
          client_id?: string | null
          created_at?: string
          created_by?: string | null
          deleted_at?: string | null
          depicts_real_client_result?: boolean
          generation_cost?: number | null
          generation_model?: string | null
          generation_prompt?: string | null
          generation_provider?: string | null
          height?: number | null
          id?: string
          mime_type?: string | null
          name: string
          organisation_id: string
          origin?: string
          reviewed_at?: string | null
          reviewed_by?: string | null
          size_bytes?: number | null
          storage_path: string
          usage_restrictions?: string | null
          width?: number | null
        }
        Update: {
          client_id?: string | null
          created_at?: string
          created_by?: string | null
          deleted_at?: string | null
          depicts_real_client_result?: boolean
          generation_cost?: number | null
          generation_model?: string | null
          generation_prompt?: string | null
          generation_provider?: string | null
          height?: number | null
          id?: string
          mime_type?: string | null
          name?: string
          organisation_id?: string
          origin?: string
          reviewed_at?: string | null
          reviewed_by?: string | null
          size_bytes?: number | null
          storage_path?: string
          usage_restrictions?: string | null
          width?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "creative_assets_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "creative_assets_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "creative_assets_organisation_id_fkey"
            columns: ["organisation_id"]
            isOneToOne: false
            referencedRelation: "organisations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "creative_assets_reviewed_by_fkey"
            columns: ["reviewed_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      deals: {
        Row: {
          client_id: string | null
          closed_at: string | null
          created_at: string
          currency: string
          deleted_at: string | null
          expected_close_date: string | null
          id: string
          lead_id: string | null
          organisation_id: string
          owner_id: string | null
          stage: string
          status: string
          title: string
          updated_at: string
          value: number | null
          win_loss_reason: string | null
        }
        Insert: {
          client_id?: string | null
          closed_at?: string | null
          created_at?: string
          currency?: string
          deleted_at?: string | null
          expected_close_date?: string | null
          id?: string
          lead_id?: string | null
          organisation_id: string
          owner_id?: string | null
          stage?: string
          status?: string
          title: string
          updated_at?: string
          value?: number | null
          win_loss_reason?: string | null
        }
        Update: {
          client_id?: string | null
          closed_at?: string | null
          created_at?: string
          currency?: string
          deleted_at?: string | null
          expected_close_date?: string | null
          id?: string
          lead_id?: string | null
          organisation_id?: string
          owner_id?: string | null
          stage?: string
          status?: string
          title?: string
          updated_at?: string
          value?: number | null
          win_loss_reason?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "deals_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "deals_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "leads"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "deals_organisation_id_fkey"
            columns: ["organisation_id"]
            isOneToOne: false
            referencedRelation: "organisations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "deals_owner_id_fkey"
            columns: ["owner_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      decision_records: {
        Row: {
          affects: Json
          client_id: string | null
          created_at: string
          decided_by: string | null
          decision: string
          decision_type: string
          deleted_at: string | null
          effective_at: string
          id: string
          organisation_id: string
          rationale: string | null
          source_evidence_id: string | null
          status: string
          supersedes_id: string | null
          title: string
          updated_at: string
        }
        Insert: {
          affects?: Json
          client_id?: string | null
          created_at?: string
          decided_by?: string | null
          decision: string
          decision_type: string
          deleted_at?: string | null
          effective_at?: string
          id?: string
          organisation_id: string
          rationale?: string | null
          source_evidence_id?: string | null
          status?: string
          supersedes_id?: string | null
          title: string
          updated_at?: string
        }
        Update: {
          affects?: Json
          client_id?: string | null
          created_at?: string
          decided_by?: string | null
          decision?: string
          decision_type?: string
          deleted_at?: string | null
          effective_at?: string
          id?: string
          organisation_id?: string
          rationale?: string | null
          source_evidence_id?: string | null
          status?: string
          supersedes_id?: string | null
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "decision_records_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "decision_records_decided_by_fkey"
            columns: ["decided_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "decision_records_organisation_id_fkey"
            columns: ["organisation_id"]
            isOneToOne: false
            referencedRelation: "organisations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "decision_records_source_evidence_id_fkey"
            columns: ["source_evidence_id"]
            isOneToOne: false
            referencedRelation: "evidence_items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "decision_records_supersedes_id_fkey"
            columns: ["supersedes_id"]
            isOneToOne: false
            referencedRelation: "decision_records"
            referencedColumns: ["id"]
          },
        ]
      }
      deployments: {
        Row: {
          created_at: string
          deployment_kind: string
          environment: string
          id: string
          landing_page_project_id: string
          landing_page_version_id: string | null
          organisation_id: string
          provider: string
          status: string
          triggered_by: string | null
          url: string | null
        }
        Insert: {
          created_at?: string
          deployment_kind?: string
          environment: string
          id?: string
          landing_page_project_id: string
          landing_page_version_id?: string | null
          organisation_id: string
          provider?: string
          status?: string
          triggered_by?: string | null
          url?: string | null
        }
        Update: {
          created_at?: string
          deployment_kind?: string
          environment?: string
          id?: string
          landing_page_project_id?: string
          landing_page_version_id?: string | null
          organisation_id?: string
          provider?: string
          status?: string
          triggered_by?: string | null
          url?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "deployments_landing_page_project_id_fkey"
            columns: ["landing_page_project_id"]
            isOneToOne: false
            referencedRelation: "landing_page_projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "deployments_landing_page_version_id_fkey"
            columns: ["landing_page_version_id"]
            isOneToOne: false
            referencedRelation: "landing_page_versions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "deployments_organisation_id_fkey"
            columns: ["organisation_id"]
            isOneToOne: false
            referencedRelation: "organisations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "deployments_triggered_by_fkey"
            columns: ["triggered_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      designs: {
        Row: {
          ad_creative_id: string | null
          campaign_id: string | null
          canvas_json: Json
          carousel_group_id: string | null
          client_id: string | null
          content_item_id: string | null
          created_at: string
          created_by: string | null
          deleted_at: string | null
          export_path: string | null
          format: string
          height: number
          id: string
          is_template: boolean
          name: string
          organisation_id: string
          slide_index: number | null
          source_design_id: string | null
          status: string
          template_category: string | null
          thumbnail_path: string | null
          updated_at: string
          version: number
          width: number
        }
        Insert: {
          ad_creative_id?: string | null
          campaign_id?: string | null
          canvas_json?: Json
          carousel_group_id?: string | null
          client_id?: string | null
          content_item_id?: string | null
          created_at?: string
          created_by?: string | null
          deleted_at?: string | null
          export_path?: string | null
          format?: string
          height?: number
          id?: string
          is_template?: boolean
          name: string
          organisation_id: string
          slide_index?: number | null
          source_design_id?: string | null
          status?: string
          template_category?: string | null
          thumbnail_path?: string | null
          updated_at?: string
          version?: number
          width?: number
        }
        Update: {
          ad_creative_id?: string | null
          campaign_id?: string | null
          canvas_json?: Json
          carousel_group_id?: string | null
          client_id?: string | null
          content_item_id?: string | null
          created_at?: string
          created_by?: string | null
          deleted_at?: string | null
          export_path?: string | null
          format?: string
          height?: number
          id?: string
          is_template?: boolean
          name?: string
          organisation_id?: string
          slide_index?: number | null
          source_design_id?: string | null
          status?: string
          template_category?: string | null
          thumbnail_path?: string | null
          updated_at?: string
          version?: number
          width?: number
        }
        Relationships: [
          {
            foreignKeyName: "designs_ad_creative_id_fkey"
            columns: ["ad_creative_id"]
            isOneToOne: false
            referencedRelation: "ad_creatives"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "designs_campaign_id_fkey"
            columns: ["campaign_id"]
            isOneToOne: false
            referencedRelation: "campaigns"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "designs_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "designs_content_item_id_fkey"
            columns: ["content_item_id"]
            isOneToOne: false
            referencedRelation: "content_items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "designs_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "designs_organisation_id_fkey"
            columns: ["organisation_id"]
            isOneToOne: false
            referencedRelation: "organisations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "designs_source_design_id_fkey"
            columns: ["source_design_id"]
            isOneToOne: false
            referencedRelation: "designs"
            referencedColumns: ["id"]
          },
        ]
      }
      documents: {
        Row: {
          client_id: string | null
          client_visible: boolean
          created_at: string
          deleted_at: string | null
          file_type: string | null
          id: string
          name: string
          organisation_id: string
          project_id: string | null
          size_bytes: number | null
          storage_path: string
          uploaded_by: string | null
        }
        Insert: {
          client_id?: string | null
          client_visible?: boolean
          created_at?: string
          deleted_at?: string | null
          file_type?: string | null
          id?: string
          name: string
          organisation_id: string
          project_id?: string | null
          size_bytes?: number | null
          storage_path: string
          uploaded_by?: string | null
        }
        Update: {
          client_id?: string | null
          client_visible?: boolean
          created_at?: string
          deleted_at?: string | null
          file_type?: string | null
          id?: string
          name?: string
          organisation_id?: string
          project_id?: string | null
          size_bytes?: number | null
          storage_path?: string
          uploaded_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "documents_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "documents_organisation_id_fkey"
            columns: ["organisation_id"]
            isOneToOne: false
            referencedRelation: "organisations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "documents_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "documents_uploaded_by_fkey"
            columns: ["uploaded_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      email_flow_steps: {
        Row: {
          channel: string
          clicks: number
          conversions: number
          created_at: string
          delay_hours: number
          delivered: number
          flow_id: string
          id: string
          name: string
          opens: number
          organisation_id: string
          purpose: string | null
          revenue: number
          sent: number
          stats_period_end: string | null
          stats_period_start: string | null
          step_index: number
          subject: string | null
          unsubscribes: number
          updated_at: string
        }
        Insert: {
          channel?: string
          clicks?: number
          conversions?: number
          created_at?: string
          delay_hours?: number
          delivered?: number
          flow_id: string
          id?: string
          name: string
          opens?: number
          organisation_id: string
          purpose?: string | null
          revenue?: number
          sent?: number
          stats_period_end?: string | null
          stats_period_start?: string | null
          step_index: number
          subject?: string | null
          unsubscribes?: number
          updated_at?: string
        }
        Update: {
          channel?: string
          clicks?: number
          conversions?: number
          created_at?: string
          delay_hours?: number
          delivered?: number
          flow_id?: string
          id?: string
          name?: string
          opens?: number
          organisation_id?: string
          purpose?: string | null
          revenue?: number
          sent?: number
          stats_period_end?: string | null
          stats_period_start?: string | null
          step_index?: number
          subject?: string | null
          unsubscribes?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "email_flow_steps_flow_id_fkey"
            columns: ["flow_id"]
            isOneToOne: false
            referencedRelation: "email_flows"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "email_flow_steps_organisation_id_fkey"
            columns: ["organisation_id"]
            isOneToOne: false
            referencedRelation: "organisations"
            referencedColumns: ["id"]
          },
        ]
      }
      email_flows: {
        Row: {
          client_id: string
          created_at: string
          created_by: string | null
          deleted_at: string | null
          entered: number
          external_ref: string | null
          flow_type: string
          goal: string | null
          id: string
          name: string
          organisation_id: string
          platform: string | null
          status: string
          trigger_description: string | null
          updated_at: string
        }
        Insert: {
          client_id: string
          created_at?: string
          created_by?: string | null
          deleted_at?: string | null
          entered?: number
          external_ref?: string | null
          flow_type?: string
          goal?: string | null
          id?: string
          name: string
          organisation_id: string
          platform?: string | null
          status?: string
          trigger_description?: string | null
          updated_at?: string
        }
        Update: {
          client_id?: string
          created_at?: string
          created_by?: string | null
          deleted_at?: string | null
          entered?: number
          external_ref?: string | null
          flow_type?: string
          goal?: string | null
          id?: string
          name?: string
          organisation_id?: string
          platform?: string | null
          status?: string
          trigger_description?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "email_flows_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "email_flows_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "email_flows_organisation_id_fkey"
            columns: ["organisation_id"]
            isOneToOne: false
            referencedRelation: "organisations"
            referencedColumns: ["id"]
          },
        ]
      }
      evaluation_records: {
        Row: {
          client_id: string | null
          created_at: string
          created_by: string | null
          dimensions: Json
          evaluation_type: string
          evaluator_identity_id: string | null
          id: string
          independent: boolean
          notes: string | null
          organisation_id: string
          overall_outcome: string
          plugin_id: string
          task_envelope_id: string | null
        }
        Insert: {
          client_id?: string | null
          created_at?: string
          created_by?: string | null
          dimensions?: Json
          evaluation_type: string
          evaluator_identity_id?: string | null
          id?: string
          independent?: boolean
          notes?: string | null
          organisation_id: string
          overall_outcome: string
          plugin_id: string
          task_envelope_id?: string | null
        }
        Update: {
          client_id?: string | null
          created_at?: string
          created_by?: string | null
          dimensions?: Json
          evaluation_type?: string
          evaluator_identity_id?: string | null
          id?: string
          independent?: boolean
          notes?: string | null
          organisation_id?: string
          overall_outcome?: string
          plugin_id?: string
          task_envelope_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "evaluation_records_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "evaluation_records_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "evaluation_records_evaluator_identity_id_fkey"
            columns: ["evaluator_identity_id"]
            isOneToOne: false
            referencedRelation: "identity_registry"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "evaluation_records_organisation_id_fkey"
            columns: ["organisation_id"]
            isOneToOne: false
            referencedRelation: "organisations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "evaluation_records_task_envelope_id_fkey"
            columns: ["task_envelope_id"]
            isOneToOne: false
            referencedRelation: "task_envelopes"
            referencedColumns: ["id"]
          },
        ]
      }
      event_attendees: {
        Row: {
          checked_in: boolean
          created_at: string
          email: string | null
          event_id: string
          id: string
          name: string
          organisation_id: string
          ticket_type: string | null
        }
        Insert: {
          checked_in?: boolean
          created_at?: string
          email?: string | null
          event_id: string
          id?: string
          name: string
          organisation_id: string
          ticket_type?: string | null
        }
        Update: {
          checked_in?: boolean
          created_at?: string
          email?: string | null
          event_id?: string
          id?: string
          name?: string
          organisation_id?: string
          ticket_type?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "event_attendees_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "event_attendees_organisation_id_fkey"
            columns: ["organisation_id"]
            isOneToOne: false
            referencedRelation: "organisations"
            referencedColumns: ["id"]
          },
        ]
      }
      event_segments: {
        Row: {
          completed_at: string | null
          created_at: string
          duration_minutes: number
          event_id: string
          id: string
          location: string | null
          notes: string | null
          organisation_id: string
          owner_id: string | null
          owner_name: string | null
          starts_after_minutes: number
          title: string
          updated_at: string
        }
        Insert: {
          completed_at?: string | null
          created_at?: string
          duration_minutes?: number
          event_id: string
          id?: string
          location?: string | null
          notes?: string | null
          organisation_id: string
          owner_id?: string | null
          owner_name?: string | null
          starts_after_minutes?: number
          title: string
          updated_at?: string
        }
        Update: {
          completed_at?: string | null
          created_at?: string
          duration_minutes?: number
          event_id?: string
          id?: string
          location?: string | null
          notes?: string | null
          organisation_id?: string
          owner_id?: string | null
          owner_name?: string | null
          starts_after_minutes?: number
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "event_segments_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "event_segments_organisation_id_fkey"
            columns: ["organisation_id"]
            isOneToOne: false
            referencedRelation: "organisations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "event_segments_owner_id_fkey"
            columns: ["owner_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      event_sponsor_deliverables: {
        Row: {
          created_at: string
          delivered_at: string | null
          description: string
          due_date: string | null
          id: string
          organisation_id: string
          sponsor_id: string
        }
        Insert: {
          created_at?: string
          delivered_at?: string | null
          description: string
          due_date?: string | null
          id?: string
          organisation_id: string
          sponsor_id: string
        }
        Update: {
          created_at?: string
          delivered_at?: string | null
          description?: string
          due_date?: string | null
          id?: string
          organisation_id?: string
          sponsor_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "event_sponsor_deliverables_organisation_id_fkey"
            columns: ["organisation_id"]
            isOneToOne: false
            referencedRelation: "organisations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "event_sponsor_deliverables_sponsor_id_fkey"
            columns: ["sponsor_id"]
            isOneToOne: false
            referencedRelation: "event_sponsors"
            referencedColumns: ["id"]
          },
        ]
      }
      event_sponsors: {
        Row: {
          cash_amount: number
          contact_email: string | null
          contact_name: string | null
          created_at: string
          event_id: string
          id: string
          in_kind_description: string | null
          invoiced_at: string | null
          name: string
          notes: string | null
          organisation_id: string
          paid_at: string | null
          status: string
          tier: string
          updated_at: string
        }
        Insert: {
          cash_amount?: number
          contact_email?: string | null
          contact_name?: string | null
          created_at?: string
          event_id: string
          id?: string
          in_kind_description?: string | null
          invoiced_at?: string | null
          name: string
          notes?: string | null
          organisation_id: string
          paid_at?: string | null
          status?: string
          tier?: string
          updated_at?: string
        }
        Update: {
          cash_amount?: number
          contact_email?: string | null
          contact_name?: string | null
          created_at?: string
          event_id?: string
          id?: string
          in_kind_description?: string | null
          invoiced_at?: string | null
          name?: string
          notes?: string | null
          organisation_id?: string
          paid_at?: string | null
          status?: string
          tier?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "event_sponsors_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "event_sponsors_organisation_id_fkey"
            columns: ["organisation_id"]
            isOneToOne: false
            referencedRelation: "organisations"
            referencedColumns: ["id"]
          },
        ]
      }
      events: {
        Row: {
          client_id: string | null
          created_at: string
          deleted_at: string | null
          ends_at: string | null
          id: string
          name: string
          notes: string | null
          organisation_id: string
          starts_at: string | null
          status: string
          target_attendance: number | null
          ticket_link: string | null
          ticket_revenue: number
          tickets_sold: number
          updated_at: string
          venue: string | null
        }
        Insert: {
          client_id?: string | null
          created_at?: string
          deleted_at?: string | null
          ends_at?: string | null
          id?: string
          name: string
          notes?: string | null
          organisation_id: string
          starts_at?: string | null
          status?: string
          target_attendance?: number | null
          ticket_link?: string | null
          ticket_revenue?: number
          tickets_sold?: number
          updated_at?: string
          venue?: string | null
        }
        Update: {
          client_id?: string | null
          created_at?: string
          deleted_at?: string | null
          ends_at?: string | null
          id?: string
          name?: string
          notes?: string | null
          organisation_id?: string
          starts_at?: string | null
          status?: string
          target_attendance?: number | null
          ticket_link?: string | null
          ticket_revenue?: number
          tickets_sold?: number
          updated_at?: string
          venue?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "events_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "events_organisation_id_fkey"
            columns: ["organisation_id"]
            isOneToOne: false
            referencedRelation: "organisations"
            referencedColumns: ["id"]
          },
        ]
      }
      evidence_items: {
        Row: {
          captured_at: string
          captured_by: string | null
          client_id: string | null
          confidence_label: string
          confidentiality: string
          created_at: string
          deleted_at: string | null
          evidence_type: string
          extracted_data: Json
          id: string
          observed_at: string | null
          organisation_id: string
          raw_text: string
          source_ai_run_id: string | null
          source_locator: string | null
          status: string
          summary: string | null
          tags: string[]
          title: string
          updated_at: string
        }
        Insert: {
          captured_at?: string
          captured_by?: string | null
          client_id?: string | null
          confidence_label?: string
          confidentiality?: string
          created_at?: string
          deleted_at?: string | null
          evidence_type: string
          extracted_data?: Json
          id?: string
          observed_at?: string | null
          organisation_id: string
          raw_text: string
          source_ai_run_id?: string | null
          source_locator?: string | null
          status?: string
          summary?: string | null
          tags?: string[]
          title: string
          updated_at?: string
        }
        Update: {
          captured_at?: string
          captured_by?: string | null
          client_id?: string | null
          confidence_label?: string
          confidentiality?: string
          created_at?: string
          deleted_at?: string | null
          evidence_type?: string
          extracted_data?: Json
          id?: string
          observed_at?: string | null
          organisation_id?: string
          raw_text?: string
          source_ai_run_id?: string | null
          source_locator?: string | null
          status?: string
          summary?: string | null
          tags?: string[]
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "evidence_items_captured_by_fkey"
            columns: ["captured_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "evidence_items_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "evidence_items_organisation_id_fkey"
            columns: ["organisation_id"]
            isOneToOne: false
            referencedRelation: "organisations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "evidence_items_source_ai_run_id_fkey"
            columns: ["source_ai_run_id"]
            isOneToOne: false
            referencedRelation: "ai_runs"
            referencedColumns: ["id"]
          },
        ]
      }
      expenses: {
        Row: {
          amount: number
          category: string
          client_id: string | null
          created_at: string
          currency: string
          deleted_at: string | null
          description: string
          id: string
          incurred_on: string
          organisation_id: string
          receipt_document_id: string | null
          recorded_by: string | null
          vendor: string | null
        }
        Insert: {
          amount: number
          category?: string
          client_id?: string | null
          created_at?: string
          currency?: string
          deleted_at?: string | null
          description: string
          id?: string
          incurred_on?: string
          organisation_id: string
          receipt_document_id?: string | null
          recorded_by?: string | null
          vendor?: string | null
        }
        Update: {
          amount?: number
          category?: string
          client_id?: string | null
          created_at?: string
          currency?: string
          deleted_at?: string | null
          description?: string
          id?: string
          incurred_on?: string
          organisation_id?: string
          receipt_document_id?: string | null
          recorded_by?: string | null
          vendor?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "expenses_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "expenses_organisation_id_fkey"
            columns: ["organisation_id"]
            isOneToOne: false
            referencedRelation: "organisations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "expenses_receipt_document_id_fkey"
            columns: ["receipt_document_id"]
            isOneToOne: false
            referencedRelation: "documents"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "expenses_recorded_by_fkey"
            columns: ["recorded_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      experiments: {
        Row: {
          client_id: string
          created_at: string
          created_by: string | null
          decision: string | null
          deleted_at: string | null
          end_date: string | null
          hypothesis: string
          id: string
          learnings: string | null
          name: string
          organisation_id: string
          page_url: string | null
          result: string | null
          start_date: string | null
          statistical_confidence: string | null
          status: string
          success_metric: string | null
          updated_at: string
          variant_description: string | null
        }
        Insert: {
          client_id: string
          created_at?: string
          created_by?: string | null
          decision?: string | null
          deleted_at?: string | null
          end_date?: string | null
          hypothesis: string
          id?: string
          learnings?: string | null
          name: string
          organisation_id: string
          page_url?: string | null
          result?: string | null
          start_date?: string | null
          statistical_confidence?: string | null
          status?: string
          success_metric?: string | null
          updated_at?: string
          variant_description?: string | null
        }
        Update: {
          client_id?: string
          created_at?: string
          created_by?: string | null
          decision?: string | null
          deleted_at?: string | null
          end_date?: string | null
          hypothesis?: string
          id?: string
          learnings?: string | null
          name?: string
          organisation_id?: string
          page_url?: string | null
          result?: string | null
          start_date?: string | null
          statistical_confidence?: string | null
          status?: string
          success_metric?: string | null
          updated_at?: string
          variant_description?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "experiments_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "experiments_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "experiments_organisation_id_fkey"
            columns: ["organisation_id"]
            isOneToOne: false
            referencedRelation: "organisations"
            referencedColumns: ["id"]
          },
        ]
      }
      feature_flags: {
        Row: {
          created_at: string
          description: string | null
          id: string
          is_enabled: boolean
          key: string
          organisation_id: string | null
          rollout: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          is_enabled?: boolean
          key: string
          organisation_id?: string | null
          rollout?: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          is_enabled?: boolean
          key?: string
          organisation_id?: string | null
          rollout?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "feature_flags_organisation_id_fkey"
            columns: ["organisation_id"]
            isOneToOne: false
            referencedRelation: "organisations"
            referencedColumns: ["id"]
          },
        ]
      }
      gbp_metrics: {
        Row: {
          average_rating: number | null
          bookings: number
          calls: number
          client_id: string
          created_at: string
          direction_requests: number
          id: string
          new_reviews: number | null
          organisation_id: string
          period_end: string
          period_start: string
          profile_views: number
          reviews_total: number | null
          search_impressions: number
          website_clicks: number
        }
        Insert: {
          average_rating?: number | null
          bookings?: number
          calls?: number
          client_id: string
          created_at?: string
          direction_requests?: number
          id?: string
          new_reviews?: number | null
          organisation_id: string
          period_end: string
          period_start: string
          profile_views?: number
          reviews_total?: number | null
          search_impressions?: number
          website_clicks?: number
        }
        Update: {
          average_rating?: number | null
          bookings?: number
          calls?: number
          client_id?: string
          created_at?: string
          direction_requests?: number
          id?: string
          new_reviews?: number | null
          organisation_id?: string
          period_end?: string
          period_start?: string
          profile_views?: number
          reviews_total?: number | null
          search_impressions?: number
          website_clicks?: number
        }
        Relationships: [
          {
            foreignKeyName: "gbp_metrics_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "gbp_metrics_organisation_id_fkey"
            columns: ["organisation_id"]
            isOneToOne: false
            referencedRelation: "organisations"
            referencedColumns: ["id"]
          },
        ]
      }
      identity_registry: {
        Row: {
          approved_by: string | null
          authority_notes: string | null
          client_id: string | null
          created_at: string
          deleted_at: string | null
          display_name: string
          evidence_status: string
          id: string
          identity_type: string
          last_approved_at: string | null
          organisation_id: string
          owner_profile_id: string | null
          reasoning_principles: Json
          restrictions: Json
          review_status: string
          scope: string
          source_references: Json
          stable_key: string
          updated_at: string
          version: string
          voice_guidance: string | null
        }
        Insert: {
          approved_by?: string | null
          authority_notes?: string | null
          client_id?: string | null
          created_at?: string
          deleted_at?: string | null
          display_name: string
          evidence_status?: string
          id?: string
          identity_type: string
          last_approved_at?: string | null
          organisation_id: string
          owner_profile_id?: string | null
          reasoning_principles?: Json
          restrictions?: Json
          review_status?: string
          scope?: string
          source_references?: Json
          stable_key: string
          updated_at?: string
          version?: string
          voice_guidance?: string | null
        }
        Update: {
          approved_by?: string | null
          authority_notes?: string | null
          client_id?: string | null
          created_at?: string
          deleted_at?: string | null
          display_name?: string
          evidence_status?: string
          id?: string
          identity_type?: string
          last_approved_at?: string | null
          organisation_id?: string
          owner_profile_id?: string | null
          reasoning_principles?: Json
          restrictions?: Json
          review_status?: string
          scope?: string
          source_references?: Json
          stable_key?: string
          updated_at?: string
          version?: string
          voice_guidance?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "identity_registry_approved_by_fkey"
            columns: ["approved_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "identity_registry_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "identity_registry_organisation_id_fkey"
            columns: ["organisation_id"]
            isOneToOne: false
            referencedRelation: "organisations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "identity_registry_owner_profile_id_fkey"
            columns: ["owner_profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      influencers: {
        Row: {
          client_id: string | null
          compensation: string | null
          created_at: string
          deleted_at: string | null
          email: string | null
          followers: number | null
          handle: string | null
          id: string
          name: string
          notes: string | null
          organisation_id: string
          platform: string | null
          status: string
          updated_at: string
          usage_rights: string | null
        }
        Insert: {
          client_id?: string | null
          compensation?: string | null
          created_at?: string
          deleted_at?: string | null
          email?: string | null
          followers?: number | null
          handle?: string | null
          id?: string
          name: string
          notes?: string | null
          organisation_id: string
          platform?: string | null
          status?: string
          updated_at?: string
          usage_rights?: string | null
        }
        Update: {
          client_id?: string | null
          compensation?: string | null
          created_at?: string
          deleted_at?: string | null
          email?: string | null
          followers?: number | null
          handle?: string | null
          id?: string
          name?: string
          notes?: string | null
          organisation_id?: string
          platform?: string | null
          status?: string
          updated_at?: string
          usage_rights?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "influencers_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "influencers_organisation_id_fkey"
            columns: ["organisation_id"]
            isOneToOne: false
            referencedRelation: "organisations"
            referencedColumns: ["id"]
          },
        ]
      }
      integration_connections: {
        Row: {
          connected_by_user_id: string | null
          created_at: string
          id: string
          last_error: string | null
          last_synced_at: string | null
          organisation_id: string
          provider: string
          scopes: string[]
          status: string
          updated_at: string
        }
        Insert: {
          connected_by_user_id?: string | null
          created_at?: string
          id?: string
          last_error?: string | null
          last_synced_at?: string | null
          organisation_id: string
          provider: string
          scopes?: string[]
          status?: string
          updated_at?: string
        }
        Update: {
          connected_by_user_id?: string | null
          created_at?: string
          id?: string
          last_error?: string | null
          last_synced_at?: string | null
          organisation_id?: string
          provider?: string
          scopes?: string[]
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "integration_connections_connected_by_user_id_fkey"
            columns: ["connected_by_user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "integration_connections_organisation_id_fkey"
            columns: ["organisation_id"]
            isOneToOne: false
            referencedRelation: "organisations"
            referencedColumns: ["id"]
          },
        ]
      }
      integration_sync_logs: {
        Row: {
          error_message: string | null
          finished_at: string | null
          id: string
          integration_connection_id: string
          records_synced: number
          started_at: string
          status: string
        }
        Insert: {
          error_message?: string | null
          finished_at?: string | null
          id?: string
          integration_connection_id: string
          records_synced?: number
          started_at?: string
          status?: string
        }
        Update: {
          error_message?: string | null
          finished_at?: string | null
          id?: string
          integration_connection_id?: string
          records_synced?: number
          started_at?: string
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "integration_sync_logs_integration_connection_id_fkey"
            columns: ["integration_connection_id"]
            isOneToOne: false
            referencedRelation: "integration_connections"
            referencedColumns: ["id"]
          },
        ]
      }
      invoices: {
        Row: {
          amount: number
          client_id: string
          created_at: string
          created_by: string | null
          currency: string
          deleted_at: string | null
          due_date: string | null
          id: string
          issue_date: string
          notes: string | null
          number: string
          organisation_id: string
          paid_at: string | null
          retainer_id: string | null
          status: string
          tax_amount: number
          updated_at: string
        }
        Insert: {
          amount: number
          client_id: string
          created_at?: string
          created_by?: string | null
          currency?: string
          deleted_at?: string | null
          due_date?: string | null
          id?: string
          issue_date?: string
          notes?: string | null
          number: string
          organisation_id: string
          paid_at?: string | null
          retainer_id?: string | null
          status?: string
          tax_amount?: number
          updated_at?: string
        }
        Update: {
          amount?: number
          client_id?: string
          created_at?: string
          created_by?: string | null
          currency?: string
          deleted_at?: string | null
          due_date?: string | null
          id?: string
          issue_date?: string
          notes?: string | null
          number?: string
          organisation_id?: string
          paid_at?: string | null
          retainer_id?: string | null
          status?: string
          tax_amount?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "invoices_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "invoices_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "invoices_organisation_id_fkey"
            columns: ["organisation_id"]
            isOneToOne: false
            referencedRelation: "organisations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "invoices_retainer_id_fkey"
            columns: ["retainer_id"]
            isOneToOne: false
            referencedRelation: "retainers"
            referencedColumns: ["id"]
          },
        ]
      }
      knowledge_entries: {
        Row: {
          body: string
          client_id: string | null
          confidentiality: string
          created_at: string
          created_by: string | null
          deleted_at: string | null
          id: string
          kind: string
          last_reviewed_at: string | null
          last_reviewed_by: string | null
          organisation_id: string
          review_due_on: string | null
          source_reference: string | null
          status: string
          summary: string | null
          supersedes_id: string | null
          tags: string[]
          title: string
          updated_at: string
        }
        Insert: {
          body: string
          client_id?: string | null
          confidentiality?: string
          created_at?: string
          created_by?: string | null
          deleted_at?: string | null
          id?: string
          kind: string
          last_reviewed_at?: string | null
          last_reviewed_by?: string | null
          organisation_id: string
          review_due_on?: string | null
          source_reference?: string | null
          status?: string
          summary?: string | null
          supersedes_id?: string | null
          tags?: string[]
          title: string
          updated_at?: string
        }
        Update: {
          body?: string
          client_id?: string | null
          confidentiality?: string
          created_at?: string
          created_by?: string | null
          deleted_at?: string | null
          id?: string
          kind?: string
          last_reviewed_at?: string | null
          last_reviewed_by?: string | null
          organisation_id?: string
          review_due_on?: string | null
          source_reference?: string | null
          status?: string
          summary?: string | null
          supersedes_id?: string | null
          tags?: string[]
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "knowledge_entries_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "knowledge_entries_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "knowledge_entries_last_reviewed_by_fkey"
            columns: ["last_reviewed_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "knowledge_entries_organisation_id_fkey"
            columns: ["organisation_id"]
            isOneToOne: false
            referencedRelation: "organisations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "knowledge_entries_supersedes_id_fkey"
            columns: ["supersedes_id"]
            isOneToOne: false
            referencedRelation: "knowledge_entries"
            referencedColumns: ["id"]
          },
        ]
      }
      landing_page_briefs: {
        Row: {
          approval_owner_id: string | null
          approved_at: string | null
          audience: string | null
          booking_link: string | null
          brand_direction: string | null
          campaign_id: string | null
          client_id: string
          conversion_action: string
          created_at: string
          created_by: string | null
          deadline: string | null
          deleted_at: string | null
          differentiators: string | null
          forbidden_claims: string | null
          goal: string | null
          id: string
          launch_date: string | null
          location: string | null
          main_cta: string
          objections: string | null
          offer: string
          organisation_id: string
          price: string | null
          product_link: string | null
          product_service: string | null
          promotion: string | null
          proof_points: string | null
          reference_projects: string | null
          required_claims: string | null
          required_disclaimer: string | null
          required_integrations: string | null
          required_tracking: string | null
          secondary_cta: string | null
          stakeholders: string | null
          status: string
          testimonials: string | null
          ticket_link: string | null
          title: string
          traffic_source: string | null
          updated_at: string
        }
        Insert: {
          approval_owner_id?: string | null
          approved_at?: string | null
          audience?: string | null
          booking_link?: string | null
          brand_direction?: string | null
          campaign_id?: string | null
          client_id: string
          conversion_action: string
          created_at?: string
          created_by?: string | null
          deadline?: string | null
          deleted_at?: string | null
          differentiators?: string | null
          forbidden_claims?: string | null
          goal?: string | null
          id?: string
          launch_date?: string | null
          location?: string | null
          main_cta: string
          objections?: string | null
          offer: string
          organisation_id: string
          price?: string | null
          product_link?: string | null
          product_service?: string | null
          promotion?: string | null
          proof_points?: string | null
          reference_projects?: string | null
          required_claims?: string | null
          required_disclaimer?: string | null
          required_integrations?: string | null
          required_tracking?: string | null
          secondary_cta?: string | null
          stakeholders?: string | null
          status?: string
          testimonials?: string | null
          ticket_link?: string | null
          title: string
          traffic_source?: string | null
          updated_at?: string
        }
        Update: {
          approval_owner_id?: string | null
          approved_at?: string | null
          audience?: string | null
          booking_link?: string | null
          brand_direction?: string | null
          campaign_id?: string | null
          client_id?: string
          conversion_action?: string
          created_at?: string
          created_by?: string | null
          deadline?: string | null
          deleted_at?: string | null
          differentiators?: string | null
          forbidden_claims?: string | null
          goal?: string | null
          id?: string
          launch_date?: string | null
          location?: string | null
          main_cta?: string
          objections?: string | null
          offer?: string
          organisation_id?: string
          price?: string | null
          product_link?: string | null
          product_service?: string | null
          promotion?: string | null
          proof_points?: string | null
          reference_projects?: string | null
          required_claims?: string | null
          required_disclaimer?: string | null
          required_integrations?: string | null
          required_tracking?: string | null
          secondary_cta?: string | null
          stakeholders?: string | null
          status?: string
          testimonials?: string | null
          ticket_link?: string | null
          title?: string
          traffic_source?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "landing_page_briefs_approval_owner_id_fkey"
            columns: ["approval_owner_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "landing_page_briefs_campaign_id_fkey"
            columns: ["campaign_id"]
            isOneToOne: false
            referencedRelation: "campaigns"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "landing_page_briefs_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "landing_page_briefs_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "landing_page_briefs_organisation_id_fkey"
            columns: ["organisation_id"]
            isOneToOne: false
            referencedRelation: "organisations"
            referencedColumns: ["id"]
          },
        ]
      }
      landing_page_performance_records: {
        Row: {
          bookings: number
          campaign_id: string | null
          client_id: string
          conversion_rate: number | null
          created_at: string
          created_by: string | null
          experiment_id: string | null
          id: string
          landing_page_project_id: string
          landing_page_version_id: string | null
          leads: number
          metric_date: string
          organisation_id: string
          qualified_leads: number
          revenue: number
          source: string
          verified_learning: string | null
          visits: number
        }
        Insert: {
          bookings?: number
          campaign_id?: string | null
          client_id: string
          conversion_rate?: number | null
          created_at?: string
          created_by?: string | null
          experiment_id?: string | null
          id?: string
          landing_page_project_id: string
          landing_page_version_id?: string | null
          leads?: number
          metric_date: string
          organisation_id: string
          qualified_leads?: number
          revenue?: number
          source?: string
          verified_learning?: string | null
          visits?: number
        }
        Update: {
          bookings?: number
          campaign_id?: string | null
          client_id?: string
          conversion_rate?: number | null
          created_at?: string
          created_by?: string | null
          experiment_id?: string | null
          id?: string
          landing_page_project_id?: string
          landing_page_version_id?: string | null
          leads?: number
          metric_date?: string
          organisation_id?: string
          qualified_leads?: number
          revenue?: number
          source?: string
          verified_learning?: string | null
          visits?: number
        }
        Relationships: [
          {
            foreignKeyName: "landing_page_performance_records_campaign_id_fkey"
            columns: ["campaign_id"]
            isOneToOne: false
            referencedRelation: "campaigns"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "landing_page_performance_records_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "landing_page_performance_records_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "landing_page_performance_records_experiment_id_fkey"
            columns: ["experiment_id"]
            isOneToOne: false
            referencedRelation: "experiments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "landing_page_performance_records_landing_page_project_id_fkey"
            columns: ["landing_page_project_id"]
            isOneToOne: false
            referencedRelation: "landing_page_projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "landing_page_performance_records_landing_page_version_id_fkey"
            columns: ["landing_page_version_id"]
            isOneToOne: false
            referencedRelation: "landing_page_versions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "landing_page_performance_records_organisation_id_fkey"
            columns: ["organisation_id"]
            isOneToOne: false
            referencedRelation: "organisations"
            referencedColumns: ["id"]
          },
        ]
      }
      landing_page_projects: {
        Row: {
          branch: string | null
          brief_id: string
          client_id: string
          created_at: string
          created_by: string | null
          deleted_at: string | null
          draft_version_id: string | null
          generation_mode: string
          id: string
          name: string
          notes: string | null
          organisation_id: string
          preview_url: string | null
          production_url: string | null
          project_id: string | null
          published_version_id: string | null
          reference_build_project_id: string | null
          repository_url: string | null
          status: string
          submitted_version_id: string | null
          updated_at: string
        }
        Insert: {
          branch?: string | null
          brief_id: string
          client_id: string
          created_at?: string
          created_by?: string | null
          deleted_at?: string | null
          draft_version_id?: string | null
          generation_mode: string
          id?: string
          name: string
          notes?: string | null
          organisation_id: string
          preview_url?: string | null
          production_url?: string | null
          project_id?: string | null
          published_version_id?: string | null
          reference_build_project_id?: string | null
          repository_url?: string | null
          status?: string
          submitted_version_id?: string | null
          updated_at?: string
        }
        Update: {
          branch?: string | null
          brief_id?: string
          client_id?: string
          created_at?: string
          created_by?: string | null
          deleted_at?: string | null
          draft_version_id?: string | null
          generation_mode?: string
          id?: string
          name?: string
          notes?: string | null
          organisation_id?: string
          preview_url?: string | null
          production_url?: string | null
          project_id?: string | null
          published_version_id?: string | null
          reference_build_project_id?: string | null
          repository_url?: string | null
          status?: string
          submitted_version_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "landing_page_projects_brief_id_fkey"
            columns: ["brief_id"]
            isOneToOne: false
            referencedRelation: "landing_page_briefs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "landing_page_projects_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "landing_page_projects_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "landing_page_projects_draft_version_id_fkey"
            columns: ["draft_version_id"]
            isOneToOne: false
            referencedRelation: "landing_page_versions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "landing_page_projects_organisation_id_fkey"
            columns: ["organisation_id"]
            isOneToOne: false
            referencedRelation: "organisations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "landing_page_projects_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "landing_page_projects_published_version_id_fkey"
            columns: ["published_version_id"]
            isOneToOne: false
            referencedRelation: "landing_page_versions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "landing_page_projects_reference_build_project_id_fkey"
            columns: ["reference_build_project_id"]
            isOneToOne: false
            referencedRelation: "build_library_projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "landing_page_projects_submitted_version_id_fkey"
            columns: ["submitted_version_id"]
            isOneToOne: false
            referencedRelation: "landing_page_versions"
            referencedColumns: ["id"]
          },
        ]
      }
      landing_page_templates: {
        Row: {
          category: string
          cloned_from_template_id: string | null
          created_at: string
          created_by: string | null
          defaults: Json
          deleted_at: string | null
          description: string | null
          id: string
          name: string
          organisation_id: string
          preview_config: Json
          slug: string
          source: string
          structure: Json
          template_key: string
          updated_at: string
        }
        Insert: {
          category?: string
          cloned_from_template_id?: string | null
          created_at?: string
          created_by?: string | null
          defaults?: Json
          deleted_at?: string | null
          description?: string | null
          id?: string
          name: string
          organisation_id: string
          preview_config?: Json
          slug: string
          source?: string
          structure?: Json
          template_key: string
          updated_at?: string
        }
        Update: {
          category?: string
          cloned_from_template_id?: string | null
          created_at?: string
          created_by?: string | null
          defaults?: Json
          deleted_at?: string | null
          description?: string | null
          id?: string
          name?: string
          organisation_id?: string
          preview_config?: Json
          slug?: string
          source?: string
          structure?: Json
          template_key?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "landing_page_templates_cloned_from_template_id_fkey"
            columns: ["cloned_from_template_id"]
            isOneToOne: false
            referencedRelation: "landing_page_templates"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "landing_page_templates_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "landing_page_templates_organisation_id_fkey"
            columns: ["organisation_id"]
            isOneToOne: false
            referencedRelation: "organisations"
            referencedColumns: ["id"]
          },
        ]
      }
      landing_page_versions: {
        Row: {
          approved_at: string | null
          asset_slots: Json
          client_id: string
          created_at: string
          created_by: string | null
          deleted_at: string | null
          domain: string | null
          form_settings: Json
          id: string
          landing_page_project_id: string
          leakage_check_passed: boolean
          organisation_id: string
          published_at: string | null
          sections: Json
          seo_settings: Json
          slug: string
          social_settings: Json
          source_ai_run_id: string | null
          source_context: Json
          status: string
          subdomain: string | null
          template_id: string | null
          template_key: string
          template_name: string
          theme_settings: Json
          title: string
          tracking_settings: Json
          updated_at: string
          validation_results: Json
          version_name: string
          version_number: number
        }
        Insert: {
          approved_at?: string | null
          asset_slots?: Json
          client_id: string
          created_at?: string
          created_by?: string | null
          deleted_at?: string | null
          domain?: string | null
          form_settings?: Json
          id?: string
          landing_page_project_id: string
          leakage_check_passed?: boolean
          organisation_id: string
          published_at?: string | null
          sections?: Json
          seo_settings?: Json
          slug: string
          social_settings?: Json
          source_ai_run_id?: string | null
          source_context?: Json
          status?: string
          subdomain?: string | null
          template_id?: string | null
          template_key: string
          template_name: string
          theme_settings?: Json
          title: string
          tracking_settings?: Json
          updated_at?: string
          validation_results?: Json
          version_name: string
          version_number: number
        }
        Update: {
          approved_at?: string | null
          asset_slots?: Json
          client_id?: string
          created_at?: string
          created_by?: string | null
          deleted_at?: string | null
          domain?: string | null
          form_settings?: Json
          id?: string
          landing_page_project_id?: string
          leakage_check_passed?: boolean
          organisation_id?: string
          published_at?: string | null
          sections?: Json
          seo_settings?: Json
          slug?: string
          social_settings?: Json
          source_ai_run_id?: string | null
          source_context?: Json
          status?: string
          subdomain?: string | null
          template_id?: string | null
          template_key?: string
          template_name?: string
          theme_settings?: Json
          title?: string
          tracking_settings?: Json
          updated_at?: string
          validation_results?: Json
          version_name?: string
          version_number?: number
        }
        Relationships: [
          {
            foreignKeyName: "landing_page_versions_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "landing_page_versions_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "landing_page_versions_landing_page_project_id_fkey"
            columns: ["landing_page_project_id"]
            isOneToOne: false
            referencedRelation: "landing_page_projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "landing_page_versions_organisation_id_fkey"
            columns: ["organisation_id"]
            isOneToOne: false
            referencedRelation: "organisations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "landing_page_versions_source_ai_run_id_fkey"
            columns: ["source_ai_run_id"]
            isOneToOne: false
            referencedRelation: "ai_runs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "landing_page_versions_template_id_fkey"
            columns: ["template_id"]
            isOneToOne: false
            referencedRelation: "landing_page_templates"
            referencedColumns: ["id"]
          },
        ]
      }
      leads: {
        Row: {
          click_id: string | null
          company_name: string
          contact_id: string | null
          converted_client_id: string | null
          created_at: string
          deleted_at: string | null
          estimated_value: number | null
          first_response_at: string | null
          form_submitted: string | null
          id: string
          industry: string | null
          landing_page: string | null
          lead_magnet: string | null
          meta_ad: string | null
          meta_ad_set: string | null
          meta_campaign: string | null
          notes: string | null
          organisation_id: string
          owner_id: string | null
          score: number
          service_interest: string[]
          sms_consent: boolean
          sms_consent_captured_at: string | null
          sms_opted_out_at: string | null
          source: string | null
          status: string
          updated_at: string
          utm_campaign: string | null
          utm_content: string | null
          utm_medium: string | null
          utm_source: string | null
          utm_term: string | null
        }
        Insert: {
          click_id?: string | null
          company_name: string
          contact_id?: string | null
          converted_client_id?: string | null
          created_at?: string
          deleted_at?: string | null
          estimated_value?: number | null
          first_response_at?: string | null
          form_submitted?: string | null
          id?: string
          industry?: string | null
          landing_page?: string | null
          lead_magnet?: string | null
          meta_ad?: string | null
          meta_ad_set?: string | null
          meta_campaign?: string | null
          notes?: string | null
          organisation_id: string
          owner_id?: string | null
          score?: number
          service_interest?: string[]
          sms_consent?: boolean
          sms_consent_captured_at?: string | null
          sms_opted_out_at?: string | null
          source?: string | null
          status?: string
          updated_at?: string
          utm_campaign?: string | null
          utm_content?: string | null
          utm_medium?: string | null
          utm_source?: string | null
          utm_term?: string | null
        }
        Update: {
          click_id?: string | null
          company_name?: string
          contact_id?: string | null
          converted_client_id?: string | null
          created_at?: string
          deleted_at?: string | null
          estimated_value?: number | null
          first_response_at?: string | null
          form_submitted?: string | null
          id?: string
          industry?: string | null
          landing_page?: string | null
          lead_magnet?: string | null
          meta_ad?: string | null
          meta_ad_set?: string | null
          meta_campaign?: string | null
          notes?: string | null
          organisation_id?: string
          owner_id?: string | null
          score?: number
          service_interest?: string[]
          sms_consent?: boolean
          sms_consent_captured_at?: string | null
          sms_opted_out_at?: string | null
          source?: string | null
          status?: string
          updated_at?: string
          utm_campaign?: string | null
          utm_content?: string | null
          utm_medium?: string | null
          utm_source?: string | null
          utm_term?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "leads_contact_id_fkey"
            columns: ["contact_id"]
            isOneToOne: false
            referencedRelation: "contacts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "leads_converted_client_id_fkey"
            columns: ["converted_client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "leads_organisation_id_fkey"
            columns: ["organisation_id"]
            isOneToOne: false
            referencedRelation: "organisations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "leads_owner_id_fkey"
            columns: ["owner_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      learning_proposals: {
        Row: {
          approval_record: Json
          client_id: string | null
          confidence_label: string
          contradictions_or_risks: Json
          created_at: string
          id: string
          organisation_id: string
          proposed_by_ai_run_id: string | null
          proposed_by_profile_id: string | null
          proposed_destination: Json
          proposed_learning: string
          raw_evidence_references: Json
          reason_for_promotion: string
          required_approver_id: string | null
          status: string
          updated_at: string
          version_impact: Json
        }
        Insert: {
          approval_record?: Json
          client_id?: string | null
          confidence_label?: string
          contradictions_or_risks?: Json
          created_at?: string
          id?: string
          organisation_id: string
          proposed_by_ai_run_id?: string | null
          proposed_by_profile_id?: string | null
          proposed_destination?: Json
          proposed_learning: string
          raw_evidence_references?: Json
          reason_for_promotion: string
          required_approver_id?: string | null
          status?: string
          updated_at?: string
          version_impact?: Json
        }
        Update: {
          approval_record?: Json
          client_id?: string | null
          confidence_label?: string
          contradictions_or_risks?: Json
          created_at?: string
          id?: string
          organisation_id?: string
          proposed_by_ai_run_id?: string | null
          proposed_by_profile_id?: string | null
          proposed_destination?: Json
          proposed_learning?: string
          raw_evidence_references?: Json
          reason_for_promotion?: string
          required_approver_id?: string | null
          status?: string
          updated_at?: string
          version_impact?: Json
        }
        Relationships: [
          {
            foreignKeyName: "learning_proposals_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "learning_proposals_organisation_id_fkey"
            columns: ["organisation_id"]
            isOneToOne: false
            referencedRelation: "organisations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "learning_proposals_proposed_by_ai_run_id_fkey"
            columns: ["proposed_by_ai_run_id"]
            isOneToOne: false
            referencedRelation: "ai_runs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "learning_proposals_proposed_by_profile_id_fkey"
            columns: ["proposed_by_profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "learning_proposals_required_approver_id_fkey"
            columns: ["required_approver_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      media_contacts: {
        Row: {
          beat: string | null
          created_at: string
          deleted_at: string | null
          email: string | null
          id: string
          name: string
          notes: string | null
          organisation_id: string
          outlet: string | null
          phone: string | null
          updated_at: string
        }
        Insert: {
          beat?: string | null
          created_at?: string
          deleted_at?: string | null
          email?: string | null
          id?: string
          name: string
          notes?: string | null
          organisation_id: string
          outlet?: string | null
          phone?: string | null
          updated_at?: string
        }
        Update: {
          beat?: string | null
          created_at?: string
          deleted_at?: string | null
          email?: string | null
          id?: string
          name?: string
          notes?: string | null
          organisation_id?: string
          outlet?: string | null
          phone?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "media_contacts_organisation_id_fkey"
            columns: ["organisation_id"]
            isOneToOne: false
            referencedRelation: "organisations"
            referencedColumns: ["id"]
          },
        ]
      }
      meetings: {
        Row: {
          client_id: string | null
          client_visible: boolean
          created_at: string
          created_by: string | null
          duration_minutes: number | null
          id: string
          meeting_link: string | null
          meeting_type: string
          notes: string | null
          organisation_id: string
          scheduled_at: string
          title: string
        }
        Insert: {
          client_id?: string | null
          client_visible?: boolean
          created_at?: string
          created_by?: string | null
          duration_minutes?: number | null
          id?: string
          meeting_link?: string | null
          meeting_type?: string
          notes?: string | null
          organisation_id: string
          scheduled_at: string
          title: string
        }
        Update: {
          client_id?: string | null
          client_visible?: boolean
          created_at?: string
          created_by?: string | null
          duration_minutes?: number | null
          id?: string
          meeting_link?: string | null
          meeting_type?: string
          notes?: string | null
          organisation_id?: string
          scheduled_at?: string
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "meetings_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "meetings_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "meetings_organisation_id_fkey"
            columns: ["organisation_id"]
            isOneToOne: false
            referencedRelation: "organisations"
            referencedColumns: ["id"]
          },
        ]
      }
      member_rates: {
        Row: {
          created_at: string
          currency: string
          effective_from: string
          hourly_cost: number
          id: string
          organisation_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          currency?: string
          effective_from?: string
          hourly_cost: number
          id?: string
          organisation_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          currency?: string
          effective_from?: string
          hourly_cost?: number
          id?: string
          organisation_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "member_rates_organisation_id_fkey"
            columns: ["organisation_id"]
            isOneToOne: false
            referencedRelation: "organisations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "member_rates_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      milestones: {
        Row: {
          due_date: string | null
          id: string
          name: string
          organisation_id: string
          project_id: string
          sort_order: number
          status: string
        }
        Insert: {
          due_date?: string | null
          id?: string
          name: string
          organisation_id: string
          project_id: string
          sort_order?: number
          status?: string
        }
        Update: {
          due_date?: string | null
          id?: string
          name?: string
          organisation_id?: string
          project_id?: string
          sort_order?: number
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "milestones_organisation_id_fkey"
            columns: ["organisation_id"]
            isOneToOne: false
            referencedRelation: "organisations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "milestones_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      notes: {
        Row: {
          author_id: string | null
          body: string
          client_id: string | null
          created_at: string
          id: string
          organisation_id: string
          subject_id: string | null
          subject_type: string | null
        }
        Insert: {
          author_id?: string | null
          body: string
          client_id?: string | null
          created_at?: string
          id?: string
          organisation_id: string
          subject_id?: string | null
          subject_type?: string | null
        }
        Update: {
          author_id?: string | null
          body?: string
          client_id?: string | null
          created_at?: string
          id?: string
          organisation_id?: string
          subject_id?: string | null
          subject_type?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "notes_author_id_fkey"
            columns: ["author_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "notes_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "notes_organisation_id_fkey"
            columns: ["organisation_id"]
            isOneToOne: false
            referencedRelation: "organisations"
            referencedColumns: ["id"]
          },
        ]
      }
      notifications: {
        Row: {
          body: string | null
          client_id: string | null
          created_at: string
          href: string | null
          id: string
          organisation_id: string
          read_at: string | null
          title: string
          user_id: string
        }
        Insert: {
          body?: string | null
          client_id?: string | null
          created_at?: string
          href?: string | null
          id?: string
          organisation_id: string
          read_at?: string | null
          title: string
          user_id: string
        }
        Update: {
          body?: string | null
          client_id?: string | null
          created_at?: string
          href?: string | null
          id?: string
          organisation_id?: string
          read_at?: string | null
          title?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "notifications_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "notifications_organisation_id_fkey"
            columns: ["organisation_id"]
            isOneToOne: false
            referencedRelation: "organisations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "notifications_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      optimisation_log: {
        Row: {
          ad_creative_id: string | null
          campaign_id: string | null
          change_type: string
          changed_at: string
          changed_by: string | null
          client_id: string
          created_at: string
          decision: string | null
          description: string
          expected_outcome: string | null
          id: string
          observed_outcome: string | null
          organisation_id: string
          rationale: string | null
          reviewed_at: string | null
        }
        Insert: {
          ad_creative_id?: string | null
          campaign_id?: string | null
          change_type: string
          changed_at?: string
          changed_by?: string | null
          client_id: string
          created_at?: string
          decision?: string | null
          description: string
          expected_outcome?: string | null
          id?: string
          observed_outcome?: string | null
          organisation_id: string
          rationale?: string | null
          reviewed_at?: string | null
        }
        Update: {
          ad_creative_id?: string | null
          campaign_id?: string | null
          change_type?: string
          changed_at?: string
          changed_by?: string | null
          client_id?: string
          created_at?: string
          decision?: string | null
          description?: string
          expected_outcome?: string | null
          id?: string
          observed_outcome?: string | null
          organisation_id?: string
          rationale?: string | null
          reviewed_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "optimisation_log_ad_creative_id_fkey"
            columns: ["ad_creative_id"]
            isOneToOne: false
            referencedRelation: "ad_creatives"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "optimisation_log_campaign_id_fkey"
            columns: ["campaign_id"]
            isOneToOne: false
            referencedRelation: "campaigns"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "optimisation_log_changed_by_fkey"
            columns: ["changed_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "optimisation_log_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "optimisation_log_organisation_id_fkey"
            columns: ["organisation_id"]
            isOneToOne: false
            referencedRelation: "organisations"
            referencedColumns: ["id"]
          },
        ]
      }
      organisation_members: {
        Row: {
          client_id: string | null
          created_at: string
          id: string
          invited_email: string | null
          organisation_id: string
          role_id: string
          status: string
          updated_at: string
          user_id: string
        }
        Insert: {
          client_id?: string | null
          created_at?: string
          id?: string
          invited_email?: string | null
          organisation_id: string
          role_id: string
          status?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          client_id?: string | null
          created_at?: string
          id?: string
          invited_email?: string | null
          organisation_id?: string
          role_id?: string
          status?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "organisation_members_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "organisation_members_organisation_id_fkey"
            columns: ["organisation_id"]
            isOneToOne: false
            referencedRelation: "organisations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "organisation_members_role_id_fkey"
            columns: ["role_id"]
            isOneToOne: false
            referencedRelation: "roles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "organisation_members_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      organisations: {
        Row: {
          accent_colour: string | null
          created_at: string
          deleted_at: string | null
          favicon_url: string | null
          id: string
          logo_url: string | null
          name: string
          slug: string
          theme: Json
          updated_at: string
        }
        Insert: {
          accent_colour?: string | null
          created_at?: string
          deleted_at?: string | null
          favicon_url?: string | null
          id?: string
          logo_url?: string | null
          name: string
          slug: string
          theme?: Json
          updated_at?: string
        }
        Update: {
          accent_colour?: string | null
          created_at?: string
          deleted_at?: string | null
          favicon_url?: string | null
          id?: string
          logo_url?: string | null
          name?: string
          slug?: string
          theme?: Json
          updated_at?: string
        }
        Relationships: []
      }
      outreach: {
        Row: {
          angle: string | null
          client_id: string | null
          contact_type: string
          created_at: string
          created_by: string | null
          follow_up_at: string | null
          follow_up_count: number
          id: string
          influencer_id: string | null
          last_follow_up_at: string | null
          media_contact_id: string | null
          notes: string | null
          organisation_id: string
          placement_outlet: string | null
          placement_published_at: string | null
          placement_reach: number | null
          placement_url: string | null
          sent_at: string | null
          status: string
          subject: string
          updated_at: string
        }
        Insert: {
          angle?: string | null
          client_id?: string | null
          contact_type: string
          created_at?: string
          created_by?: string | null
          follow_up_at?: string | null
          follow_up_count?: number
          id?: string
          influencer_id?: string | null
          last_follow_up_at?: string | null
          media_contact_id?: string | null
          notes?: string | null
          organisation_id: string
          placement_outlet?: string | null
          placement_published_at?: string | null
          placement_reach?: number | null
          placement_url?: string | null
          sent_at?: string | null
          status?: string
          subject: string
          updated_at?: string
        }
        Update: {
          angle?: string | null
          client_id?: string | null
          contact_type?: string
          created_at?: string
          created_by?: string | null
          follow_up_at?: string | null
          follow_up_count?: number
          id?: string
          influencer_id?: string | null
          last_follow_up_at?: string | null
          media_contact_id?: string | null
          notes?: string | null
          organisation_id?: string
          placement_outlet?: string | null
          placement_published_at?: string | null
          placement_reach?: number | null
          placement_url?: string | null
          sent_at?: string | null
          status?: string
          subject?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "outreach_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "outreach_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "outreach_influencer_id_fkey"
            columns: ["influencer_id"]
            isOneToOne: false
            referencedRelation: "influencers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "outreach_media_contact_id_fkey"
            columns: ["media_contact_id"]
            isOneToOne: false
            referencedRelation: "media_contacts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "outreach_organisation_id_fkey"
            columns: ["organisation_id"]
            isOneToOne: false
            referencedRelation: "organisations"
            referencedColumns: ["id"]
          },
        ]
      }
      payments: {
        Row: {
          amount: number
          created_at: string
          currency: string
          id: string
          invoice_id: string
          method: string
          organisation_id: string
          paid_at: string
          recorded_by: string | null
          reference: string | null
        }
        Insert: {
          amount: number
          created_at?: string
          currency?: string
          id?: string
          invoice_id: string
          method?: string
          organisation_id: string
          paid_at?: string
          recorded_by?: string | null
          reference?: string | null
        }
        Update: {
          amount?: number
          created_at?: string
          currency?: string
          id?: string
          invoice_id?: string
          method?: string
          organisation_id?: string
          paid_at?: string
          recorded_by?: string | null
          reference?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "payments_invoice_id_fkey"
            columns: ["invoice_id"]
            isOneToOne: false
            referencedRelation: "invoices"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payments_organisation_id_fkey"
            columns: ["organisation_id"]
            isOneToOne: false
            referencedRelation: "organisations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payments_recorded_by_fkey"
            columns: ["recorded_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      permissions: {
        Row: {
          action: string
          description: string | null
          id: string
          resource: string
        }
        Insert: {
          action: string
          description?: string | null
          id?: string
          resource: string
        }
        Update: {
          action?: string
          description?: string | null
          id?: string
          resource?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string
          full_name: string | null
          id: string
          updated_at: string
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          full_name?: string | null
          id: string
          updated_at?: string
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          full_name?: string | null
          id?: string
          updated_at?: string
        }
        Relationships: []
      }
      projects: {
        Row: {
          budget: number | null
          client_id: string
          client_visible: boolean
          created_at: string
          deleted_at: string | null
          end_date: string | null
          id: string
          name: string
          organisation_id: string
          owner_id: string | null
          project_type: string | null
          service_type: string | null
          source_template_id: string | null
          start_date: string | null
          status: string
          updated_at: string
        }
        Insert: {
          budget?: number | null
          client_id: string
          client_visible?: boolean
          created_at?: string
          deleted_at?: string | null
          end_date?: string | null
          id?: string
          name: string
          organisation_id: string
          owner_id?: string | null
          project_type?: string | null
          service_type?: string | null
          source_template_id?: string | null
          start_date?: string | null
          status?: string
          updated_at?: string
        }
        Update: {
          budget?: number | null
          client_id?: string
          client_visible?: boolean
          created_at?: string
          deleted_at?: string | null
          end_date?: string | null
          id?: string
          name?: string
          organisation_id?: string
          owner_id?: string | null
          project_type?: string | null
          service_type?: string | null
          source_template_id?: string | null
          start_date?: string | null
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "projects_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "projects_organisation_id_fkey"
            columns: ["organisation_id"]
            isOneToOne: false
            referencedRelation: "organisations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "projects_owner_id_fkey"
            columns: ["owner_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "projects_source_template_id_fkey"
            columns: ["source_template_id"]
            isOneToOne: false
            referencedRelation: "task_templates"
            referencedColumns: ["id"]
          },
        ]
      }
      proposal_line_items: {
        Row: {
          cadence: string
          created_at: string
          description: string
          id: string
          organisation_id: string
          position: number
          proposal_id: string
          quantity: number
          service_package_id: string | null
          unit_price: number
        }
        Insert: {
          cadence?: string
          created_at?: string
          description: string
          id?: string
          organisation_id: string
          position?: number
          proposal_id: string
          quantity?: number
          service_package_id?: string | null
          unit_price?: number
        }
        Update: {
          cadence?: string
          created_at?: string
          description?: string
          id?: string
          organisation_id?: string
          position?: number
          proposal_id?: string
          quantity?: number
          service_package_id?: string | null
          unit_price?: number
        }
        Relationships: [
          {
            foreignKeyName: "proposal_line_items_organisation_id_fkey"
            columns: ["organisation_id"]
            isOneToOne: false
            referencedRelation: "organisations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "proposal_line_items_proposal_id_fkey"
            columns: ["proposal_id"]
            isOneToOne: false
            referencedRelation: "proposals"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "proposal_line_items_service_package_id_fkey"
            columns: ["service_package_id"]
            isOneToOne: false
            referencedRelation: "service_packages"
            referencedColumns: ["id"]
          },
        ]
      }
      proposals: {
        Row: {
          amount: number | null
          client_id: string | null
          created_at: string
          created_by: string | null
          currency: string
          deal_id: string | null
          decided_at: string | null
          deleted_at: string | null
          id: string
          notes: string | null
          organisation_id: string
          sent_at: string | null
          sent_by: string | null
          sent_to_email: string | null
          status: string
          title: string
          updated_at: string
          valid_until: string | null
        }
        Insert: {
          amount?: number | null
          client_id?: string | null
          created_at?: string
          created_by?: string | null
          currency?: string
          deal_id?: string | null
          decided_at?: string | null
          deleted_at?: string | null
          id?: string
          notes?: string | null
          organisation_id: string
          sent_at?: string | null
          sent_by?: string | null
          sent_to_email?: string | null
          status?: string
          title: string
          updated_at?: string
          valid_until?: string | null
        }
        Update: {
          amount?: number | null
          client_id?: string | null
          created_at?: string
          created_by?: string | null
          currency?: string
          deal_id?: string | null
          decided_at?: string | null
          deleted_at?: string | null
          id?: string
          notes?: string | null
          organisation_id?: string
          sent_at?: string | null
          sent_by?: string | null
          sent_to_email?: string | null
          status?: string
          title?: string
          updated_at?: string
          valid_until?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "proposals_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "proposals_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "proposals_deal_id_fkey"
            columns: ["deal_id"]
            isOneToOne: false
            referencedRelation: "deals"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "proposals_organisation_id_fkey"
            columns: ["organisation_id"]
            isOneToOne: false
            referencedRelation: "organisations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "proposals_sent_by_fkey"
            columns: ["sent_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      qa_runs: {
        Row: {
          created_at: string
          id: string
          items: Json
          landing_page_project_id: string
          landing_page_version_id: string | null
          notes: string | null
          organisation_id: string
          overall: string
          run_by: string | null
        }
        Insert: {
          created_at?: string
          id?: string
          items?: Json
          landing_page_project_id: string
          landing_page_version_id?: string | null
          notes?: string | null
          organisation_id: string
          overall: string
          run_by?: string | null
        }
        Update: {
          created_at?: string
          id?: string
          items?: Json
          landing_page_project_id?: string
          landing_page_version_id?: string | null
          notes?: string | null
          organisation_id?: string
          overall?: string
          run_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "qa_runs_landing_page_project_id_fkey"
            columns: ["landing_page_project_id"]
            isOneToOne: false
            referencedRelation: "landing_page_projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "qa_runs_landing_page_version_id_fkey"
            columns: ["landing_page_version_id"]
            isOneToOne: false
            referencedRelation: "landing_page_versions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "qa_runs_organisation_id_fkey"
            columns: ["organisation_id"]
            isOneToOne: false
            referencedRelation: "organisations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "qa_runs_run_by_fkey"
            columns: ["run_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      reports: {
        Row: {
          client_id: string
          created_at: string
          created_by: string | null
          deleted_at: string | null
          executive_summary: string | null
          id: string
          key_wins: string | null
          next_month_plan: string | null
          organisation_id: string
          period_end: string
          period_start: string
          published_at: string | null
          risks: string | null
          status: string
          title: string
          updated_at: string
        }
        Insert: {
          client_id: string
          created_at?: string
          created_by?: string | null
          deleted_at?: string | null
          executive_summary?: string | null
          id?: string
          key_wins?: string | null
          next_month_plan?: string | null
          organisation_id: string
          period_end: string
          period_start: string
          published_at?: string | null
          risks?: string | null
          status?: string
          title: string
          updated_at?: string
        }
        Update: {
          client_id?: string
          created_at?: string
          created_by?: string | null
          deleted_at?: string | null
          executive_summary?: string | null
          id?: string
          key_wins?: string | null
          next_month_plan?: string | null
          organisation_id?: string
          period_end?: string
          period_start?: string
          published_at?: string | null
          risks?: string | null
          status?: string
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "reports_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reports_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reports_organisation_id_fkey"
            columns: ["organisation_id"]
            isOneToOne: false
            referencedRelation: "organisations"
            referencedColumns: ["id"]
          },
        ]
      }
      retainers: {
        Row: {
          amount: number
          billing_cadence: string
          client_id: string
          created_at: string
          currency: string
          deleted_at: string | null
          end_date: string | null
          id: string
          included_hours: number | null
          name: string
          organisation_id: string
          start_date: string
          status: string
          updated_at: string
        }
        Insert: {
          amount: number
          billing_cadence?: string
          client_id: string
          created_at?: string
          currency?: string
          deleted_at?: string | null
          end_date?: string | null
          id?: string
          included_hours?: number | null
          name: string
          organisation_id: string
          start_date: string
          status?: string
          updated_at?: string
        }
        Update: {
          amount?: number
          billing_cadence?: string
          client_id?: string
          created_at?: string
          currency?: string
          deleted_at?: string | null
          end_date?: string | null
          id?: string
          included_hours?: number | null
          name?: string
          organisation_id?: string
          start_date?: string
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "retainers_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "retainers_organisation_id_fkey"
            columns: ["organisation_id"]
            isOneToOne: false
            referencedRelation: "organisations"
            referencedColumns: ["id"]
          },
        ]
      }
      reusable_components: {
        Row: {
          accessibility_notes: string | null
          analytics_events: string | null
          approval_status: string
          category: string
          client_restrictions: string | null
          code_reference: string | null
          conversion_purpose: string | null
          created_at: string
          deleted_at: string | null
          dependencies: string | null
          editable_fields: string | null
          id: string
          name: string
          organisation_id: string
          preview_document_id: string | null
          props_notes: string | null
          source_project_id: string | null
          updated_at: string
        }
        Insert: {
          accessibility_notes?: string | null
          analytics_events?: string | null
          approval_status?: string
          category: string
          client_restrictions?: string | null
          code_reference?: string | null
          conversion_purpose?: string | null
          created_at?: string
          deleted_at?: string | null
          dependencies?: string | null
          editable_fields?: string | null
          id?: string
          name: string
          organisation_id: string
          preview_document_id?: string | null
          props_notes?: string | null
          source_project_id?: string | null
          updated_at?: string
        }
        Update: {
          accessibility_notes?: string | null
          analytics_events?: string | null
          approval_status?: string
          category?: string
          client_restrictions?: string | null
          code_reference?: string | null
          conversion_purpose?: string | null
          created_at?: string
          deleted_at?: string | null
          dependencies?: string | null
          editable_fields?: string | null
          id?: string
          name?: string
          organisation_id?: string
          preview_document_id?: string | null
          props_notes?: string | null
          source_project_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "reusable_components_organisation_id_fkey"
            columns: ["organisation_id"]
            isOneToOne: false
            referencedRelation: "organisations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reusable_components_preview_document_id_fkey"
            columns: ["preview_document_id"]
            isOneToOne: false
            referencedRelation: "documents"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reusable_components_source_project_id_fkey"
            columns: ["source_project_id"]
            isOneToOne: false
            referencedRelation: "build_library_projects"
            referencedColumns: ["id"]
          },
        ]
      }
      role_permissions: {
        Row: {
          permission_id: string
          requires_client_scope: boolean
          role_id: string
        }
        Insert: {
          permission_id: string
          requires_client_scope?: boolean
          role_id: string
        }
        Update: {
          permission_id?: string
          requires_client_scope?: boolean
          role_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "role_permissions_permission_id_fkey"
            columns: ["permission_id"]
            isOneToOne: false
            referencedRelation: "permissions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "role_permissions_role_id_fkey"
            columns: ["role_id"]
            isOneToOne: false
            referencedRelation: "roles"
            referencedColumns: ["id"]
          },
        ]
      }
      roles: {
        Row: {
          created_at: string
          id: string
          is_system_role: boolean
          name: string
          organisation_id: string | null
          slug: string
        }
        Insert: {
          created_at?: string
          id?: string
          is_system_role?: boolean
          name: string
          organisation_id?: string | null
          slug: string
        }
        Update: {
          created_at?: string
          id?: string
          is_system_role?: boolean
          name?: string
          organisation_id?: string | null
          slug?: string
        }
        Relationships: [
          {
            foreignKeyName: "roles_organisation_id_fkey"
            columns: ["organisation_id"]
            isOneToOne: false
            referencedRelation: "organisations"
            referencedColumns: ["id"]
          },
        ]
      }
      secrets_metadata: {
        Row: {
          created_at: string
          created_by: string | null
          encrypted_value: string
          id: string
          key_alias: string
          last_rotated_at: string | null
          organisation_id: string
          provider: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          encrypted_value: string
          id?: string
          key_alias: string
          last_rotated_at?: string | null
          organisation_id: string
          provider: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          encrypted_value?: string
          id?: string
          key_alias?: string
          last_rotated_at?: string | null
          organisation_id?: string
          provider?: string
        }
        Relationships: [
          {
            foreignKeyName: "secrets_metadata_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "secrets_metadata_organisation_id_fkey"
            columns: ["organisation_id"]
            isOneToOne: false
            referencedRelation: "organisations"
            referencedColumns: ["id"]
          },
        ]
      }
      seo_keywords: {
        Row: {
          client_id: string
          created_at: string
          created_by: string | null
          deleted_at: string | null
          difficulty: number | null
          id: string
          intent: string | null
          is_priority: boolean
          keyword: string
          location: string | null
          organisation_id: string
          search_volume: number | null
          target_url: string | null
          updated_at: string
        }
        Insert: {
          client_id: string
          created_at?: string
          created_by?: string | null
          deleted_at?: string | null
          difficulty?: number | null
          id?: string
          intent?: string | null
          is_priority?: boolean
          keyword: string
          location?: string | null
          organisation_id: string
          search_volume?: number | null
          target_url?: string | null
          updated_at?: string
        }
        Update: {
          client_id?: string
          created_at?: string
          created_by?: string | null
          deleted_at?: string | null
          difficulty?: number | null
          id?: string
          intent?: string | null
          is_priority?: boolean
          keyword?: string
          location?: string | null
          organisation_id?: string
          search_volume?: number | null
          target_url?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "seo_keywords_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "seo_keywords_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "seo_keywords_organisation_id_fkey"
            columns: ["organisation_id"]
            isOneToOne: false
            referencedRelation: "organisations"
            referencedColumns: ["id"]
          },
        ]
      }
      seo_rankings: {
        Row: {
          created_at: string
          id: string
          keyword_id: string
          organisation_id: string
          position: number | null
          ranking_url: string | null
          recorded_on: string
        }
        Insert: {
          created_at?: string
          id?: string
          keyword_id: string
          organisation_id: string
          position?: number | null
          ranking_url?: string | null
          recorded_on: string
        }
        Update: {
          created_at?: string
          id?: string
          keyword_id?: string
          organisation_id?: string
          position?: number | null
          ranking_url?: string | null
          recorded_on?: string
        }
        Relationships: [
          {
            foreignKeyName: "seo_rankings_keyword_id_fkey"
            columns: ["keyword_id"]
            isOneToOne: false
            referencedRelation: "seo_keywords"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "seo_rankings_organisation_id_fkey"
            columns: ["organisation_id"]
            isOneToOne: false
            referencedRelation: "organisations"
            referencedColumns: ["id"]
          },
        ]
      }
      service_package_templates: {
        Row: {
          id: string
          organisation_id: string
          service_package_id: string
          sort_order: number
          task_template_id: string
          trigger: string
        }
        Insert: {
          id?: string
          organisation_id: string
          service_package_id: string
          sort_order?: number
          task_template_id: string
          trigger?: string
        }
        Update: {
          id?: string
          organisation_id?: string
          service_package_id?: string
          sort_order?: number
          task_template_id?: string
          trigger?: string
        }
        Relationships: [
          {
            foreignKeyName: "service_package_templates_organisation_id_fkey"
            columns: ["organisation_id"]
            isOneToOne: false
            referencedRelation: "organisations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "service_package_templates_service_package_id_fkey"
            columns: ["service_package_id"]
            isOneToOne: false
            referencedRelation: "service_packages"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "service_package_templates_task_template_id_fkey"
            columns: ["task_template_id"]
            isOneToOne: false
            referencedRelation: "task_templates"
            referencedColumns: ["id"]
          },
        ]
      }
      service_packages: {
        Row: {
          cadence: string
          category: string
          created_at: string
          currency: string
          default_included_hours: number | null
          default_price: number | null
          description: string | null
          id: string
          is_active: boolean
          name: string
          organisation_id: string
          slug: string
          updated_at: string
        }
        Insert: {
          cadence?: string
          category: string
          created_at?: string
          currency?: string
          default_included_hours?: number | null
          default_price?: number | null
          description?: string | null
          id?: string
          is_active?: boolean
          name: string
          organisation_id: string
          slug: string
          updated_at?: string
        }
        Update: {
          cadence?: string
          category?: string
          created_at?: string
          currency?: string
          default_included_hours?: number | null
          default_price?: number | null
          description?: string | null
          id?: string
          is_active?: boolean
          name?: string
          organisation_id?: string
          slug?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "service_packages_organisation_id_fkey"
            columns: ["organisation_id"]
            isOneToOne: false
            referencedRelation: "organisations"
            referencedColumns: ["id"]
          },
        ]
      }
      source_lineage_records: {
        Row: {
          ai_run_id: string | null
          claim_locator: string | null
          client_id: string | null
          created_at: string
          id: string
          organisation_id: string
          source_client_id: string | null
          source_id: string | null
          source_locator: string | null
          source_type: string
          source_version: string | null
          supplied_identity_id: string | null
          task_envelope_id: string
          unresolved_uncertainty: string | null
          usage: string
        }
        Insert: {
          ai_run_id?: string | null
          claim_locator?: string | null
          client_id?: string | null
          created_at?: string
          id?: string
          organisation_id: string
          source_client_id?: string | null
          source_id?: string | null
          source_locator?: string | null
          source_type: string
          source_version?: string | null
          supplied_identity_id?: string | null
          task_envelope_id: string
          unresolved_uncertainty?: string | null
          usage: string
        }
        Update: {
          ai_run_id?: string | null
          claim_locator?: string | null
          client_id?: string | null
          created_at?: string
          id?: string
          organisation_id?: string
          source_client_id?: string | null
          source_id?: string | null
          source_locator?: string | null
          source_type?: string
          source_version?: string | null
          supplied_identity_id?: string | null
          task_envelope_id?: string
          unresolved_uncertainty?: string | null
          usage?: string
        }
        Relationships: [
          {
            foreignKeyName: "source_lineage_records_ai_run_id_fkey"
            columns: ["ai_run_id"]
            isOneToOne: false
            referencedRelation: "ai_runs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "source_lineage_records_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "source_lineage_records_organisation_id_fkey"
            columns: ["organisation_id"]
            isOneToOne: false
            referencedRelation: "organisations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "source_lineage_records_source_client_id_fkey"
            columns: ["source_client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "source_lineage_records_supplied_identity_id_fkey"
            columns: ["supplied_identity_id"]
            isOneToOne: false
            referencedRelation: "identity_registry"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "source_lineage_records_task_envelope_id_fkey"
            columns: ["task_envelope_id"]
            isOneToOne: false
            referencedRelation: "task_envelopes"
            referencedColumns: ["id"]
          },
        ]
      }
      task_envelopes: {
        Row: {
          ai_run_id: string | null
          approval_requirements: Json
          audit_references: Json
          authority_state: string
          client_adapter_id: string | null
          client_id: string | null
          created_at: string
          current_status: string
          current_step: string
          id: string
          operating_mode: string
          organisation_id: string
          output_destination: Json
          permission_state: string
          relevant_identity_refs: Json
          requested_by: string | null
          selected_app: string
          selected_plugin: string
          source_references: Json
          updated_at: string
          user_request: string
          work_item_id: string | null
        }
        Insert: {
          ai_run_id?: string | null
          approval_requirements?: Json
          audit_references?: Json
          authority_state?: string
          client_adapter_id?: string | null
          client_id?: string | null
          created_at?: string
          current_status?: string
          current_step?: string
          id?: string
          operating_mode?: string
          organisation_id: string
          output_destination?: Json
          permission_state?: string
          relevant_identity_refs?: Json
          requested_by?: string | null
          selected_app: string
          selected_plugin: string
          source_references?: Json
          updated_at?: string
          user_request: string
          work_item_id?: string | null
        }
        Update: {
          ai_run_id?: string | null
          approval_requirements?: Json
          audit_references?: Json
          authority_state?: string
          client_adapter_id?: string | null
          client_id?: string | null
          created_at?: string
          current_status?: string
          current_step?: string
          id?: string
          operating_mode?: string
          organisation_id?: string
          output_destination?: Json
          permission_state?: string
          relevant_identity_refs?: Json
          requested_by?: string | null
          selected_app?: string
          selected_plugin?: string
          source_references?: Json
          updated_at?: string
          user_request?: string
          work_item_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "task_envelopes_ai_run_id_fkey"
            columns: ["ai_run_id"]
            isOneToOne: false
            referencedRelation: "ai_runs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "task_envelopes_client_adapter_id_fkey"
            columns: ["client_adapter_id"]
            isOneToOne: false
            referencedRelation: "client_adapters"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "task_envelopes_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "task_envelopes_organisation_id_fkey"
            columns: ["organisation_id"]
            isOneToOne: false
            referencedRelation: "organisations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "task_envelopes_requested_by_fkey"
            columns: ["requested_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "task_envelopes_work_item_id_fkey"
            columns: ["work_item_id"]
            isOneToOne: false
            referencedRelation: "tasks"
            referencedColumns: ["id"]
          },
        ]
      }
      task_templates: {
        Row: {
          category: string
          created_at: string
          default_tasks: Json
          description: string | null
          id: string
          name: string
          organisation_id: string | null
        }
        Insert: {
          category: string
          created_at?: string
          default_tasks?: Json
          description?: string | null
          id?: string
          name: string
          organisation_id?: string | null
        }
        Update: {
          category?: string
          created_at?: string
          default_tasks?: Json
          description?: string | null
          id?: string
          name?: string
          organisation_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "task_templates_organisation_id_fkey"
            columns: ["organisation_id"]
            isOneToOne: false
            referencedRelation: "organisations"
            referencedColumns: ["id"]
          },
        ]
      }
      tasks: {
        Row: {
          actual_hours: number | null
          assignee_id: string | null
          billable: boolean
          category: string | null
          client_id: string | null
          completed_at: string | null
          created_at: string
          deleted_at: string | null
          due_date: string | null
          estimated_hours: number | null
          id: string
          organisation_id: string
          priority: string
          project_id: string | null
          reviewer_id: string | null
          start_date: string | null
          status: string
          task_template_id: string | null
          title: string
          updated_at: string
        }
        Insert: {
          actual_hours?: number | null
          assignee_id?: string | null
          billable?: boolean
          category?: string | null
          client_id?: string | null
          completed_at?: string | null
          created_at?: string
          deleted_at?: string | null
          due_date?: string | null
          estimated_hours?: number | null
          id?: string
          organisation_id: string
          priority?: string
          project_id?: string | null
          reviewer_id?: string | null
          start_date?: string | null
          status?: string
          task_template_id?: string | null
          title: string
          updated_at?: string
        }
        Update: {
          actual_hours?: number | null
          assignee_id?: string | null
          billable?: boolean
          category?: string | null
          client_id?: string | null
          completed_at?: string | null
          created_at?: string
          deleted_at?: string | null
          due_date?: string | null
          estimated_hours?: number | null
          id?: string
          organisation_id?: string
          priority?: string
          project_id?: string | null
          reviewer_id?: string | null
          start_date?: string | null
          status?: string
          task_template_id?: string | null
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "tasks_assignee_id_fkey"
            columns: ["assignee_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tasks_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tasks_organisation_id_fkey"
            columns: ["organisation_id"]
            isOneToOne: false
            referencedRelation: "organisations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tasks_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tasks_reviewer_id_fkey"
            columns: ["reviewer_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tasks_task_template_id_fkey"
            columns: ["task_template_id"]
            isOneToOne: false
            referencedRelation: "task_templates"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      can_access_client: {
        Args: { p_client_id: string; p_org_id: string }
        Returns: boolean
      }
      has_permission: {
        Args: {
          p_action: string
          p_client_id?: string
          p_org_id: string
          p_resource: string
        }
        Returns: boolean
      }
      ihp_mcp_access_token_hook: { Args: { event: Json }; Returns: Json }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
  storage: {
    Tables: {
      buckets: {
        Row: {
          allowed_mime_types: string[] | null
          avif_autodetection: boolean | null
          created_at: string | null
          file_size_limit: number | null
          id: string
          name: string
          owner: string | null
          owner_id: string | null
          public: boolean | null
          type: Database["storage"]["Enums"]["buckettype"]
          updated_at: string | null
          versioning_status: string
        }
        Insert: {
          allowed_mime_types?: string[] | null
          avif_autodetection?: boolean | null
          created_at?: string | null
          file_size_limit?: number | null
          id: string
          name: string
          owner?: string | null
          owner_id?: string | null
          public?: boolean | null
          type?: Database["storage"]["Enums"]["buckettype"]
          updated_at?: string | null
          versioning_status?: string
        }
        Update: {
          allowed_mime_types?: string[] | null
          avif_autodetection?: boolean | null
          created_at?: string | null
          file_size_limit?: number | null
          id?: string
          name?: string
          owner?: string | null
          owner_id?: string | null
          public?: boolean | null
          type?: Database["storage"]["Enums"]["buckettype"]
          updated_at?: string | null
          versioning_status?: string
        }
        Relationships: []
      }
      buckets_analytics: {
        Row: {
          created_at: string
          deleted_at: string | null
          format: string
          id: string
          name: string
          type: Database["storage"]["Enums"]["buckettype"]
          updated_at: string
        }
        Insert: {
          created_at?: string
          deleted_at?: string | null
          format?: string
          id?: string
          name: string
          type?: Database["storage"]["Enums"]["buckettype"]
          updated_at?: string
        }
        Update: {
          created_at?: string
          deleted_at?: string | null
          format?: string
          id?: string
          name?: string
          type?: Database["storage"]["Enums"]["buckettype"]
          updated_at?: string
        }
        Relationships: []
      }
      buckets_vectors: {
        Row: {
          created_at: string
          id: string
          type: Database["storage"]["Enums"]["buckettype"]
          updated_at: string
        }
        Insert: {
          created_at?: string
          id: string
          type?: Database["storage"]["Enums"]["buckettype"]
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          type?: Database["storage"]["Enums"]["buckettype"]
          updated_at?: string
        }
        Relationships: []
      }
      migrations: {
        Row: {
          executed_at: string | null
          hash: string
          id: number
          name: string
        }
        Insert: {
          executed_at?: string | null
          hash: string
          id: number
          name: string
        }
        Update: {
          executed_at?: string | null
          hash?: string
          id?: number
          name?: string
        }
        Relationships: []
      }
      objects: {
        Row: {
          archived_at: string | null
          bucket_id: string | null
          created_at: string | null
          id: string
          is_delete_marker: boolean
          is_versioned: boolean
          last_accessed_at: string | null
          metadata: Json | null
          name: string | null
          owner: string | null
          owner_id: string | null
          path_tokens: string[] | null
          updated_at: string | null
          user_metadata: Json | null
          version: string | null
        }
        Insert: {
          archived_at?: string | null
          bucket_id?: string | null
          created_at?: string | null
          id?: string
          is_delete_marker?: boolean
          is_versioned?: boolean
          last_accessed_at?: string | null
          metadata?: Json | null
          name?: string | null
          owner?: string | null
          owner_id?: string | null
          path_tokens?: string[] | null
          updated_at?: string | null
          user_metadata?: Json | null
          version?: string | null
        }
        Update: {
          archived_at?: string | null
          bucket_id?: string | null
          created_at?: string | null
          id?: string
          is_delete_marker?: boolean
          is_versioned?: boolean
          last_accessed_at?: string | null
          metadata?: Json | null
          name?: string | null
          owner?: string | null
          owner_id?: string | null
          path_tokens?: string[] | null
          updated_at?: string | null
          user_metadata?: Json | null
          version?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "objects_bucketId_fkey"
            columns: ["bucket_id"]
            isOneToOne: false
            referencedRelation: "buckets"
            referencedColumns: ["id"]
          },
        ]
      }
      s3_multipart_uploads: {
        Row: {
          bucket_id: string
          created_at: string
          id: string
          in_progress_size: number
          key: string
          metadata: Json | null
          owner_id: string | null
          upload_signature: string
          user_metadata: Json | null
          version: string
        }
        Insert: {
          bucket_id: string
          created_at?: string
          id: string
          in_progress_size?: number
          key: string
          metadata?: Json | null
          owner_id?: string | null
          upload_signature: string
          user_metadata?: Json | null
          version: string
        }
        Update: {
          bucket_id?: string
          created_at?: string
          id?: string
          in_progress_size?: number
          key?: string
          metadata?: Json | null
          owner_id?: string | null
          upload_signature?: string
          user_metadata?: Json | null
          version?: string
        }
        Relationships: [
          {
            foreignKeyName: "s3_multipart_uploads_bucket_id_fkey"
            columns: ["bucket_id"]
            isOneToOne: false
            referencedRelation: "buckets"
            referencedColumns: ["id"]
          },
        ]
      }
      s3_multipart_uploads_parts: {
        Row: {
          bucket_id: string
          created_at: string
          etag: string
          id: string
          key: string
          owner_id: string | null
          part_number: number
          size: number
          upload_id: string
          version: string
        }
        Insert: {
          bucket_id: string
          created_at?: string
          etag: string
          id?: string
          key: string
          owner_id?: string | null
          part_number: number
          size?: number
          upload_id: string
          version: string
        }
        Update: {
          bucket_id?: string
          created_at?: string
          etag?: string
          id?: string
          key?: string
          owner_id?: string | null
          part_number?: number
          size?: number
          upload_id?: string
          version?: string
        }
        Relationships: [
          {
            foreignKeyName: "s3_multipart_uploads_parts_bucket_id_fkey"
            columns: ["bucket_id"]
            isOneToOne: false
            referencedRelation: "buckets"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "s3_multipart_uploads_parts_upload_id_fkey"
            columns: ["upload_id"]
            isOneToOne: false
            referencedRelation: "s3_multipart_uploads"
            referencedColumns: ["id"]
          },
        ]
      }
      vector_indexes: {
        Row: {
          bucket_id: string
          created_at: string
          data_type: string
          dimension: number
          distance_metric: string
          id: string
          metadata_configuration: Json | null
          name: string
          updated_at: string
        }
        Insert: {
          bucket_id: string
          created_at?: string
          data_type: string
          dimension: number
          distance_metric: string
          id?: string
          metadata_configuration?: Json | null
          name: string
          updated_at?: string
        }
        Update: {
          bucket_id?: string
          created_at?: string
          data_type?: string
          dimension?: number
          distance_metric?: string
          id?: string
          metadata_configuration?: Json | null
          name?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "vector_indexes_bucket_id_fkey"
            columns: ["bucket_id"]
            isOneToOne: false
            referencedRelation: "buckets_vectors"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      allow_any_operation: {
        Args: { expected_operations: string[] }
        Returns: boolean
      }
      allow_only_operation: {
        Args: { expected_operation: string }
        Returns: boolean
      }
      can_insert_object: {
        Args: { bucketid: string; metadata: Json; name: string; owner: string }
        Returns: undefined
      }
      extension: { Args: { name: string }; Returns: string }
      filename: { Args: { name: string }; Returns: string }
      foldername: { Args: { name: string }; Returns: string[] }
      get_common_prefix: {
        Args: { p_delimiter: string; p_key: string; p_prefix: string }
        Returns: string
      }
      get_size_by_bucket: {
        Args: never
        Returns: {
          bucket_id: string
          size: number
        }[]
      }
      list_multipart_uploads_with_delimiter: {
        Args: {
          bucket_id: string
          delimiter_param: string
          max_keys?: number
          next_key_token?: string
          next_upload_token?: string
          prefix_param: string
        }
        Returns: {
          created_at: string
          id: string
          key: string
        }[]
      }
      list_objects_with_delimiter: {
        Args: {
          _bucket_id: string
          delimiter_param: string
          max_keys?: number
          next_token?: string
          prefix_param: string
          sort_order?: string
          start_after?: string
        }
        Returns: {
          created_at: string
          id: string
          last_accessed_at: string
          metadata: Json
          name: string
          updated_at: string
        }[]
      }
      operation: { Args: never; Returns: string }
      search: {
        Args: {
          bucketname: string
          levels?: number
          limits?: number
          offsets?: number
          prefix: string
          search?: string
          sortcolumn?: string
          sortorder?: string
        }
        Returns: {
          created_at: string
          id: string
          last_accessed_at: string
          metadata: Json
          name: string
          updated_at: string
        }[]
      }
      search_by_timestamp: {
        Args: {
          p_bucket_id: string
          p_level: number
          p_limit: number
          p_prefix: string
          p_sort_column: string
          p_sort_column_after: string
          p_sort_order: string
          p_start_after: string
        }
        Returns: {
          created_at: string
          id: string
          key: string
          last_accessed_at: string
          metadata: Json
          name: string
          updated_at: string
        }[]
      }
      search_v2: {
        Args: {
          bucket_name: string
          levels?: number
          limits?: number
          prefix: string
          sort_column?: string
          sort_column_after?: string
          sort_order?: string
          start_after?: string
        }
        Returns: {
          created_at: string
          id: string
          key: string
          last_accessed_at: string
          metadata: Json
          name: string
          updated_at: string
        }[]
      }
    }
    Enums: {
      buckettype: "STANDARD" | "ANALYTICS" | "VECTOR"
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never) = never,
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
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
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never) = never,
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
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never) = never,
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
  storage: {
    Enums: {
      buckettype: ["STANDARD", "ANALYTICS", "VECTOR"],
    },
  },
} as const
