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
      campaign_briefs: {
        Row: {
          budget: number | null
          collaboration_types: string[]
          contact_email: string | null
          core_values: string[]
          created_at: string
          description: string
          id: string
          status: string
          target_audience: string | null
          timeline: string | null
          title: string
          user_id: string
        }
        Insert: {
          budget?: number | null
          collaboration_types?: string[]
          contact_email?: string | null
          core_values?: string[]
          created_at?: string
          description?: string
          id?: string
          status?: string
          target_audience?: string | null
          timeline?: string | null
          title: string
          user_id: string
        }
        Update: {
          budget?: number | null
          collaboration_types?: string[]
          contact_email?: string | null
          core_values?: string[]
          created_at?: string
          description?: string
          id?: string
          status?: string
          target_audience?: string | null
          timeline?: string | null
          title?: string
          user_id?: string
        }
        Relationships: []
      }
      community_profiles: {
        Row: {
          account_type: string
          avatar_url: string | null
          bio: string | null
          created_at: string
          display_name: string
          id: string
          location: string | null
          socials: Json
          tagline: string | null
          values: string[]
        }
        Insert: {
          account_type: string
          avatar_url?: string | null
          bio?: string | null
          created_at?: string
          display_name: string
          id?: string
          location?: string | null
          socials?: Json
          tagline?: string | null
          values?: string[]
        }
        Update: {
          account_type?: string
          avatar_url?: string | null
          bio?: string | null
          created_at?: string
          display_name?: string
          id?: string
          location?: string | null
          socials?: Json
          tagline?: string | null
          values?: string[]
        }
        Relationships: []
      }
      contact_messages: {
        Row: {
          created_at: string
          email: string
          handled: boolean
          id: string
          message: string
          name: string
        }
        Insert: {
          created_at?: string
          email: string
          handled?: boolean
          id?: string
          message: string
          name: string
        }
        Update: {
          created_at?: string
          email?: string
          handled?: boolean
          id?: string
          message?: string
          name?: string
        }
        Relationships: []
      }
      lead_briefs: {
        Row: {
          budget: number | null
          collaboration_types: string[]
          company: string | null
          contact_email: string
          contact_name: string | null
          core_values: string[]
          created_at: string
          description: string
          id: string
          status: string
          target_audience: string | null
          timeline: string | null
          title: string
        }
        Insert: {
          budget?: number | null
          collaboration_types?: string[]
          company?: string | null
          contact_email: string
          contact_name?: string | null
          core_values?: string[]
          created_at?: string
          description?: string
          id?: string
          status?: string
          target_audience?: string | null
          timeline?: string | null
          title: string
        }
        Update: {
          budget?: number | null
          collaboration_types?: string[]
          company?: string | null
          contact_email?: string
          contact_name?: string | null
          core_values?: string[]
          created_at?: string
          description?: string
          id?: string
          status?: string
          target_audience?: string | null
          timeline?: string | null
          title?: string
        }
        Relationships: []
      }
      mailing_list_subscribers: {
        Row: {
          created_at: string
          email: string
          id: string
          marketing_opt_in: boolean
          name: string | null
          source: string
        }
        Insert: {
          created_at?: string
          email: string
          id?: string
          marketing_opt_in?: boolean
          name?: string | null
          source?: string
        }
        Update: {
          created_at?: string
          email?: string
          id?: string
          marketing_opt_in?: boolean
          name?: string | null
          source?: string
        }
        Relationships: []
      }
      partner_pages: {
        Row: {
          audience_segments: string[]
          avg_engagement: number | null
          avg_reach: number | null
          created_at: string
          eoi_opportunities: string[]
          header_image_url: string | null
          headline: string
          host_bio: string | null
          id: string
          intro: string | null
          links: Json
          monthly_streams: number | null
          partnership_pitch: string | null
          profile_image_url: string | null
          published: boolean
          slug: string
          subtitle: string | null
          total_followers: number | null
          total_streams: number | null
          type: string
          updated_at: string
        }
        Insert: {
          audience_segments?: string[]
          avg_engagement?: number | null
          avg_reach?: number | null
          created_at?: string
          eoi_opportunities?: string[]
          header_image_url?: string | null
          headline: string
          host_bio?: string | null
          id?: string
          intro?: string | null
          links?: Json
          monthly_streams?: number | null
          partnership_pitch?: string | null
          profile_image_url?: string | null
          published?: boolean
          slug: string
          subtitle?: string | null
          total_followers?: number | null
          total_streams?: number | null
          type?: string
          updated_at?: string
        }
        Update: {
          audience_segments?: string[]
          avg_engagement?: number | null
          avg_reach?: number | null
          created_at?: string
          eoi_opportunities?: string[]
          header_image_url?: string | null
          headline?: string
          host_bio?: string | null
          id?: string
          intro?: string | null
          links?: Json
          monthly_streams?: number | null
          partnership_pitch?: string | null
          profile_image_url?: string | null
          published?: boolean
          slug?: string
          subtitle?: string | null
          total_followers?: number | null
          total_streams?: number | null
          type?: string
          updated_at?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          account_type: Database["public"]["Enums"]["account_type"] | null
          artist_name: string | null
          avatar_url: string | null
          avg_engagement: number | null
          avg_reach: number | null
          bio: string | null
          created_at: string
          display_name: string | null
          email: string | null
          id: string
          location: string | null
          marketing_opt_in: boolean
          monthly_streams: number | null
          notify_direct_messages: boolean
          notify_new_matches: boolean
          notify_newsletter: boolean
          slug: string | null
          socials: Json
          top_audience_location: string | null
          total_followers: number | null
          total_streams: number | null
          updated_at: string
          values: string[]
        }
        Insert: {
          account_type?: Database["public"]["Enums"]["account_type"] | null
          artist_name?: string | null
          avatar_url?: string | null
          avg_engagement?: number | null
          avg_reach?: number | null
          bio?: string | null
          created_at?: string
          display_name?: string | null
          email?: string | null
          id: string
          location?: string | null
          marketing_opt_in?: boolean
          monthly_streams?: number | null
          notify_direct_messages?: boolean
          notify_new_matches?: boolean
          notify_newsletter?: boolean
          slug?: string | null
          socials?: Json
          top_audience_location?: string | null
          total_followers?: number | null
          total_streams?: number | null
          updated_at?: string
          values?: string[]
        }
        Update: {
          account_type?: Database["public"]["Enums"]["account_type"] | null
          artist_name?: string | null
          avatar_url?: string | null
          avg_engagement?: number | null
          avg_reach?: number | null
          bio?: string | null
          created_at?: string
          display_name?: string | null
          email?: string | null
          id?: string
          location?: string | null
          marketing_opt_in?: boolean
          monthly_streams?: number | null
          notify_direct_messages?: boolean
          notify_new_matches?: boolean
          notify_newsletter?: boolean
          slug?: string | null
          socials?: Json
          top_audience_location?: string | null
          total_followers?: number | null
          total_streams?: number | null
          updated_at?: string
          values?: string[]
        }
        Relationships: []
      }
      roster_members: {
        Row: {
          created_at: string
          id: string
          member_id: string
          owner_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          member_id: string
          owner_id: string
        }
        Update: {
          created_at?: string
          id?: string
          member_id?: string
          owner_id?: string
        }
        Relationships: []
      }
      spotlight_interests: {
        Row: {
          created_at: string
          id: string
          note: string | null
          partner_page_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          note?: string | null
          partner_page_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          note?: string | null
          partner_page_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "spotlight_interests_partner_page_id_fkey"
            columns: ["partner_page_id"]
            isOneToOne: false
            referencedRelation: "partner_pages"
            referencedColumns: ["id"]
          },
        ]
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
      vibe_check_config: {
        Row: {
          config: Json
          id: string
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          config?: Json
          id?: string
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          config?: Json
          id?: string
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: []
      }
      vibe_check_responses: {
        Row: {
          answers: Json
          artist_score: number
          brand_score: number
          created_at: string
          id: string
          result: Database["public"]["Enums"]["account_type"] | null
          user_id: string
        }
        Insert: {
          answers?: Json
          artist_score?: number
          brand_score?: number
          created_at?: string
          id?: string
          result?: Database["public"]["Enums"]["account_type"] | null
          user_id: string
        }
        Update: {
          answers?: Json
          artist_score?: number
          brand_score?: number
          created_at?: string
          id?: string
          result?: Database["public"]["Enums"]["account_type"] | null
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      public_profiles: {
        Row: {
          account_type: Database["public"]["Enums"]["account_type"] | null
          avatar_url: string | null
          bio: string | null
          created_at: string | null
          display_name: string | null
          id: string | null
        }
        Insert: {
          account_type?: Database["public"]["Enums"]["account_type"] | null
          avatar_url?: string | null
          bio?: string | null
          created_at?: string | null
          display_name?: string | null
          id?: string | null
        }
        Update: {
          account_type?: Database["public"]["Enums"]["account_type"] | null
          avatar_url?: string | null
          bio?: string | null
          created_at?: string | null
          display_name?: string | null
          id?: string | null
        }
        Relationships: []
      }
    }
    Functions: {
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
    }
    Enums: {
      account_type: "artist" | "brand" | "fan"
      app_role: "admin" | "moderator" | "user"
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
      account_type: ["artist", "brand", "fan"],
      app_role: ["admin", "moderator", "user"],
    },
  },
} as const
