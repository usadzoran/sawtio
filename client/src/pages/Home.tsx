import { FormEvent, useEffect, useMemo, useState } from "react";
import { supabase, type SupabaseRoomRow } from "@/lib/supabase";
import AuthDialog from "@/components/AuthDialog";
import MessagesPanel from "@/components/MessagesPanel";
import { useSupabaseAuth } from "@/lib/auth";
import { toast } from "sonner";
import {
  ArrowUpLeft,
  Bell,
  ChevronDown,
  ChevronLeft,
  CircleHelp,
  Headphones,
  Home as HomeIcon,
  LayoutGrid,
  LockKeyhole,
  Menu,
  Mic,
  MicOff,
  MoreHorizontal,
  Plus,
  Radio,
  Search,
  Settings,
  Sparkles,
  Speaker,
  VolumeX,
  Users,
  Volume2,
  X,
} from "lucide-react";

type Member = {
  name: string;
  role: "مضيف" | "متحدث" | "مستمع";
  initials: string;
  tone: string;
  speaking?: boolean;
};

type Room = {
  id: string;
  title: string;
  topic: string;
  category: string;
  listeners: number;
  status: string;
  accent: "coral" | "teal" | "violet" | "amber";
  host: string;
  hostInitials: string;
  hostTone: string;
  members: Member[];
  private?: boolean;
};

const categories = ["الكل", "الأكثر نشاطًا", "تقنية", "ثقافة", "صباحي", "ريادة أعمال"];

export const initialSampleRooms: Room[] = [
  {
    id: "room-tech-ai",
    title: "مستقبل الذكاء الاصطناعي وتطبيقاته في العالم العربي",
    topic: "تقنية",
    category: "تقنية",
    listeners: 48,
    status: "مباشر الآن",
    accent: "coral",
    host: "سارة المهندس",
    hostInitials: "سم",
    hostTone: "tone-coral",
    members: [
      { name: "سارة المهندس", role: "مضيف", initials: "سم", tone: "tone-coral", speaking: true },
      { name: "أحمد كمال", role: "متحدث", initials: "أك", tone: "tone-teal", speaking: false },
      { name: "ليلى العامري", role: "متحدث", initials: "لع", tone: "tone-violet", speaking: false },
      { name: "طارق سليم", role: "مستمع", initials: "طس", tone: "tone-amber", speaking: false },
      { name: "رنا يوسف", role: "مستمع", initials: "ري", tone: "tone-mint", speaking: false },
    ],
  },
  {
    id: "room-startups",
    title: "رواد الأعمال: كيف تبني وتطلق أول منتج رقمي؟",
    topic: "ريادة أعمال",
    category: "ريادة أعمال",
    listeners: 92,
    status: "مباشر الآن",
    accent: "teal",
    host: "فيصل المطيري",
    hostInitials: "فم",
    hostTone: "tone-teal",
    members: [
      { name: "فيصل المطيري", role: "مضيف", initials: "فم", tone: "tone-teal", speaking: true },
      { name: "عمر خالد", role: "متحدث", initials: "عخ", tone: "tone-coral", speaking: false },
      { name: "نور الدين", role: "مستمع", initials: "ند", tone: "tone-violet", speaking: false },
    ],
  },
  {
    id: "room-morning-coffee",
    title: "قهوة الصباح: حوار مفتوح وتطلعات الأسبوع الجديد",
    topic: "صباحي",
    category: "صباحي",
    listeners: 64,
    status: "مباشر الآن",
    accent: "amber",
    host: "نورة العلي",
    hostInitials: "نع",
    hostTone: "tone-amber",
    members: [
      { name: "نورة العلي", role: "مضيف", initials: "نع", tone: "tone-amber", speaking: false },
      { name: "زيد الهاشمي", role: "متحدث", initials: "زه", tone: "tone-teal", speaking: true },
      { name: "منى الدوسري", role: "مستمع", initials: "مد", tone: "tone-coral", speaking: false },
    ],
  },
  {
    id: "room-design-ux",
    title: "تصميم تجربة المستخدم والهوية البصرية الرقمية",
    topic: "تصميم",
    category: "ثقافة",
    listeners: 37,
    status: "مباشر الآن",
    accent: "violet",
    host: "خالد بن صالح",
    hostInitials: "خص",
    hostTone: "tone-violet",
    members: [
      { name: "خالد بن صالح", role: "مضيف", initials: "خص", tone: "tone-violet", speaking: true },
      { name: "ريم العتيبي", role: "متحدث", initials: "رع", tone: "tone-coral", speaking: false },
    ],
  },
];

function getInitialRooms(): Room[] {
  try {
    const raw = localStorage.getItem("sawtio_custom_rooms");
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) {
        return parsed;
      }
    }
  } catch {}
  return initialSampleRooms;
}

const emptyRoom: Room = {
  id: "empty",
  title: "لا توجد غرف مباشرة بعد",
  topic: "أنشئ أول غرفة من مساحة Sawtio",
  category: "الأكثر نشاطًا",
  listeners: 0,
  status: "بانتظارك",
  accent: "coral",
  host: "Sawtio",
  hostInitials: "سو",
  hostTone: "tone-coral",
  members: [],
};

function normalizeRoom(row: SupabaseRoomRow): Room {
  const members: Member[] = [];
  const color = row.cover_color?.toLowerCase() ?? "";
  const accent: Room["accent"] = color.includes("teal") || color.includes("green") ? "teal" : color.includes("violet") || color.includes("purple") ? "violet" : color.includes("amber") || color.includes("yellow") ? "amber" : "coral";
  return {
    id: row.id,
    title: row.title,
    topic: row.topic || "مجتمع",
    category: "الأكثر نشاطًا",
    listeners: row.listener_count ?? 0,
    status: row.status === "live" || row.status === "active" ? "مباشر الآن" : row.status,
    accent,
    host: row.host_id ? "مضيف Sawtio" : "فريق Sawtio",
    hostInitials: "سو",
    hostTone: "tone-coral",
    private: false,
    members,
  };
}

function Avatar({ initials, tone, speaking = false, size = "normal" }: { initials: string; tone: string; speaking?: boolean; size?: "small" | "normal" | "large" }) {
  return (
    <div className={`avatar ${tone} avatar-${size} ${speaking ? "is-speaking" : ""}`}>
      <span>{initials}</span>
      {speaking && <i className="speaking-dot" />}
    </div>
  );
}

function BrandMark() {
  return (
    <div className="brand-lockup">
      <div className="brand-mark" aria-hidden="true">
        <span />
        <span />
        <span />
      </div>
      <div>
        <strong>Sawtio</strong>
        <small>مساحتك الصوتية</small>
      </div>
    </div>
  );
}

function RoomCard({ room, selected, onSelect }: { room: Room; selected: boolean; onSelect: () => void }) {
  return (
    <button className={`room-card ${selected ? "selected" : ""}`} onClick={onSelect} type="button">
      <div className={`room-art art-${room.accent}`}>
        <Radio size={19} strokeWidth={1.8} />
        <span className="room-live-dot" />
      </div>
        <div className="room-card-body">
          <div className="room-card-meta">
            <span className="live-label"><i /> {room.status}</span>
            <span>{room.private && <LockKeyhole size={10} />} {room.private ? "خاصة" : room.topic}</span>
        </div>
        <h3>{room.title}</h3>
        <div className="room-card-footer">
          <div className="mini-host">
            <Avatar initials={room.hostInitials} tone={room.hostTone} size="small" />
            <span>{room.host}</span>
          </div>
          <span className="listener-count"><Users size={14} /> {room.listeners}</span>
        </div>
      </div>
      <ChevronLeft className="room-arrow" size={18} />
    </button>
  );
}

export default function Home() {
  const { user, loading: authLoading, signOut } = useSupabaseAuth();
  const [rooms, setRooms] = useState<Room[]>(getInitialRooms);
  const [currentRoomId, setCurrentRoomId] = useState(() => getInitialRooms()[0]?.id ?? "");
  const [activeCategory, setActiveCategory] = useState("الكل");
  const [search, setSearch] = useState("");
  const [joined, setJoined] = useState(false);
  const [micEnabled, setMicEnabled] = useState(false);
  const [micStream, setMicStream] = useState<MediaStream | null>(null);
  const [speakerEnabled, setSpeakerEnabled] = useState(true);
  const [databaseState, setDatabaseState] = useState<"loading" | "connected" | "fallback">(supabase ? "loading" : "fallback");
  const [isSavingRoom, setIsSavingRoom] = useState(false);
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isMobileNavOpen, setIsMobileNavOpen] = useState(false);
  const [newRoomTitle, setNewRoomTitle] = useState("");
  const [newRoomTopic, setNewRoomTopic] = useState("مجتمع");
  const [isPrivate, setIsPrivate] = useState(false);
  const [activeView, setActiveView] = useState<"rooms" | "messages">("rooms");
  const [isAuthOpen, setIsAuthOpen] = useState(false);

  const currentRoom = rooms.find((room) => room.id === currentRoomId) ?? rooms[0] ?? emptyRoom;
  const userName = user?.user_metadata?.display_name || user?.email?.split("@")[0] || (authLoading ? "جارٍ التحقق" : "زائر");
  const userInitials = userName.slice(0, 2);

  useEffect(() => {
    const client = supabase;
    if (!client) {
      setDatabaseState("fallback");
      return;
    }

    let cancelled = false;
    const loadRooms = async () => {
      const { data, error } = await client
        .from("rooms")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(50);

      if (cancelled) return;
      if (error || !data || data.length === 0) {
        console.warn("[Sawtio] Supabase rooms unavailable, using demo spaces:", error?.message);
        setDatabaseState("fallback");
        return;
      }
      const loadedRooms = data.map((row) => normalizeRoom(row as SupabaseRoomRow));
      setRooms(loadedRooms);
      setCurrentRoomId(loadedRooms[0]?.id ?? "");
      setDatabaseState("connected");
    };

    void loadRooms();
    const channel = client
      .channel("sawtio:rooms")
      .on("postgres_changes", { event: "*", schema: "public", table: "rooms" }, () => {
        void loadRooms();
      })
      .subscribe();
    return () => {
      cancelled = true;
      void client.removeChannel(channel);
    };
  }, []);

  const filteredRooms = useMemo(() => {
    const query = search.trim().toLowerCase();
    return rooms.filter((room) => {
      const matchesCategory = activeCategory === "الكل" || room.category === activeCategory;
      const matchesSearch = !query || `${room.title} ${room.topic} ${room.host}`.toLowerCase().includes(query);
      return matchesCategory && matchesSearch;
    });
  }, [activeCategory, rooms, search]);

  const currentMembers: Member[] = joined && !currentRoom.members.some((member) => member.name === (userName || "أنت"))
    ? [...currentRoom.members, { name: userName || "أنت", role: "مستمع", initials: userInitials || "أنت", tone: "tone-coral", speaking: false }]
    : currentRoom.members;

  const handleSelectRoom = (room: Room) => {
    setCurrentRoomId(room.id);
    setJoined(false);
    micStream?.getTracks().forEach((track) => track.stop());
    setMicStream(null);
    setMicEnabled(false);
  };

  const handleJoin = () => {
    if (currentRoom.id === emptyRoom.id) {
      toast.info("أنشئ أول غرفة لتبدأ البث الصوتي.");
      return;
    }
    setJoined((value) => {
      const next = !value;
      toast.success(next ? `انضممت إلى «${currentRoom.title}»` : "غادرت الغرفة بنجاح", {
        description: next ? "يمكنك الآن الاستماع والتفاعل مع المتحدثين." : "نراك في غرفة أخرى قريبًا.",
      });
      if (!next) {
        micStream?.getTracks().forEach((track) => track.stop());
        setMicStream(null);
        setMicEnabled(false);
      }
      return next;
    });
  };

  const handleMicToggle = async () => {
    if (!joined) {
      toast.info("انضم إلى الغرفة أولًا لتشغيل الميكروفون.");
      return;
    }
    if (!micEnabled && navigator.mediaDevices?.getUserMedia) {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        setMicStream(stream);
        setMicEnabled(true);
        toast.success("تم تفعيل الميكروفون بنجاح", { description: "صوتك مسموع الآن للمستمعين في الغرفة." });
        return;
      } catch {
        toast.info("يمكنك تفعيل الميكروفون عند السماح للمتصفح بالوصول للصوت.");
        return;
      }
    }
    micStream?.getTracks().forEach((track) => track.stop());
    setMicStream(null);
    setMicEnabled(false);
  };

  const handleCreateRoom = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const trimmedTitle = newRoomTitle.trim();
    if (!trimmedTitle) {
      toast.error("أضف اسمًا للغرفة أولًا");
      return;
    }

    const hostName = userName && userName !== "زائر" && userName !== "جارٍ التحقق" ? userName : "أنت";
    const hostInitials = hostName.slice(0, 2);

    const draftRoom: Room = {
      id: `room-${Date.now()}`,
      title: trimmedTitle,
      topic: newRoomTopic,
      category: "الأكثر نشاطًا",
      listeners: 1,
      status: "مباشر الآن",
      accent: isPrivate ? "violet" : "coral",
      host: hostName,
      hostInitials,
      hostTone: "tone-coral",
      private: isPrivate,
      members: [{ name: hostName, role: "مضيف", initials: hostInitials, tone: "tone-coral", speaking: true }],
    };

    setIsSavingRoom(true);
    let roomToAdd = draftRoom;

    try {
      if (supabase && user && !user.app_metadata?.is_guest) {
        const { data, error } = await supabase
          .from("rooms")
          .insert({
            host_id: user.id,
            slug: `${draftRoom.title.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || "sawtio-room"}-${Date.now()}`,
            title: draftRoom.title,
            topic: draftRoom.topic,
            description: "",
            cover_color: "#ff8f7f",
            status: "live",
            listener_count: 1,
            max_speakers: 10,
            tags: [draftRoom.topic],
          })
          .select()
          .single();

        if (error) {
          console.warn("[Sawtio] Room was not persisted to Supabase:", error.message);
          setDatabaseState("fallback");
          toast.warning("تم فتح الغرفة في وضع المعاينة", { description: "غرفتك جاهزة ومباشرة الآن." });
        } else if (data) {
          roomToAdd = normalizeRoom(data as SupabaseRoomRow);
          setDatabaseState("connected");
        }
      }

      setRooms((prev) => {
        const next = [roomToAdd, ...prev.filter((r) => r.id !== roomToAdd.id)];
        try {
          localStorage.setItem("sawtio_custom_rooms", JSON.stringify(next.slice(0, 20)));
        } catch {}
        return next;
      });

      setCurrentRoomId(roomToAdd.id);
      setJoined(true);
      setIsCreateOpen(false);
      setNewRoomTitle("");
      setIsPrivate(false);
      toast.success("غرفتك أصبحت مباشرة!", { description: "أنت المضيف الآن ويمكنك التحدث وبدء الحوار." });
    } finally {
      setIsSavingRoom(false);
    }
  };

  const handleProfileClick = async () => {
    if (!user) {
      setIsAuthOpen(true);
      return;
    }
    await signOut();
    toast.success("تم تسجيل الخروج بنجاح");
  };

  return (
    <div className="sawtio-app" dir="rtl">
      <aside className={`sidebar ${isMobileNavOpen ? "mobile-open" : ""}`}>
        <div className="sidebar-top">
          <BrandMark />
          <button className="sidebar-close" onClick={() => setIsMobileNavOpen(false)} type="button" aria-label="إغلاق القائمة"><X size={18} /></button>
        </div>

        <div className="sidebar-section-label">المساحة</div>
        <nav className="main-nav" aria-label="التنقل الرئيسي">
          <button className={`nav-item ${activeView === "rooms" ? "active" : ""}`} type="button" onClick={() => setActiveView("rooms")}><HomeIcon size={18} /><span>استكشف</span><i className="nav-pill">4</i></button>
          <button className={`nav-item ${activeView === "messages" ? "active" : ""}`} type="button" onClick={() => setActiveView("messages")}><Headphones size={18} /><span>محادثاتي</span></button>
          <button className="nav-item" type="button" onClick={() => toast.info("ستظهر الدعوات هنا عند وصولها") }><Bell size={18} /><span>دعواتي</span><i className="nav-notification">2</i></button>
        </nav>

        <div className="sidebar-section-label second-label">مساحتك</div>
        <nav className="main-nav">
          <button className="nav-item" type="button" onClick={() => setIsCreateOpen(true)}><Plus size={18} /><span>إنشاء غرفة</span></button>
          <button className="nav-item" type="button" onClick={() => toast.info("إعدادات الحساب ستكون متاحة قريبًا") }><Settings size={18} /><span>الإعدادات</span></button>
        </nav>

        <div className="sidebar-spacer" />
        <div className="sidebar-tip">
          <div className="tip-icon"><Sparkles size={17} /></div>
          <strong>صوتك له أثر</strong>
          <p>ابدأ غرفة حول فكرة تستحق أن تُسمع.</p>
          <button type="button" onClick={() => setIsCreateOpen(true)}>أنشئ غرفتك <ArrowUpLeft size={14} /></button>
        </div>
        <button className="profile-chip" type="button" onClick={handleProfileClick}>
          <Avatar initials={userInitials} tone="tone-profile" size="small" />
          <span><strong>{userName}</strong><small>{user ? "حساب Supabase" : "سجّل الدخول للمحادثات"}</small></span>
          <MoreHorizontal size={17} />
        </button>
      </aside>

      <main className="main-content">
        <header className="topbar">
          <button className="mobile-menu" type="button" onClick={() => setIsMobileNavOpen(true)} aria-label="فتح القائمة"><Menu size={20} /></button>
          <div className="breadcrumbs"><span>الرئيسية</span><ChevronLeft size={14} /><strong>{activeView === "messages" ? "الرسائل الخاصة" : "استكشف الغرف"}</strong></div>
          <div className="topbar-actions">
            <label className="search-box">
              <Search size={17} />
              <input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="ابحث عن غرفة أو موضوع" aria-label="البحث عن غرفة" />
              <kbd>⌘ K</kbd>
            </label>
            <button className="icon-button" type="button" onClick={() => toast.info("لا توجد تنبيهات جديدة") } aria-label="التنبيهات"><Bell size={18} /><i /></button>
            <button className="user-menu" type="button" onClick={handleProfileClick}><Avatar initials={userInitials} tone="tone-profile" size="small" /><ChevronDown size={15} /></button>
          </div>
        </header>

        <div className="mobile-brand"><BrandMark /></div>

        <div className="dashboard-wrap">
          <div className={`rooms-view ${activeView === "messages" ? "view-hidden" : ""}`}>
          <div className="dashboard-heading">
            <div>
              <div className="eyebrow"><span className="eyebrow-line" /> مساحة اليوم</div>
              <h1>اسمع، شارك، <em>وكن حاضرًا.</em></h1>
              <p>الغرفة المناسبة قد تبدأ بسؤال صغير.</p>
            </div>
            <div className="heading-actions"><div className={`database-badge ${databaseState}`}><span /> {databaseState === "loading" ? "جاري الاتصال" : databaseState === "connected" ? "Supabase متصلة" : "وضع العرض المحلي"}</div><button className="create-button" type="button" onClick={() => setIsCreateOpen(true)}><Plus size={17} /> أنشئ غرفة</button></div>
          </div>

          <section className="feature-room" aria-label="الغرفة المميزة">
            <div className="feature-glow glow-one" /><div className="feature-glow glow-two" />
            <div className="feature-copy">
              <div className="feature-tag"><span><i /> مباشر الآن</span><small>اختيار Sawtio</small></div>
              <h2>{currentRoom.title}</h2>
              <p>حديث مفتوح عن التفاصيل التي تمنح مدننا روحها، بصوت أشخاص يعيشونها كل يوم.</p>
              <div className="feature-host"><Avatar initials={currentRoom.hostInitials} tone={currentRoom.hostTone} size="normal" /><span><small>يستضيفها</small><strong>{currentRoom.host}</strong></span></div>
              <button className="feature-cta" type="button" onClick={handleJoin}>{joined ? "أنت داخل الغرفة" : "انضم إلى الحوار"}<ArrowUpLeft size={17} /></button>
            </div>
            <div className="feature-visual" aria-hidden="true">
              <div className="wave-disc"><div className="wave-ring ring-a" /><div className="wave-ring ring-b" /><div className="wave-ring ring-c" /><div className="disc-core"><Volume2 size={25} /></div></div>
              <div className="visual-caption"><span className="pulse-bars"><i /><i /><i /><i /><i /></span><span>الصوت واضح ومفتوح</span></div>
            </div>
            <div className="feature-stat"><strong>{currentRoom.listeners}</strong><span>مستمعًا الآن</span><div className="avatar-stack"><Avatar initials="عخ" tone="tone-ocean" size="small" /><Avatar initials="لع" tone="tone-lilac" size="small" /><Avatar initials="من" tone="tone-mint" size="small" /><b>+124</b></div></div>
          </section>

          <div className="content-columns">
            <section className="rooms-section">
              <div className="section-heading"><div><div className="eyebrow compact"><span className="eyebrow-line" /> على الهواء</div><h2>غرف قد تهمك</h2></div><button className="text-button" type="button" onClick={() => { setActiveCategory("الكل"); setSearch(""); }}>عرض الكل <ArrowUpLeft size={15} /></button></div>
              <div className="category-tabs" role="tablist" aria-label="تصنيف الغرف">{categories.map((category) => <button key={category} className={activeCategory === category ? "active" : ""} onClick={() => setActiveCategory(category)} type="button">{category}</button>)}</div>
              <div className="rooms-list">{filteredRooms.length ? filteredRooms.map((room) => <RoomCard key={room.id} room={room} selected={currentRoomId === room.id} onSelect={() => handleSelectRoom(room)} />) : <div className="empty-state"><Search size={22} /><strong>لم نجد غرفة بهذا الاسم</strong><span>جرّب كلمة أخرى أو استكشف كل الغرف.</span></div>}</div>
            </section>

            <aside className="live-panel" aria-label="الغرفة الحالية">
              <div className="panel-heading"><div><span className="live-kicker"><i /> غرفة حية</span><h2>داخل الغرفة</h2></div><button className="panel-more" type="button" onClick={() => toast.info("خيارات الغرفة قيد الإعداد")} aria-label="المزيد"><MoreHorizontal size={19} /></button></div>
              <div className="current-room-mini"><div className={`mini-room-art art-${currentRoom.accent}`}><Radio size={17} /></div><div><strong>{currentRoom.title}</strong><span>{currentRoom.private ? "غرفة خاصة" : currentRoom.topic} · {currentRoom.listeners} مستمع</span></div></div>
              <div className="members-heading"><span>المشاركون <b>{currentMembers.length}</b></span><button type="button" onClick={() => toast.info("مشاركة رابط الغرفة قيد الإعداد")}>دعوة <ArrowUpLeft size={14} /></button></div>
              <div className="members-list">{currentMembers.map((member, index) => <div className={`member-row ${member.name === "أنت" ? "self" : ""}`} key={`${member.name}-${index}`}><Avatar initials={member.initials} tone={member.tone} speaking={member.speaking} size="normal" /><div className="member-name"><strong>{member.name}</strong><span>{member.role}</span></div>{member.speaking && <span className="speaking-wave"><i /><i /><i /></span>}{member.name === "أنت" && <span className="you-badge">أنت</span>}</div>)}</div>
              <div className="panel-divider" />
              <div className="audio-status"><span className="status-signal"><i /><i /><i /><i /></span><div><strong>{joined ? "أنت متصل الآن" : "استمع قبل أن تنضم"}</strong><span>{joined ? "الصوت يعمل بجودة ممتازة" : "انضم لتشارك بصوتك"}</span></div></div>
              <div className="room-controls"><button className={`control-button mic-control ${micEnabled ? "active" : ""}`} type="button" onClick={handleMicToggle} aria-label={micEnabled ? "كتم الميكروفون" : "تشغيل الميكروفون"}>{micEnabled ? <Mic size={19} /> : <MicOff size={19} />}<span>{micEnabled ? "الميكروفون يعمل" : "الميكروفون مكتوم"}</span></button><button className="control-button sound-control" type="button" onClick={() => setSpeakerEnabled((value) => !value)} aria-label={speakerEnabled ? "كتم الصوت" : "تشغيل الصوت"}>{speakerEnabled ? <Speaker size={18} /> : <VolumeX size={18} />}<span>{speakerEnabled ? "الصوت" : "صامت"}</span></button></div>
              <button className={`join-room-button ${joined ? "joined" : ""}`} type="button" onClick={handleJoin}>{joined ? "مغادرة الغرفة" : "انضمام إلى الغرفة"}<ChevronLeft size={17} /></button>
              <div className="panel-note"><CircleHelp size={14} /><span>يمكنك المغادرة في أي وقت دون أن يفوتك شيء.</span></div>
            </aside>
          </div>
          </div>
          <MessagesPanel user={user} onRequestAuth={() => setIsAuthOpen(true)} />
        </div>

        <footer className="page-footer"><span>© 2025 Sawtio</span><span>صُنع للحكايات التي تستحق أن تُسمع</span><span><a href="#help">مركز المساعدة</a><a href="#privacy">الخصوصية</a></span></footer>
      </main>

      {isCreateOpen && <div className="dialog-backdrop" role="presentation" onMouseDown={(event) => { if (event.currentTarget === event.target) setIsCreateOpen(false); }}><form className="create-dialog" onSubmit={handleCreateRoom}><button className="dialog-close" type="button" onClick={() => setIsCreateOpen(false)} aria-label="إغلاق"><X size={18} /></button><div className="dialog-icon"><Radio size={22} /></div><div className="eyebrow compact"><span className="eyebrow-line" /> غرفة جديدة</div><h2>ما الفكرة التي تستحق صوتًا؟</h2><p>اصنع مساحة صغيرة لحوار كبير، وابدأها بطريقتك.</p><label>اسم الغرفة<input autoFocus value={newRoomTitle} onChange={(event) => setNewRoomTitle(event.target.value)} placeholder="مثال: جلسة شاي وموسيقى" /></label><label>موضوع الغرفة<select value={newRoomTopic} onChange={(event) => setNewRoomTopic(event.target.value)}><option>مجتمع</option><option>تصميم وتقنية</option><option>كتب وثقافة</option><option>رفاهية</option><option>صباحي</option></select></label><label className="privacy-toggle"><span className="toggle-copy"><strong>غرفة خاصة</strong><small>يمكن للأشخاص المدعوين فقط الدخول</small></span><input type="checkbox" checked={isPrivate} onChange={(event) => setIsPrivate(event.target.checked)} /><i className="toggle-track"><b /></i><LockKeyhole size={16} /></label><button className="dialog-submit" type="submit" disabled={isSavingRoom}>{isSavingRoom ? "جارٍ حفظ الغرفة…" : <>ابدأ الغرفة <ArrowUpLeft size={17} /></>}</button></form></div>}
      <AuthDialog open={isAuthOpen} onClose={() => setIsAuthOpen(false)} />
    </div>
  );
}
