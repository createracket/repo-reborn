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
      brief_form_config: {
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
      brief_interests: {
        Row: {
          brief_id: string
          brief_source: string
          created_at: string
          id: string
          user_id: string
        }
        Insert: {
          brief_id: string
          brief_source: string
          created_at?: string
          id?: string
          user_id: string
        }
        Update: {
          brief_id?: string
          brief_source?: string
          created_at?: string
          id?: string
          user_id?: string
        }
        Relationships: []
      }
      campaign_brief_shares: {
        Row: {
          brief_id: string
          brief_source: string
          created_at: string
          created_by: string | null
          id: string
          target_email: string | null
          target_user_id: string | null
        }
        Insert: {
          brief_id: string
          brief_source: string
          created_at?: string
          created_by?: string | null
          id?: string
          target_email?: string | null
          target_user_id?: string | null
        }
        Update: {
          brief_id?: string
          brief_source?: string
          created_at?: string
          created_by?: string | null
          id?: string
          target_email?: string | null
          target_user_id?: string | null
        }
        Relationships: []
      }
      campaign_briefs: {
        Row: {
          artist_archetypes: string[]
          brand_archetypes: string[]
          budget: number | null
          collaboration_types: string[]
          contact_email: string | null
          core_values: string[]
          created_at: string
          currency: string | null
          description: string
          display_order: number
          id: string
          linked_report_id: string | null
          linked_roster_id: string | null
          published: boolean
          published_at: string | null
          status: string
          target_audience: string | null
          timeline: string | null
          title: string
          transparency: string | null
          user_id: string
        }
        Insert: {
          artist_archetypes?: string[]
          brand_archetypes?: string[]
          budget?: number | null
          collaboration_types?: string[]
          contact_email?: string | null
          core_values?: string[]
          created_at?: string
          currency?: string | null
          description?: string
          display_order?: number
          id?: string
          linked_report_id?: string | null
          linked_roster_id?: string | null
          published?: boolean
          published_at?: string | null
          status?: string
          target_audience?: string | null
          timeline?: string | null
          title: string
          transparency?: string | null
          user_id: string
        }
        Update: {
          artist_archetypes?: string[]
          brand_archetypes?: string[]
          budget?: number | null
          collaboration_types?: string[]
          contact_email?: string | null
          core_values?: string[]
          created_at?: string
          currency?: string | null
          description?: string
          display_order?: number
          id?: string
          linked_report_id?: string | null
          linked_roster_id?: string | null
          published?: boolean
          published_at?: string | null
          status?: string
          target_audience?: string | null
          timeline?: string | null
          title?: string
          transparency?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "campaign_briefs_linked_report_id_fkey"
            columns: ["linked_report_id"]
            isOneToOne: false
            referencedRelation: "campaign_reports"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "campaign_briefs_linked_report_id_fkey"
            columns: ["linked_report_id"]
            isOneToOne: false
            referencedRelation: "public_campaign_reports"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "campaign_briefs_linked_roster_id_fkey"
            columns: ["linked_roster_id"]
            isOneToOne: false
            referencedRelation: "public_rosters"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "campaign_briefs_linked_roster_id_fkey"
            columns: ["linked_roster_id"]
            isOneToOne: false
            referencedRelation: "rosters"
            referencedColumns: ["id"]
          },
        ]
      }
      campaign_report_access_leads: {
        Row: {
          created_at: string
          email: string
          id: string
          report_id: string
        }
        Insert: {
          created_at?: string
          email: string
          id?: string
          report_id: string
        }
        Update: {
          created_at?: string
          email?: string
          id?: string
          report_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "campaign_report_access_leads_report_id_fkey"
            columns: ["report_id"]
            isOneToOne: false
            referencedRelation: "campaign_reports"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "campaign_report_access_leads_report_id_fkey"
            columns: ["report_id"]
            isOneToOne: false
            referencedRelation: "public_campaign_reports"
            referencedColumns: ["id"]
          },
        ]
      }
      campaign_report_creators: {
        Row: {
          avatar_url: string | null
          category: string | null
          created_at: string
          handle: string | null
          id: string
          location: string | null
          name: string
          position: number
          report_id: string
          updated_at: string
        }
        Insert: {
          avatar_url?: string | null
          category?: string | null
          created_at?: string
          handle?: string | null
          id?: string
          location?: string | null
          name?: string
          position?: number
          report_id: string
          updated_at?: string
        }
        Update: {
          avatar_url?: string | null
          category?: string | null
          created_at?: string
          handle?: string | null
          id?: string
          location?: string | null
          name?: string
          position?: number
          report_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "campaign_report_creators_report_id_fkey"
            columns: ["report_id"]
            isOneToOne: false
            referencedRelation: "campaign_reports"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "campaign_report_creators_report_id_fkey"
            columns: ["report_id"]
            isOneToOne: false
            referencedRelation: "public_campaign_reports"
            referencedColumns: ["id"]
          },
        ]
      }
      campaign_report_posts: {
        Row: {
          brand_tag: string | null
          caption: string | null
          comments: number | null
          created_at: string
          creator_id: string
          engagement_rate_pct: number | null
          featured_comments: Json
          followers: number | null
          hashtags: string[]
          id: string
          interaction_pct: number | null
          likes: number | null
          metrics_updated_at: string | null
          platform: string
          position: number
          post_url: string | null
          posted_at: string | null
          reach_pct: number | null
          saves: number | null
          sentiment_score: number | null
          shares: number | null
          thumbnail_url: string | null
          updated_at: string
          views: number | null
          watch_time_hours: number | null
        }
        Insert: {
          brand_tag?: string | null
          caption?: string | null
          comments?: number | null
          created_at?: string
          creator_id: string
          engagement_rate_pct?: number | null
          featured_comments?: Json
          followers?: number | null
          hashtags?: string[]
          id?: string
          interaction_pct?: number | null
          likes?: number | null
          metrics_updated_at?: string | null
          platform?: string
          position?: number
          post_url?: string | null
          posted_at?: string | null
          reach_pct?: number | null
          saves?: number | null
          sentiment_score?: number | null
          shares?: number | null
          thumbnail_url?: string | null
          updated_at?: string
          views?: number | null
          watch_time_hours?: number | null
        }
        Update: {
          brand_tag?: string | null
          caption?: string | null
          comments?: number | null
          created_at?: string
          creator_id?: string
          engagement_rate_pct?: number | null
          featured_comments?: Json
          followers?: number | null
          hashtags?: string[]
          id?: string
          interaction_pct?: number | null
          likes?: number | null
          metrics_updated_at?: string | null
          platform?: string
          position?: number
          post_url?: string | null
          posted_at?: string | null
          reach_pct?: number | null
          saves?: number | null
          sentiment_score?: number | null
          shares?: number | null
          thumbnail_url?: string | null
          updated_at?: string
          views?: number | null
          watch_time_hours?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "campaign_report_posts_creator_id_fkey"
            columns: ["creator_id"]
            isOneToOne: false
            referencedRelation: "campaign_report_creators"
            referencedColumns: ["id"]
          },
        ]
      }
      campaign_reports: {
        Row: {
          access_code: string | null
          access_code_label: string | null
          brand_email: string | null
          categories: string[]
          client_email: string | null
          created_at: string
          description: string | null
          header_image_url: string | null
          hide_categories: boolean
          id: string
          owner_id: string
          profile_image_url: string | null
          published: boolean
          published_at: string | null
          slug: string
          source_roster_id: string | null
          template: string
          title: string
          updated_at: string
        }
        Insert: {
          access_code?: string | null
          access_code_label?: string | null
          brand_email?: string | null
          categories?: string[]
          client_email?: string | null
          created_at?: string
          description?: string | null
          header_image_url?: string | null
          hide_categories?: boolean
          id?: string
          owner_id: string
          profile_image_url?: string | null
          published?: boolean
          published_at?: string | null
          slug: string
          source_roster_id?: string | null
          template?: string
          title?: string
          updated_at?: string
        }
        Update: {
          access_code?: string | null
          access_code_label?: string | null
          brand_email?: string | null
          categories?: string[]
          client_email?: string | null
          created_at?: string
          description?: string | null
          header_image_url?: string | null
          hide_categories?: boolean
          id?: string
          owner_id?: string
          profile_image_url?: string | null
          published?: boolean
          published_at?: string | null
          slug?: string
          source_roster_id?: string | null
          template?: string
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "campaign_reports_source_roster_id_fkey"
            columns: ["source_roster_id"]
            isOneToOne: false
            referencedRelation: "public_rosters"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "campaign_reports_source_roster_id_fkey"
            columns: ["source_roster_id"]
            isOneToOne: false
            referencedRelation: "rosters"
            referencedColumns: ["id"]
          },
        ]
      }
      community_profiles: {
        Row: {
          account_type: string
          avatar_url: string | null
          bio: string | null
          created_at: string
          display_name: string
          id: string
          is_published: boolean
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
          is_published?: boolean
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
          is_published?: boolean
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
      email_custom_templates: {
        Row: {
          body_markdown: string
          created_at: string
          created_by: string | null
          display_name: string
          id: string
          name: string
          sample_data: Json
          subject: string
          updated_at: string
          variables: string[]
        }
        Insert: {
          body_markdown?: string
          created_at?: string
          created_by?: string | null
          display_name: string
          id?: string
          name: string
          sample_data?: Json
          subject: string
          updated_at?: string
          variables?: string[]
        }
        Update: {
          body_markdown?: string
          created_at?: string
          created_by?: string | null
          display_name?: string
          id?: string
          name?: string
          sample_data?: Json
          subject?: string
          updated_at?: string
          variables?: string[]
        }
        Relationships: []
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
      example_opportunities: {
        Row: {
          created_at: string
          description: string | null
          id: string
          image_url: string | null
          location: string | null
          position: number
          title: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          image_url?: string | null
          location?: string | null
          position?: number
          title: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          image_url?: string | null
          location?: string | null
          position?: number
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      faqs: {
        Row: {
          answer: string
          created_at: string
          id: string
          position: number
          published: boolean
          question: string
          updated_at: string
        }
        Insert: {
          answer: string
          created_at?: string
          id?: string
          position?: number
          published?: boolean
          question: string
          updated_at?: string
        }
        Update: {
          answer?: string
          created_at?: string
          id?: string
          position?: number
          published?: boolean
          question?: string
          updated_at?: string
        }
        Relationships: []
      }
      lead_briefs: {
        Row: {
          additional_info: string | null
          budget: number | null
          collaboration_types: string[]
          company: string | null
          contact_email: string
          contact_name: string | null
          core_values: string[]
          created_at: string
          currency: string | null
          description: string
          display_order: number
          id: string
          linked_report_id: string | null
          linked_roster_id: string | null
          status: string
          target_audience: string | null
          timeline: string | null
          title: string
          transparency: string | null
        }
        Insert: {
          additional_info?: string | null
          budget?: number | null
          collaboration_types?: string[]
          company?: string | null
          contact_email: string
          contact_name?: string | null
          core_values?: string[]
          created_at?: string
          currency?: string | null
          description?: string
          display_order?: number
          id?: string
          linked_report_id?: string | null
          linked_roster_id?: string | null
          status?: string
          target_audience?: string | null
          timeline?: string | null
          title: string
          transparency?: string | null
        }
        Update: {
          additional_info?: string | null
          budget?: number | null
          collaboration_types?: string[]
          company?: string | null
          contact_email?: string
          contact_name?: string | null
          core_values?: string[]
          created_at?: string
          currency?: string | null
          description?: string
          display_order?: number
          id?: string
          linked_report_id?: string | null
          linked_roster_id?: string | null
          status?: string
          target_audience?: string | null
          timeline?: string | null
          title?: string
          transparency?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "lead_briefs_linked_report_id_fkey"
            columns: ["linked_report_id"]
            isOneToOne: false
            referencedRelation: "campaign_reports"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lead_briefs_linked_report_id_fkey"
            columns: ["linked_report_id"]
            isOneToOne: false
            referencedRelation: "public_campaign_reports"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lead_briefs_linked_roster_id_fkey"
            columns: ["linked_roster_id"]
            isOneToOne: false
            referencedRelation: "public_rosters"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lead_briefs_linked_roster_id_fkey"
            columns: ["linked_roster_id"]
            isOneToOne: false
            referencedRelation: "rosters"
            referencedColumns: ["id"]
          },
        ]
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
      page_views: {
        Row: {
          bot_reason: string | null
          country: string | null
          created_at: string
          id: number
          is_bot: boolean
          path: string
          referrer: string | null
          session_id: string
          user_agent: string | null
          user_id: string | null
        }
        Insert: {
          bot_reason?: string | null
          country?: string | null
          created_at?: string
          id?: number
          is_bot?: boolean
          path: string
          referrer?: string | null
          session_id: string
          user_agent?: string | null
          user_id?: string | null
        }
        Update: {
          bot_reason?: string | null
          country?: string | null
          created_at?: string
          id?: number
          is_bot?: boolean
          path?: string
          referrer?: string | null
          session_id?: string
          user_agent?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      partner_page_shares: {
        Row: {
          created_at: string
          id: string
          partner_page_id: string
          target_email: string | null
          target_user_id: string | null
        }
        Insert: {
          created_at?: string
          id?: string
          partner_page_id: string
          target_email?: string | null
          target_user_id?: string | null
        }
        Update: {
          created_at?: string
          id?: string
          partner_page_id?: string
          target_email?: string | null
          target_user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "partner_page_shares_partner_page_id_fkey"
            columns: ["partner_page_id"]
            isOneToOne: false
            referencedRelation: "partner_pages"
            referencedColumns: ["id"]
          },
        ]
      }
      partner_pages: {
        Row: {
          access_code: string | null
          access_code_label: string | null
          archived: boolean
          audience_segments: string[]
          avg_engagement: number | null
          avg_reach: number | null
          created_at: string
          dashboard_visible: boolean
          eoi_opportunities: string[]
          flagged_streaming_mismatch: boolean
          flagged_streaming_reason: string | null
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
          section: string
          slug: string
          subtitle: string | null
          total_followers: number | null
          total_streams: number | null
          type: string
          updated_at: string
          vibe_tags: string[]
        }
        Insert: {
          access_code?: string | null
          access_code_label?: string | null
          archived?: boolean
          audience_segments?: string[]
          avg_engagement?: number | null
          avg_reach?: number | null
          created_at?: string
          dashboard_visible?: boolean
          eoi_opportunities?: string[]
          flagged_streaming_mismatch?: boolean
          flagged_streaming_reason?: string | null
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
          section?: string
          slug: string
          subtitle?: string | null
          total_followers?: number | null
          total_streams?: number | null
          type?: string
          updated_at?: string
          vibe_tags?: string[]
        }
        Update: {
          access_code?: string | null
          access_code_label?: string | null
          archived?: boolean
          audience_segments?: string[]
          avg_engagement?: number | null
          avg_reach?: number | null
          created_at?: string
          dashboard_visible?: boolean
          eoi_opportunities?: string[]
          flagged_streaming_mismatch?: boolean
          flagged_streaming_reason?: string | null
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
          section?: string
          slug?: string
          subtitle?: string | null
          total_followers?: number | null
          total_streams?: number | null
          type?: string
          updated_at?: string
          vibe_tags?: string[]
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
          flagged_streaming_mismatch: boolean
          flagged_streaming_reason: string | null
          id: string
          is_featured: boolean
          location: string | null
          marketing_opt_in: boolean
          monthly_streams: number | null
          notify_direct_messages: boolean
          notify_new_matches: boolean
          notify_newsletter: boolean
          slug: string | null
          socials: Json
          subscription_tier: string
          top_audience_location: string | null
          total_followers: number | null
          total_streams: number | null
          updated_at: string
          usage_blocked: boolean
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
          flagged_streaming_mismatch?: boolean
          flagged_streaming_reason?: string | null
          id: string
          is_featured?: boolean
          location?: string | null
          marketing_opt_in?: boolean
          monthly_streams?: number | null
          notify_direct_messages?: boolean
          notify_new_matches?: boolean
          notify_newsletter?: boolean
          slug?: string | null
          socials?: Json
          subscription_tier?: string
          top_audience_location?: string | null
          total_followers?: number | null
          total_streams?: number | null
          updated_at?: string
          usage_blocked?: boolean
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
          flagged_streaming_mismatch?: boolean
          flagged_streaming_reason?: string | null
          id?: string
          is_featured?: boolean
          location?: string | null
          marketing_opt_in?: boolean
          monthly_streams?: number | null
          notify_direct_messages?: boolean
          notify_new_matches?: boolean
          notify_newsletter?: boolean
          slug?: string | null
          socials?: Json
          subscription_tier?: string
          top_audience_location?: string | null
          total_followers?: number | null
          total_streams?: number | null
          updated_at?: string
          usage_blocked?: boolean
          values?: string[]
        }
        Relationships: []
      }
      racket_desk_profiles: {
        Row: {
          created_at: string
          handle: string
          id: string
          platform: string
          regions: string[]
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          handle: string
          id?: string
          platform: string
          regions?: string[]
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          handle?: string
          id?: string
          platform?: string
          regions?: string[]
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      roster_access_leads: {
        Row: {
          created_at: string
          email: string
          id: string
          roster_id: string
        }
        Insert: {
          created_at?: string
          email: string
          id?: string
          roster_id: string
        }
        Update: {
          created_at?: string
          email?: string
          id?: string
          roster_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "roster_access_leads_roster_id_fkey"
            columns: ["roster_id"]
            isOneToOne: false
            referencedRelation: "public_rosters"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "roster_access_leads_roster_id_fkey"
            columns: ["roster_id"]
            isOneToOne: false
            referencedRelation: "rosters"
            referencedColumns: ["id"]
          },
        ]
      }
      roster_items: {
        Row: {
          apple_music_followers: number | null
          apple_music_url: string | null
          avatar_url: string | null
          bio_page_url: string | null
          budget: number | null
          categories: string[]
          category: string | null
          content_review_url: string | null
          created_at: string
          custom_followers: number | null
          custom_label: string | null
          custom_url: string | null
          example_video_url: string | null
          facebook_followers: number | null
          facebook_url: string | null
          flagged_streaming_mismatch: boolean
          flagged_streaming_reason: string | null
          id: string
          instagram_followers: number | null
          instagram_url: string | null
          kind: string
          location: string | null
          metrics_month: string | null
          name: string
          position: number
          profile_id: string | null
          roster_id: string
          spotify_monthly_listens: number | null
          spotify_url: string | null
          status: string
          tiktok_followers: number | null
          tiktok_url: string | null
          twitch_followers: number | null
          twitch_url: string | null
          updated_at: string
          vibe: string | null
          x_followers: number | null
          x_url: string | null
          youtube_subscribers: number | null
          youtube_url: string | null
        }
        Insert: {
          apple_music_followers?: number | null
          apple_music_url?: string | null
          avatar_url?: string | null
          bio_page_url?: string | null
          budget?: number | null
          categories?: string[]
          category?: string | null
          content_review_url?: string | null
          created_at?: string
          custom_followers?: number | null
          custom_label?: string | null
          custom_url?: string | null
          example_video_url?: string | null
          facebook_followers?: number | null
          facebook_url?: string | null
          flagged_streaming_mismatch?: boolean
          flagged_streaming_reason?: string | null
          id?: string
          instagram_followers?: number | null
          instagram_url?: string | null
          kind: string
          location?: string | null
          metrics_month?: string | null
          name: string
          position?: number
          profile_id?: string | null
          roster_id: string
          spotify_monthly_listens?: number | null
          spotify_url?: string | null
          status?: string
          tiktok_followers?: number | null
          tiktok_url?: string | null
          twitch_followers?: number | null
          twitch_url?: string | null
          updated_at?: string
          vibe?: string | null
          x_followers?: number | null
          x_url?: string | null
          youtube_subscribers?: number | null
          youtube_url?: string | null
        }
        Update: {
          apple_music_followers?: number | null
          apple_music_url?: string | null
          avatar_url?: string | null
          bio_page_url?: string | null
          budget?: number | null
          categories?: string[]
          category?: string | null
          content_review_url?: string | null
          created_at?: string
          custom_followers?: number | null
          custom_label?: string | null
          custom_url?: string | null
          example_video_url?: string | null
          facebook_followers?: number | null
          facebook_url?: string | null
          flagged_streaming_mismatch?: boolean
          flagged_streaming_reason?: string | null
          id?: string
          instagram_followers?: number | null
          instagram_url?: string | null
          kind?: string
          location?: string | null
          metrics_month?: string | null
          name?: string
          position?: number
          profile_id?: string | null
          roster_id?: string
          spotify_monthly_listens?: number | null
          spotify_url?: string | null
          status?: string
          tiktok_followers?: number | null
          tiktok_url?: string | null
          twitch_followers?: number | null
          twitch_url?: string | null
          updated_at?: string
          vibe?: string | null
          x_followers?: number | null
          x_url?: string | null
          youtube_subscribers?: number | null
          youtube_url?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "roster_items_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "community_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "roster_items_roster_id_fkey"
            columns: ["roster_id"]
            isOneToOne: false
            referencedRelation: "public_rosters"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "roster_items_roster_id_fkey"
            columns: ["roster_id"]
            isOneToOne: false
            referencedRelation: "rosters"
            referencedColumns: ["id"]
          },
        ]
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
      roster_shares: {
        Row: {
          created_at: string
          id: string
          roster_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          roster_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          roster_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "roster_shares_roster_id_fkey"
            columns: ["roster_id"]
            isOneToOne: false
            referencedRelation: "public_rosters"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "roster_shares_roster_id_fkey"
            columns: ["roster_id"]
            isOneToOne: false
            referencedRelation: "rosters"
            referencedColumns: ["id"]
          },
        ]
      }
      rosters: {
        Row: {
          access_code: string | null
          access_code_label: string | null
          allow_multi_category: boolean
          brand_email: string | null
          brief_id: string | null
          categories: string[]
          client_email: string | null
          created_at: string
          custom_links: Json
          description: string | null
          est_engagement_pct: number | null
          header_image_url: string | null
          hide_prospect_tags: boolean
          hide_statuses: boolean
          id: string
          owner_id: string
          profile_image_url: string | null
          published: boolean
          published_at: string | null
          slug: string | null
          title: string
          updated_at: string
        }
        Insert: {
          access_code?: string | null
          access_code_label?: string | null
          allow_multi_category?: boolean
          brand_email?: string | null
          brief_id?: string | null
          categories?: string[]
          client_email?: string | null
          created_at?: string
          custom_links?: Json
          description?: string | null
          est_engagement_pct?: number | null
          header_image_url?: string | null
          hide_prospect_tags?: boolean
          hide_statuses?: boolean
          id?: string
          owner_id: string
          profile_image_url?: string | null
          published?: boolean
          published_at?: string | null
          slug?: string | null
          title: string
          updated_at?: string
        }
        Update: {
          access_code?: string | null
          access_code_label?: string | null
          allow_multi_category?: boolean
          brand_email?: string | null
          brief_id?: string | null
          categories?: string[]
          client_email?: string | null
          created_at?: string
          custom_links?: Json
          description?: string | null
          est_engagement_pct?: number | null
          header_image_url?: string | null
          hide_prospect_tags?: boolean
          hide_statuses?: boolean
          id?: string
          owner_id?: string
          profile_image_url?: string | null
          published?: boolean
          published_at?: string | null
          slug?: string | null
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "rosters_brief_id_fkey"
            columns: ["brief_id"]
            isOneToOne: false
            referencedRelation: "campaign_briefs"
            referencedColumns: ["id"]
          },
        ]
      }
      social_listening_scan_shares: {
        Row: {
          created_at: string
          created_by: string | null
          id: string
          scan_id: string
          target_user_id: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          id?: string
          scan_id: string
          target_user_id: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          id?: string
          scan_id?: string
          target_user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "social_listening_scan_shares_scan_id_fkey"
            columns: ["scan_id"]
            isOneToOne: false
            referencedRelation: "social_listening_scans"
            referencedColumns: ["id"]
          },
        ]
      }
      social_listening_scans: {
        Row: {
          analysis: Json
          artist_name: string
          created_at: string
          created_by: string | null
          dashboard_visible: boolean
          handle: string
          id: string
          notes: string | null
          platform: string
          posts: Json
          report_title: string | null
          saved: boolean
          updated_at: string
        }
        Insert: {
          analysis?: Json
          artist_name: string
          created_at?: string
          created_by?: string | null
          dashboard_visible?: boolean
          handle: string
          id?: string
          notes?: string | null
          platform?: string
          posts?: Json
          report_title?: string | null
          saved?: boolean
          updated_at?: string
        }
        Update: {
          analysis?: Json
          artist_name?: string
          created_at?: string
          created_by?: string | null
          dashboard_visible?: boolean
          handle?: string
          id?: string
          notes?: string | null
          platform?: string
          posts?: Json
          report_title?: string | null
          saved?: boolean
          updated_at?: string
        }
        Relationships: []
      }
      sound_board_items: {
        Row: {
          copy: string
          created_at: string
          gradient: string | null
          id: string
          position: number
          published: boolean
          thumbnail_url: string | null
          title: string
          updated_at: string
          video_url: string | null
        }
        Insert: {
          copy?: string
          created_at?: string
          gradient?: string | null
          id?: string
          position?: number
          published?: boolean
          thumbnail_url?: string | null
          title?: string
          updated_at?: string
          video_url?: string | null
        }
        Update: {
          copy?: string
          created_at?: string
          gradient?: string | null
          id?: string
          position?: number
          published?: boolean
          thumbnail_url?: string | null
          title?: string
          updated_at?: string
          video_url?: string | null
        }
        Relationships: []
      }
      spotlight_access_leads: {
        Row: {
          created_at: string
          email: string
          id: string
          partner_page_id: string
        }
        Insert: {
          created_at?: string
          email: string
          id?: string
          partner_page_id: string
        }
        Update: {
          created_at?: string
          email?: string
          id?: string
          partner_page_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "spotlight_access_leads_partner_page_id_fkey"
            columns: ["partner_page_id"]
            isOneToOne: false
            referencedRelation: "partner_pages"
            referencedColumns: ["id"]
          },
        ]
      }
      spotlight_interests: {
        Row: {
          created_at: string
          guest_email: string | null
          guest_name: string | null
          handled: boolean
          id: string
          note: string | null
          partner_page_id: string
          user_id: string | null
        }
        Insert: {
          created_at?: string
          guest_email?: string | null
          guest_name?: string | null
          handled?: boolean
          id?: string
          note?: string | null
          partner_page_id: string
          user_id?: string | null
        }
        Update: {
          created_at?: string
          guest_email?: string | null
          guest_name?: string | null
          handled?: boolean
          id?: string
          note?: string | null
          partner_page_id?: string
          user_id?: string | null
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
      usage_events: {
        Row: {
          action: string
          bonus: number
          count: number
          period: string
          updated_at: string
          user_id: string
        }
        Insert: {
          action: string
          bonus?: number
          count?: number
          period: string
          updated_at?: string
          user_id: string
        }
        Update: {
          action?: string
          bonus?: number
          count?: number
          period?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      usage_limits: {
        Row: {
          action: string
          label: string
          monthly_limit: number
          updated_at: string
        }
        Insert: {
          action: string
          label: string
          monthly_limit: number
          updated_at?: string
        }
        Update: {
          action?: string
          label?: string
          monthly_limit?: number
          updated_at?: string
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
      lead_briefs_shared: {
        Row: {
          budget: number | null
          company: string | null
          contact_name: string | null
          created_at: string | null
          currency: string | null
          description: string | null
          display_order: number | null
          id: string | null
          status: string | null
          target_audience: string | null
          timeline: string | null
          title: string | null
          transparency: string | null
        }
        Insert: {
          budget?: number | null
          company?: string | null
          contact_name?: string | null
          created_at?: string | null
          currency?: string | null
          description?: string | null
          display_order?: number | null
          id?: string | null
          status?: string | null
          target_audience?: string | null
          timeline?: string | null
          title?: string | null
          transparency?: string | null
        }
        Update: {
          budget?: number | null
          company?: string | null
          contact_name?: string | null
          created_at?: string | null
          currency?: string | null
          description?: string | null
          display_order?: number | null
          id?: string | null
          status?: string | null
          target_audience?: string | null
          timeline?: string | null
          title?: string | null
          transparency?: string | null
        }
        Relationships: []
      }
      public_campaign_reports: {
        Row: {
          categories: string[] | null
          created_at: string | null
          description: string | null
          header_image_url: string | null
          hide_categories: boolean | null
          id: string | null
          profile_image_url: string | null
          published: boolean | null
          published_at: string | null
          slug: string | null
          template: string | null
          title: string | null
          updated_at: string | null
        }
        Insert: {
          categories?: string[] | null
          created_at?: string | null
          description?: string | null
          header_image_url?: string | null
          hide_categories?: boolean | null
          id?: string | null
          profile_image_url?: string | null
          published?: boolean | null
          published_at?: string | null
          slug?: string | null
          template?: string | null
          title?: string | null
          updated_at?: string | null
        }
        Update: {
          categories?: string[] | null
          created_at?: string | null
          description?: string | null
          header_image_url?: string | null
          hide_categories?: boolean | null
          id?: string | null
          profile_image_url?: string | null
          published?: boolean | null
          published_at?: string | null
          slug?: string | null
          template?: string | null
          title?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      public_profiles: {
        Row: {
          account_type: Database["public"]["Enums"]["account_type"] | null
          artist_name: string | null
          avatar_url: string | null
          avg_engagement: number | null
          avg_reach: number | null
          bio: string | null
          created_at: string | null
          display_name: string | null
          id: string | null
          is_featured: boolean | null
          location: string | null
          monthly_streams: number | null
          slug: string | null
          socials: Json | null
          top_audience_location: string | null
          total_followers: number | null
          total_streams: number | null
          values: string[] | null
        }
        Insert: {
          account_type?: Database["public"]["Enums"]["account_type"] | null
          artist_name?: string | null
          avatar_url?: string | null
          avg_engagement?: number | null
          avg_reach?: number | null
          bio?: string | null
          created_at?: string | null
          display_name?: string | null
          id?: string | null
          is_featured?: boolean | null
          location?: string | null
          monthly_streams?: number | null
          slug?: string | null
          socials?: Json | null
          top_audience_location?: string | null
          total_followers?: number | null
          total_streams?: number | null
          values?: string[] | null
        }
        Update: {
          account_type?: Database["public"]["Enums"]["account_type"] | null
          artist_name?: string | null
          avatar_url?: string | null
          avg_engagement?: number | null
          avg_reach?: number | null
          bio?: string | null
          created_at?: string | null
          display_name?: string | null
          id?: string | null
          is_featured?: boolean | null
          location?: string | null
          monthly_streams?: number | null
          slug?: string | null
          socials?: Json | null
          top_audience_location?: string | null
          total_followers?: number | null
          total_streams?: number | null
          values?: string[] | null
        }
        Relationships: []
      }
      public_rosters: {
        Row: {
          categories: string[] | null
          created_at: string | null
          custom_links: Json | null
          description: string | null
          est_engagement_pct: number | null
          header_image_url: string | null
          hide_prospect_tags: boolean | null
          hide_statuses: boolean | null
          id: string | null
          owner_id: string | null
          profile_image_url: string | null
          published: boolean | null
          published_at: string | null
          slug: string | null
          title: string | null
          updated_at: string | null
        }
        Insert: {
          categories?: string[] | null
          created_at?: string | null
          custom_links?: Json | null
          description?: string | null
          est_engagement_pct?: number | null
          header_image_url?: string | null
          hide_prospect_tags?: boolean | null
          hide_statuses?: boolean | null
          id?: string | null
          owner_id?: string | null
          profile_image_url?: string | null
          published?: boolean | null
          published_at?: string | null
          slug?: string | null
          title?: string | null
          updated_at?: string | null
        }
        Update: {
          categories?: string[] | null
          created_at?: string | null
          custom_links?: Json | null
          description?: string | null
          est_engagement_pct?: number | null
          header_image_url?: string | null
          hide_prospect_tags?: boolean | null
          hide_statuses?: boolean | null
          id?: string | null
          owner_id?: string | null
          profile_image_url?: string | null
          published?: boolean | null
          published_at?: string | null
          slug?: string | null
          title?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
    }
    Functions: {
      admin_campaign_brief_emails: {
        Args: never
        Returns: {
          contact_email: string
          id: string
        }[]
      }
      delete_email: {
        Args: { message_id: number; queue_name: string }
        Returns: boolean
      }
      email_queue_dispatch: { Args: never; Returns: undefined }
      enqueue_email: {
        Args: { payload: Json; queue_name: string }
        Returns: number
      }
      get_assigned_campaign_reports: {
        Args: never
        Returns: {
          created_at: string
          description: string
          header_image_url: string
          id: string
          owner_id: string
          published: boolean
          published_at: string
          slug: string
          title: string
          updated_at: string
        }[]
      }
      get_assigned_rosters: {
        Args: never
        Returns: {
          created_at: string
          description: string
          header_image_url: string
          id: string
          owner_id: string
          published: boolean
          published_at: string
          slug: string
          title: string
          updated_at: string
        }[]
      }
      get_campaign_brief_contact_email: {
        Args: { _brief_id: string }
        Returns: string
      }
      get_campaign_report_assignment: {
        Args: { _report_id: string }
        Returns: {
          brand_email: string
          client_email: string
        }[]
      }
      get_roster_assignment: {
        Args: { _roster_id: string }
        Returns: {
          brand_email: string
          client_email: string
        }[]
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      is_assigned_to_campaign_report: {
        Args: { _report_id: string }
        Returns: boolean
      }
      is_assigned_to_roster: { Args: { _roster_id: string }; Returns: boolean }
      is_campaign_brief_owner: {
        Args: { _brief_id: string; _user_id: string }
        Returns: boolean
      }
      move_to_dlq: {
        Args: {
          dlq_name: string
          message_id: number
          payload: Json
          source_queue: string
        }
        Returns: number
      }
      read_email_batch: {
        Args: { batch_size: number; queue_name: string; vt: number }
        Returns: {
          message: Json
          msg_id: number
          read_ct: number
        }[]
      }
    }
    Enums: {
      account_type: "artist" | "brand" | "fan" | "creative" | "crew"
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
      account_type: ["artist", "brand", "fan", "creative", "crew"],
      app_role: ["admin", "moderator", "user"],
    },
  },
} as const
