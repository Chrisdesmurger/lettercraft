/**
 * Client Supabase configuré pour l'application
 * Ce fichier centralise l'instance Supabase utilisée dans toute l'app
 */

import { createClient } from '@supabase/supabase-js'

// Types pour la base de données
export type Database = {
    public: {
        Tables: {
            onboarding_responses: {
                Row: {
                    id: string
                    user_id: string
                    category: string
                    question_id: string
                    response: string
                    created_at: string
                    updated_at: string
                }
                Insert: {
                    id?: string
                    user_id: string
                    category: string
                    question_id: string
                    response: string
                    created_at?: string
                    updated_at?: string
                }
                Update: {
                    id?: string
                    user_id?: string
                    category?: string
                    question_id?: string
                    response?: string
                    created_at?: string
                    updated_at?: string
                }
            }
        }
    }
}

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

export const supabase = createClient<Database>(supabaseUrl, supabaseAnonKey)