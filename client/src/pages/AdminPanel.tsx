import { useEffect, useMemo, useState } from "react";
import { ArrowUpLeft, DoorOpen, LayoutDashboard, Loader2, MessageSquare, RefreshCw, ShieldAlert, Users, Volume2 } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { useSupabaseAuth } from "@/lib/auth";

type AdminProfile = { id: string; handle: string | null; display_name: string; role: string | null; level: number | null; created_at: string };
type AdminRoom = { id: string; title: string; status: string; listener_count: number; created_at: string };
type AdminMessage = { id: string | number; body: string; sender_id: string; room_id?: string | null; conversation_id?: string | null; message_type?: string | null; created_at: string };

const dateLabel = (value: string) => new Date(value).toLocaleString("ar", { dateStyle: "medium", timeStyle: "short" });
const shortId = (value: string) => `${value.slice(0, 6)}…${value.slice(-4)}`;

export default function AdminPanel() {
  const { user, loading: authLoading } = useSupabaseAuth();
  const [isAdmin, setIsAdmin] = useState(false);
  const [checking, setChecking] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [profiles, setProfiles] = useState<AdminProfile[]>([]);
  const [rooms, setRooms] = useState<AdminRoom[]>([]);
  const [roomMessages, setRoomMessages] = useState<AdminMessage[]>([]);
  const [directMessages, setDirectMessages] = useState<AdminMessage[]>([]);
  const [refreshing, setRefreshing] = useState(false);

  const loadDashboard = async () => {
    const client = supabase;
    if (!client || !user) return;
    setRefreshing(true);
    setError(null);
    const { data: profile, error: profileError } = await client.from("profiles").select("role").eq("id", user.id).maybeSingle();
    if (profileError) {
      setRefreshing(false);
      setError("تعذر التحقق من صلاحيات حسابك.");
      return;
    }
    const allowed = profile?.role === "admin";
    setIsAdmin(allowed);
    if (!allowed) {
      setRefreshing(false);
      return;
    }
    const [{ data: users, error: usersError }, { data: roomsData, error: roomsError }, { data: roomMessagesData, error: roomMessagesError }, { data: directMessagesData, error: directMessagesError }] = await Promise.all([
      client.from("profiles").select("id, handle, display_name, role, level, created_at").order("created_at", { ascending: false }).limit(100),
      client.from("rooms").select("id, title, status, listener_count, created_at").order("created_at", { ascending: false }).limit(100),
      client.from("room_messages").select("id, body, sender_id, room_id, message_type, created_at").order("created_at", { ascending: false }).limit(50),
      client.from("direct_messages").select("id, body, sender_id, conversation_id, created_at").order("created_at", { ascending: false }).limit(50),
    ]);
    setRefreshing(false);
    const firstError = usersError || roomsError || roomMessagesError || directMessagesError;
    if (firstError) {
      setError("تم فتح اللوحة جزئيًا؛ تأكد من سياسات RLS الخاصة بالمدير.");
    }
    setProfiles((users ?? []) as AdminProfile[]);
    setRooms((roomsData ?? []) as AdminRoom[]);
    setRoomMessages((roomMessagesData ?? []) as AdminMessage[]);
    setDirectMessages((directMessagesData ?? []) as AdminMessage[]);
  };

  useEffect(() => {
    if (!user) {
      setChecking(!authLoading);
      return;
    }
    setChecking(true);
    void loadDashboard().finally(() => setChecking(false));
  }, [authLoading, user]);

  const activeRooms = useMemo(() => rooms.filter((room) => ["live", "active", "مباشر الآن"].includes(room.status)).length, [rooms]);
  const admins = useMemo(() => profiles.filter((profile) => profile.role === "admin").length, [profiles]);

  if (checking || authLoading) {
    return <div className="admin-state"><Loader2 className="spin" size={25} /><span>جارٍ التحقق من صلاحيات الإدارة…</span></div>;
  }
  if (!user) {
    return <div className="admin-state"><ShieldAlert size={28} /><h1>تسجيل الدخول مطلوب</h1><p>هذه الصفحة متاحة لفريق إدارة Sawtio فقط.</p><a className="admin-back" href="/">العودة إلى Sawtio <ArrowUpLeft size={16} /></a></div>;
  }
  if (!isAdmin) {
    return <div className="admin-state"><ShieldAlert size={28} /><h1>ليس لديك صلاحية الإدارة</h1><p>حسابك مسجل، لكن دوره لا يسمح بمراقبة بيانات المستخدمين أو الرسائل.</p><a className="admin-back" href="/">العودة إلى Sawtio <ArrowUpLeft size={16} /></a></div>;
  }

  return <div className="admin-app" dir="rtl">
    <header className="admin-topbar"><div className="admin-brand"><div className="admin-brand-mark"><Volume2 size={18} /></div><div><strong>Sawtio Control</strong><small>لوحة الإدارة والمراقبة</small></div></div><div className="admin-actions"><span className="admin-live-dot"><i /> اتصال قاعدة البيانات نشط</span><button type="button" className="admin-refresh" onClick={() => void loadDashboard()} disabled={refreshing}><RefreshCw size={15} className={refreshing ? "spin" : ""} /> تحديث</button><a href="/" className="admin-back">العودة للموقع <ArrowUpLeft size={15} /></a></div></header>
    <main className="admin-main"><div className="admin-heading"><div><div className="eyebrow"><span className="eyebrow-line" /> مساحة محمية</div><h1>نظرة على Sawtio.</h1><p>مراقبة تشغيلية للبيانات الحقيقية من Supabase، بدون عرض أي محتوى للزوار العاديين.</p></div><div className="admin-identity"><span>مدير النظام</span><strong>{user.email}</strong></div></div>
      {error && <div className="admin-alert"><ShieldAlert size={16} /> {error}</div>}
      <section className="admin-stats"><article><span className="admin-stat-icon coral"><Users size={18} /></span><div><small>المستخدمون</small><strong>{profiles.length}</strong></div></article><article><span className="admin-stat-icon teal"><Volume2 size={18} /></span><div><small>الغرف المباشرة</small><strong>{activeRooms}</strong></div></article><article><span className="admin-stat-icon violet"><MessageSquare size={18} /></span><div><small>رسائل الغرف</small><strong>{roomMessages.length}</strong></div></article><article><span className="admin-stat-icon amber"><DoorOpen size={18} /></span><div><small>المديرون</small><strong>{admins}</strong></div></article></section>
      <div className="admin-columns"><section className="admin-card"><div className="admin-card-heading"><div><h2>المستخدمون</h2><span>آخر 100 حساب من جدول profiles</span></div><Users size={18} /></div><div className="admin-table-wrap"><table className="admin-table"><thead><tr><th>المستخدم</th><th>الدور</th><th>المستوى</th><th>الانضمام</th></tr></thead><tbody>{profiles.length ? profiles.map((profile) => <tr key={profile.id}><td><strong>{profile.display_name || profile.handle || "بدون اسم"}</strong><small>{profile.handle ? `@${profile.handle}` : shortId(profile.id)}</small></td><td><span className={`role-pill ${profile.role === "admin" ? "admin" : ""}`}>{profile.role || "member"}</span></td><td>{profile.level ?? 1}</td><td>{dateLabel(profile.created_at)}</td></tr>) : <tr><td colSpan={4} className="admin-empty">لا توجد حسابات ظاهرة.</td></tr>}</tbody></table></div></section>
        <section className="admin-card"><div className="admin-card-heading"><div><h2>الغرف</h2><span>حالة الغرف وعدد المستمعين</span></div><LayoutDashboard size={18} /></div><div className="admin-table-wrap"><table className="admin-table"><thead><tr><th>الغرفة</th><th>الحالة</th><th>المستمعون</th><th>وقت الإنشاء</th></tr></thead><tbody>{rooms.length ? rooms.map((room) => <tr key={room.id}><td><strong>{room.title}</strong><small>{shortId(room.id)}</small></td><td><span className="room-status"><i /> {room.status}</span></td><td>{room.listener_count ?? 0}</td><td>{dateLabel(room.created_at)}</td></tr>) : <tr><td colSpan={4} className="admin-empty">لا توجد غرف بعد.</td></tr>}</tbody></table></div></section></div>
      <div className="admin-columns"><section className="admin-card"><div className="admin-card-heading"><div><h2>آخر رسائل الغرف</h2><span>مراقبة الرسائل العامة داخل الغرف</span></div><MessageSquare size={18} /></div><div className="admin-messages">{roomMessages.length ? roomMessages.map((message) => <article key={`room-${message.id}`}><div><strong>{message.body}</strong><small>{shortId(message.sender_id)} · غرفة {shortId(message.room_id || "unknown")}</small></div><time>{dateLabel(message.created_at)}</time></article>) : <div className="admin-empty">لا توجد رسائل غرف ظاهرة.</div>}</div></section><section className="admin-card"><div className="admin-card-heading"><div><h2>آخر الرسائل الخاصة</h2><span>للمراقبة التشغيلية والصلاحيات فقط</span></div><MessageSquare size={18} /></div><div className="admin-messages">{directMessages.length ? directMessages.map((message) => <article key={`direct-${message.id}`}><div><strong>{message.body}</strong><small>{shortId(message.sender_id)} · محادثة {shortId(message.conversation_id || "unknown")}</small></div><time>{dateLabel(message.created_at)}</time></article>) : <div className="admin-empty">لا توجد رسائل خاصة ظاهرة.</div>}</div></section></div>
    </main>
  </div>;
}
