import { createClient, type SupabaseClient } from "@supabase/supabase-js";

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string | undefined;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined;

/**
 * The anon key is intentionally browser-safe, but the values still come from
 * Webdev secrets rather than being committed to the repository.
 */
export const supabase: SupabaseClient | null = supabaseUrl && supabaseAnonKey
  ? createClient(supabaseUrl, supabaseAnonKey, {
      auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true },
    })
  : null;

export type SupabaseMember = {
  name: string;
  role: "مضيف" | "متحدث" | "مستمع";
  initials: string;
  tone: string;
  speaking?: boolean;
};

export type SupabaseRoomRow = {
  id: string;
  title: string;
  topic: string;
  category: string;
  listeners: number;
  status: string;
  accent: string;
  host: string;
  host_initials: string;
  host_tone: string;
  private: boolean;
  members: SupabaseMember[];
  created_at: string;
};
