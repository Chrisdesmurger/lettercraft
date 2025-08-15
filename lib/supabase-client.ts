/**
 * Client Supabase pour l'application
 * Configuration centralisée de l'instance Supabase
 */

import { createClient } from "@supabase/supabase-js";

// Configuration des types de base de données
export type Database = {
  auth: {
    Tables: {
      users: {
        Row: {
          id: string;
          email: string;
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
          stripe_customer_id: string | null;
          stripe_subscription_id: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          email: string;
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
          stripe_customer_id?: string | null;
          stripe_subscription_id?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          email?: string;
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
          stripe_customer_id?: string | null;
          stripe_subscription_id?: string | null;
          created_at?: string;
          updated_at?: string;
        };
      };
    };
  };
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
      users_with_profiles: {
        Row: {
          id: string;
          email: string;
          first_name: string | null;
          last_name: string | null;
          profile_phone: string | null;
          country: string | null;
          language: string | null;
          birth_date: string | null;
          avatar_url: string | null;
          bio: string | null;
          subscription_tier: 'free' | 'premium';
          subscription_end_date: string | null;
          stripe_customer_id: string | null;
          stripe_subscription_id: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: never; // Vue en lecture seule
        Update: never; // Vue en lecture seule
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
          stripe_customer_id: string | null;
          stripe_subscription_id: string | null;
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
          stripe_customer_id?: string | null;
          stripe_subscription_id?: string | null;
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
          stripe_customer_id?: string | null;
          stripe_subscription_id?: string | null;
          created_at?: string | null;
          updated_at?: string | null;
        };
      };
      feedback_categories: {
        Row: {
          key: string;
          label_fr: string;
          label_en: string;
          created_at: string;
        };
        Insert: {
          key: string;
          label_fr: string;
          label_en: string;
          created_at?: string;
        };
        Update: {
          key?: string;
          label_fr?: string;
          label_en?: string;
          created_at?: string;
        };
      };
      letter_reviews: {
        Row: {
          id: string;
          letter_id: string;
          user_id: string;
          rating: number;
          feedback: string | null;
          categories: string[];
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          letter_id: string;
          user_id: string;
          rating: number;
          feedback?: string | null;
          categories?: string[];
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          letter_id?: string;
          user_id?: string;
          rating?: number;
          feedback?: string | null;
          categories?: string[];
          created_at?: string;
          updated_at?: string;
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
  users: () => supabase.from("users_with_profiles"),
  userProfiles: () => supabase.from("user_profiles"),
  countries: () => supabase.from("countries"),
  languages: () => supabase.from("languages"),
  candidatesProfile: () => supabase.from("candidates_profile"),
  jobOffers: () => supabase.from("job_offers"),
  letterQuestionnaireResponses: () => supabase.from("letter_questionnaire_responses"),
  generatedLetters: () => supabase.from("generated_letters"),
  letterReviews: () => supabase.from("letter_reviews"),
  feedbackCategories: () => supabase.from("feedback_categories"),
};
