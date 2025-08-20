export interface UserProfile {
  id: string;
  email: string;
  firstName?: string;
  lastName?: string;
  phone?: string;
  bio?: string;
  avatar_url?: string;
  created_at: string;
  generation_count: number;
  subscription_tier: "free" | "premium";
  subscription_end_date?: string;
}

export interface CV {
  id: string;
  user_id: string;
  name: string;
  file_url: string;
  size: number;
  upload_date: string;
  is_active: boolean;
  parsed_content?: any;
}

export interface UserSettings {
  notifications_email: boolean;
  notifications_push: boolean;
  newsletter: boolean;
  language: string;
  theme?: "light" | "dark";
}
