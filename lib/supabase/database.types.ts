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
      categories: {
        Row: {
          archived_at: string | null;
          archived_by: string | null;
          created_at: string;
          current_draft_version_id: string | null;
          current_published_version_id: string | null;
          draft_revision: number;
          id: string;
          updated_at: string;
        };
        Insert: {
          archived_at?: string | null;
          archived_by?: string | null;
          created_at?: string;
          current_draft_version_id?: string | null;
          current_published_version_id?: string | null;
          draft_revision?: number;
          id?: string;
          updated_at?: string;
        };
        Update: {
          archived_at?: string | null;
          archived_by?: string | null;
          created_at?: string;
          current_draft_version_id?: string | null;
          current_published_version_id?: string | null;
          draft_revision?: number;
          id?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "categories_draft_version_belongs_to_category";
            columns: ["id", "current_draft_version_id"];
            isOneToOne: false;
            referencedRelation: "category_versions";
            referencedColumns: ["category_id", "id"];
          },
          {
            foreignKeyName: "categories_published_version_belongs_to_category";
            columns: ["id", "current_published_version_id"];
            isOneToOne: false;
            referencedRelation: "category_versions";
            referencedColumns: ["category_id", "id"];
          },
        ];
      };
      category_slug_claims: {
        Row: {
          category_id: string;
          claimed_at: string;
          slug: string;
        };
        Insert: {
          category_id: string;
          claimed_at?: string;
          slug: string;
        };
        Update: {
          category_id?: string;
          claimed_at?: string;
          slug?: string;
        };
        Relationships: [
          {
            foreignKeyName: "category_slug_claims_category_id_fkey";
            columns: ["category_id"];
            isOneToOne: false;
            referencedRelation: "categories";
            referencedColumns: ["id"];
          },
        ];
      };
      category_versions: {
        Row: {
          category_id: string;
          created_at: string;
          created_by: string;
          description: string | null;
          display_order: number;
          field_schema: Json;
          id: string;
          name: string;
          parent_category_id: string | null;
          revision: number;
          seo_description: string | null;
          seo_title: string | null;
          slug: string;
        };
        Insert: {
          category_id: string;
          created_at?: string;
          created_by: string;
          description?: string | null;
          display_order?: number;
          field_schema?: Json;
          id?: string;
          name: string;
          parent_category_id?: string | null;
          revision: number;
          seo_description?: string | null;
          seo_title?: string | null;
          slug: string;
        };
        Update: {
          category_id?: string;
          created_at?: string;
          created_by?: string;
          description?: string | null;
          display_order?: number;
          field_schema?: Json;
          id?: string;
          name?: string;
          parent_category_id?: string | null;
          revision?: number;
          seo_description?: string | null;
          seo_title?: string | null;
          slug?: string;
        };
        Relationships: [
          {
            foreignKeyName: "category_versions_category_id_fkey";
            columns: ["category_id"];
            isOneToOne: false;
            referencedRelation: "categories";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "category_versions_parent_category_id_fkey";
            columns: ["parent_category_id"];
            isOneToOne: false;
            referencedRelation: "categories";
            referencedColumns: ["id"];
          },
        ];
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
      media_asset_references: {
        Row: {
          created_at: string;
          media_asset_id: string;
          reference_id: string;
          reference_type: string;
        };
        Insert: {
          created_at?: string;
          media_asset_id: string;
          reference_id: string;
          reference_type: string;
        };
        Update: {
          created_at?: string;
          media_asset_id?: string;
          reference_id?: string;
          reference_type?: string;
        };
        Relationships: [
          {
            foreignKeyName: "media_asset_references_media_asset_id_fkey";
            columns: ["media_asset_id"];
            isOneToOne: false;
            referencedRelation: "media_assets";
            referencedColumns: ["id"];
          },
        ];
      };
      media_assets: {
        Row: {
          alt_text: string;
          byte_size: number | null;
          checksum_sha256: string | null;
          created_at: string;
          created_by: string;
          failure_code: string | null;
          height: number | null;
          id: string;
          mime_type: string | null;
          object_path: string;
          original_extension: string;
          source_attribution: string | null;
          status: Database["public"]["Enums"]["media_asset_status"];
          updated_at: string;
          updated_by: string;
          verified_at: string | null;
          width: number | null;
        };
        Insert: {
          alt_text: string;
          byte_size?: number | null;
          checksum_sha256?: string | null;
          created_at?: string;
          created_by: string;
          failure_code?: string | null;
          height?: number | null;
          id: string;
          mime_type?: string | null;
          object_path: string;
          original_extension: string;
          source_attribution?: string | null;
          status?: Database["public"]["Enums"]["media_asset_status"];
          updated_at?: string;
          updated_by: string;
          verified_at?: string | null;
          width?: number | null;
        };
        Update: {
          alt_text?: string;
          byte_size?: number | null;
          checksum_sha256?: string | null;
          created_at?: string;
          created_by?: string;
          failure_code?: string | null;
          height?: number | null;
          id?: string;
          mime_type?: string | null;
          object_path?: string;
          original_extension?: string;
          source_attribution?: string | null;
          status?: Database["public"]["Enums"]["media_asset_status"];
          updated_at?: string;
          updated_by?: string;
          verified_at?: string | null;
          width?: number | null;
        };
        Relationships: [];
      };
      product_media: {
        Row: {
          display_order: number;
          media_asset_id: string;
          product_version_id: string;
        };
        Insert: {
          display_order: number;
          media_asset_id: string;
          product_version_id: string;
        };
        Update: {
          display_order?: number;
          media_asset_id?: string;
          product_version_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "product_media_media_asset_id_fkey";
            columns: ["media_asset_id"];
            isOneToOne: false;
            referencedRelation: "media_assets";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "product_media_product_version_id_fkey";
            columns: ["product_version_id"];
            isOneToOne: false;
            referencedRelation: "product_versions";
            referencedColumns: ["id"];
          },
        ];
      };
      product_option_groups: {
        Row: {
          display_order: number;
          group_key: string;
          id: string;
          name: string;
          product_version_id: string;
        };
        Insert: {
          display_order: number;
          group_key: string;
          id?: string;
          name: string;
          product_version_id: string;
        };
        Update: {
          display_order?: number;
          group_key?: string;
          id?: string;
          name?: string;
          product_version_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "product_option_groups_product_version_id_fkey";
            columns: ["product_version_id"];
            isOneToOne: false;
            referencedRelation: "product_versions";
            referencedColumns: ["id"];
          },
        ];
      };
      product_option_values: {
        Row: {
          display_order: number;
          id: string;
          label: string;
          option_group_id: string;
          product_version_id: string;
          value_key: string;
        };
        Insert: {
          display_order: number;
          id?: string;
          label: string;
          option_group_id: string;
          product_version_id: string;
          value_key: string;
        };
        Update: {
          display_order?: number;
          id?: string;
          label?: string;
          option_group_id?: string;
          product_version_id?: string;
          value_key?: string;
        };
        Relationships: [
          {
            foreignKeyName: "product_option_values_group_fk";
            columns: ["product_version_id", "option_group_id"];
            isOneToOne: false;
            referencedRelation: "product_option_groups";
            referencedColumns: ["product_version_id", "id"];
          },
        ];
      };
      product_related_products: {
        Row: {
          display_order: number;
          product_id: string;
          product_version_id: string;
          related_product_id: string;
        };
        Insert: {
          display_order: number;
          product_id: string;
          product_version_id: string;
          related_product_id: string;
        };
        Update: {
          display_order?: number;
          product_id?: string;
          product_version_id?: string;
          related_product_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "product_related_products_related_product_id_fkey";
            columns: ["related_product_id"];
            isOneToOne: false;
            referencedRelation: "products";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "product_related_products_version_fk";
            columns: ["product_id", "product_version_id"];
            isOneToOne: false;
            referencedRelation: "product_versions";
            referencedColumns: ["product_id", "id"];
          },
        ];
      };
      product_sku_claims: {
        Row: {
          claimed_at: string;
          normalized_sku: string;
          product_variant_id: string;
        };
        Insert: {
          claimed_at?: string;
          normalized_sku: string;
          product_variant_id: string;
        };
        Update: {
          claimed_at?: string;
          normalized_sku?: string;
          product_variant_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "product_sku_claims_product_variant_id_fkey";
            columns: ["product_variant_id"];
            isOneToOne: false;
            referencedRelation: "product_variants";
            referencedColumns: ["id"];
          },
        ];
      };
      product_slug_claims: {
        Row: {
          claimed_at: string;
          product_id: string;
          slug: string;
        };
        Insert: {
          claimed_at?: string;
          product_id: string;
          slug: string;
        };
        Update: {
          claimed_at?: string;
          product_id?: string;
          slug?: string;
        };
        Relationships: [
          {
            foreignKeyName: "product_slug_claims_product_id_fkey";
            columns: ["product_id"];
            isOneToOne: false;
            referencedRelation: "products";
            referencedColumns: ["id"];
          },
        ];
      };
      product_variant_option_values: {
        Row: {
          option_group_id: string;
          option_value_id: string;
          product_variant_version_id: string;
          product_version_id: string;
        };
        Insert: {
          option_group_id: string;
          option_value_id: string;
          product_variant_version_id: string;
          product_version_id: string;
        };
        Update: {
          option_group_id?: string;
          option_value_id?: string;
          product_variant_version_id?: string;
          product_version_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "product_variant_option_values_group_fk";
            columns: ["product_version_id", "option_group_id"];
            isOneToOne: false;
            referencedRelation: "product_option_groups";
            referencedColumns: ["product_version_id", "id"];
          },
          {
            foreignKeyName: "product_variant_option_values_value_fk";
            columns: ["option_group_id", "option_value_id"];
            isOneToOne: false;
            referencedRelation: "product_option_values";
            referencedColumns: ["option_group_id", "id"];
          },
          {
            foreignKeyName: "product_variant_option_values_variant_fk";
            columns: ["product_version_id", "product_variant_version_id"];
            isOneToOne: false;
            referencedRelation: "product_variant_versions";
            referencedColumns: ["product_version_id", "id"];
          },
        ];
      };
      product_variant_versions: {
        Row: {
          availability: Database["public"]["Enums"]["product_availability"];
          created_at: string;
          created_by: string;
          currency: string;
          id: string;
          option_signature: string;
          price_minor: number;
          product_id: string;
          product_variant_id: string;
          product_version_id: string;
          sku: string | null;
        };
        Insert: {
          availability: Database["public"]["Enums"]["product_availability"];
          created_at?: string;
          created_by: string;
          currency: string;
          id?: string;
          option_signature: string;
          price_minor: number;
          product_id: string;
          product_variant_id: string;
          product_version_id: string;
          sku?: string | null;
        };
        Update: {
          availability?: Database["public"]["Enums"]["product_availability"];
          created_at?: string;
          created_by?: string;
          currency?: string;
          id?: string;
          option_signature?: string;
          price_minor?: number;
          product_id?: string;
          product_variant_id?: string;
          product_version_id?: string;
          sku?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "product_variant_versions_product_variant_fk";
            columns: ["product_id", "product_variant_id"];
            isOneToOne: false;
            referencedRelation: "product_variants";
            referencedColumns: ["product_id", "id"];
          },
          {
            foreignKeyName: "product_variant_versions_product_version_fk";
            columns: ["product_id", "product_version_id"];
            isOneToOne: false;
            referencedRelation: "product_versions";
            referencedColumns: ["product_id", "id"];
          },
        ];
      };
      product_variants: {
        Row: {
          created_at: string;
          id: string;
          product_id: string;
        };
        Insert: {
          created_at?: string;
          id?: string;
          product_id: string;
        };
        Update: {
          created_at?: string;
          id?: string;
          product_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "product_variants_product_id_fkey";
            columns: ["product_id"];
            isOneToOne: false;
            referencedRelation: "products";
            referencedColumns: ["id"];
          },
        ];
      };
      product_versions: {
        Row: {
          base_currency: string;
          category_id: string;
          created_at: string;
          created_by: string;
          description: string;
          featured: boolean;
          id: string;
          is_new: boolean;
          name: string;
          product_id: string;
          revision: number;
          seo_description: string | null;
          seo_social_media_asset_id: string | null;
          seo_title: string | null;
          short_description: string;
          slug: string;
          specifications: Json;
          tags: string[];
        };
        Insert: {
          base_currency: string;
          category_id: string;
          created_at?: string;
          created_by: string;
          description: string;
          featured?: boolean;
          id?: string;
          is_new?: boolean;
          name: string;
          product_id: string;
          revision: number;
          seo_description?: string | null;
          seo_social_media_asset_id?: string | null;
          seo_title?: string | null;
          short_description: string;
          slug: string;
          specifications?: Json;
          tags?: string[];
        };
        Update: {
          base_currency?: string;
          category_id?: string;
          created_at?: string;
          created_by?: string;
          description?: string;
          featured?: boolean;
          id?: string;
          is_new?: boolean;
          name?: string;
          product_id?: string;
          revision?: number;
          seo_description?: string | null;
          seo_social_media_asset_id?: string | null;
          seo_title?: string | null;
          short_description?: string;
          slug?: string;
          specifications?: Json;
          tags?: string[];
        };
        Relationships: [
          {
            foreignKeyName: "product_versions_category_id_fkey";
            columns: ["category_id"];
            isOneToOne: false;
            referencedRelation: "categories";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "product_versions_product_id_fkey";
            columns: ["product_id"];
            isOneToOne: false;
            referencedRelation: "products";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "product_versions_seo_social_media_asset_id_fkey";
            columns: ["seo_social_media_asset_id"];
            isOneToOne: false;
            referencedRelation: "media_assets";
            referencedColumns: ["id"];
          },
        ];
      };
      products: {
        Row: {
          archived_at: string | null;
          archived_by: string | null;
          created_at: string;
          current_draft_version_id: string | null;
          current_published_version_id: string | null;
          draft_revision: number;
          id: string;
          updated_at: string;
        };
        Insert: {
          archived_at?: string | null;
          archived_by?: string | null;
          created_at?: string;
          current_draft_version_id?: string | null;
          current_published_version_id?: string | null;
          draft_revision?: number;
          id?: string;
          updated_at?: string;
        };
        Update: {
          archived_at?: string | null;
          archived_by?: string | null;
          created_at?: string;
          current_draft_version_id?: string | null;
          current_published_version_id?: string | null;
          draft_revision?: number;
          id?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "products_draft_version_belongs_to_product";
            columns: ["id", "current_draft_version_id"];
            isOneToOne: false;
            referencedRelation: "product_versions";
            referencedColumns: ["product_id", "id"];
          },
          {
            foreignKeyName: "products_published_version_belongs_to_product";
            columns: ["id", "current_published_version_id"];
            isOneToOne: false;
            referencedRelation: "product_versions";
            referencedColumns: ["product_id", "id"];
          },
        ];
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
      media_asset_health: {
        Row: {
          detected_from: string | null;
          issue_code: string | null;
          media_asset_id: string | null;
          object_path: string | null;
        };
        Relationships: [];
      };
    };
    Functions: {
      archive_category: {
        Args: {
          expected_revision: number;
          input_category_id: string;
          request_correlation_id: string;
        };
        Returns: Database["public"]["CompositeTypes"]["category_mutation_result"];
        SetofOptions: {
          from: "*";
          to: "category_mutation_result";
          isOneToOne: true;
          isSetofReturn: false;
        };
      };
      archive_product: {
        Args: {
          expected_revision: number;
          input_product_id: string;
          request_correlation_id: string;
        };
        Returns: Database["public"]["CompositeTypes"]["product_mutation_result"];
        SetofOptions: {
          from: "*";
          to: "product_mutation_result";
          isOneToOne: true;
          isSetofReturn: false;
        };
      };
      begin_media_upload: {
        Args: {
          input_alt_text: string;
          input_byte_size: number;
          input_declared_mime_type: string;
          input_extension: string;
          input_source_attribution: string;
          request_correlation_id: string;
        };
        Returns: Database["public"]["CompositeTypes"]["media_upload_result"];
        SetofOptions: {
          from: "*";
          to: "media_upload_result";
          isOneToOne: true;
          isSetofReturn: false;
        };
      };
      bind_admin_account: {
        Args: {
          candidate_user_id: string;
          expected_email: string;
          request_correlation_id: string;
        };
        Returns: string;
      };
      complete_media_deletion: {
        Args: { input_media_id: string; request_correlation_id: string };
        Returns: Database["public"]["CompositeTypes"]["media_mutation_result"];
        SetofOptions: {
          from: "*";
          to: "media_mutation_result";
          isOneToOne: true;
          isSetofReturn: false;
        };
      };
      create_category_draft: {
        Args: {
          input_description: string;
          input_display_order: number;
          input_field_schema: Json;
          input_name: string;
          input_parent_category_id: string;
          input_seo_description: string;
          input_seo_title: string;
          input_slug: string;
          request_correlation_id: string;
        };
        Returns: Database["public"]["CompositeTypes"]["category_mutation_result"];
        SetofOptions: {
          from: "*";
          to: "category_mutation_result";
          isOneToOne: true;
          isSetofReturn: false;
        };
      };
      create_product_draft: {
        Args: {
          input_base_currency: string;
          input_category_id: string;
          input_description: string;
          input_featured: boolean;
          input_is_new: boolean;
          input_media_asset_ids: string[];
          input_name: string;
          input_option_groups: Json;
          input_related_product_ids: string[];
          input_seo_description: string;
          input_seo_social_media_asset_id: string;
          input_seo_title: string;
          input_short_description: string;
          input_slug: string;
          input_specifications: Json;
          input_tags: string[];
          input_variants: Json;
          request_correlation_id: string;
        };
        Returns: Database["public"]["CompositeTypes"]["product_mutation_result"];
        SetofOptions: {
          from: "*";
          to: "product_mutation_result";
          isOneToOne: true;
          isSetofReturn: false;
        };
      };
      finalize_media_upload: {
        Args: {
          input_byte_size: number;
          input_checksum_sha256: string;
          input_height: number;
          input_media_id: string;
          input_mime_type: string;
          input_width: number;
          request_correlation_id: string;
        };
        Returns: Database["public"]["CompositeTypes"]["media_mutation_result"];
        SetofOptions: {
          from: "*";
          to: "media_mutation_result";
          isOneToOne: true;
          isSetofReturn: false;
        };
      };
      is_admin: { Args: never; Returns: boolean };
      reject_media_upload: {
        Args: {
          input_failure_code: string;
          input_media_id: string;
          request_correlation_id: string;
        };
        Returns: Database["public"]["CompositeTypes"]["media_mutation_result"];
        SetofOptions: {
          from: "*";
          to: "media_mutation_result";
          isOneToOne: true;
          isSetofReturn: false;
        };
      };
      request_media_deletion: {
        Args: { input_media_id: string; request_correlation_id: string };
        Returns: Database["public"]["CompositeTypes"]["media_mutation_result"];
        SetofOptions: {
          from: "*";
          to: "media_mutation_result";
          isOneToOne: true;
          isSetofReturn: false;
        };
      };
      restore_category: {
        Args: {
          expected_revision: number;
          input_category_id: string;
          request_correlation_id: string;
        };
        Returns: Database["public"]["CompositeTypes"]["category_mutation_result"];
        SetofOptions: {
          from: "*";
          to: "category_mutation_result";
          isOneToOne: true;
          isSetofReturn: false;
        };
      };
      restore_product: {
        Args: {
          expected_revision: number;
          input_product_id: string;
          request_correlation_id: string;
        };
        Returns: Database["public"]["CompositeTypes"]["product_mutation_result"];
        SetofOptions: {
          from: "*";
          to: "product_mutation_result";
          isOneToOne: true;
          isSetofReturn: false;
        };
      };
      update_category_draft: {
        Args: {
          expected_revision: number;
          input_category_id: string;
          input_description: string;
          input_display_order: number;
          input_field_schema: Json;
          input_name: string;
          input_parent_category_id: string;
          input_seo_description: string;
          input_seo_title: string;
          input_slug: string;
          request_correlation_id: string;
        };
        Returns: Database["public"]["CompositeTypes"]["category_mutation_result"];
        SetofOptions: {
          from: "*";
          to: "category_mutation_result";
          isOneToOne: true;
          isSetofReturn: false;
        };
      };
      update_media_metadata: {
        Args: {
          input_alt_text: string;
          input_media_id: string;
          input_source_attribution: string;
          request_correlation_id: string;
        };
        Returns: Database["public"]["CompositeTypes"]["media_mutation_result"];
        SetofOptions: {
          from: "*";
          to: "media_mutation_result";
          isOneToOne: true;
          isSetofReturn: false;
        };
      };
      update_product_draft: {
        Args: {
          expected_revision: number;
          input_base_currency: string;
          input_category_id: string;
          input_description: string;
          input_featured: boolean;
          input_is_new: boolean;
          input_media_asset_ids: string[];
          input_name: string;
          input_option_groups: Json;
          input_product_id: string;
          input_related_product_ids: string[];
          input_seo_description: string;
          input_seo_social_media_asset_id: string;
          input_seo_title: string;
          input_short_description: string;
          input_slug: string;
          input_specifications: Json;
          input_tags: string[];
          input_variants: Json;
          request_correlation_id: string;
        };
        Returns: Database["public"]["CompositeTypes"]["product_mutation_result"];
        SetofOptions: {
          from: "*";
          to: "product_mutation_result";
          isOneToOne: true;
          isSetofReturn: false;
        };
      };
    };
    Enums: {
      audit_actor_kind: "admin" | "system";
      audit_outcome: "success" | "denied" | "failure";
      job_status: "running" | "succeeded" | "failed" | "skipped";
      media_asset_status: "pending" | "ready" | "rejected" | "deleting";
      product_availability:
        "available" | "low_stock" | "coming_soon" | "unavailable";
      release_status:
        | "draft"
        | "validating"
        | "ready"
        | "publishing"
        | "published"
        | "failed";
    };
    CompositeTypes: {
      category_mutation_result: {
        category_id: string | null;
        revision: number | null;
      };
      media_mutation_result: {
        media_id: string | null;
        status: Database["public"]["Enums"]["media_asset_status"] | null;
      };
      media_upload_result: {
        media_id: string | null;
        object_path: string | null;
      };
      product_mutation_result: {
        product_id: string | null;
        revision: number | null;
      };
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
      media_asset_status: ["pending", "ready", "rejected", "deleting"],
      product_availability: [
        "available",
        "low_stock",
        "coming_soon",
        "unavailable",
      ],
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
