import { createClient, type SupabaseClient } from "@supabase/supabase-js";

const STORAGE_URL_KEY = "sawtio_supabase_url";
const STORAGE_KEY_KEY = "sawtio_supabase_anon_key";

export function getSupabaseCredentials(): { url: string; anonKey: string; isCustom: boolean } {
  const envUrl = (import.meta.env.VITE_SUPABASE_URL as string | undefined)?.trim();
  const envKey = (import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined)?.trim();

  let storedUrl = "";
  let storedKey = "";
  try {
    storedUrl = localStorage.getItem(STORAGE_URL_KEY)?.trim() || "";
    storedKey = localStorage.getItem(STORAGE_KEY_KEY)?.trim() || "";
  } catch {}

  if (storedUrl && storedKey) {
    return { url: storedUrl, anonKey: storedKey, isCustom: true };
  }

  if (envUrl && envKey) {
    return { url: envUrl, anonKey: envKey, isCustom: false };
  }

  return { url: "", anonKey: "", isCustom: false };
}

function createSupabaseClient(url: string, key: string): SupabaseClient | null {
  if (!url || !key) return null;
  try {
    return createClient(url, key, {
      auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true },
    });
  } catch (error) {
    console.warn("[Sawtio] Failed to initialize Supabase client:", error);
    return null;
  }
}

const initialCreds = getSupabaseCredentials();
export let supabase: SupabaseClient | null = createSupabaseClient(initialCreds.url, initialCreds.anonKey);

export function isSupabaseConnected(): boolean {
  return Boolean(supabase);
}

export async function testSupabaseConnection(
  url: string,
  anonKey: string
): Promise<{ success: boolean; message: string; tablesFound?: boolean }> {
  const trimmedUrl = url.trim();
  const trimmedKey = anonKey.trim();

  if (!trimmedUrl.startsWith("http://") && !trimmedUrl.startsWith("https://")) {
    return { success: false, message: "رابط المشروع يجب أن يبدأ بـ https://" };
  }
  if (!trimmedKey) {
    return { success: false, message: "يرجى إدخال المفتاح العام (Anon Key)" };
  }

  try {
    const testClient = createClient(trimmedUrl, trimmedKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    });

    const { error } = await testClient.from("rooms").select("id").limit(1);

    if (!error) {
      return {
        success: true,
        message: "تم الاتصال بنجاح وتأكيد جاهزية جداول قاعدة البيانات!",
        tablesFound: true,
      };
    }

    if (error.code === "42P01" || error.message.includes("does not exist") || error.message.includes("not found")) {
      return {
        success: true,
        message: "تم التحقق من بيانات الاتصال بنجاح! الجداول غير منشأة بعد، يمكنك تشغيل supabase/full_schema.sql في Supabase SQL Editor.",
        tablesFound: false,
      };
    }

    return {
      success: false,
      message: `خطأ من Supabase: ${error.message}`,
    };
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : String(err);
    return {
      success: false,
      message: `تعذر الاتصال بـ Supabase: ${errorMsg}`,
    };
  }
}

export function saveSupabaseConnection(url: string, anonKey: string): boolean {
  const trimmedUrl = url.trim();
  const trimmedKey = anonKey.trim();
  if (!trimmedUrl || !trimmedKey) return false;

  try {
    localStorage.setItem(STORAGE_URL_KEY, trimmedUrl);
    localStorage.setItem(STORAGE_KEY_KEY, trimmedKey);
    supabase = createSupabaseClient(trimmedUrl, trimmedKey);
    window.dispatchEvent(new CustomEvent("sawtio_supabase_change"));
    return true;
  } catch {
    return false;
  }
}

export function disconnectSupabase(): void {
  try {
    localStorage.removeItem(STORAGE_URL_KEY);
    localStorage.removeItem(STORAGE_KEY_KEY);
  } catch {}

  const envUrl = (import.meta.env.VITE_SUPABASE_URL as string | undefined)?.trim() || "";
  const envKey = (import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined)?.trim() || "";
  supabase = createSupabaseClient(envUrl, envKey);
  window.dispatchEvent(new CustomEvent("sawtio_supabase_change"));
}

export type SupabaseMember = {
  name: string;
  role: "مضيف" | "متحدث" | "مستمع";
  initials: string;
  tone: string;
  speaking?: boolean;
};

export type SupabaseRoomRow = {
  id: string;
  slug: string;
  host_id: string | null;
  title: string;
  topic: string;
  description: string | null;
  cover_color: string | null;
  status: string;
  max_speakers: number;
  listener_count: number;
  tags: string[];
  created_at: string;
  ended_at: string | null;
};
