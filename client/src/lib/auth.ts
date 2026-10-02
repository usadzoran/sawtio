import { useCallback, useEffect, useState } from "react";
import type { Session, User } from "@supabase/supabase-js";
import { supabase } from "@/lib/supabase";

const GUEST_STORAGE_KEY = "sawtio_guest_user";

export type GuestUser = {
  id: string;
  email: string;
  display_name: string;
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
      email: parsed.email || "guest@sawtio.app",
      user_metadata: { display_name: parsed.display_name || "ضيف Sawtio" },
      app_metadata: { is_guest: true },
      aud: "authenticated",
      created_at: parsed.created_at || new Date().toISOString(),
    } as unknown as User;
  } catch {
    return null;
  }
}

export function saveGuestUser(displayName: string, email?: string): User {
  const guest: GuestUser = {
    id: `guest-${Math.random().toString(36).slice(2, 9)}`,
    display_name: displayName.trim() || "ضيف Sawtio",
    email: email?.trim() || "guest@sawtio.app",
    created_at: new Date().toISOString(),
    is_guest: true,
  };
  localStorage.setItem(GUEST_STORAGE_KEY, JSON.stringify(guest));
  window.dispatchEvent(new Event("sawtio_auth_change"));
  return {
    id: guest.id,
    email: guest.email,
    user_metadata: { display_name: guest.display_name },
    app_metadata: { is_guest: true },
    aud: "authenticated",
    created_at: guest.created_at,
  } as unknown as User;
}

export function clearGuestUser() {
  localStorage.removeItem(GUEST_STORAGE_KEY);
  window.dispatchEvent(new Event("sawtio_auth_change"));
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

async function ensureProfile(user: User) {
  const client = supabase;
  if (!client) return;
  const fallbackName = user.email?.split("@")[0] || "عضو جديد";
  await client.from("profiles").upsert(
    { id: user.id, display_name: fallbackName },
    { onConflict: "id", ignoreDuplicates: true },
  );
}
