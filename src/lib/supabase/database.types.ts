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
      audit_events: {
        Row: {
          created_at: string
          event_type: string
          id: string
          metadata: Json
          user_id: string | null
        }
        Insert: {
          created_at?: string
          event_type: string
          id?: string
          metadata?: Json
          user_id?: string | null
        }
        Update: {
          created_at?: string
          event_type?: string
          id?: string
          metadata?: Json
          user_id?: string | null
        }
        Relationships: []
      }
      autonomy_runs: {
        Row: {
          created_at: string
          finished_at: string | null
          id: string
          started_at: string | null
          status: string
          steps: number
          task_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          finished_at?: string | null
          id?: string
          started_at?: string | null
          status: string
          steps?: number
          task_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          finished_at?: string | null
          id?: string
          started_at?: string | null
          status?: string
          steps?: number
          task_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "autonomy_runs_task_id_fkey"
            columns: ["task_id"]
            isOneToOne: false
            referencedRelation: "autonomy_tasks"
            referencedColumns: ["id"]
          },
        ]
      }
      autonomy_tasks: {
        Row: {
          created_at: string
          enabled: boolean
          id: string
          max_steps: number
          purpose: string
          token_budget: number
          user_id: string
        }
        Insert: {
          created_at?: string
          enabled?: boolean
          id?: string
          max_steps?: number
          purpose: string
          token_budget?: number
          user_id: string
        }
        Update: {
          created_at?: string
          enabled?: boolean
          id?: string
          max_steps?: number
          purpose?: string
          token_budget?: number
          user_id?: string
        }
        Relationships: []
      }
      conversations: {
        Row: {
          archived_at: string | null
          created_at: string
          id: string
          title: string
          updated_at: string
          user_id: string
        }
        Insert: {
          archived_at?: string | null
          created_at?: string
          id?: string
          title?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          archived_at?: string | null
          created_at?: string
          id?: string
          title?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      generated_assets: {
        Row: {
          asset_type: string
          conversation_id: string | null
          created_at: string
          id: string
          metadata: Json
          storage_path: string
          user_id: string
        }
        Insert: {
          asset_type: string
          conversation_id?: string | null
          created_at?: string
          id?: string
          metadata?: Json
          storage_path: string
          user_id: string
        }
        Update: {
          asset_type?: string
          conversation_id?: string | null
          created_at?: string
          id?: string
          metadata?: Json
          storage_path?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "generated_assets_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "conversations"
            referencedColumns: ["id"]
          },
        ]
      }
      gunmar_identity: {
        Row: {
          created_at: string
          current_model_version: string | null
          id: string
          identity_version: number
          name: string
        }
        Insert: {
          created_at?: string
          current_model_version?: string | null
          id?: string
          identity_version?: number
          name?: string
        }
        Update: {
          created_at?: string
          current_model_version?: string | null
          id?: string
          identity_version?: number
          name?: string
        }
        Relationships: []
      }
      interests: {
        Row: {
          id: string
          name: string
          strength: number
          user_id: string
        }
        Insert: {
          id?: string
          name: string
          strength?: number
          user_id: string
        }
        Update: {
          id?: string
          name?: string
          strength?: number
          user_id?: string
        }
        Relationships: []
      }
      journal_entries: {
        Row: {
          created_at: string
          id: string
          learned: string | null
          summary: string
          uncertainty: string | null
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          learned?: string | null
          summary: string
          uncertainty?: string | null
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          learned?: string | null
          summary?: string
          uncertainty?: string | null
          user_id?: string
        }
        Relationships: []
      }
      learned_facts: {
        Row: {
          confidence: number
          created_at: string
          fact: string
          id: string
          superseded_at: string | null
          user_id: string
        }
        Insert: {
          confidence?: number
          created_at?: string
          fact: string
          id?: string
          superseded_at?: string | null
          user_id: string
        }
        Update: {
          confidence?: number
          created_at?: string
          fact?: string
          id?: string
          superseded_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      memories: {
        Row: {
          access_count: number
          confidence: number
          content: string
          created_at: string
          embedding: string | null
          id: string
          importance: number
          last_accessed_at: string | null
          memory_type: string
          source_message_id: string | null
          superseded_at: string | null
          superseded_by: string | null
          user_id: string
        }
        Insert: {
          access_count?: number
          confidence?: number
          content: string
          created_at?: string
          embedding?: string | null
          id?: string
          importance?: number
          last_accessed_at?: string | null
          memory_type: string
          source_message_id?: string | null
          superseded_at?: string | null
          superseded_by?: string | null
          user_id: string
        }
        Update: {
          access_count?: number
          confidence?: number
          content?: string
          created_at?: string
          embedding?: string | null
          id?: string
          importance?: number
          last_accessed_at?: string | null
          memory_type?: string
          source_message_id?: string | null
          superseded_at?: string | null
          superseded_by?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "memories_superseded_by_fkey"
            columns: ["superseded_by"]
            isOneToOne: false
            referencedRelation: "memories"
            referencedColumns: ["id"]
          },
        ]
      }
      messages: {
        Row: {
          content: string
          conversation_id: string
          created_at: string
          id: string
          role: string
          user_id: string
        }
        Insert: {
          content: string
          conversation_id: string
          created_at?: string
          id?: string
          role: string
          user_id: string
        }
        Update: {
          content?: string
          conversation_id?: string
          created_at?: string
          id?: string
          role?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "messages_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "conversations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "messages_conversation_id_user_id_fkey"
            columns: ["conversation_id", "user_id"]
            isOneToOne: false
            referencedRelation: "conversations"
            referencedColumns: ["id", "user_id"]
          },
        ]
      }
      model_evaluations: {
        Row: {
          created_at: string
          id: string
          model_version_id: string
          notes: string | null
          score: number
          user_id: string | null
        }
        Insert: {
          created_at?: string
          id?: string
          model_version_id: string
          notes?: string | null
          score: number
          user_id?: string | null
        }
        Update: {
          created_at?: string
          id?: string
          model_version_id?: string
          notes?: string | null
          score?: number
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "model_evaluations_model_version_id_fkey"
            columns: ["model_version_id"]
            isOneToOne: false
            referencedRelation: "model_versions"
            referencedColumns: ["id"]
          },
        ]
      }
      model_versions: {
        Row: {
          created_at: string
          id: string
          model_name: string
          provider: string
          status: string
          version: string
        }
        Insert: {
          created_at?: string
          id?: string
          model_name: string
          provider: string
          status: string
          version: string
        }
        Update: {
          created_at?: string
          id?: string
          model_name?: string
          provider?: string
          status?: string
          version?: string
        }
        Relationships: []
      }
      personality_history: {
        Row: {
          created_at: string
          id: string
          new_value: number
          previous_value: number | null
          reason: string
          trait: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          new_value: number
          previous_value?: number | null
          reason: string
          trait: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          new_value?: number
          previous_value?: number | null
          reason?: string
          trait?: string
          user_id?: string
        }
        Relationships: []
      }
      personality_traits: {
        Row: {
          trait: string
          updated_at: string
          user_id: string
          value: number
        }
        Insert: {
          trait: string
          updated_at?: string
          user_id: string
          value: number
        }
        Update: {
          trait?: string
          updated_at?: string
          user_id?: string
          value?: number
        }
        Relationships: []
      }
      profiles: {
        Row: {
          created_at: string
          display_name: string | null
          id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          display_name?: string | null
          id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          display_name?: string | null
          id?: string
          updated_at?: string
        }
        Relationships: []
      }
      provider_usage: {
        Row: {
          cost: number
          created_at: string
          id: string
          operation: string
          provider: string
          units: number
          user_id: string | null
        }
        Insert: {
          cost?: number
          created_at?: string
          id?: string
          operation: string
          provider: string
          units?: number
          user_id?: string | null
        }
        Update: {
          cost?: number
          created_at?: string
          id?: string
          operation?: string
          provider?: string
          units?: number
          user_id?: string | null
        }
        Relationships: []
      }
      relationship_events: {
        Row: {
          created_at: string
          event_type: string
          id: string
          summary: string
          user_id: string
        }
        Insert: {
          created_at?: string
          event_type: string
          id?: string
          summary: string
          user_id: string
        }
        Update: {
          created_at?: string
          event_type?: string
          id?: string
          summary?: string
          user_id?: string
        }
        Relationships: []
      }
      relationships: {
        Row: {
          created_at: string
          familiarity: number
          interaction_count: number
          last_interaction_at: string | null
          trust: number
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          familiarity?: number
          interaction_count?: number
          last_interaction_at?: string | null
          trust?: number
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          familiarity?: number
          interaction_count?: number
          last_interaction_at?: string | null
          trust?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      skills: {
        Row: {
          id: string
          name: string
          proficiency: number
          user_id: string
        }
        Insert: {
          id?: string
          name: string
          proficiency?: number
          user_id: string
        }
        Update: {
          id?: string
          name?: string
          proficiency?: number
          user_id?: string
        }
        Relationships: []
      }
      tool_definitions: {
        Row: {
          created_at: string
          description: string
          enabled: boolean
          name: string
          risk_level: string
        }
        Insert: {
          created_at?: string
          description: string
          enabled?: boolean
          name: string
          risk_level: string
        }
        Update: {
          created_at?: string
          description?: string
          enabled?: boolean
          name?: string
          risk_level?: string
        }
        Relationships: []
      }
      tool_executions: {
        Row: {
          created_at: string
          id: string
          input: Json
          output: Json | null
          status: string
          tool_name: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          input?: Json
          output?: Json | null
          status: string
          tool_name: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          input?: Json
          output?: Json | null
          status?: string
          tool_name?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "tool_executions_tool_name_fkey"
            columns: ["tool_name"]
            isOneToOne: false
            referencedRelation: "tool_definitions"
            referencedColumns: ["name"]
          },
        ]
      }
      training_datasets: {
        Row: {
          created_at: string
          id: string
          name: string
          status: string
          user_id: string
          version: number
        }
        Insert: {
          created_at?: string
          id?: string
          name: string
          status: string
          user_id: string
          version?: number
        }
        Update: {
          created_at?: string
          id?: string
          name?: string
          status?: string
          user_id?: string
          version?: number
        }
        Relationships: []
      }
      training_examples: {
        Row: {
          approved: boolean
          created_at: string
          id: string
          input: string
          output: string
          user_id: string
        }
        Insert: {
          approved?: boolean
          created_at?: string
          id?: string
          input: string
          output: string
          user_id: string
        }
        Update: {
          approved?: boolean
          created_at?: string
          id?: string
          input?: string
          output?: string
          user_id?: string
        }
        Relationships: []
      }
      voice_sessions: {
        Row: {
          conversation_id: string | null
          created_at: string
          id: string
          provider: string
          status: string
          user_id: string
        }
        Insert: {
          conversation_id?: string | null
          created_at?: string
          id?: string
          provider: string
          status: string
          user_id: string
        }
        Update: {
          conversation_id?: string | null
          created_at?: string
          id?: string
          provider?: string
          status?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "voice_sessions_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "conversations"
            referencedColumns: ["id"]
          },
        ]
      }
      web_research_sessions: {
        Row: {
          created_at: string
          id: string
          query: string
          sources: Json
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          query: string
          sources?: Json
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          query?: string
          sources?: Json
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      [_ in never]: never
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
} as const
