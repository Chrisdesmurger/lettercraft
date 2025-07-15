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
};
