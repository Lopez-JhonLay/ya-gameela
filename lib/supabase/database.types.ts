export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export type Database = {
  public: {
    Tables: {
      admin_accounts: {
        Row: {
          auth_user_id: string | null;
          bound_at: string | null;
          created_at: string;
          email: string;
          id: string;
          singleton: boolean;
          updated_at: string;
        };
        Insert: {
          auth_user_id?: string | null;
          bound_at?: string | null;
          created_at?: string;
          email: string;
          id?: string;
          singleton?: boolean;
          updated_at?: string;
        };
        Update: {
          auth_user_id?: string | null;
          bound_at?: string | null;
          created_at?: string;
          email?: string;
          id?: string;
          singleton?: boolean;
          updated_at?: string;
        };
        Relationships: [];
      };
      admin_audit_events: {
        Row: {
          action: string;
          actor_kind: Database["public"]["Enums"]["audit_actor_kind"];
          actor_user_id: string | null;
          correlation_id: string;
          id: string;
          occurred_at: string;
          outcome: Database["public"]["Enums"]["audit_outcome"];
          reason_code: string | null;
          subject_id: string | null;
          subject_type: string | null;
        };
        Insert: {
          action: string;
          actor_kind: Database["public"]["Enums"]["audit_actor_kind"];
          actor_user_id?: string | null;
          correlation_id?: string;
          id?: string;
          occurred_at?: string;
          outcome: Database["public"]["Enums"]["audit_outcome"];
          reason_code?: string | null;
          subject_id?: string | null;
          subject_type?: string | null;
        };
        Update: {
          action?: string;
          actor_kind?: Database["public"]["Enums"]["audit_actor_kind"];
          actor_user_id?: string | null;
          correlation_id?: string;
          id?: string;
          occurred_at?: string;
          outcome?: Database["public"]["Enums"]["audit_outcome"];
          reason_code?: string | null;
          subject_id?: string | null;
          subject_type?: string | null;
        };
        Relationships: [];
      };
      job_runs: {
        Row: {
          attempt: number;
          claimed_count: number;
          correlation_id: string;
          failed_count: number;
          finished_at: string | null;
          id: string;
          job_name: string;
          outcome_code: string | null;
          started_at: string;
          status: Database["public"]["Enums"]["job_status"];
          succeeded_count: number;
          updated_at: string;
        };
        Insert: {
          attempt?: number;
          claimed_count?: number;
          correlation_id?: string;
          failed_count?: number;
          finished_at?: string | null;
          id?: string;
          job_name: string;
          outcome_code?: string | null;
          started_at?: string;
          status?: Database["public"]["Enums"]["job_status"];
          succeeded_count?: number;
          updated_at?: string;
        };
        Update: {
          attempt?: number;
          claimed_count?: number;
          correlation_id?: string;
          failed_count?: number;
          finished_at?: string | null;
          id?: string;
          job_name?: string;
          outcome_code?: string | null;
          started_at?: string;
          status?: Database["public"]["Enums"]["job_status"];
          succeeded_count?: number;
          updated_at?: string;
        };
        Relationships: [];
      };
      release_publications: {
        Row: {
          entity_id: string;
          entity_type: string;
          id: string;
          previous_version_id: string | null;
          published_version_id: string | null;
          recorded_at: string;
          release_id: string;
        };
        Insert: {
          entity_id: string;
          entity_type: string;
          id?: string;
          previous_version_id?: string | null;
          published_version_id?: string | null;
          recorded_at?: string;
          release_id: string;
        };
        Update: {
          entity_id?: string;
          entity_type?: string;
          id?: string;
          previous_version_id?: string | null;
          published_version_id?: string | null;
          recorded_at?: string;
          release_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "release_publications_release_id_fkey";
            columns: ["release_id"];
            isOneToOne: false;
            referencedRelation: "releases";
            referencedColumns: ["id"];
          },
        ];
      };
      releases: {
        Row: {
          created_at: string;
          created_by: string;
          failure_code: string | null;
          id: string;
          name: string;
          published_at: string | null;
          rollback_of_release_id: string | null;
          status: Database["public"]["Enums"]["release_status"];
          updated_at: string;
        };
        Insert: {
          created_at?: string;
          created_by: string;
          failure_code?: string | null;
          id?: string;
          name: string;
          published_at?: string | null;
          rollback_of_release_id?: string | null;
          status?: Database["public"]["Enums"]["release_status"];
          updated_at?: string;
        };
        Update: {
          created_at?: string;
          created_by?: string;
          failure_code?: string | null;
          id?: string;
          name?: string;
          published_at?: string | null;
          rollback_of_release_id?: string | null;
          status?: Database["public"]["Enums"]["release_status"];
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "releases_rollback_of_release_id_fkey";
            columns: ["rollback_of_release_id"];
            isOneToOne: false;
            referencedRelation: "releases";
            referencedColumns: ["id"];
          },
        ];
      };
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      bind_admin_account: {
        Args: {
          candidate_user_id: string;
          expected_email: string;
          request_correlation_id: string;
        };
        Returns: string;
      };
      is_admin: { Args: never; Returns: boolean };
    };
    Enums: {
      audit_actor_kind: "admin" | "system";
      audit_outcome: "success" | "denied" | "failure";
      job_status: "running" | "succeeded" | "failed" | "skipped";
      release_status:
        | "draft"
        | "validating"
        | "ready"
        | "publishing"
        | "published"
        | "failed";
    };
    CompositeTypes: {
      [_ in never]: never;
    };
  };
};

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">;

type DefaultSchema = DatabaseWithoutInternals[Extract<
  keyof Database,
  "public"
>];

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R;
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R;
      }
      ? R
      : never
    : never;

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    keyof DefaultSchema["Tables"] | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I;
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I;
      }
      ? I
      : never
    : never;

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    keyof DefaultSchema["Tables"] | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U;
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U;
      }
      ? U
      : never
    : never;

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    keyof DefaultSchema["Enums"] | { schema: keyof DatabaseWithoutInternals },
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never) = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never;

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never) = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never;

export const Constants = {
  public: {
    Enums: {
      audit_actor_kind: ["admin", "system"],
      audit_outcome: ["success", "denied", "failure"],
      job_status: ["running", "succeeded", "failed", "skipped"],
      release_status: [
        "draft",
        "validating",
        "ready",
        "publishing",
        "published",
        "failed",
      ],
    },
  },
} as const;
