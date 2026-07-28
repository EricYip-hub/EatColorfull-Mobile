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
      admin_audit_log: {
        Row: {
          actor_email: string | null
          actor_user_id: string | null
          created_at: string
          entity_id: string
          entity_type: string
          from_status: string | null
          id: string
          note: string | null
          to_status: string
        }
        Insert: {
          actor_email?: string | null
          actor_user_id?: string | null
          created_at?: string
          entity_id: string
          entity_type: string
          from_status?: string | null
          id?: string
          note?: string | null
          to_status: string
        }
        Update: {
          actor_email?: string | null
          actor_user_id?: string | null
          created_at?: string
          entity_id?: string
          entity_type?: string
          from_status?: string | null
          id?: string
          note?: string | null
          to_status?: string
        }
        Relationships: []
      }
      chat_messages: {
        Row: {
          content: string
          created_at: string
          id: string
          role: string
          user_id: string
        }
        Insert: {
          content: string
          created_at?: string
          id?: string
          role: string
          user_id: string
        }
        Update: {
          content?: string
          created_at?: string
          id?: string
          role?: string
          user_id?: string
        }
        Relationships: []
      }
      chef_events: {
        Row: {
          chef_name: string | null
          cover_url: string | null
          created_at: string
          description: string | null
          event_date: string | null
          id: string
          menu: Json
          owner_id: string
          pickup_address: string | null
          slug: string
          status: string
          title: string
          updated_at: string
        }
        Insert: {
          chef_name?: string | null
          cover_url?: string | null
          created_at?: string
          description?: string | null
          event_date?: string | null
          id?: string
          menu?: Json
          owner_id: string
          pickup_address?: string | null
          slug: string
          status?: string
          title: string
          updated_at?: string
        }
        Update: {
          chef_name?: string | null
          cover_url?: string | null
          created_at?: string
          description?: string | null
          event_date?: string | null
          id?: string
          menu?: Json
          owner_id?: string
          pickup_address?: string | null
          slug?: string
          status?: string
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      chef_favorites: {
        Row: {
          chef_id: string
          created_at: string
          user_id: string
        }
        Insert: {
          chef_id: string
          created_at?: string
          user_id: string
        }
        Update: {
          chef_id?: string
          created_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "chef_favorites_chef_id_fkey"
            columns: ["chef_id"]
            isOneToOne: false
            referencedRelation: "chef_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      chef_kitchen_videos: {
        Row: {
          chef_id: string
          created_at: string
          cta_label: string | null
          description: string | null
          display_order: number
          external_url: string | null
          id: string
          is_public: boolean
          linked_listing_id: string | null
          platform: Database["public"]["Enums"]["chef_video_platform"]
          thumbnail_url: string | null
          title: string
          updated_at: string
          uploaded_video_id: string | null
        }
        Insert: {
          chef_id: string
          created_at?: string
          cta_label?: string | null
          description?: string | null
          display_order?: number
          external_url?: string | null
          id?: string
          is_public?: boolean
          linked_listing_id?: string | null
          platform: Database["public"]["Enums"]["chef_video_platform"]
          thumbnail_url?: string | null
          title: string
          updated_at?: string
          uploaded_video_id?: string | null
        }
        Update: {
          chef_id?: string
          created_at?: string
          cta_label?: string | null
          description?: string | null
          display_order?: number
          external_url?: string | null
          id?: string
          is_public?: boolean
          linked_listing_id?: string | null
          platform?: Database["public"]["Enums"]["chef_video_platform"]
          thumbnail_url?: string | null
          title?: string
          updated_at?: string
          uploaded_video_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "chef_kitchen_videos_chef_id_fkey"
            columns: ["chef_id"]
            isOneToOne: false
            referencedRelation: "chef_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "chef_kitchen_videos_linked_listing_id_fkey"
            columns: ["linked_listing_id"]
            isOneToOne: false
            referencedRelation: "chef_listings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "chef_kitchen_videos_uploaded_video_id_fkey"
            columns: ["uploaded_video_id"]
            isOneToOne: false
            referencedRelation: "tastemaker_videos"
            referencedColumns: ["id"]
          },
        ]
      }
      chef_link_clicks: {
        Row: {
          created_at: string
          id: string
          listing_id: string
          referrer: string | null
          utm_source: string | null
        }
        Insert: {
          created_at?: string
          id?: string
          listing_id: string
          referrer?: string | null
          utm_source?: string | null
        }
        Update: {
          created_at?: string
          id?: string
          listing_id?: string
          referrer?: string | null
          utm_source?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "chef_link_clicks_listing_id_fkey"
            columns: ["listing_id"]
            isOneToOne: false
            referencedRelation: "chef_listings"
            referencedColumns: ["id"]
          },
        ]
      }
      chef_listings: {
        Row: {
          chef_id: string
          created_at: string
          currency: string
          cutoff_at: string | null
          description: string | null
          details: Json
          id: string
          inventory_remaining: number | null
          kind: Database["public"]["Enums"]["chef_listing_kind"]
          photos: Json
          price_cents: number | null
          slug: string
          status: Database["public"]["Enums"]["chef_listing_status"]
          title: string
          updated_at: string
          video_url: string | null
        }
        Insert: {
          chef_id: string
          created_at?: string
          currency?: string
          cutoff_at?: string | null
          description?: string | null
          details?: Json
          id?: string
          inventory_remaining?: number | null
          kind: Database["public"]["Enums"]["chef_listing_kind"]
          photos?: Json
          price_cents?: number | null
          slug: string
          status?: Database["public"]["Enums"]["chef_listing_status"]
          title: string
          updated_at?: string
          video_url?: string | null
        }
        Update: {
          chef_id?: string
          created_at?: string
          currency?: string
          cutoff_at?: string | null
          description?: string | null
          details?: Json
          id?: string
          inventory_remaining?: number | null
          kind?: Database["public"]["Enums"]["chef_listing_kind"]
          photos?: Json
          price_cents?: number | null
          slug?: string
          status?: Database["public"]["Enums"]["chef_listing_status"]
          title?: string
          updated_at?: string
          video_url?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "chef_listings_chef_id_fkey"
            columns: ["chef_id"]
            isOneToOne: false
            referencedRelation: "chef_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      chef_meal_prep_requests: {
        Row: {
          additional_notes: string | null
          chef_slug: string
          city_state: string | null
          created_at: string
          dietary_restrictions: string | null
          dining_setting: string | null
          email: string
          food_allergies: string | null
          full_name: string
          guest_count: number | null
          id: string
          occasion_type: string | null
          phone: string
          preferred_menu_items: string | null
          requested_date: string | null
          requested_time: string | null
          service_type: string | null
          status: string
          updated_at: string
        }
        Insert: {
          additional_notes?: string | null
          chef_slug: string
          city_state?: string | null
          created_at?: string
          dietary_restrictions?: string | null
          dining_setting?: string | null
          email: string
          food_allergies?: string | null
          full_name: string
          guest_count?: number | null
          id?: string
          occasion_type?: string | null
          phone: string
          preferred_menu_items?: string | null
          requested_date?: string | null
          requested_time?: string | null
          service_type?: string | null
          status?: string
          updated_at?: string
        }
        Update: {
          additional_notes?: string | null
          chef_slug?: string
          city_state?: string | null
          created_at?: string
          dietary_restrictions?: string | null
          dining_setting?: string | null
          email?: string
          food_allergies?: string | null
          full_name?: string
          guest_count?: number | null
          id?: string
          occasion_type?: string | null
          phone?: string
          preferred_menu_items?: string | null
          requested_date?: string | null
          requested_time?: string | null
          service_type?: string | null
          status?: string
          updated_at?: string
        }
        Relationships: []
      }
      chef_orders: {
        Row: {
          address: Json | null
          chef_id: string
          coupon_code: string | null
          created_at: string
          dietary_notes: string | null
          fulfillment: Database["public"]["Enums"]["chef_fulfillment"]
          fulfillment_date: string | null
          guest_email: string | null
          guest_phone: string | null
          id: string
          listing_id: string
          paid_at: string | null
          payment_method: string
          payment_proof_note: string | null
          payment_reference: string | null
          payment_status: string
          quantity: number
          source_video_id: string | null
          status: Database["public"]["Enums"]["chef_order_status"]
          stripe_payment_intent: string | null
          stripe_session_id: string | null
          total_cents: number
          updated_at: string
          user_id: string
        }
        Insert: {
          address?: Json | null
          chef_id: string
          coupon_code?: string | null
          created_at?: string
          dietary_notes?: string | null
          fulfillment?: Database["public"]["Enums"]["chef_fulfillment"]
          fulfillment_date?: string | null
          guest_email?: string | null
          guest_phone?: string | null
          id?: string
          listing_id: string
          paid_at?: string | null
          payment_method?: string
          payment_proof_note?: string | null
          payment_reference?: string | null
          payment_status?: string
          quantity?: number
          source_video_id?: string | null
          status?: Database["public"]["Enums"]["chef_order_status"]
          stripe_payment_intent?: string | null
          stripe_session_id?: string | null
          total_cents?: number
          updated_at?: string
          user_id: string
        }
        Update: {
          address?: Json | null
          chef_id?: string
          coupon_code?: string | null
          created_at?: string
          dietary_notes?: string | null
          fulfillment?: Database["public"]["Enums"]["chef_fulfillment"]
          fulfillment_date?: string | null
          guest_email?: string | null
          guest_phone?: string | null
          id?: string
          listing_id?: string
          paid_at?: string | null
          payment_method?: string
          payment_proof_note?: string | null
          payment_reference?: string | null
          payment_status?: string
          quantity?: number
          source_video_id?: string | null
          status?: Database["public"]["Enums"]["chef_order_status"]
          stripe_payment_intent?: string | null
          stripe_session_id?: string | null
          total_cents?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "chef_orders_chef_id_fkey"
            columns: ["chef_id"]
            isOneToOne: false
            referencedRelation: "chef_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "chef_orders_listing_id_fkey"
            columns: ["listing_id"]
            isOneToOne: false
            referencedRelation: "chef_listings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "chef_orders_source_video_id_fkey"
            columns: ["source_video_id"]
            isOneToOne: false
            referencedRelation: "chef_kitchen_videos"
            referencedColumns: ["id"]
          },
        ]
      }
      chef_payment_events: {
        Row: {
          actor_user_id: string | null
          amount_cents: number | null
          chef_id: string
          created_at: string
          currency: string | null
          event_type: string
          id: string
          metadata: Json
          note: string | null
          order_id: string
          payment_method: string | null
          reference: string | null
          user_id: string | null
        }
        Insert: {
          actor_user_id?: string | null
          amount_cents?: number | null
          chef_id: string
          created_at?: string
          currency?: string | null
          event_type: string
          id?: string
          metadata?: Json
          note?: string | null
          order_id: string
          payment_method?: string | null
          reference?: string | null
          user_id?: string | null
        }
        Update: {
          actor_user_id?: string | null
          amount_cents?: number | null
          chef_id?: string
          created_at?: string
          currency?: string | null
          event_type?: string
          id?: string
          metadata?: Json
          note?: string | null
          order_id?: string
          payment_method?: string | null
          reference?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      chef_profile_views: {
        Row: {
          chef_id: string
          created_at: string
          id: string
          viewer_user_id: string | null
        }
        Insert: {
          chef_id: string
          created_at?: string
          id?: string
          viewer_user_id?: string | null
        }
        Update: {
          chef_id?: string
          created_at?: string
          id?: string
          viewer_user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "chef_profile_views_chef_id_fkey"
            columns: ["chef_id"]
            isOneToOne: false
            referencedRelation: "chef_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      chef_profiles: {
        Row: {
          accepting_orders: boolean
          created_at: string
          extended_bio: string | null
          id: string
          instagram_url: string | null
          service_area: string | null
          tastemaker_id: string
          tiktok_url: string | null
          updated_at: string
          user_id: string
          venmo_handle: string | null
          youtube_url: string | null
          zelle_handle: string | null
        }
        Insert: {
          accepting_orders?: boolean
          created_at?: string
          extended_bio?: string | null
          id?: string
          instagram_url?: string | null
          service_area?: string | null
          tastemaker_id: string
          tiktok_url?: string | null
          updated_at?: string
          user_id: string
          venmo_handle?: string | null
          youtube_url?: string | null
          zelle_handle?: string | null
        }
        Update: {
          accepting_orders?: boolean
          created_at?: string
          extended_bio?: string | null
          id?: string
          instagram_url?: string | null
          service_area?: string | null
          tastemaker_id?: string
          tiktok_url?: string | null
          updated_at?: string
          user_id?: string
          venmo_handle?: string | null
          youtube_url?: string | null
          zelle_handle?: string | null
        }
        Relationships: []
      }
      chef_ratings: {
        Row: {
          chef_id: string
          comment: string | null
          created_at: string
          id: string
          order_id: string
          stars: number
          updated_at: string
          user_id: string
        }
        Insert: {
          chef_id: string
          comment?: string | null
          created_at?: string
          id?: string
          order_id: string
          stars: number
          updated_at?: string
          user_id: string
        }
        Update: {
          chef_id?: string
          comment?: string | null
          created_at?: string
          id?: string
          order_id?: string
          stars?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      chef_service_info: {
        Row: {
          chef_slug: string
          first_interstate_use_date: string | null
          first_use_date: string | null
          updated_at: string
        }
        Insert: {
          chef_slug: string
          first_interstate_use_date?: string | null
          first_use_date?: string | null
          updated_at?: string
        }
        Update: {
          chef_slug?: string
          first_interstate_use_date?: string | null
          first_use_date?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      chef_share_events: {
        Row: {
          chef_id: string
          created_at: string
          created_by: string | null
          id: string
          listing_id: string | null
          platform: string
          share_url: string
        }
        Insert: {
          chef_id: string
          created_at?: string
          created_by?: string | null
          id?: string
          listing_id?: string | null
          platform: string
          share_url: string
        }
        Update: {
          chef_id?: string
          created_at?: string
          created_by?: string | null
          id?: string
          listing_id?: string | null
          platform?: string
          share_url?: string
        }
        Relationships: []
      }
      client_events: {
        Row: {
          created_at: string
          event: string
          id: string
          path: string | null
          props: Json
          session_id: string | null
          user_agent: string | null
          user_id: string | null
        }
        Insert: {
          created_at?: string
          event: string
          id?: string
          path?: string | null
          props?: Json
          session_id?: string | null
          user_agent?: string | null
          user_id?: string | null
        }
        Update: {
          created_at?: string
          event?: string
          id?: string
          path?: string | null
          props?: Json
          session_id?: string | null
          user_agent?: string | null
          user_id?: string | null
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
      event_bookings: {
        Row: {
          age: number | null
          amount_due_cents: number
          coupon_code: string | null
          created_at: string
          dietary_notes: string | null
          email: string
          event_slug: string
          full_name: string
          guest_count: number
          id: string
          notes: string | null
          payment_status: string
          phone: string | null
          price_cents: number
          updated_at: string
        }
        Insert: {
          age?: number | null
          amount_due_cents?: number
          coupon_code?: string | null
          created_at?: string
          dietary_notes?: string | null
          email: string
          event_slug: string
          full_name: string
          guest_count?: number
          id?: string
          notes?: string | null
          payment_status?: string
          phone?: string | null
          price_cents?: number
          updated_at?: string
        }
        Update: {
          age?: number | null
          amount_due_cents?: number
          coupon_code?: string | null
          created_at?: string
          dietary_notes?: string | null
          email?: string
          event_slug?: string
          full_name?: string
          guest_count?: number
          id?: string
          notes?: string | null
          payment_status?: string
          phone?: string | null
          price_cents?: number
          updated_at?: string
        }
        Relationships: []
      }
      event_coupons: {
        Row: {
          active: boolean
          code: string
          created_at: string
          discount_percent: number
          event_slug: string | null
          expires_at: string | null
          max_uses: number | null
          updated_at: string
          uses_count: number
        }
        Insert: {
          active?: boolean
          code: string
          created_at?: string
          discount_percent?: number
          event_slug?: string | null
          expires_at?: string | null
          max_uses?: number | null
          updated_at?: string
          uses_count?: number
        }
        Update: {
          active?: boolean
          code?: string
          created_at?: string
          discount_percent?: number
          event_slug?: string | null
          expires_at?: string | null
          max_uses?: number | null
          updated_at?: string
          uses_count?: number
        }
        Relationships: []
      }
      form_submissions: {
        Row: {
          created_at: string
          email: string | null
          id: string
          location: string | null
          name: string | null
          notes: string | null
          payload: Json
          phone: string | null
          source: string
          user_id: string | null
        }
        Insert: {
          created_at?: string
          email?: string | null
          id?: string
          location?: string | null
          name?: string | null
          notes?: string | null
          payload?: Json
          phone?: string | null
          source: string
          user_id?: string | null
        }
        Update: {
          created_at?: string
          email?: string | null
          id?: string
          location?: string | null
          name?: string | null
          notes?: string | null
          payload?: Json
          phone?: string | null
          source?: string
          user_id?: string | null
        }
        Relationships: []
      }
      host_applications: {
        Row: {
          background: string
          compliance_docs: Json
          county_city: string | null
          created_at: string
          email: string
          emergency_contact: string | null
          experience_type: string
          food_prep_location: string | null
          guest_count: number
          id: string
          instagram: string | null
          location: string
          location_status: string
          max_capacity: number | null
          motivation: string
          name: string
          permit_agency: string | null
          permit_expiration: string | null
          permit_number: string | null
          phone: string
          sample_menu: string
          status: string
        }
        Insert: {
          background: string
          compliance_docs?: Json
          county_city?: string | null
          created_at?: string
          email: string
          emergency_contact?: string | null
          experience_type: string
          food_prep_location?: string | null
          guest_count: number
          id?: string
          instagram?: string | null
          location: string
          location_status: string
          max_capacity?: number | null
          motivation: string
          name: string
          permit_agency?: string | null
          permit_expiration?: string | null
          permit_number?: string | null
          phone: string
          sample_menu: string
          status?: string
        }
        Update: {
          background?: string
          compliance_docs?: Json
          county_city?: string | null
          created_at?: string
          email?: string
          emergency_contact?: string | null
          experience_type?: string
          food_prep_location?: string | null
          guest_count?: number
          id?: string
          instagram?: string | null
          location?: string
          location_status?: string
          max_capacity?: number | null
          motivation?: string
          name?: string
          permit_agency?: string | null
          permit_expiration?: string | null
          permit_number?: string | null
          phone?: string
          sample_menu?: string
          status?: string
        }
        Relationships: []
      }
      join_requests: {
        Row: {
          created_at: string
          decided_at: string | null
          decided_by: string | null
          host_note: string | null
          id: string
          message: string | null
          notification_id: string | null
          paid_at: string | null
          status: Database["public"]["Enums"]["request_status"]
          table_id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          decided_at?: string | null
          decided_by?: string | null
          host_note?: string | null
          id?: string
          message?: string | null
          notification_id?: string | null
          paid_at?: string | null
          status?: Database["public"]["Enums"]["request_status"]
          table_id: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          decided_at?: string | null
          decided_by?: string | null
          host_note?: string | null
          id?: string
          message?: string | null
          notification_id?: string | null
          paid_at?: string | null
          status?: Database["public"]["Enums"]["request_status"]
          table_id?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "join_requests_notification_id_fkey"
            columns: ["notification_id"]
            isOneToOne: false
            referencedRelation: "notifications"
            referencedColumns: ["id"]
          },
        ]
      }
      meal_plan_requests: {
        Row: {
          admin_note: string | null
          created_at: string
          cuisine_style: string | null
          days_count: number | null
          dietary_restrictions: string | null
          foods_more_of: string | null
          foods_to_avoid: string | null
          grocery_list: boolean
          hosting_menu: boolean
          id: string
          plan_type: string | null
          status: string
          table_id: string | null
          updated_at: string
          user_id: string
          wellness_goals: string | null
        }
        Insert: {
          admin_note?: string | null
          created_at?: string
          cuisine_style?: string | null
          days_count?: number | null
          dietary_restrictions?: string | null
          foods_more_of?: string | null
          foods_to_avoid?: string | null
          grocery_list?: boolean
          hosting_menu?: boolean
          id?: string
          plan_type?: string | null
          status?: string
          table_id?: string | null
          updated_at?: string
          user_id: string
          wellness_goals?: string | null
        }
        Update: {
          admin_note?: string | null
          created_at?: string
          cuisine_style?: string | null
          days_count?: number | null
          dietary_restrictions?: string | null
          foods_more_of?: string | null
          foods_to_avoid?: string | null
          grocery_list?: boolean
          hosting_menu?: boolean
          id?: string
          plan_type?: string | null
          status?: string
          table_id?: string | null
          updated_at?: string
          user_id?: string
          wellness_goals?: string | null
        }
        Relationships: []
      }
      notifications: {
        Row: {
          body: string | null
          created_at: string
          delivered_at: string | null
          id: string
          kind: string
          link: string | null
          read_at: string | null
          title: string
          user_id: string
        }
        Insert: {
          body?: string | null
          created_at?: string
          delivered_at?: string | null
          id?: string
          kind: string
          link?: string | null
          read_at?: string | null
          title: string
          user_id: string
        }
        Update: {
          body?: string | null
          created_at?: string
          delivered_at?: string | null
          id?: string
          kind?: string
          link?: string | null
          read_at?: string | null
          title?: string
          user_id?: string
        }
        Relationships: []
      }
      order_reminders: {
        Row: {
          channel: string
          chef_id: string
          created_at: string
          created_by: string | null
          guest_user_id: string
          id: string
          in_app_sent_at: string | null
          message: string
          order_id: string
          scheduled_at: string
          sms_error: string | null
          sms_sent_at: string | null
          status: string
          template: string
          title: string
          updated_at: string
        }
        Insert: {
          channel?: string
          chef_id: string
          created_at?: string
          created_by?: string | null
          guest_user_id: string
          id?: string
          in_app_sent_at?: string | null
          message: string
          order_id: string
          scheduled_at: string
          sms_error?: string | null
          sms_sent_at?: string | null
          status?: string
          template: string
          title: string
          updated_at?: string
        }
        Update: {
          channel?: string
          chef_id?: string
          created_at?: string
          created_by?: string | null
          guest_user_id?: string
          id?: string
          in_app_sent_at?: string | null
          message?: string
          order_id?: string
          scheduled_at?: string
          sms_error?: string | null
          sms_sent_at?: string | null
          status?: string
          template?: string
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "order_reminders_chef_id_fkey"
            columns: ["chef_id"]
            isOneToOne: false
            referencedRelation: "chef_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "order_reminders_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "chef_orders"
            referencedColumns: ["id"]
          },
        ]
      }
      payments_go_live_state: {
        Row: {
          completed: boolean
          completed_at: string | null
          id: boolean
          updated_at: string
        }
        Insert: {
          completed?: boolean
          completed_at?: string | null
          id?: boolean
          updated_at?: string
        }
        Update: {
          completed?: boolean
          completed_at?: string | null
          id?: boolean
          updated_at?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          avatar_url: string | null
          bio: string | null
          created_at: string
          date_of_birth: string | null
          dietary_notes: string | null
          display_name: string | null
          id: string
          updated_at: string
        }
        Insert: {
          avatar_url?: string | null
          bio?: string | null
          created_at?: string
          date_of_birth?: string | null
          dietary_notes?: string | null
          display_name?: string | null
          id: string
          updated_at?: string
        }
        Update: {
          avatar_url?: string | null
          bio?: string | null
          created_at?: string
          date_of_birth?: string | null
          dietary_notes?: string | null
          display_name?: string | null
          id?: string
          updated_at?: string
        }
        Relationships: []
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
      table_feedback: {
        Row: {
          admin_reviewed: boolean
          ambience: number | null
          cleanliness: number | null
          created_at: string
          flagged: boolean
          flow: number | null
          food: number | null
          host_energy: number | null
          host_id: string | null
          id: string
          loved: string[]
          notes: string | null
          private_note: string | null
          public_note: string | null
          table_id: string
          user_id: string
          would_eat_again: string | null
          would_return: number | null
        }
        Insert: {
          admin_reviewed?: boolean
          ambience?: number | null
          cleanliness?: number | null
          created_at?: string
          flagged?: boolean
          flow?: number | null
          food?: number | null
          host_energy?: number | null
          host_id?: string | null
          id?: string
          loved?: string[]
          notes?: string | null
          private_note?: string | null
          public_note?: string | null
          table_id: string
          user_id: string
          would_eat_again?: string | null
          would_return?: number | null
        }
        Update: {
          admin_reviewed?: boolean
          ambience?: number | null
          cleanliness?: number | null
          created_at?: string
          flagged?: boolean
          flow?: number | null
          food?: number | null
          host_energy?: number | null
          host_id?: string | null
          id?: string
          loved?: string[]
          notes?: string | null
          private_note?: string | null
          public_note?: string | null
          table_id?: string
          user_id?: string
          would_eat_again?: string | null
          would_return?: number | null
        }
        Relationships: []
      }
      tables_meta: {
        Row: {
          id: string
          seats_total: number
        }
        Insert: {
          id: string
          seats_total: number
        }
        Update: {
          id?: string
          seats_total?: number
        }
        Relationships: []
      }
      tastemaker_videos: {
        Row: {
          created_at: string
          file_size_bytes: number | null
          id: string
          mime_type: string | null
          platform: string
          poster_url: string | null
          public_url: string
          storage_path: string
          tastemaker_id: string
          title: string
          updated_at: string
          uploaded_by: string | null
        }
        Insert: {
          created_at?: string
          file_size_bytes?: number | null
          id?: string
          mime_type?: string | null
          platform?: string
          poster_url?: string | null
          public_url: string
          storage_path: string
          tastemaker_id: string
          title: string
          updated_at?: string
          uploaded_by?: string | null
        }
        Update: {
          created_at?: string
          file_size_bytes?: number | null
          id?: string
          mime_type?: string | null
          platform?: string
          poster_url?: string | null
          public_url?: string
          storage_path?: string
          tastemaker_id?: string
          title?: string
          updated_at?: string
          uploaded_by?: string | null
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
    }
    Views: {
      table_seat_counts: {
        Row: {
          approved_seats: number | null
          paid_seats: number | null
          pending_seats: number | null
          table_id: string | null
        }
        Relationships: []
      }
    }
    Functions: {
      confirm_manual_chef_payment: {
        Args: { _note?: string; _order_id: string }
        Returns: {
          address: Json | null
          chef_id: string
          coupon_code: string | null
          created_at: string
          dietary_notes: string | null
          fulfillment: Database["public"]["Enums"]["chef_fulfillment"]
          fulfillment_date: string | null
          guest_email: string | null
          guest_phone: string | null
          id: string
          listing_id: string
          paid_at: string | null
          payment_method: string
          payment_proof_note: string | null
          payment_reference: string | null
          payment_status: string
          quantity: number
          source_video_id: string | null
          status: Database["public"]["Enums"]["chef_order_status"]
          stripe_payment_intent: string | null
          stripe_session_id: string | null
          total_cents: number
          updated_at: string
          user_id: string
        }
        SetofOptions: {
          from: "*"
          to: "chef_orders"
          isOneToOne: true
          isSetofReturn: false
        }
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
      finalize_chef_order_paid: {
        Args: {
          _coupon_code?: string
          _order_id: string
          _stripe_payment_intent: string
          _stripe_session_id: string
        }
        Returns: {
          address: Json | null
          chef_id: string
          coupon_code: string | null
          created_at: string
          dietary_notes: string | null
          fulfillment: Database["public"]["Enums"]["chef_fulfillment"]
          fulfillment_date: string | null
          guest_email: string | null
          guest_phone: string | null
          id: string
          listing_id: string
          paid_at: string | null
          payment_method: string
          payment_proof_note: string | null
          payment_reference: string | null
          payment_status: string
          quantity: number
          source_video_id: string | null
          status: Database["public"]["Enums"]["chef_order_status"]
          stripe_payment_intent: string | null
          stripe_session_id: string | null
          total_cents: number
          updated_at: string
          user_id: string
        }
        SetofOptions: {
          from: "*"
          to: "chef_orders"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      get_application_status: {
        Args: { _id: string }
        Returns: {
          created_at: string
          id: string
          name: string
          source: string
          status: string
        }[]
      }
      get_chef_payment_handles: {
        Args: { _chef_id: string }
        Returns: {
          venmo_handle: string
          zelle_handle: string
        }[]
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
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
      promote_waitlist: { Args: { _table_id: string }; Returns: undefined }
      purge_old_notifications: { Args: never; Returns: number }
      read_email_batch: {
        Args: { batch_size: number; queue_name: string; vt: number }
        Returns: {
          message: Json
          msg_id: number
          read_ct: number
        }[]
      }
      request_seat: {
        Args: { _message: string; _table_id: string }
        Returns: {
          created_at: string
          decided_at: string | null
          decided_by: string | null
          host_note: string | null
          id: string
          message: string | null
          notification_id: string | null
          paid_at: string | null
          status: Database["public"]["Enums"]["request_status"]
          table_id: string
          updated_at: string
          user_id: string
        }
        SetofOptions: {
          from: "*"
          to: "join_requests"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      submit_application_form: {
        Args: {
          _email: string
          _location: string
          _name: string
          _notes: string
          _payload: Json
          _phone: string
          _source: string
        }
        Returns: string
      }
      submit_manual_chef_payment: {
        Args: {
          _method: string
          _note: string
          _order_id: string
          _reference: string
        }
        Returns: {
          address: Json | null
          chef_id: string
          coupon_code: string | null
          created_at: string
          dietary_notes: string | null
          fulfillment: Database["public"]["Enums"]["chef_fulfillment"]
          fulfillment_date: string | null
          guest_email: string | null
          guest_phone: string | null
          id: string
          listing_id: string
          paid_at: string | null
          payment_method: string
          payment_proof_note: string | null
          payment_reference: string | null
          payment_status: string
          quantity: number
          source_video_id: string | null
          status: Database["public"]["Enums"]["chef_order_status"]
          stripe_payment_intent: string | null
          stripe_session_id: string | null
          total_cents: number
          updated_at: string
          user_id: string
        }
        SetofOptions: {
          from: "*"
          to: "chef_orders"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      validate_event_coupon: {
        Args: { _code: string; _event_slug: string }
        Returns: {
          discount_percent: number
          reason: string
          valid: boolean
        }[]
      }
    }
    Enums: {
      app_role: "guest" | "host" | "admin"
      chef_fulfillment: "pickup" | "delivery"
      chef_listing_kind:
        | "meal_prep"
        | "hosted_table"
        | "private_dining"
        | "product"
        | "merch"
      chef_listing_status: "draft" | "active" | "paused" | "sold_out"
      chef_order_status: "pending" | "confirmed" | "fulfilled" | "cancelled"
      chef_video_platform: "instagram" | "tiktok" | "youtube" | "upload"
      request_status:
        | "pending"
        | "approved"
        | "declined"
        | "paid"
        | "cancelled"
        | "waitlisted"
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
      app_role: ["guest", "host", "admin"],
      chef_fulfillment: ["pickup", "delivery"],
      chef_listing_kind: [
        "meal_prep",
        "hosted_table",
        "private_dining",
        "product",
        "merch",
      ],
      chef_listing_status: ["draft", "active", "paused", "sold_out"],
      chef_order_status: ["pending", "confirmed", "fulfilled", "cancelled"],
      chef_video_platform: ["instagram", "tiktok", "youtube", "upload"],
      request_status: [
        "pending",
        "approved",
        "declined",
        "paid",
        "cancelled",
        "waitlisted",
      ],
    },
  },
} as const
