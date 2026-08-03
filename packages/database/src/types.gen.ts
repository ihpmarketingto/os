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
          subject_type: "content_item" | "document" | "report" | "landing_page";
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
      campaigns: {
        Row: {
          id: string;
          organisation_id: string;
          client_id: string;
          name: string;
          objective: string | null;
          offer: string | null;
          audience: string | null;
          channels: string[];
          budget: number | null;
          kpis: string | null;
          start_date: string | null;
          end_date: string | null;
          status:
            | "planning"
            | "awaiting_approval"
            | "ready_to_launch"
            | "live"
            | "optimising"
            | "paused"
            | "complete"
            | "archived";
          owner_id: string | null;
          results: string | null;
          learnings: string | null;
          client_visible: boolean;
          created_at: string;
          updated_at: string;
          deleted_at: string | null;
        };
        Insert: Partial<Database["public"]["Tables"]["campaigns"]["Row"]> & {
          organisation_id: string;
          client_id: string;
          name: string;
        };
        Update: Partial<Database["public"]["Tables"]["campaigns"]["Row"]>;
        Relationships: [];
      };
      campaign_metrics: {
        Row: {
          id: string;
          organisation_id: string;
          client_id: string;
          campaign_id: string | null;
          channel: "meta_ads" | "google_ads" | "seo" | "email" | "social" | "other";
          metric_date: string;
          spend: number;
          impressions: number;
          clicks: number;
          leads: number;
          conversions: number;
          revenue: number;
          extras: Json;
          source: "csv_import" | "manual" | "api";
          ad_creative_id: string | null;
          created_by: string | null;
          created_at: string;
        };
        Insert: Partial<Database["public"]["Tables"]["campaign_metrics"]["Row"]> & {
          organisation_id: string;
          client_id: string;
          channel: Database["public"]["Tables"]["campaign_metrics"]["Row"]["channel"];
          metric_date: string;
        };
        Update: Partial<Database["public"]["Tables"]["campaign_metrics"]["Row"]>;
        Relationships: [];
      };
      reports: {
        Row: {
          id: string;
          organisation_id: string;
          client_id: string;
          title: string;
          period_start: string;
          period_end: string;
          executive_summary: string | null;
          key_wins: string | null;
          risks: string | null;
          next_month_plan: string | null;
          status: "draft" | "internal_review" | "client_review" | "published" | "archived";
          created_by: string | null;
          published_at: string | null;
          created_at: string;
          updated_at: string;
          deleted_at: string | null;
        };
        Insert: Partial<Database["public"]["Tables"]["reports"]["Row"]> & {
          organisation_id: string;
          client_id: string;
          title: string;
          period_start: string;
          period_end: string;
        };
        Update: Partial<Database["public"]["Tables"]["reports"]["Row"]>;
        Relationships: [];
      };
      experiments: {
        Row: {
          id: string;
          organisation_id: string;
          client_id: string;
          name: string;
          hypothesis: string;
          page_url: string | null;
          variant_description: string | null;
          success_metric: string | null;
          start_date: string | null;
          end_date: string | null;
          status: "planned" | "running" | "complete" | "abandoned";
          result: string | null;
          statistical_confidence: string | null;
          decision: "ship" | "revert" | "iterate" | null;
          learnings: string | null;
          created_by: string | null;
          created_at: string;
          updated_at: string;
          deleted_at: string | null;
        };
        Insert: Partial<Database["public"]["Tables"]["experiments"]["Row"]> & {
          organisation_id: string;
          client_id: string;
          name: string;
          hypothesis: string;
        };
        Update: Partial<Database["public"]["Tables"]["experiments"]["Row"]>;
        Relationships: [];
      };
      influencers: {
        Row: {
          id: string;
          organisation_id: string;
          client_id: string | null;
          name: string;
          handle: string | null;
          platform: string | null;
          followers: number | null;
          email: string | null;
          status: "prospect" | "contacted" | "negotiating" | "active" | "past";
          compensation: string | null;
          usage_rights: string | null;
          notes: string | null;
          created_at: string;
          updated_at: string;
          deleted_at: string | null;
        };
        Insert: Partial<Database["public"]["Tables"]["influencers"]["Row"]> & {
          organisation_id: string;
          name: string;
        };
        Update: Partial<Database["public"]["Tables"]["influencers"]["Row"]>;
        Relationships: [];
      };
      media_contacts: {
        Row: {
          id: string;
          organisation_id: string;
          name: string;
          outlet: string | null;
          beat: string | null;
          email: string | null;
          phone: string | null;
          notes: string | null;
          created_at: string;
          updated_at: string;
          deleted_at: string | null;
        };
        Insert: Partial<Database["public"]["Tables"]["media_contacts"]["Row"]> & {
          organisation_id: string;
          name: string;
        };
        Update: Partial<Database["public"]["Tables"]["media_contacts"]["Row"]>;
        Relationships: [];
      };
      outreach: {
        Row: {
          id: string;
          organisation_id: string;
          client_id: string | null;
          contact_type: "influencer" | "media";
          influencer_id: string | null;
          media_contact_id: string | null;
          subject: string;
          status: "drafted" | "sent" | "responded" | "declined" | "confirmed";
          sent_at: string | null;
          notes: string | null;
          created_by: string | null;
          created_at: string;
        };
        Insert: Partial<Database["public"]["Tables"]["outreach"]["Row"]> & {
          organisation_id: string;
          contact_type: Database["public"]["Tables"]["outreach"]["Row"]["contact_type"];
          subject: string;
        };
        Update: Partial<Database["public"]["Tables"]["outreach"]["Row"]>;
        Relationships: [];
      };
      events: {
        Row: {
          id: string;
          organisation_id: string;
          client_id: string | null;
          name: string;
          venue: string | null;
          starts_at: string | null;
          ends_at: string | null;
          ticket_link: string | null;
          status: "planning" | "on_sale" | "live" | "complete" | "cancelled";
          target_attendance: number | null;
          tickets_sold: number;
          ticket_revenue: number;
          notes: string | null;
          created_at: string;
          updated_at: string;
          deleted_at: string | null;
        };
        Insert: Partial<Database["public"]["Tables"]["events"]["Row"]> & {
          organisation_id: string;
          name: string;
        };
        Update: Partial<Database["public"]["Tables"]["events"]["Row"]>;
        Relationships: [];
      };
      event_attendees: {
        Row: {
          id: string;
          organisation_id: string;
          event_id: string;
          name: string;
          email: string | null;
          ticket_type: string | null;
          checked_in: boolean;
          created_at: string;
        };
        Insert: Partial<Database["public"]["Tables"]["event_attendees"]["Row"]> & {
          organisation_id: string;
          event_id: string;
          name: string;
        };
        Update: Partial<Database["public"]["Tables"]["event_attendees"]["Row"]>;
        Relationships: [];
      };
      build_library_projects: {
        Row: {
          id: string;
          organisation_id: string;
          client_id: string | null;
          project_name: string;
          repository_url: string | null;
          branch: string | null;
          deployment_url: string | null;
          replit_url: string | null;
          source_provider: "github" | "replit" | "manual";
          technology_stack: string[];
          page_type: string | null;
          offer_type: string | null;
          funnel_type: string | null;
          industry: string | null;
          target_audience: string | null;
          conversion_goal: string | null;
          traffic_source: string | null;
          screenshot_document_id: string | null;
          design_style_tags: string[];
          components_detected: string[];
          tracking_detected: string[];
          form_system: string | null;
          conversion_rate: number | null;
          leads: number | null;
          revenue: number | null;
          roas: number | null;
          learnings: string | null;
          status: "imported" | "reviewed" | "approved_for_reuse" | "restricted";
          reuse_permitted: boolean;
          client_restrictions: string | null;
          asset_rights: string | null;
          source_ownership: string;
          created_at: string;
          updated_at: string;
          deleted_at: string | null;
        };
        Insert: Partial<Database["public"]["Tables"]["build_library_projects"]["Row"]> & {
          organisation_id: string;
          project_name: string;
        };
        Update: Partial<Database["public"]["Tables"]["build_library_projects"]["Row"]>;
        Relationships: [];
      };
      reusable_components: {
        Row: {
          id: string;
          organisation_id: string;
          source_project_id: string | null;
          name: string;
          category:
            | "hero"
            | "navigation"
            | "offer"
            | "pricing"
            | "reviews"
            | "testimonials"
            | "before_after"
            | "product"
            | "booking"
            | "event"
            | "speaker"
            | "faq"
            | "form"
            | "trust_bar"
            | "cta"
            | "countdown"
            | "location"
            | "video"
            | "footer";
          code_reference: string | null;
          props_notes: string | null;
          dependencies: string | null;
          editable_fields: string | null;
          preview_document_id: string | null;
          accessibility_notes: string | null;
          analytics_events: string | null;
          conversion_purpose: string | null;
          client_restrictions: string | null;
          approval_status: "pending_review" | "approved" | "rejected";
          created_at: string;
          updated_at: string;
          deleted_at: string | null;
        };
        Insert: Partial<Database["public"]["Tables"]["reusable_components"]["Row"]> & {
          organisation_id: string;
          name: string;
          category: Database["public"]["Tables"]["reusable_components"]["Row"]["category"];
        };
        Update: Partial<Database["public"]["Tables"]["reusable_components"]["Row"]>;
        Relationships: [];
      };
      landing_page_briefs: {
        Row: {
          id: string;
          organisation_id: string;
          client_id: string;
          campaign_id: string | null;
          title: string;
          offer: string;
          product_service: string | null;
          audience: string | null;
          goal: string | null;
          conversion_action: string;
          main_cta: string;
          secondary_cta: string | null;
          traffic_source: string | null;
          price: string | null;
          promotion: string | null;
          deadline: string | null;
          location: string | null;
          booking_link: string | null;
          product_link: string | null;
          ticket_link: string | null;
          testimonials: string | null;
          objections: string | null;
          proof_points: string | null;
          differentiators: string | null;
          required_claims: string | null;
          forbidden_claims: string | null;
          required_disclaimer: string | null;
          brand_direction: string | null;
          reference_projects: string | null;
          required_tracking: string | null;
          required_integrations: string | null;
          launch_date: string | null;
          stakeholders: string | null;
          approval_owner_id: string | null;
          status: "draft" | "approved";
          approved_at: string | null;
          created_by: string | null;
          created_at: string;
          updated_at: string;
          deleted_at: string | null;
        };
        Insert: Partial<Database["public"]["Tables"]["landing_page_briefs"]["Row"]> & {
          organisation_id: string;
          client_id: string;
          title: string;
          offer: string;
          conversion_action: string;
          main_cta: string;
        };
        Update: Partial<Database["public"]["Tables"]["landing_page_briefs"]["Row"]>;
        Relationships: [];
      };
      landing_page_projects: {
        Row: {
          id: string;
          organisation_id: string;
          client_id: string;
          brief_id: string;
          name: string;
          generation_mode: "clone_and_adapt" | "build_from_components" | "build_from_strategy" | "improve_existing";
          reference_build_project_id: string | null;
          repository_url: string | null;
          branch: string | null;
          preview_url: string | null;
          production_url: string | null;
          status:
            | "planning"
            | "generating"
            | "preview"
            | "qa"
            | "internal_approval"
            | "client_approval"
            | "approved_to_publish"
            | "published"
            | "archived";
          notes: string | null;
          created_by: string | null;
          created_at: string;
          updated_at: string;
          deleted_at: string | null;
        };
        Insert: Partial<Database["public"]["Tables"]["landing_page_projects"]["Row"]> & {
          organisation_id: string;
          client_id: string;
          brief_id: string;
          name: string;
          generation_mode: Database["public"]["Tables"]["landing_page_projects"]["Row"]["generation_mode"];
        };
        Update: Partial<Database["public"]["Tables"]["landing_page_projects"]["Row"]>;
        Relationships: [];
      };
      qa_runs: {
        Row: {
          id: string;
          organisation_id: string;
          landing_page_project_id: string;
          run_by: string | null;
          overall: "pass" | "warning" | "fail";
          items: Json;
          notes: string | null;
          created_at: string;
        };
        Insert: Partial<Database["public"]["Tables"]["qa_runs"]["Row"]> & {
          organisation_id: string;
          landing_page_project_id: string;
          overall: Database["public"]["Tables"]["qa_runs"]["Row"]["overall"];
        };
        Update: Partial<Database["public"]["Tables"]["qa_runs"]["Row"]>;
        Relationships: [];
      };
      creative_assets: {
        Row: {
          id: string;
          organisation_id: string;
          client_id: string | null;
          name: string;
          storage_path: string;
          mime_type: string | null;
          width: number | null;
          height: number | null;
          size_bytes: number | null;
          origin: "uploaded" | "ai_generated";
          generation_prompt: string | null;
          generation_provider: string | null;
          generation_model: string | null;
          generation_cost: number | null;
          reviewed_at: string | null;
          reviewed_by: string | null;
          depicts_real_client_result: boolean;
          usage_restrictions: string | null;
          created_by: string | null;
          created_at: string;
          deleted_at: string | null;
        };
        Insert: Partial<Database["public"]["Tables"]["creative_assets"]["Row"]> & {
          organisation_id: string;
          name: string;
          storage_path: string;
        };
        Update: Partial<Database["public"]["Tables"]["creative_assets"]["Row"]>;
        Relationships: [];
      };
      email_flows: {
        Row: {
          id: string;
          organisation_id: string;
          client_id: string;
          name: string;
          flow_type:
            | "welcome"
            | "nurture"
            | "win_back"
            | "post_purchase"
            | "abandoned_cart"
            | "re_engagement"
            | "booking_reminder"
            | "other";
          status: "draft" | "live" | "paused" | "archived";
          trigger_description: string | null;
          goal: string | null;
          platform: string | null;
          external_ref: string | null;
          entered: number;
          created_by: string | null;
          created_at: string;
          updated_at: string;
          deleted_at: string | null;
        };
        Insert: Partial<Database["public"]["Tables"]["email_flows"]["Row"]> & {
          organisation_id: string;
          client_id: string;
          name: string;
        };
        Update: Partial<Database["public"]["Tables"]["email_flows"]["Row"]>;
        Relationships: [];
      };
      email_flow_steps: {
        Row: {
          id: string;
          organisation_id: string;
          flow_id: string;
          step_index: number;
          name: string;
          channel: "email" | "sms";
          /* Wait since the previous step, not since flow entry. */
          delay_hours: number;
          subject: string | null;
          purpose: string | null;
          stats_period_start: string | null;
          stats_period_end: string | null;
          sent: number;
          delivered: number;
          opens: number;
          clicks: number;
          unsubscribes: number;
          conversions: number;
          revenue: number;
          created_at: string;
          updated_at: string;
        };
        Insert: Partial<Database["public"]["Tables"]["email_flow_steps"]["Row"]> & {
          organisation_id: string;
          flow_id: string;
          step_index: number;
          name: string;
        };
        Update: Partial<Database["public"]["Tables"]["email_flow_steps"]["Row"]>;
        Relationships: [];
      };
      seo_keywords: {
        Row: {
          id: string;
          organisation_id: string;
          client_id: string;
          keyword: string;
          location: string | null;
          intent: "informational" | "commercial" | "transactional" | "navigational" | "local" | null;
          target_url: string | null;
          search_volume: number | null;
          difficulty: number | null;
          is_priority: boolean;
          created_by: string | null;
          created_at: string;
          updated_at: string;
          deleted_at: string | null;
        };
        Insert: Partial<Database["public"]["Tables"]["seo_keywords"]["Row"]> & {
          organisation_id: string;
          client_id: string;
          keyword: string;
        };
        Update: Partial<Database["public"]["Tables"]["seo_keywords"]["Row"]>;
        Relationships: [];
      };
      seo_rankings: {
        Row: {
          id: string;
          organisation_id: string;
          keyword_id: string;
          recorded_on: string;
          /* Null means measured and not ranking. Never 0, never a sentinel. */
          position: number | null;
          ranking_url: string | null;
          created_at: string;
        };
        Insert: Partial<Database["public"]["Tables"]["seo_rankings"]["Row"]> & {
          organisation_id: string;
          keyword_id: string;
          recorded_on: string;
        };
        Update: Partial<Database["public"]["Tables"]["seo_rankings"]["Row"]>;
        Relationships: [];
      };
      gbp_metrics: {
        Row: {
          id: string;
          organisation_id: string;
          client_id: string;
          period_start: string;
          period_end: string;
          profile_views: number;
          search_impressions: number;
          calls: number;
          direction_requests: number;
          website_clicks: number;
          bookings: number;
          reviews_total: number | null;
          new_reviews: number | null;
          average_rating: number | null;
          created_at: string;
        };
        Insert: Partial<Database["public"]["Tables"]["gbp_metrics"]["Row"]> & {
          organisation_id: string;
          client_id: string;
          period_start: string;
          period_end: string;
        };
        Update: Partial<Database["public"]["Tables"]["gbp_metrics"]["Row"]>;
        Relationships: [];
      };
      designs: {
        Row: {
          id: string;
          organisation_id: string;
          /* Null only for shared templates. Client work always names its client. */
          client_id: string | null;
          name: string;
          format: "square" | "portrait" | "story" | "landscape" | "custom";
          width: number;
          height: number;
          canvas_json: Json;
          thumbnail_path: string | null;
          export_path: string | null;
          ad_creative_id: string | null;
          content_item_id: string | null;
          campaign_id: string | null;
          status: "draft" | "in_review" | "approved" | "archived";
          is_template: boolean;
          carousel_group_id: string | null;
          slide_index: number | null;
          template_category: string | null;
          source_design_id: string | null;
          version: number;
          created_by: string | null;
          created_at: string;
          updated_at: string;
          deleted_at: string | null;
        };
        Insert: Partial<Database["public"]["Tables"]["designs"]["Row"]> & {
          organisation_id: string;
          name: string;
        };
        Update: Partial<Database["public"]["Tables"]["designs"]["Row"]>;
        Relationships: [];
      };
      ad_creatives: {
        Row: {
          id: string;
          organisation_id: string;
          client_id: string;
          campaign_id: string | null;
          concept: string;
          variant_label: string;
          name: string;
          channel: "meta_ads" | "google_ads" | "social" | "other";
          format: "static" | "image" | "carousel" | "video" | "ugc_video" | "story";
          audience: string | null;
          primary_text: string | null;
          headline: string | null;
          description: string | null;
          cta: string | null;
          asset_document_id: string | null;
          content_item_id: string | null;
          status: "draft" | "in_review" | "approved" | "live" | "paused" | "retired";
          launched_at: string | null;
          retired_at: string | null;
          fatigue_flagged_at: string | null;
          notes: string | null;
          created_by: string | null;
          created_at: string;
          updated_at: string;
          deleted_at: string | null;
        };
        Insert: Partial<Database["public"]["Tables"]["ad_creatives"]["Row"]> & {
          organisation_id: string;
          client_id: string;
          concept: string;
          name: string;
        };
        Update: Partial<Database["public"]["Tables"]["ad_creatives"]["Row"]>;
        Relationships: [];
      };
      optimisation_log: {
        Row: {
          id: string;
          organisation_id: string;
          client_id: string;
          campaign_id: string | null;
          ad_creative_id: string | null;
          change_type:
            | "budget"
            | "audience"
            | "creative"
            | "bid"
            | "targeting"
            | "placement"
            | "pause"
            | "scale"
            | "other";
          description: string;
          rationale: string | null;
          expected_outcome: string | null;
          observed_outcome: string | null;
          decision: "scale" | "iterate" | "kill" | "hold" | null;
          changed_at: string;
          reviewed_at: string | null;
          changed_by: string | null;
          created_at: string;
        };
        Insert: Partial<Database["public"]["Tables"]["optimisation_log"]["Row"]> & {
          organisation_id: string;
          client_id: string;
          change_type: Database["public"]["Tables"]["optimisation_log"]["Row"]["change_type"];
          description: string;
        };
        Update: Partial<Database["public"]["Tables"]["optimisation_log"]["Row"]>;
        Relationships: [];
      };
      service_packages: {
        Row: {
          id: string;
          organisation_id: string;
          slug: string;
          name: string;
          category:
            | "strategy"
            | "website"
            | "landing_pages"
            | "paid_media"
            | "seo"
            | "local_seo"
            | "social"
            | "email"
            | "lifecycle"
            | "booking"
            | "pr"
            | "events"
            | "reporting"
            | "other";
          description: string | null;
          cadence: "one_time" | "monthly" | "quarterly";
          default_included_hours: number | null;
          default_price: number | null;
          currency: string;
          is_active: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: Partial<Database["public"]["Tables"]["service_packages"]["Row"]> & {
          organisation_id: string;
          slug: string;
          name: string;
          category: Database["public"]["Tables"]["service_packages"]["Row"]["category"];
        };
        Update: Partial<Database["public"]["Tables"]["service_packages"]["Row"]>;
        Relationships: [];
      };
      service_package_templates: {
        Row: {
          id: string;
          organisation_id: string;
          service_package_id: string;
          task_template_id: string;
          trigger: "on_start" | "each_period";
          sort_order: number;
        };
        Insert: Partial<Database["public"]["Tables"]["service_package_templates"]["Row"]> & {
          organisation_id: string;
          service_package_id: string;
          task_template_id: string;
        };
        Update: Partial<Database["public"]["Tables"]["service_package_templates"]["Row"]>;
        Relationships: [];
      };
      client_services: {
        Row: {
          id: string;
          organisation_id: string;
          client_id: string;
          service_package_id: string;
          retainer_id: string | null;
          owner_id: string | null;
          status: "active" | "paused" | "ended";
          cadence: "one_time" | "monthly" | "quarterly" | null;
          included_hours: number | null;
          price: number | null;
          start_date: string;
          end_date: string | null;
          last_fulfilled_period: string | null;
          notes: string | null;
          created_at: string;
          updated_at: string;
          deleted_at: string | null;
        };
        Insert: Partial<Database["public"]["Tables"]["client_services"]["Row"]> & {
          organisation_id: string;
          client_id: string;
          service_package_id: string;
        };
        Update: Partial<Database["public"]["Tables"]["client_services"]["Row"]>;
        Relationships: [];
      };
      automation_rules: {
        Row: {
          id: string;
          organisation_id: string;
          rule_key: string;
          name: string;
          description: string | null;
          trigger_type: "event" | "sweep";
          is_enabled: boolean;
          config: Json;
          last_run_at: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: Partial<Database["public"]["Tables"]["automation_rules"]["Row"]> & {
          organisation_id: string;
          rule_key: string;
          name: string;
          trigger_type: "event" | "sweep";
        };
        Update: Partial<Database["public"]["Tables"]["automation_rules"]["Row"]>;
        Relationships: [];
      };
      automation_runs: {
        Row: {
          id: string;
          organisation_id: string;
          rule_key: string;
          dedupe_key: string;
          status: "completed" | "failed";
          summary: string | null;
          created_at: string;
        };
        Insert: Partial<Database["public"]["Tables"]["automation_runs"]["Row"]> & {
          organisation_id: string;
          rule_key: string;
          dedupe_key: string;
        };
        Update: Partial<Database["public"]["Tables"]["automation_runs"]["Row"]>;
        Relationships: [];
      };
      notifications: {
        Row: {
          id: string;
          organisation_id: string;
          user_id: string;
          client_id: string | null;
          title: string;
          body: string | null;
          href: string | null;
          read_at: string | null;
          created_at: string;
        };
        Insert: Partial<Database["public"]["Tables"]["notifications"]["Row"]> & {
          organisation_id: string;
          user_id: string;
          title: string;
        };
        Update: Partial<Database["public"]["Tables"]["notifications"]["Row"]>;
        Relationships: [];
      };
      deployments: {
        Row: {
          id: string;
          organisation_id: string;
          landing_page_project_id: string;
          environment: "preview" | "production";
          provider: "vercel" | "netlify" | "cloudflare_pages" | "replit" | "manual";
          url: string | null;
          status: "pending" | "succeeded" | "failed";
          triggered_by: string | null;
          created_at: string;
        };
        Insert: Partial<Database["public"]["Tables"]["deployments"]["Row"]> & {
          organisation_id: string;
          landing_page_project_id: string;
          environment: Database["public"]["Tables"]["deployments"]["Row"]["environment"];
        };
        Update: Partial<Database["public"]["Tables"]["deployments"]["Row"]>;
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
