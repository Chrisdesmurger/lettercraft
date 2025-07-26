/**
 * Client Supabase pour l'application
 * Configuration centralisée de l'instance Supabase
 */

import { createClient } from "@supabase/supabase-js";

// Configuration des types de base de données
export type Database = {
  public: {
    Tables: {
      onboarding_responses: {
        Row: {
          id: string;
          user_id: string;
          category: string;
          question_id: string;
          response: string;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          category: string;
          question_id: string;
          response: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          category?: string;
          question_id?: string;
          response?: string;
          created_at?: string;
          updated_at?: string;
        };
      };
      saved_letters: {
        Row: {
          id: string;
          user_id: string;
          job_title: string;
          company: string;
          content: string;
          language: string;
          metadata: any;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          job_title: string;
          company: string;
          content: string;
          language?: string;
          metadata?: any;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          job_title?: string;
          company?: string;
          content?: string;
          language?: string;
          metadata?: any;
          created_at?: string;
          updated_at?: string;
        };
      };
      user_quotas: {
        Row: {
          id: string;
          user_id: string;
          letters_generated: number;
          max_letters: number;
          reset_date: string;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          letters_generated?: number;
          max_letters?: number;
          reset_date?: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          letters_generated?: number;
          max_letters?: number;
          reset_date?: string;
          created_at?: string;
          updated_at?: string;
        };
      };
      user_profiles: {
        Row: {
          user_id: string;
          first_name: string | null;
          last_name: string | null;
          phone: string | null;
          country: string | null;
          language: string | null;
          birth_date: string | null;
          avatar_url: string | null;
          bio: string | null;
          subscription_tier: 'free' | 'premium';
          subscription_end_date: string | null;
          created_at: string | null;
          updated_at: string | null;
        };
        Insert: {
          user_id: string;
          first_name?: string | null;
          last_name?: string | null;
          phone?: string | null;
          country?: string | null;
          language?: string | null;
          birth_date?: string | null;
          avatar_url?: string | null;
          bio?: string | null;
          subscription_tier?: 'free' | 'premium';
          subscription_end_date?: string | null;
          created_at?: string | null;
          updated_at?: string | null;
        };
        Update: {
          user_id?: string;
          first_name?: string | null;
          last_name?: string | null;
          phone?: string | null;
          country?: string | null;
          language?: string | null;
          birth_date?: string | null;
          avatar_url?: string | null;
          bio?: string | null;
          subscription_tier?: 'free' | 'premium';
          subscription_end_date?: string | null;
          created_at?: string | null;
          updated_at?: string | null;
        };
      };
      countries: {
        Row: {
          code: string;
          name: string;
        };
        Insert: {
          code: string;
          name: string;
        };
        Update: {
          code?: string;
          name?: string;
        };
      };
      languages: {
        Row: {
          code: string;
          label: string;
          flag: string;
        };
        Insert: {
          code: string;
          label: string;
          flag: string;
        };
        Update: {
          code?: string;
          label?: string;
          flag?: string;
        };
      };
      candidates_profile: {
        Row: {
          id: string;
          user_id: string;
          title: string;
          language: string;
          description: string | null;
          file_url: string;
          uploaded_at: string;
          first_name: string | null;
          last_name: string | null;
          experiences: string[] | null;
          skills: string[] | null;
          education: string[] | null;
          file_size: number | null;
          is_active: boolean | null;
        };
        Insert: {
          id?: string;
          user_id: string;
          title: string;
          language: string;
          description?: string | null;
          file_url: string;
          uploaded_at?: string;
          first_name?: string | null;
          last_name?: string | null;
          experiences?: string[] | null;
          skills?: string[] | null;
          education?: string[] | null;
          file_size?: number | null;
          is_active?: boolean | null;
        };
        Update: {
          id?: string;
          user_id?: string;
          title?: string;
          language?: string;
          description?: string | null;
          file_url?: string;
          uploaded_at?: string;
          first_name?: string | null;
          last_name?: string | null;
          experiences?: string[] | null;
          skills?: string[] | null;
          education?: string[] | null;
          file_size?: number | null;
          is_active?: boolean | null;
        };
      };
      job_offers: {
        Row: {
          id: string;
          user_id: string;
          title: string;
          company: string;
          description: string;
          requirements: string[] | null;
          location: string | null;
          salary_range: string | null;
          employment_type: string | null;
          source_url: string | null;
          extracted_keywords: string[] | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          title: string;
          company: string;
          description: string;
          requirements?: string[] | null;
          location?: string | null;
          salary_range?: string | null;
          employment_type?: string | null;
          source_url?: string | null;
          extracted_keywords?: string[] | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          title?: string;
          company?: string;
          description?: string;
          requirements?: string[] | null;
          location?: string | null;
          salary_range?: string | null;
          employment_type?: string | null;
          source_url?: string | null;
          extracted_keywords?: string[] | null;
          created_at?: string;
          updated_at?: string;
        };
      };
      letter_questionnaire_responses: {
        Row: {
          id: string;
          user_id: string;
          job_offer_id: string;
          cv_id: string;
          motivation: string;
          experience_highlight: any;
          skills_match: string[];
          company_values: string;
          additional_context: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          job_offer_id: string;
          cv_id: string;
          motivation: string;
          experience_highlight: any;
          skills_match: string[];
          company_values: string;
          additional_context?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          job_offer_id?: string;
          cv_id?: string;
          motivation?: string;
          experience_highlight?: any;
          skills_match?: string[];
          company_values?: string;
          additional_context?: string | null;
          created_at?: string;
          updated_at?: string;
        };
      };
      generated_letters: {
        Row: {
          id: string;
          user_id: string;
          questionnaire_response_id: string;
          job_offer_id: string;
          cv_id: string;
          content: string;
          html_content: string | null;
          pdf_url: string | null;
          generation_settings: any;
          openai_model: string;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          questionnaire_response_id: string;
          job_offer_id: string;
          cv_id: string;
          content: string;
          html_content?: string | null;
          pdf_url?: string | null;
          generation_settings?: any;
          openai_model?: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          questionnaire_response_id?: string;
          job_offer_id?: string;
          cv_id?: string;
          content?: string;
          html_content?: string | null;
          pdf_url?: string | null;
          generation_settings?: any;
          openai_model?: string;
          created_at?: string;
          updated_at?: string;
        };
      };
      brevo_contacts_sync: {
        Row: {
          id: string;
          user_id: string;
          brevo_contact_id: number | null;
          email: string;
          sync_status: 'pending' | 'synced' | 'failed' | 'outdated';
          last_synced_at: string | null;
          sync_attempts: number;
          error_message: string | null;
          brevo_attributes: any | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          brevo_contact_id?: number | null;
          email: string;
          sync_status?: 'pending' | 'synced' | 'failed' | 'outdated';
          last_synced_at?: string | null;
          sync_attempts?: number;
          error_message?: string | null;
          brevo_attributes?: any | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          brevo_contact_id?: number | null;
          email?: string;
          sync_status?: 'pending' | 'synced' | 'failed' | 'outdated';
          last_synced_at?: string | null;
          sync_attempts?: number;
          error_message?: string | null;
          brevo_attributes?: any | null;
          created_at?: string;
          updated_at?: string;
        };
      };
      brevo_lists: {
        Row: {
          id: string;
          brevo_list_id: number;
          name: string;
          type: 'manual' | 'dynamic';
          criteria: any | null;
          contact_count: number;
          is_active: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          brevo_list_id: number;
          name: string;
          type?: 'manual' | 'dynamic';
          criteria?: any | null;
          contact_count?: number;
          is_active?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          brevo_list_id?: number;
          name?: string;
          type?: 'manual' | 'dynamic';
          criteria?: any | null;
          contact_count?: number;
          is_active?: boolean;
          created_at?: string;
          updated_at?: string;
        };
      };
      brevo_contact_lists: {
        Row: {
          id: string;
          contact_sync_id: string;
          list_id: string;
          added_at: string;
        };
        Insert: {
          id?: string;
          contact_sync_id: string;
          list_id: string;
          added_at?: string;
        };
        Update: {
          id?: string;
          contact_sync_id?: string;
          list_id?: string;
          added_at?: string;
        };
      };
      brevo_sync_jobs: {
        Row: {
          id: string;
          job_type: 'import_single' | 'import_batch' | 'update_contact' | 'delete_contact' | 'sync_lists' | 'full_sync';
          status: 'pending' | 'running' | 'completed' | 'failed' | 'cancelled';
          total_items: number | null;
          processed_items: number;
          failed_items: number;
          data: any | null;
          error_details: any | null;
          started_at: string | null;
          completed_at: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          job_type: 'import_single' | 'import_batch' | 'update_contact' | 'delete_contact' | 'sync_lists' | 'full_sync';
          status?: 'pending' | 'running' | 'completed' | 'failed' | 'cancelled';
          total_items?: number | null;
          processed_items?: number;
          failed_items?: number;
          data?: any | null;
          error_details?: any | null;
          started_at?: string | null;
          completed_at?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          job_type?: 'import_single' | 'import_batch' | 'update_contact' | 'delete_contact' | 'sync_lists' | 'full_sync';
          status?: 'pending' | 'running' | 'completed' | 'failed' | 'cancelled';
          total_items?: number | null;
          processed_items?: number;
          failed_items?: number;
          data?: any | null;
          error_details?: any | null;
          started_at?: string | null;
          completed_at?: string | null;
          created_at?: string;
          updated_at?: string;
        };
      };
      brevo_contact_events: {
        Row: {
          id: string;
          user_id: string;
          event_type: string;
          event_data: any;
          source: string;
          processed: boolean;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          event_type: string;
          event_data: any;
          source?: string;
          processed?: boolean;
          created_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          event_type?: string;
          event_data?: any;
          source?: string;
          processed?: boolean;
          created_at?: string;
        };
      };
      brevo_api_config: {
        Row: {
          id: string;
          key_name: string;
          value: string;
          is_encrypted: boolean;
          updated_at: string;
        };
        Insert: {
          id?: string;
          key_name: string;
          value: string;
          is_encrypted?: boolean;
          updated_at?: string;
        };
        Update: {
          id?: string;
          key_name?: string;
          value?: string;
          is_encrypted?: boolean;
          updated_at?: string;
        };
      };
      brevo_rate_limits: {
        Row: {
          id: string;
          endpoint: string;
          requests_made: number;
          window_start: string;
          last_request_at: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          endpoint: string;
          requests_made?: number;
          window_start?: string;
          last_request_at?: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          endpoint?: string;
          requests_made?: number;
          window_start?: string;
          last_request_at?: string;
          created_at?: string;
        };
      };
    };
  };
};

// Vérification des variables d'environnement
if (!process.env.NEXT_PUBLIC_SUPABASE_URL) {
  throw new Error("Missing env.NEXT_PUBLIC_SUPABASE_URL");
}
if (!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
  throw new Error("Missing env.NEXT_PUBLIC_SUPABASE_ANON_KEY");
}

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

// Création du client Supabase avec typage
export const supabase = createClient<Database>(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
  },
});

// Export des types utiles
export type Tables<T extends keyof Database["public"]["Tables"]> =
  Database["public"]["Tables"][T]["Row"];

export type InsertTables<T extends keyof Database["public"]["Tables"]> =
  Database["public"]["Tables"][T]["Insert"];

export type UpdateTables<T extends keyof Database["public"]["Tables"]> =
  Database["public"]["Tables"][T]["Update"];

// Helpers pour les requêtes typées
export const db = {
  onboardingResponses: () => supabase.from("onboarding_responses"),
  savedLetters: () => supabase.from("saved_letters"),
  userQuotas: () => supabase.from("user_quotas"),
  userProfiles: () => supabase.from("user_profiles"),
  countries: () => supabase.from("countries"),
  languages: () => supabase.from("languages"),
  candidatesProfile: () => supabase.from("candidates_profile"),
  jobOffers: () => supabase.from("job_offers"),
  letterQuestionnaireResponses: () => supabase.from("letter_questionnaire_responses"),
  generatedLetters: () => supabase.from("generated_letters"),
  // Brevo sync tables
  brevoContactsSync: () => supabase.from("brevo_contacts_sync"),
  brevoLists: () => supabase.from("brevo_lists"),
  brevoContactLists: () => supabase.from("brevo_contact_lists"),
  brevoSyncJobs: () => supabase.from("brevo_sync_jobs"),
  brevoContactEvents: () => supabase.from("brevo_contact_events"),
  brevoApiConfig: () => supabase.from("brevo_api_config"),
  brevoRateLimits: () => supabase.from("brevo_rate_limits"),
};
