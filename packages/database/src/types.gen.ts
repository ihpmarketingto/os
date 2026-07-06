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
