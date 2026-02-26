export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  public: {
    Tables: {
      allergens: {
        Row: {
          id: string
          jurisdiction: string
          allergen_name: string
          allergen_group: string | null
          sub_allergens: string[]
          declaration_threshold: string | null
          regulation_reference: string | null
          created_at: string
        }
        Insert: {
          id?: string
          jurisdiction: string
          allergen_name: string
          allergen_group?: string | null
          sub_allergens?: string[]
          declaration_threshold?: string | null
          regulation_reference?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          jurisdiction?: string
          allergen_name?: string
          allergen_group?: string | null
          sub_allergens?: string[]
          declaration_threshold?: string | null
          regulation_reference?: string | null
          created_at?: string
        }
        Relationships: []
      }
      audit_log: {
        Row: {
          id: string
          product_id: string | null
          user_id: string | null
          action: string
          details: Json | null
          created_at: string
        }
        Insert: {
          id?: string
          product_id?: string | null
          user_id?: string | null
          action: string
          details?: Json | null
          created_at?: string
        }
        Update: {
          id?: string
          product_id?: string | null
          user_id?: string | null
          action?: string
          details?: Json | null
          created_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "audit_log_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      claims_rules: {
        Row: {
          id: string
          jurisdiction: string
          regulatory_body: string
          claim_text: string
          claim_type: string
          status: string
          product_categories: string[]
          conditions: Json | null
          regulation_reference: string | null
          source_id: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          jurisdiction: string
          regulatory_body: string
          claim_text: string
          claim_type: string
          status: string
          product_categories?: string[]
          conditions?: Json | null
          regulation_reference?: string | null
          source_id?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          jurisdiction?: string
          regulatory_body?: string
          claim_text?: string
          claim_type?: string
          status?: string
          product_categories?: string[]
          conditions?: Json | null
          regulation_reference?: string | null
          source_id?: string | null
          created_at?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "claims_rules_source_id_fkey"
            columns: ["source_id"]
            isOneToOne: false
            referencedRelation: "regulatory_sources"
            referencedColumns: ["id"]
          },
        ]
      }
      compliance_checks: {
        Row: {
          id: string
          product_id: string | null
          jurisdiction: string
          overall_status: string
          compliance_score: number | null
          readiness_score: number | null
          findings: Json
          statistics: Json | null
          report_pdf_url: string | null
          data_version: string | null
          checked_at: string
          checked_by: string | null
        }
        Insert: {
          id?: string
          product_id?: string | null
          jurisdiction: string
          overall_status: string
          compliance_score?: number | null
          readiness_score?: number | null
          findings: Json
          statistics?: Json | null
          report_pdf_url?: string | null
          data_version?: string | null
          checked_at?: string
          checked_by?: string | null
        }
        Update: {
          id?: string
          product_id?: string | null
          jurisdiction?: string
          overall_status?: string
          compliance_score?: number | null
          readiness_score?: number | null
          findings?: Json
          statistics?: Json | null
          report_pdf_url?: string | null
          data_version?: string | null
          checked_at?: string
          checked_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "compliance_checks_checked_by_fkey"
            columns: ["checked_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "compliance_checks_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      compliance_findings: {
        Row: {
          id: string
          check_id: string | null
          severity: string
          blocking: boolean
          category: string
          title: string
          description: string | null
          ingredient_name: string | null
          regulation_reference: string | null
          regulatory_body: string | null
          recommended_action: string | null
          evidence_required: string | null
          status: string
          resolved_at: string | null
          resolved_by: string | null
          created_at: string
        }
        Insert: {
          id?: string
          check_id?: string | null
          severity: string
          blocking?: boolean
          category: string
          title: string
          description?: string | null
          ingredient_name?: string | null
          regulation_reference?: string | null
          regulatory_body?: string | null
          recommended_action?: string | null
          evidence_required?: string | null
          status?: string
          resolved_at?: string | null
          resolved_by?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          check_id?: string | null
          severity?: string
          blocking?: boolean
          category?: string
          title?: string
          description?: string | null
          ingredient_name?: string | null
          regulation_reference?: string | null
          regulatory_body?: string | null
          recommended_action?: string | null
          evidence_required?: string | null
          status?: string
          resolved_at?: string | null
          resolved_by?: string | null
          created_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "compliance_findings_check_id_fkey"
            columns: ["check_id"]
            isOneToOne: false
            referencedRelation: "compliance_checks"
            referencedColumns: ["id"]
          },
        ]
      }
      import_requirements: {
        Row: {
          id: string
          jurisdiction: string
          product_category: string
          requirement: string
          requirement_type: string | null
          regulatory_body: string | null
          documents_required: string[]
          special_conditions: Json | null
          regulation_reference: string | null
          source_id: string | null
          created_at: string
        }
        Insert: {
          id?: string
          jurisdiction: string
          product_category: string
          requirement: string
          requirement_type?: string | null
          regulatory_body?: string | null
          documents_required?: string[]
          special_conditions?: Json | null
          regulation_reference?: string | null
          source_id?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          jurisdiction?: string
          product_category?: string
          requirement?: string
          requirement_type?: string | null
          regulatory_body?: string | null
          documents_required?: string[]
          special_conditions?: Json | null
          regulation_reference?: string | null
          source_id?: string | null
          created_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "import_requirements_source_id_fkey"
            columns: ["source_id"]
            isOneToOne: false
            referencedRelation: "regulatory_sources"
            referencedColumns: ["id"]
          },
        ]
      }
      ingredient_regulations: {
        Row: {
          id: string
          ingredient_id: string | null
          jurisdiction: string
          regulatory_body: string
          status: string
          product_categories: string[]
          product_subcategories: string[]
          max_concentration_pct: number | null
          max_daily_dose_mg: number | null
          conditions: Json
          required_warnings: string[]
          regulation_reference: string | null
          annex_reference: string | null
          effective_date: string | null
          source_id: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          ingredient_id?: string | null
          jurisdiction: string
          regulatory_body: string
          status: string
          product_categories?: string[]
          product_subcategories?: string[]
          max_concentration_pct?: number | null
          max_daily_dose_mg?: number | null
          conditions?: Json
          required_warnings?: string[]
          regulation_reference?: string | null
          annex_reference?: string | null
          effective_date?: string | null
          source_id?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          ingredient_id?: string | null
          jurisdiction?: string
          regulatory_body?: string
          status?: string
          product_categories?: string[]
          product_subcategories?: string[]
          max_concentration_pct?: number | null
          max_daily_dose_mg?: number | null
          conditions?: Json
          required_warnings?: string[]
          regulation_reference?: string | null
          annex_reference?: string | null
          effective_date?: string | null
          source_id?: string | null
          created_at?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "ingredient_regulations_ingredient_id_fkey"
            columns: ["ingredient_id"]
            isOneToOne: false
            referencedRelation: "ingredients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ingredient_regulations_source_id_fkey"
            columns: ["source_id"]
            isOneToOne: false
            referencedRelation: "regulatory_sources"
            referencedColumns: ["id"]
          },
        ]
      }
      ingredients: {
        Row: {
          id: string
          canonical_name: string
          inci_name: string | null
          cas_number: string | null
          synonyms: string[]
          common_names: string[]
          category: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          canonical_name: string
          inci_name?: string | null
          cas_number?: string | null
          synonyms?: string[]
          common_names?: string[]
          category?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          canonical_name?: string
          inci_name?: string | null
          cas_number?: string | null
          synonyms?: string[]
          common_names?: string[]
          category?: string | null
          created_at?: string
          updated_at?: string
        }
        Relationships: []
      }
      labelling_requirements: {
        Row: {
          id: string
          jurisdiction: string
          regulatory_body: string
          product_category: string
          element: string
          mandatory: boolean
          description: string | null
          format_rules: Json | null
          language_requirements: string[]
          exemptions: Json
          regulation_reference: string | null
          source_id: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          jurisdiction: string
          regulatory_body: string
          product_category: string
          element: string
          mandatory?: boolean
          description?: string | null
          format_rules?: Json | null
          language_requirements?: string[]
          exemptions?: Json
          regulation_reference?: string | null
          source_id?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          jurisdiction?: string
          regulatory_body?: string
          product_category?: string
          element?: string
          mandatory?: boolean
          description?: string | null
          format_rules?: Json | null
          language_requirements?: string[]
          exemptions?: Json
          regulation_reference?: string | null
          source_id?: string | null
          created_at?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "labelling_requirements_source_id_fkey"
            columns: ["source_id"]
            isOneToOne: false
            referencedRelation: "regulatory_sources"
            referencedColumns: ["id"]
          },
        ]
      }
      products: {
        Row: {
          id: string
          user_id: string | null
          team_id: string | null
          name: string
          category: string
          subcategory: string | null
          formulation: Json | null
          claims: string[]
          nutrition_info: Json | null
          label_info: Json | null
          artwork_urls: string[]
          target_markets: string[]
          status: string
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id?: string | null
          team_id?: string | null
          name: string
          category: string
          subcategory?: string | null
          formulation?: Json | null
          claims?: string[]
          nutrition_info?: Json | null
          label_info?: Json | null
          artwork_urls?: string[]
          target_markets?: string[]
          status?: string
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string | null
          team_id?: string | null
          name?: string
          category?: string
          subcategory?: string | null
          formulation?: Json | null
          claims?: string[]
          nutrition_info?: Json | null
          label_info?: Json | null
          artwork_urls?: string[]
          target_markets?: string[]
          status?: string
          created_at?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "products_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      regulatory_embeddings: {
        Row: {
          id: string
          source_id: string | null
          chunk_text: string
          chunk_index: number | null
          embedding: string | null
          metadata: Json | null
          created_at: string
        }
        Insert: {
          id?: string
          source_id?: string | null
          chunk_text: string
          chunk_index?: number | null
          embedding?: string | null
          metadata?: Json | null
          created_at?: string
        }
        Update: {
          id?: string
          source_id?: string | null
          chunk_text?: string
          chunk_index?: number | null
          embedding?: string | null
          metadata?: Json | null
          created_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "regulatory_embeddings_source_id_fkey"
            columns: ["source_id"]
            isOneToOne: false
            referencedRelation: "regulatory_sources"
            referencedColumns: ["id"]
          },
        ]
      }
      regulatory_source_changes: {
        Row: {
          id: string
          source_id: string | null
          old_content_hash: string | null
          new_content_hash: string | null
          change_summary: string | null
          detected_at: string
          processed: boolean
        }
        Insert: {
          id?: string
          source_id?: string | null
          old_content_hash?: string | null
          new_content_hash?: string | null
          change_summary?: string | null
          detected_at?: string
          processed?: boolean
        }
        Update: {
          id?: string
          source_id?: string | null
          old_content_hash?: string | null
          new_content_hash?: string | null
          change_summary?: string | null
          detected_at?: string
          processed?: boolean
        }
        Relationships: [
          {
            foreignKeyName: "regulatory_source_changes_source_id_fkey"
            columns: ["source_id"]
            isOneToOne: false
            referencedRelation: "regulatory_sources"
            referencedColumns: ["id"]
          },
        ]
      }
      regulatory_sources: {
        Row: {
          id: string
          url: string
          title: string | null
          domain: string
          regulatory_body: string
          jurisdiction: string
          content_type: string | null
          ingestion_tier: string
          browser_use_task: string | null
          content_text: string | null
          content_hash: string | null
          structured_data: Json | null
          pdf_page_count: number | null
          pdf_storage_path: string | null
          extraction_model: string | null
          extraction_confidence: number | null
          last_scraped_at: string | null
          last_changed_at: string | null
          scrape_status: string | null
          error_message: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          url: string
          title?: string | null
          domain: string
          regulatory_body: string
          jurisdiction?: string
          content_type?: string | null
          ingestion_tier?: string
          browser_use_task?: string | null
          content_text?: string | null
          content_hash?: string | null
          structured_data?: Json | null
          pdf_page_count?: number | null
          pdf_storage_path?: string | null
          extraction_model?: string | null
          extraction_confidence?: number | null
          last_scraped_at?: string | null
          last_changed_at?: string | null
          scrape_status?: string | null
          error_message?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          url?: string
          title?: string | null
          domain?: string
          regulatory_body?: string
          jurisdiction?: string
          content_type?: string | null
          ingestion_tier?: string
          browser_use_task?: string | null
          content_text?: string | null
          content_hash?: string | null
          structured_data?: Json | null
          pdf_page_count?: number | null
          pdf_storage_path?: string | null
          extraction_model?: string | null
          extraction_confidence?: number | null
          last_scraped_at?: string | null
          last_changed_at?: string | null
          scrape_status?: string | null
          error_message?: string | null
          created_at?: string
          updated_at?: string
        }
        Relationships: []
      }
      scrape_schedule: {
        Row: {
          id: string
          source_id: string | null
          frequency: string
          last_run_at: string | null
          next_run_at: string | null
          enabled: boolean
          created_at: string
        }
        Insert: {
          id?: string
          source_id?: string | null
          frequency: string
          last_run_at?: string | null
          next_run_at?: string | null
          enabled?: boolean
          created_at?: string
        }
        Update: {
          id?: string
          source_id?: string | null
          frequency?: string
          last_run_at?: string | null
          next_run_at?: string | null
          enabled?: boolean
          created_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "scrape_schedule_source_id_fkey"
            columns: ["source_id"]
            isOneToOne: false
            referencedRelation: "regulatory_sources"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      find_ingredient_by_synonym: {
        Args: {
          search_term: string
        }
        Returns: {
          id: string
          canonical_name: string
          inci_name: string
          cas_number: string
          synonyms: string[]
          common_names: string[]
          category: string
        }[]
      }
      fuzzy_match_ingredient: {
        Args: {
          search_term: string
          similarity_threshold?: number
          result_limit?: number
        }
        Returns: {
          id: string
          canonical_name: string
          inci_name: string
          cas_number: string
          synonyms: string[]
          common_names: string[]
          category: string
          similarity: number
        }[]
      }
      search_ingredients: {
        Args: {
          search_term: string
          result_limit?: number
        }
        Returns: {
          id: string
          canonical_name: string
          inci_name: string
          cas_number: string
          category: string
          synonyms: string[]
          common_names: string[]
          relevance: number
        }[]
      }
      search_regulatory_content: {
        Args: {
          query_text: string
          jurisdiction_filter?: string
          result_limit?: number
        }
        Returns: {
          chunk_text: string
          source_url: string
          regulatory_body: string
          similarity: number
        }[]
      }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

export type Tables<
  PublicTableNameOrOptions extends
    | keyof (Database["public"]["Tables"] & Database["public"]["Views"])
    | { schema: keyof Database },
  TableName extends PublicTableNameOrOptions extends { schema: keyof Database }
    ? keyof (Database[PublicTableNameOrOptions["schema"]]["Tables"] &
        Database[PublicTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = PublicTableNameOrOptions extends { schema: keyof Database }
  ? (Database[PublicTableNameOrOptions["schema"]]["Tables"] &
      Database[PublicTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : PublicTableNameOrOptions extends keyof (Database["public"]["Tables"] &
        Database["public"]["Views"])
    ? (Database["public"]["Tables"] &
        Database["public"]["Views"])[PublicTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  PublicTableNameOrOptions extends
    | keyof Database["public"]["Tables"]
    | { schema: keyof Database },
  TableName extends PublicTableNameOrOptions extends { schema: keyof Database }
    ? keyof Database[PublicTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = PublicTableNameOrOptions extends { schema: keyof Database }
  ? Database[PublicTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : PublicTableNameOrOptions extends keyof Database["public"]["Tables"]
    ? Database["public"]["Tables"][PublicTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  PublicTableNameOrOptions extends
    | keyof Database["public"]["Tables"]
    | { schema: keyof Database },
  TableName extends PublicTableNameOrOptions extends { schema: keyof Database }
    ? keyof Database[PublicTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = PublicTableNameOrOptions extends { schema: keyof Database }
  ? Database[PublicTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : PublicTableNameOrOptions extends keyof Database["public"]["Tables"]
    ? Database["public"]["Tables"][PublicTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  PublicEnumNameOrOptions extends
    | keyof Database["public"]["Enums"]
    | { schema: keyof Database },
  EnumName extends PublicEnumNameOrOptions extends { schema: keyof Database }
    ? keyof Database[PublicEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = PublicEnumNameOrOptions extends { schema: keyof Database }
  ? Database[PublicEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : PublicEnumNameOrOptions extends keyof Database["public"]["Enums"]
    ? Database["public"]["Enums"][PublicEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof Database["public"]["CompositeTypes"]
    | { schema: keyof Database },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof Database[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends { schema: keyof Database }
  ? Database[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof Database["public"]["CompositeTypes"]
    ? Database["public"]["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never
