import { FormEvent, useEffect, useMemo, useState } from "react";
import { ArrowUpLeft, CheckCheck, Loader2, MessageCircle, Search, Send, UserRound } from "lucide-react";
import { toast } from "sonner";
import type { User } from "@supabase/supabase-js";
import { supabase } from "@/lib/supabase";

type Profile = { id: string; display_name: string; avatar_url?: string | null };
type Message = { id: string; conversation_id: string; sender_id: string; body: string; created_at: string };

type MessagesPanelProps = {
  user: User | null;
  onRequestAuth: () => void;
};

const profileTone = (profile: Profile) => {
  const tones = ["tone-ocean", "tone-lilac", "tone-mint", "tone-rose", "tone-honey"];
  const sum = profile.id.split("").reduce((acc, char) => acc + char.charCodeAt(0), 0);
  return tones[sum % tones.length];
};

function initials(name: string) {
  return name.trim().split(/\s+/).slice(0, 2).map((part) => part[0]).join("") || "؟";
}

export default function MessagesPanel({ user, onRequestAuth }: MessagesPanelProps) {
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [selectedProfile, setSelectedProfile] = useState<Profile | null>(null);
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [draft, setDraft] = useState("");
  const [search, setSearch] = useState("");
  const [loadingProfiles, setLoadingProfiles] = useState(false);
  const [loadingThread, setLoadingThread] = useState(false);
  const [sending, setSending] = useState(false);

  const visibleProfiles = useMemo(() => {
    const query = search.trim().toLowerCase();
    return profiles.filter((profile) => !query || profile.display_name.toLowerCase().includes(query));
  }, [profiles, search]);

  useEffect(() => {
    const client = supabase;
    if (!client || !user) return;

    let cancelled = false;
    const loadProfiles = async () => {
      setLoadingProfiles(true);
      const { data, error } = await client.from("profiles").select("id, display_name, avatar_url").neq("id", user.id).order("display_name");
      if (cancelled) return;
      setLoadingProfiles(false);
      if (error) {
        toast.error("تعذر تحميل قائمة المستخدمين", { description: "تأكد من تشغيل supabase/schema.sql." });
        return;
      }
      setProfiles((data ?? []) as Profile[]);
    };
    void loadProfiles();
    return () => { cancelled = true; };
  }, [user]);

  useEffect(() => {
    const client = supabase;
    if (!client || !user || !selectedProfile) return;

    let cancelled = false;
    const openThread = async () => {
      setLoadingThread(true);
      setMessages([]);
      const { data: mine } = await client.from("conversation_members").select("conversation_id").eq("user_id", user.id);
      const ids = (mine ?? []).map((row) => row.conversation_id as string);
      let existingId: string | null = null;
      if (ids.length) {
        const { data: theirs } = await client.from("conversation_members").select("conversation_id").eq("user_id", selectedProfile.id).in("conversation_id", ids).limit(1);
        existingId = theirs?.[0]?.conversation_id ?? null;
      }
      if (cancelled) return;
      setConversationId(existingId);
      if (existingId) {
        const { data, error } = await client.from("messages").select("id, conversation_id, sender_id, body, created_at").eq("conversation_id", existingId).order("created_at", { ascending: true });
        if (!error) setMessages((data ?? []) as Message[]);
      }
      setLoadingThread(false);
    };
    void openThread();
    return () => { cancelled = true; };
  }, [selectedProfile, user]);

  useEffect(() => {
    const client = supabase;
    if (!client || !conversationId) return;
    const channel = client.channel(`messages:${conversationId}`).on("postgres_changes", { event: "INSERT", schema: "public", table: "messages", filter: `conversation_id=eq.${conversationId}` }, (payload) => {
      const incoming = payload.new as Message;
      setMessages((current) => current.some((message) => message.id === incoming.id) ? current : [...current, incoming]);
    }).subscribe();
    return () => { void client.removeChannel(channel); };
  }, [conversationId]);

  const createConversation = async () => {
    const client = supabase;
    if (!client || !user || !selectedProfile) return null;
    const { data: conversation, error: conversationError } = await client.from("conversations").insert({}).select("id").single();
    if (conversationError || !conversation) {
      toast.error("تعذر إنشاء المحادثة", { description: conversationError?.message });
      return null;
    }
    const { error: membersError } = await client.from("conversation_members").insert([
      { conversation_id: conversation.id, user_id: user.id },
      { conversation_id: conversation.id, user_id: selectedProfile.id },
    ]);
    if (membersError) {
      toast.error("تعذر تجهيز أعضاء المحادثة", { description: membersError.message });
      return null;
    }
    setConversationId(conversation.id);
    return conversation.id as string;
  };

  const handleSend = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const client = supabase;
    const body = draft.trim();
    if (!client || !user || !selectedProfile || !body || sending) return;
    setSending(true);
    let targetConversation = conversationId;
    if (!targetConversation) targetConversation = await createConversation();
    if (!targetConversation) { setSending(false); return; }
    const { data, error } = await client.from("messages").insert({ conversation_id: targetConversation, sender_id: user.id, body }).select("id, conversation_id, sender_id, body, created_at").single();
    setSending(false);
    if (error) {
      toast.error("تعذر إرسال الرسالة", { description: error.message });
      return;
    }
    if (data) setMessages((current) => current.some((message) => message.id === data.id) ? current : [...current, data as Message]);
    setDraft("");
  };

  if (!user) {
    return <section className="messages-locked"><div className="messages-locked-icon"><MessageCircle size={26} /></div><div className="eyebrow compact"><span className="eyebrow-line" /> رسائل خاصة</div><h1>حواراتك، في مكانها الآمن.</h1><p>سجّل دخولك لتبدأ محادثات خاصة مع أعضاء Sawtio وتستقبل الرسائل لحظيًا.</p><button className="create-button" type="button" onClick={onRequestAuth}>سجّل الدخول <ArrowUpLeft size={17} /></button></section>;
  }

  return (
    <section className="messages-workspace">
      <div className="messages-header"><div><div className="eyebrow"><span className="eyebrow-line" /> مساحة خاصة</div><h1>محادثاتك</h1><p>رسائل مباشرة محفوظة في Supabase وتصل فورًا إلى الطرف الآخر.</p></div><div className="messages-user-badge"><UserRound size={15} /> {user.email}</div></div>
      <div className="messages-grid">
        <aside className="contacts-panel"><div className="contacts-heading"><div><strong>الأعضاء</strong><span>{profiles.length} أشخاص</span></div><MessageCircle size={18} /></div><label className="messages-search"><Search size={15} /><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="ابحث عن شخص" /></label><div className="contacts-list">{loadingProfiles ? <div className="messages-loading"><Loader2 size={18} className="spin" /> جارٍ التحميل</div> : visibleProfiles.length ? visibleProfiles.map((profile) => <button className={`contact-row ${selectedProfile?.id === profile.id ? "active" : ""}`} key={profile.id} type="button" onClick={() => setSelectedProfile(profile)}><div className={`contact-avatar ${profileTone(profile)}`}>{initials(profile.display_name)}</div><span><strong>{profile.display_name}</strong><small>عضو في Sawtio</small></span><ArrowUpLeft size={15} /></button>) : <div className="contacts-empty"><UserRound size={20} /><span>لا يوجد أعضاء آخرون بعد.</span><small>شارك رابط الموقع لبدء أول محادثة.</small></div>}</div></aside>
        <section className="thread-panel">{selectedProfile ? <><div className="thread-header"><div className={`contact-avatar ${profileTone(selectedProfile)}`}>{initials(selectedProfile.display_name)}</div><div><strong>{selectedProfile.display_name}</strong><span>محادثة خاصة ومشفرة أثناء النقل</span></div><span className="thread-status"><i /> متصل عبر Supabase</span></div><div className="thread-messages">{loadingThread ? <div className="messages-loading"><Loader2 size={19} className="spin" /> جارٍ فتح المحادثة</div> : messages.length ? messages.map((message) => <div className={`message-bubble ${message.sender_id === user.id ? "mine" : "theirs"}`} key={message.id}><p>{message.body}</p><small>{new Date(message.created_at).toLocaleTimeString("ar", { hour: "2-digit", minute: "2-digit" })}{message.sender_id === user.id && <CheckCheck size={12} />}</small></div>) : <div className="thread-empty"><MessageCircle size={24} /><strong>ابدأ الحديث</strong><span>اكتب أول رسالة إلى {selectedProfile.display_name}.</span></div>}</div><form className="message-composer" onSubmit={handleSend}><input value={draft} onChange={(event) => setDraft(event.target.value)} placeholder="اكتب رسالة خاصة…" aria-label="نص الرسالة" /><button type="submit" disabled={!draft.trim() || sending} aria-label="إرسال الرسالة"><Send size={17} /></button></form></> : <div className="thread-empty choose-thread"><MessageCircle size={28} /><strong>اختر شخصًا لبدء محادثة</strong><span>كل رسالة تُحفظ في قاعدة البيانات وتصل لحظيًا.</span></div>}</section>
      </div>
    </section>
  );
}
