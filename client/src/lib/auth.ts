import { useCallback, useEffect, useState } from "react";
import type { Session, User } from "@supabase/supabase-js";
import { supabase } from "@/lib/supabase";

const GUEST_STORAGE_KEY = "sawtio_guest_user";
const LOCAL_USERS_KEY = "sawtio_registered_users";

export type GuestUser = {
  id: string;
  email: string;
  display_name: string;
  handle?: string;
  created_at: string;
  is_guest: boolean;
};

export function getStoredGuest(): User | null {
  try {
    const raw = localStorage.getItem(GUEST_STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    return {
      id: parsed.id || `guest-${Date.now()}`,
      email: parsed.email || "user@sawtio.app",
      user_metadata: {
        display_name: parsed.display_name || "عضو Sawtio",
        handle: parsed.handle || "member",
      },
      app_metadata: { is_guest: parsed.is_guest ?? false },
      aud: "authenticated",
      created_at: parsed.created_at || new Date().toISOString(),
    } as unknown as User;
  } catch {
    return null;
  }
}

export function saveGuestUser(displayName: string, email?: string, handle?: string): User {
  const guest: GuestUser = {
    id: `user-${Math.random().toString(36).slice(2, 9)}`,
    display_name: displayName.trim() || "عضو Sawtio",
    email: email?.trim() || "user@sawtio.app",
    handle: handle?.trim() || displayName.trim().toLowerCase().replace(/\s+/g, "_"),
    created_at: new Date().toISOString(),
    is_guest: !email,
  };
  localStorage.setItem(GUEST_STORAGE_KEY, JSON.stringify(guest));
  window.dispatchEvent(new Event("sawtio_auth_change"));
  return {
    id: guest.id,
    email: guest.email,
    user_metadata: { display_name: guest.display_name, handle: guest.handle },
    app_metadata: { is_guest: guest.is_guest },
    aud: "authenticated",
    created_at: guest.created_at,
  } as unknown as User;
}

export function clearGuestUser() {
  localStorage.removeItem(GUEST_STORAGE_KEY);
  window.dispatchEvent(new Event("sawtio_auth_change"));
}

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

  // Local Accounts Fallback
  try {
    const raw = localStorage.getItem(LOCAL_USERS_KEY);
    const users: Array<{ email: string; passwordHash: string; displayName: string; handle?: string }> = raw
      ? JSON.parse(raw)
      : [];

    const found = users.find((u) => u.email === cleanEmail && u.passwordHash === password);
    if (found) {
      saveGuestUser(found.displayName, found.email, found.handle);
      return { success: true };
    }

    // If no existing local account with this email, allow direct first-time sign in or ask to create account
    if (users.length > 0 && !found) {
      return {
        success: false,
        error: "البريد الإلكتروني أو كلمة المرور غير صحيحة. هل قمت بإنشاء حساب أولاً؟",
      };
    }

    // If clean slate: login directly
    saveGuestUser(cleanEmail.split("@")[0], cleanEmail);
    return { success: true };
  } catch {
    saveGuestUser(cleanEmail.split("@")[0], cleanEmail);
    return { success: true };
  }
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
        saveGuestUser(cleanName, cleanEmail, cleanHandle);
        return { success: true };
      }
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      return { success: false, error: message };
    }
  }

  // Local Accounts Store
  try {
    const raw = localStorage.getItem(LOCAL_USERS_KEY);
    const users: Array<{ email: string; passwordHash: string; displayName: string; handle?: string }> = raw
      ? JSON.parse(raw)
      : [];

    const existing = users.find((u) => u.email === cleanEmail);
    if (existing) {
      return { success: false, error: "هذا البريد مسجل مسبقًا، يرجى تسجيل الدخول." };
    }

    users.push({
      email: cleanEmail,
      passwordHash: password,
      displayName: cleanName,
      handle: cleanHandle,
    });
    localStorage.setItem(LOCAL_USERS_KEY, JSON.stringify(users));
  } catch {}

  saveGuestUser(cleanName, cleanEmail, cleanHandle);
  return { success: true };
}

export function useSupabaseAuth() {
  const [session, setSession] = useState<Session | null>(null);
  const [guestUser, setGuestUser] = useState<User | null>(getStoredGuest);
  const [loading, setLoading] = useState(Boolean(supabase));

  useEffect(() => {
    const handleAuthChange = () => {
      setGuestUser(getStoredGuest());
    };
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
    clearGuestUser();
    if (supabase) {
      await supabase.auth.signOut();
    }
  }, []);

  const activeUser = session?.user ?? guestUser;

  return {
    session,
    user: activeUser,
    loading,
    signOut,
    signInAsGuest: saveGuestUser,
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
