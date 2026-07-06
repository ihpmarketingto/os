/**
 * Hand-written to match supabase/migrations/0001-0005 exactly, in the shape
 * `supabase gen types typescript` would produce. Once a real Supabase project
 * exists, regenerate with:
 *   supabase gen types typescript --project-id <ref> > packages/database/src/types.gen.ts
 * and this file (and this comment) go away.
 */
export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

export interface Database {
  public: {
    Tables: {
      organisations: {
        Row: {
          id: string;
          name: string;
          slug: string;
          logo_url: string | null;
          favicon_url: string | null;
          accent_colour: string | null;
          theme: Json;
          created_at: string;
          updated_at: string;
          deleted_at: string | null;
        };
        Insert: Partial<Database["public"]["Tables"]["organisations"]["Row"]> & { name: string; slug: string };
        Update: Partial<Database["public"]["Tables"]["organisations"]["Row"]>;
        Relationships: [];
      };
      profiles: {
        Row: {
          id: string;
          full_name: string | null;
          avatar_url: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: Partial<Database["public"]["Tables"]["profiles"]["Row"]> & { id: string };
        Update: Partial<Database["public"]["Tables"]["profiles"]["Row"]>;
        Relationships: [];
      };
      roles: {
        Row: {
          id: string;
          organisation_id: string | null;
          slug: string;
          name: string;
          is_system_role: boolean;
          created_at: string;
        };
        Insert: Partial<Database["public"]["Tables"]["roles"]["Row"]> & { slug: string; name: string };
        Update: Partial<Database["public"]["Tables"]["roles"]["Row"]>;
        Relationships: [];
      };
      permissions: {
        Row: { id: string; resource: string; action: string; description: string | null };
        Insert: Partial<Database["public"]["Tables"]["permissions"]["Row"]> & { resource: string; action: string };
        Update: Partial<Database["public"]["Tables"]["permissions"]["Row"]>;
        Relationships: [];
      };
      role_permissions: {
        Row: { role_id: string; permission_id: string; requires_client_scope: boolean };
        Insert: Database["public"]["Tables"]["role_permissions"]["Row"];
        Update: Partial<Database["public"]["Tables"]["role_permissions"]["Row"]>;
        Relationships: [];
      };
      clients: {
        Row: {
          id: string;
          organisation_id: string;
          name: string;
          slug: string;
          industry: string | null;
          status: "prospect" | "active" | "paused" | "offboarding" | "archived";
          account_manager_id: string | null;
          ai_enabled: boolean;
          ai_settings: Json;
          website: string | null;
          social_handles: Json;
          brand_kit: Json;
          contract_start_date: string | null;
          contract_end_date: string | null;
          renewal_notice_days: number | null;
          retainer_amount: number | null;
          health_score: number | null;
          health_score_updated_at: string | null;
          health_score_explanation: string | null;
          gohighlevel_mode: "source_of_truth" | "automation_engine" | "booking_layer" | "migration_source" | "not_used";
          created_at: string;
          updated_at: string;
          deleted_at: string | null;
        };
        Insert: Partial<Database["public"]["Tables"]["clients"]["Row"]> & {
          organisation_id: string;
          name: string;
          slug: string;
        };
        Update: Partial<Database["public"]["Tables"]["clients"]["Row"]>;
        Relationships: [];
      };
      organisation_members: {
        Row: {
          id: string;
          organisation_id: string;
          user_id: string;
          role_id: string;
          client_id: string | null;
          status: "active" | "invited" | "suspended";
          invited_email: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: Partial<Database["public"]["Tables"]["organisation_members"]["Row"]> & {
          organisation_id: string;
          user_id: string;
          role_id: string;
        };
        Update: Partial<Database["public"]["Tables"]["organisation_members"]["Row"]>;
        Relationships: [];
      };
      client_assignments: {
        Row: {
          id: string;
          organisation_id: string;
          client_id: string;
          user_id: string;
          assigned_by: string | null;
          created_at: string;
        };
        Insert: Partial<Database["public"]["Tables"]["client_assignments"]["Row"]> & {
          organisation_id: string;
          client_id: string;
          user_id: string;
        };
        Update: Partial<Database["public"]["Tables"]["client_assignments"]["Row"]>;
        Relationships: [];
      };
      audit_logs: {
        Row: {
          id: string;
          organisation_id: string;
          actor_user_id: string | null;
          actor_type: "user" | "ai_agent" | "system" | "automation";
          action:
            | "create"
            | "update"
            | "delete"
            | "export"
            | "ai_retrieve"
            | "external_action"
            | "login"
            | "logout"
            | "permission_change";
          resource: string;
          resource_id: string | null;
          client_id: string | null;
          metadata: Json;
          ip_address: string | null;
          user_agent: string | null;
          created_at: string;
        };
        Insert: Partial<Database["public"]["Tables"]["audit_logs"]["Row"]> & {
          organisation_id: string;
          actor_type: Database["public"]["Tables"]["audit_logs"]["Row"]["actor_type"];
          action: Database["public"]["Tables"]["audit_logs"]["Row"]["action"];
          resource: string;
        };
        Update: never;
        Relationships: [];
      };
      feature_flags: {
        Row: {
          id: string;
          organisation_id: string | null;
          key: string;
          is_enabled: boolean;
          description: string | null;
          rollout: "off" | "internal_only" | "all_users";
          created_at: string;
          updated_at: string;
        };
        Insert: Partial<Database["public"]["Tables"]["feature_flags"]["Row"]> & { key: string };
        Update: Partial<Database["public"]["Tables"]["feature_flags"]["Row"]>;
        Relationships: [];
      };
      secrets_metadata: {
        Row: {
          id: string;
          organisation_id: string;
          provider: string;
          key_alias: string;
          encrypted_value: string;
          last_rotated_at: string | null;
          created_by: string | null;
          created_at: string;
        };
        Insert: Partial<Database["public"]["Tables"]["secrets_metadata"]["Row"]> & {
          organisation_id: string;
          provider: string;
          key_alias: string;
          encrypted_value: string;
        };
        Update: Partial<Database["public"]["Tables"]["secrets_metadata"]["Row"]>;
        Relationships: [];
      };
      integration_connections: {
        Row: {
          id: string;
          organisation_id: string;
          provider: string;
          connected_by_user_id: string | null;
          status: "connected" | "disconnected" | "error" | "pending";
          scopes: string[];
          last_synced_at: string | null;
          last_error: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: Partial<Database["public"]["Tables"]["integration_connections"]["Row"]> & {
          organisation_id: string;
          provider: string;
        };
        Update: Partial<Database["public"]["Tables"]["integration_connections"]["Row"]>;
        Relationships: [];
      };
      integration_sync_logs: {
        Row: {
          id: string;
          integration_connection_id: string;
          started_at: string;
          finished_at: string | null;
          status: "running" | "success" | "partial" | "failed";
          records_synced: number;
          error_message: string | null;
        };
        Insert: Partial<Database["public"]["Tables"]["integration_sync_logs"]["Row"]> & {
          integration_connection_id: string;
        };
        Update: Partial<Database["public"]["Tables"]["integration_sync_logs"]["Row"]>;
        Relationships: [];
      };
      ai_providers: {
        Row: { id: string; slug: "openai" | "gemini" | "anthropic"; name: string; is_enabled_globally: boolean };
        Insert: Partial<Database["public"]["Tables"]["ai_providers"]["Row"]> & {
          slug: Database["public"]["Tables"]["ai_providers"]["Row"]["slug"];
          name: string;
        };
        Update: Partial<Database["public"]["Tables"]["ai_providers"]["Row"]>;
        Relationships: [];
      };
      ai_model_configs: {
        Row: {
          id: string;
          ai_provider_id: string;
          model_name: string;
          capability_tags: string[];
          cost_per_1k_input_tokens: number;
          cost_per_1k_output_tokens: number;
          is_active: boolean;
        };
        Insert: Partial<Database["public"]["Tables"]["ai_model_configs"]["Row"]> & {
          ai_provider_id: string;
          model_name: string;
        };
        Update: Partial<Database["public"]["Tables"]["ai_model_configs"]["Row"]>;
        Relationships: [];
      };
      ai_prompt_templates: {
        Row: {
          id: string;
          organisation_id: string | null;
          key: string;
          version: number;
          task_type: string;
          template: string;
          created_by: string | null;
          created_at: string;
        };
        Insert: Partial<Database["public"]["Tables"]["ai_prompt_templates"]["Row"]> & {
          key: string;
          task_type: string;
          template: string;
        };
        Update: Partial<Database["public"]["Tables"]["ai_prompt_templates"]["Row"]>;
        Relationships: [];
      };
      ai_runs: {
        Row: {
          id: string;
          organisation_id: string;
          client_id: string | null;
          user_id: string | null;
          ai_provider_id: string | null;
          model_name: string | null;
          task_type: string;
          mode: "read" | "draft" | "action_proposal";
          prompt_template_id: string | null;
          prompt: string | null;
          output: string | null;
          status: "pending" | "success" | "error" | "rejected";
          error_message: string | null;
          estimated_cost: number | null;
          approval_result: "approved" | "rejected" | "not_required" | null;
          created_at: string;
        };
        Insert: Partial<Database["public"]["Tables"]["ai_runs"]["Row"]> & {
          organisation_id: string;
          task_type: string;
        };
        Update: Partial<Database["public"]["Tables"]["ai_runs"]["Row"]>;
        Relationships: [];
      };
      ai_source_citations: {
        Row: {
          id: string;
          ai_run_id: string;
          document_type: string;
          document_id: string | null;
          title: string | null;
          excerpt: string | null;
        };
        Insert: Partial<Database["public"]["Tables"]["ai_source_citations"]["Row"]> & {
          ai_run_id: string;
          document_type: string;
        };
        Update: Partial<Database["public"]["Tables"]["ai_source_citations"]["Row"]>;
        Relationships: [];
      };
      ai_action_proposals: {
        Row: {
          id: string;
          ai_run_id: string;
          organisation_id: string;
          proposed_action: string;
          payload: Json;
          status: "pending" | "approved" | "rejected" | "expired";
          decided_by: string | null;
          decided_at: string | null;
          created_at: string;
        };
        Insert: Partial<Database["public"]["Tables"]["ai_action_proposals"]["Row"]> & {
          ai_run_id: string;
          organisation_id: string;
          proposed_action: string;
        };
        Update: Partial<Database["public"]["Tables"]["ai_action_proposals"]["Row"]>;
        Relationships: [];
      };
      ai_usage: {
        Row: {
          id: string;
          organisation_id: string;
          client_id: string | null;
          user_id: string | null;
          ai_provider_id: string | null;
          period_start: string;
          period_end: string;
          total_input_tokens: number;
          total_output_tokens: number;
          total_cost: number;
        };
        Insert: Partial<Database["public"]["Tables"]["ai_usage"]["Row"]> & {
          organisation_id: string;
          period_start: string;
          period_end: string;
        };
        Update: Partial<Database["public"]["Tables"]["ai_usage"]["Row"]>;
        Relationships: [];
      };
      contacts: {
        Row: {
          id: string;
          organisation_id: string;
          client_id: string | null;
          full_name: string;
          email: string | null;
          phone: string | null;
          job_title: string | null;
          company_name: string | null;
          is_primary: boolean;
          created_at: string;
          updated_at: string;
          deleted_at: string | null;
        };
        Insert: Partial<Database["public"]["Tables"]["contacts"]["Row"]> & {
          organisation_id: string;
          full_name: string;
        };
        Update: Partial<Database["public"]["Tables"]["contacts"]["Row"]>;
        Relationships: [];
      };
      leads: {
        Row: {
          id: string;
          organisation_id: string;
          contact_id: string | null;
          company_name: string;
          industry: string | null;
          source: string | null;
          status: "new" | "qualified" | "disqualified" | "converted";
          score: number;
          estimated_value: number | null;
          service_interest: string[];
          owner_id: string | null;
          notes: string | null;
          converted_client_id: string | null;
          utm_source: string | null;
          utm_medium: string | null;
          utm_campaign: string | null;
          utm_content: string | null;
          utm_term: string | null;
          meta_campaign: string | null;
          meta_ad_set: string | null;
          meta_ad: string | null;
          click_id: string | null;
          landing_page: string | null;
          form_submitted: string | null;
          lead_magnet: string | null;
          first_response_at: string | null;
          sms_consent: boolean;
          sms_consent_captured_at: string | null;
          sms_opted_out_at: string | null;
          created_at: string;
          updated_at: string;
          deleted_at: string | null;
        };
        Insert: Partial<Database["public"]["Tables"]["leads"]["Row"]> & {
          organisation_id: string;
          company_name: string;
        };
        Update: Partial<Database["public"]["Tables"]["leads"]["Row"]>;
        Relationships: [];
      };
      deals: {
        Row: {
          id: string;
          organisation_id: string;
          lead_id: string | null;
          client_id: string | null;
          title: string;
          stage:
            | "new_lead"
            | "qualified"
            | "discovery_call_booked"
            | "discovery_completed"
            | "proposal_sent"
            | "negotiation"
            | "verbal_yes"
            | "contract_sent"
            | "closed_won"
            | "closed_lost"
            | "nurture";
          value: number | null;
          currency: string;
          expected_close_date: string | null;
          owner_id: string | null;
          status: "open" | "won" | "lost";
          win_loss_reason: string | null;
          created_at: string;
          updated_at: string;
          closed_at: string | null;
          deleted_at: string | null;
        };
        Insert: Partial<Database["public"]["Tables"]["deals"]["Row"]> & {
          organisation_id: string;
          title: string;
        };
        Update: Partial<Database["public"]["Tables"]["deals"]["Row"]>;
        Relationships: [];
      };
      task_templates: {
        Row: {
          id: string;
          organisation_id: string | null;
          name: string;
          category: string;
          description: string | null;
          default_tasks: Json;
          created_at: string;
        };
        Insert: Partial<Database["public"]["Tables"]["task_templates"]["Row"]> & { name: string; category: string };
        Update: Partial<Database["public"]["Tables"]["task_templates"]["Row"]>;
        Relationships: [];
      };
      projects: {
        Row: {
          id: string;
          organisation_id: string;
          client_id: string;
          name: string;
          service_type: string | null;
          project_type: string | null;
          budget: number | null;
          start_date: string | null;
          end_date: string | null;
          owner_id: string | null;
          status: "planning" | "active" | "on_hold" | "complete" | "cancelled";
          client_visible: boolean;
          source_template_id: string | null;
          created_at: string;
          updated_at: string;
          deleted_at: string | null;
        };
        Insert: Partial<Database["public"]["Tables"]["projects"]["Row"]> & {
          organisation_id: string;
          client_id: string;
          name: string;
        };
        Update: Partial<Database["public"]["Tables"]["projects"]["Row"]>;
        Relationships: [];
      };
      milestones: {
        Row: {
          id: string;
          organisation_id: string;
          project_id: string;
          name: string;
          due_date: string | null;
          status: "not_started" | "in_progress" | "complete";
          sort_order: number;
        };
        Insert: Partial<Database["public"]["Tables"]["milestones"]["Row"]> & {
          organisation_id: string;
          project_id: string;
          name: string;
        };
        Update: Partial<Database["public"]["Tables"]["milestones"]["Row"]>;
        Relationships: [];
      };
      tasks: {
        Row: {
          id: string;
          organisation_id: string;
          client_id: string | null;
          project_id: string | null;
          task_template_id: string | null;
          title: string;
          category: string | null;
          priority: "low" | "medium" | "high" | "urgent";
          assignee_id: string | null;
          reviewer_id: string | null;
          due_date: string | null;
          start_date: string | null;
          estimated_hours: number | null;
          actual_hours: number | null;
          billable: boolean;
          status:
            | "not_started"
            | "in_progress"
            | "waiting_on_internal_review"
            | "waiting_on_client"
            | "blocked"
            | "complete"
            | "cancelled";
          created_at: string;
          updated_at: string;
          completed_at: string | null;
          deleted_at: string | null;
        };
        Insert: Partial<Database["public"]["Tables"]["tasks"]["Row"]> & {
          organisation_id: string;
          title: string;
        };
        Update: Partial<Database["public"]["Tables"]["tasks"]["Row"]>;
        Relationships: [];
      };
      content_items: {
        Row: {
          id: string;
          organisation_id: string;
          client_id: string;
          platform: string | null;
          content_type: string | null;
          objective: string | null;
          hook: string | null;
          caption: string | null;
          cta: string | null;
          brief: string | null;
          owner_id: string | null;
          reviewer_id: string | null;
          approver_id: string | null;
          due_date: string | null;
          publish_date: string | null;
          status:
            | "idea"
            | "brief_needed"
            | "in_production"
            | "internal_review"
            | "client_review"
            | "revisions"
            | "approved"
            | "scheduled"
            | "published"
            | "archived";
          client_visible: boolean;
          created_at: string;
          updated_at: string;
          deleted_at: string | null;
        };
        Insert: Partial<Database["public"]["Tables"]["content_items"]["Row"]> & {
          organisation_id: string;
          client_id: string;
        };
        Update: Partial<Database["public"]["Tables"]["content_items"]["Row"]>;
        Relationships: [];
      };
      approvals: {
        Row: {
          id: string;
          organisation_id: string;
          client_id: string;
          subject_type: "content_item" | "document" | "report";
          subject_id: string;
          requested_by: string | null;
          status: "pending" | "approved" | "changes_requested";
          decision_notes: string | null;
          requested_at: string;
          decided_by: string | null;
          decided_at: string | null;
        };
        Insert: Partial<Database["public"]["Tables"]["approvals"]["Row"]> & {
          organisation_id: string;
          client_id: string;
          subject_type: Database["public"]["Tables"]["approvals"]["Row"]["subject_type"];
          subject_id: string;
        };
        Update: Partial<Database["public"]["Tables"]["approvals"]["Row"]>;
        Relationships: [];
      };
      meetings: {
        Row: {
          id: string;
          organisation_id: string;
          client_id: string | null;
          title: string;
          meeting_type: "discovery_call" | "internal" | "client_review" | "other";
          scheduled_at: string;
          duration_minutes: number | null;
          meeting_link: string | null;
          notes: string | null;
          client_visible: boolean;
          created_by: string | null;
          created_at: string;
        };
        Insert: Partial<Database["public"]["Tables"]["meetings"]["Row"]> & {
          organisation_id: string;
          title: string;
          scheduled_at: string;
        };
        Update: Partial<Database["public"]["Tables"]["meetings"]["Row"]>;
        Relationships: [];
      };
      documents: {
        Row: {
          id: string;
          organisation_id: string;
          client_id: string | null;
          project_id: string | null;
          name: string;
          storage_path: string;
          file_type: string | null;
          size_bytes: number | null;
          client_visible: boolean;
          uploaded_by: string | null;
          created_at: string;
          deleted_at: string | null;
        };
        Insert: Partial<Database["public"]["Tables"]["documents"]["Row"]> & {
          organisation_id: string;
          name: string;
          storage_path: string;
        };
        Update: Partial<Database["public"]["Tables"]["documents"]["Row"]>;
        Relationships: [];
      };
      notes: {
        Row: {
          id: string;
          organisation_id: string;
          client_id: string | null;
          subject_type: "client" | "lead" | "deal" | "project" | "task" | null;
          subject_id: string | null;
          author_id: string | null;
          body: string;
          created_at: string;
        };
        Insert: Partial<Database["public"]["Tables"]["notes"]["Row"]> & {
          organisation_id: string;
          body: string;
        };
        Update: Partial<Database["public"]["Tables"]["notes"]["Row"]>;
        Relationships: [];
      };
      bookings: {
        Row: {
          id: string;
          organisation_id: string;
          client_id: string | null;
          lead_id: string | null;
          deal_id: string | null;
          source: "calendly" | "google_calendar" | "gohighlevel" | "internal";
          external_ref: string | null;
          title: string;
          scheduled_at: string;
          duration_minutes: number | null;
          status: "booked" | "confirmed" | "attended" | "rescheduled" | "cancelled" | "no_show";
          deposit_status: "not_required" | "pending" | "paid" | "refunded";
          deposit_amount: number | null;
          deposit_provider: "stripe" | "square" | null;
          outcome: "closed_won" | "closed_lost" | null;
          revenue: number | null;
          owner_id: string | null;
          created_at: string;
          updated_at: string;
          deleted_at: string | null;
        };
        Insert: Partial<Database["public"]["Tables"]["bookings"]["Row"]> & {
          organisation_id: string;
          title: string;
          scheduled_at: string;
        };
        Update: Partial<Database["public"]["Tables"]["bookings"]["Row"]>;
        Relationships: [];
      };
      proposals: {
        Row: {
          id: string;
          organisation_id: string;
          client_id: string | null;
          deal_id: string | null;
          title: string;
          amount: number | null;
          currency: string;
          status: "draft" | "sent" | "accepted" | "declined" | "expired";
          valid_until: string | null;
          sent_at: string | null;
          decided_at: string | null;
          notes: string | null;
          created_by: string | null;
          created_at: string;
          updated_at: string;
          deleted_at: string | null;
        };
        Insert: Partial<Database["public"]["Tables"]["proposals"]["Row"]> & {
          organisation_id: string;
          title: string;
        };
        Update: Partial<Database["public"]["Tables"]["proposals"]["Row"]>;
        Relationships: [];
      };
      contracts: {
        Row: {
          id: string;
          organisation_id: string;
          client_id: string;
          name: string;
          status: "draft" | "sent" | "signed" | "expired" | "terminated";
          start_date: string | null;
          end_date: string | null;
          renewal_notice_days: number;
          auto_renews: boolean;
          value: number | null;
          currency: string;
          document_id: string | null;
          created_at: string;
          updated_at: string;
          deleted_at: string | null;
        };
        Insert: Partial<Database["public"]["Tables"]["contracts"]["Row"]> & {
          organisation_id: string;
          client_id: string;
          name: string;
        };
        Update: Partial<Database["public"]["Tables"]["contracts"]["Row"]>;
        Relationships: [];
      };
      retainers: {
        Row: {
          id: string;
          organisation_id: string;
          client_id: string;
          name: string;
          amount: number;
          currency: string;
          billing_cadence: "monthly" | "quarterly";
          included_hours: number | null;
          start_date: string;
          end_date: string | null;
          status: "active" | "paused" | "ended";
          created_at: string;
          updated_at: string;
          deleted_at: string | null;
        };
        Insert: Partial<Database["public"]["Tables"]["retainers"]["Row"]> & {
          organisation_id: string;
          client_id: string;
          name: string;
          amount: number;
          start_date: string;
        };
        Update: Partial<Database["public"]["Tables"]["retainers"]["Row"]>;
        Relationships: [];
      };
      invoices: {
        Row: {
          id: string;
          organisation_id: string;
          client_id: string;
          retainer_id: string | null;
          number: string;
          status: "draft" | "sent" | "paid" | "overdue" | "void";
          issue_date: string;
          due_date: string | null;
          amount: number;
          tax_amount: number;
          currency: string;
          notes: string | null;
          paid_at: string | null;
          created_by: string | null;
          created_at: string;
          updated_at: string;
          deleted_at: string | null;
        };
        Insert: Partial<Database["public"]["Tables"]["invoices"]["Row"]> & {
          organisation_id: string;
          client_id: string;
          number: string;
          amount: number;
        };
        Update: Partial<Database["public"]["Tables"]["invoices"]["Row"]>;
        Relationships: [];
      };
      payments: {
        Row: {
          id: string;
          organisation_id: string;
          invoice_id: string;
          amount: number;
          currency: string;
          method: "stripe" | "square" | "e_transfer" | "cheque" | "wire" | "other";
          reference: string | null;
          paid_at: string;
          recorded_by: string | null;
          created_at: string;
        };
        Insert: Partial<Database["public"]["Tables"]["payments"]["Row"]> & {
          organisation_id: string;
          invoice_id: string;
          amount: number;
        };
        Update: Partial<Database["public"]["Tables"]["payments"]["Row"]>;
        Relationships: [];
      };
      expenses: {
        Row: {
          id: string;
          organisation_id: string;
          client_id: string | null;
          category: "contractor" | "software" | "ad_spend" | "ai_spend" | "other";
          description: string;
          vendor: string | null;
          amount: number;
          currency: string;
          incurred_on: string;
          receipt_document_id: string | null;
          recorded_by: string | null;
          created_at: string;
          deleted_at: string | null;
        };
        Insert: Partial<Database["public"]["Tables"]["expenses"]["Row"]> & {
          organisation_id: string;
          description: string;
          amount: number;
        };
        Update: Partial<Database["public"]["Tables"]["expenses"]["Row"]>;
        Relationships: [];
      };
      member_rates: {
        Row: {
          id: string;
          organisation_id: string;
          user_id: string;
          hourly_cost: number;
          currency: string;
          effective_from: string;
          created_at: string;
        };
        Insert: Partial<Database["public"]["Tables"]["member_rates"]["Row"]> & {
          organisation_id: string;
          user_id: string;
          hourly_cost: number;
        };
        Update: Partial<Database["public"]["Tables"]["member_rates"]["Row"]>;
        Relationships: [];
      };
    };
    Views: Record<string, never>;
    Functions: {
      has_permission: {
        Args: { p_org_id: string; p_resource: string; p_action: string; p_client_id?: string | null };
        Returns: boolean;
      };
      can_access_client: {
        Args: { p_org_id: string; p_client_id: string };
        Returns: boolean;
      };
    };
    Enums: Record<string, never>;
  };
}
