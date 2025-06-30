import { createClient } from '@supabase/supabase-js'

// Use fallback values during build to avoid errors if env vars are missing
const supabaseUrl =
  process.env.NEXT_PUBLIC_SUPABASE_URL || 'http://localhost:54321'
const supabaseAnonKey =
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'public-anon-key'

export const supabase = createClient(supabaseUrl, supabaseAnonKey)

// Types pour les tables Supabase
export interface User {
  id: string
  email: string
  created_at: string
  generation_count: number
  onboarded: boolean
}

export interface Document {
  id: string
  user_id: string
  type: 'cv' | 'job_offer'
  content: string
  summary: string
  created_at: string
}

export interface GeneratedLetter {
  id: string
  user_id: string
  document_id: string
  job_offer_id: string
  content: string
  answers: Record<string, string>
  created_at: string
}
