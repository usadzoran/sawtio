import { useCallback, useEffect, useState } from "react";
import type { Session, User } from "@supabase/supabase-js";
import { supabase } from "@/lib/supabase";

export async function signInWithEmail(
  email: string,
  password: string
): Promise<{ success: boolean; error?: string }> {
  const cleanEmail = email.trim().toLowerCase();
  if (!cleanEmail || !password) {
    return { success: false, error: "يرجى إدخال البريد الإلكتروني وكلمة المرور." };
  }

  // If Supabase is connected, authenticate via Supabase Auth
  if (supabase) {
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email: cleanEmail,
        password,
      });

      if (!error && data.user) {
        await ensureProfile(data.user);
        window.dispatchEvent(new Event("sawtio_auth_change"));
        return { success: true };
      }

      // If Supabase returns invalid login, return error message
      if (error) {
        return { success: false, error: error.message };
      }
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      return { success: false, error: message };
    }
  }

  return { success: false, error: "خدمة المصادقة غير متاحة حاليًا. أعد تحميل الصفحة وحاول مرة أخرى." };
}

export async function signUpWithEmail(
  email: string,
  password: string,
  displayName: string,
  handle?: string
): Promise<{ success: boolean; error?: string }> {
  const cleanEmail = email.trim().toLowerCase();
  const cleanName = displayName.trim();
  const cleanHandle = (handle?.trim() || cleanName.toLowerCase().replace(/\s+/g, "_")).replace(/^@/, "");

  if (!cleanEmail || !cleanEmail.includes("@")) {
    return { success: false, error: "يرجى إدخال بريد إلكتروني صالح." };
  }
  if (!password || password.length < 6) {
    return { success: false, error: "كلمة المرور يجب أن تكون 6 أحرف على الأقل." };
  }
  if (!cleanName) {
    return { success: false, error: "يرجى إدخال اسم العرض." };
  }

  // If Supabase is connected
  if (supabase) {
    try {
      const { data, error } = await supabase.auth.signUp({
        email: cleanEmail,
        password,
        options: {
          data: {
            display_name: cleanName,
            handle: cleanHandle,
          },
        },
      });

      if (error) {
        return { success: false, error: error.message };
      }

      if (data.user) {
        await ensureProfile(data.user, cleanName, cleanHandle);
        return { success: true };
      }
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      return { success: false, error: message };
    }
  }

  return { success: false, error: "خدمة المصادقة غير متاحة حاليًا. أعد تحميل الصفحة وحاول مرة أخرى." };
}

export function useSupabaseAuth() {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(Boolean(supabase));

  useEffect(() => {
    const handleAuthChange = () => undefined;
    window.addEventListener("sawtio_auth_change", handleAuthChange);

    const client = supabase;
    if (!client) {
      setLoading(false);
      return () => {
        window.removeEventListener("sawtio_auth_change", handleAuthChange);
      };
    }

    let mounted = true;
    void client.auth.getSession().then(({ data }) => {
      if (!mounted) return;
      setSession(data.session);
      setLoading(false);
      if (data.session?.user) void ensureProfile(data.session.user);
    });

    const { data: listener } = client.auth.onAuthStateChange((_event, nextSession) => {
      if (!mounted) return;
      setSession(nextSession);
      setLoading(false);
      if (nextSession?.user) void ensureProfile(nextSession.user);
    });

    return () => {
      mounted = false;
      listener.subscription.unsubscribe();
      window.removeEventListener("sawtio_auth_change", handleAuthChange);
    };
  }, []);

  const signOut = useCallback(async () => {
    if (supabase) await supabase.auth.signOut();
  }, []);

  return {
    session,
    user: session?.user ?? null,
    loading,
    signOut,
  };
}

async function ensureProfile(user: User, displayName?: string, handle?: string) {
  const client = supabase;
  if (!client) return;
  const fallbackName = displayName || (user.user_metadata?.display_name as string) || user.email?.split("@")[0] || "عضو Sawtio";
  const fallbackHandle = handle || (user.user_metadata?.handle as string) || fallbackName.toLowerCase().replace(/\s+/g, "_");
  try {
    await client.from("profiles").upsert(
      {
        id: user.id,
        display_name: fallbackName,
        handle: fallbackHandle,
      },
      { onConflict: "id", ignoreDuplicates: true }
    );
  } catch {}
}
