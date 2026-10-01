import { useEffect, useState } from "react";
import type { Session, User } from "@supabase/supabase-js";
import { supabase } from "@/lib/supabase";

export function useSupabaseAuth() {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(Boolean(supabase));

  useEffect(() => {
    const client = supabase;
    if (!client) {
      setLoading(false);
      return;
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
    };
  }, []);

  return { session, user: session?.user ?? null, loading };
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
