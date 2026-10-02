import { useEffect, useMemo, useRef, useState } from "react";
import { useRoute, useLocation } from "wouter";
import {
  ArrowRight,
  ArrowUpLeft,
  Award,
  Bell,
  Check,
  CheckCircle2,
  ChevronDown,
  Coins,
  Crown,
  Gift,
  Hand,
  Headphones,
  Heart,
  HelpCircle,
  LogOut,
  MessageSquare,
  Mic,
  MicOff,
  MoreHorizontal,
  Radio,
  Share2,
  Smile,
  Sparkles,
  Speaker,
  ThumbsUp,
  UserCheck,
  UserPlus,
  Users,
  Volume2,
  VolumeX,
  X,
} from "lucide-react";
import { toast } from "sonner";
import AuthGate from "@/components/AuthGate";
import { getInitialRooms, type Member, type Room, emptyRoom } from "@/lib/rooms";
import { useSupabaseAuth } from "@/lib/auth";
import { supabase, type SupabaseRoomRow } from "@/lib/supabase";
import GiftsStoreDialog from "@/components/GiftsStoreDialog";
import LiveGiftAnimationOverlay from "@/components/LiveGiftAnimationOverlay";
import { getUserCoins, playGiftSound } from "@/lib/gifts";

type HandRaiseRequest = {
  userName: string;
  initials: string;
  tone: string;
  timestamp: number;
};

type ReactionEmoji = {
  id: number;
  emoji: string;
  left: number;
};

export default function RoomPage() {
  const [, params] = useRoute("/room/:id");
  const [, setLocation] = useLocation();
  const roomId = params?.id || "";

  const { user, loading: authLoading } = useSupabaseAuth();
  const userName = user?.user_metadata?.display_name || user?.email?.split("@")[0] || (authLoading ? "جارٍ التحقق" : "أنت");
  const userInitials = userName.slice(0, 2);

  const [room, setRoom] = useState<Room>(() => {
    const found = getInitialRooms().find((r) => r.id === roomId);
    return found || emptyRoom;
  });

  const [members, setMembers] = useState<Member[]>(room.members || []);
  const [micEnabled, setMicEnabled] = useState(false);
  const [micStream, setMicStream] = useState<MediaStream | null>(null);
  const [speakerEnabled, setSpeakerEnabled] = useState(true);
  const [isHandRaised, setIsHandRaised] = useState(false);
  const [handRaiseQueue, setHandRaiseQueue] = useState<HandRaiseRequest[]>([]);
  const [isQueueOpen, setIsQueueOpen] = useState(false);
  const [userRole, setUserRole] = useState<"مضيف" | "متحدث" | "مستمع">("مستمع");
  const [isGiftsStoreOpen, setIsGiftsStoreOpen] = useState(false);
  const [giftRecipient, setGiftRecipient] = useState<string>("");
  const [userCoins, setUserCoins] = useState<number>(getUserCoins);
  const [reactions, setReactions] = useState<ReactionEmoji[]>([]);
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [chatMessages, setChatMessages] = useState<{ id: string; sender: string; senderId?: string; body: string; time: string }[]>([]);
  const [chatInput, setChatInput] = useState("");
  const [roomLoading, setRoomLoading] = useState(true);
  const [roomNotFound, setRoomNotFound] = useState(false);

  // Load room data
  useEffect(() => {
    let active = true;
    const initial = getInitialRooms().find((r) => r.id === roomId);
    if (initial) {
      setRoom(initial);
      setMembers(initial.members);
      // Determine if current user is host
      if (initial.host === userName || initial.host === "أنت") {
        setUserRole("مضيف");
      }
    }

    setRoomLoading(true);
    setRoomNotFound(false);
    if (!supabase || !roomId) {
      setRoomLoading(false);
      setRoomNotFound(true);
      return () => { active = false; };
    }
    void supabase
      .from("rooms")
      .select("*")
      .eq("id", roomId)
      .maybeSingle()
      .then(({ data, error }) => {
        if (!active) return;
        setRoomLoading(false);
        if (error || !data) {
          setRoomNotFound(true);
          return;
        }
        const row = data as SupabaseRoomRow;
        setRoom((prev) => ({
          ...prev,
          id: row.id,
          title: row.title,
          topic: row.topic,
          listeners: row.listener_count ?? prev.listeners,
        }));
        if (row.host_id === user?.id) setUserRole("مضيف");
      });

    return () => {
      active = false;
    };
  }, [roomId, userName]);

  // Real room chat: load persisted messages and subscribe to new inserts.
  useEffect(() => {
    const client = supabase;
    if (!client || !roomId) return;
    let active = true;
    const formatMessage = (row: { id: number | string; body: string; sender_id: string | null; created_at: string }) => ({
      id: String(row.id),
      sender: row.sender_id === user?.id ? userName : "عضو الغرفة",
      senderId: row.sender_id ?? undefined,
      body: row.body,
      time: new Date(row.created_at).toLocaleTimeString("ar", { hour: "2-digit", minute: "2-digit" }),
    });
    const loadMessages = async () => {
      const { data, error } = await client
        .from("room_messages")
        .select("id, body, sender_id, created_at")
        .eq("room_id", roomId)
        .order("created_at", { ascending: true })
        .limit(100);
      if (!active || error || !data) return;
      setChatMessages(data.map((row) => formatMessage(row as typeof row & { sender_id: string | null })));
    };
    void loadMessages();
    const channel = client
      .channel(`sawtio:room-messages:${roomId}`)
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "room_messages", filter: `room_id=eq.${roomId}` }, (payload) => {
        const row = payload.new as { id: number | string; body: string; sender_id: string | null; created_at: string };
        setChatMessages((prev) => prev.some((message) => message.id === String(row.id)) ? prev : [...prev, formatMessage(row)]);
      })
      .subscribe();
    return () => {
      active = false;
      void client.removeChannel(channel);
    };
  }, [roomId, user?.id, userName]);

  // Sync coins
  useEffect(() => {
    const handleCoinsChange = () => setUserCoins(getUserCoins());
    window.addEventListener("sawtio_coins_change", handleCoinsChange);
    return () => window.removeEventListener("sawtio_coins_change", handleCoinsChange);
  }, []);

  // Cleanup audio tracks on unmount
  useEffect(() => {
    return () => {
      micStream?.getTracks().forEach((t) => t.stop());
    };
  }, [micStream]);

  // Add current user to members list if not present
  useEffect(() => {
    setMembers((prev) => {
      const exists = prev.some((m) => m.name === userName);
      if (!exists) {
        return [
          ...prev,
          {
            name: userName,
            role: userRole,
            initials: userInitials,
            tone: "tone-coral",
            speaking: micEnabled,
            handRaised: isHandRaised,
          },
        ];
      }
      return prev.map((m) =>
        m.name === userName
          ? { ...m, role: userRole, speaking: micEnabled, handRaised: isHandRaised }
          : m
      );
    });
  }, [userName, userRole, micEnabled, isHandRaised, userInitials]);

  const isHost = userRole === "مضيف";
  const isSpeaker = userRole === "متحدث" || isHost;

  // Split members into speakers stage & audience
  const speakers = useMemo(() => {
    return members.filter((m) => m.role === "مضيف" || m.role === "متحدث");
  }, [members]);

  const listeners = useMemo(() => {
    return members.filter((m) => m.role === "مستمع");
  }, [members]);

  // Toggle Microphone
  const handleToggleMic = async () => {
    // If user is just a listener: they MUST raise hand first!
    if (!isSpeaker) {
      toast.warning("✋ لا يمكنك فتح الميكروفون مباشرة", {
        description: "يرجى رفع يدك أولاً لطلب إذن التحدث من مضيف الغرفة.",
        action: {
          label: "رفع اليد الآن ✋",
          onClick: handleToggleHandRaise,
        },
      });
      return;
    }

    if (!micEnabled && navigator.mediaDevices?.getUserMedia) {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        setMicStream(stream);
        setMicEnabled(true);
        toast.success("تم تشغيل الميكروفون", { description: "صوتك مسموع الآن لجميع الحضور في الغرفة." });
        return;
      } catch {
        toast.error("تعذر الوصول للميكروفون", { description: "يرجى السماح للمتصفح باستخدام الميكروفون." });
        return;
      }
    }

    micStream?.getTracks().forEach((track) => track.stop());
    setMicStream(null);
    setMicEnabled(false);
    toast.info("تم كتم الميكروفون");
  };

  // Raise / Lower Hand Handler
  const handleToggleHandRaise = () => {
    if (isSpeaker) {
      toast.info("أنت بالفعل على المنصة كمتحدث!");
      return;
    }

    if (!isHandRaised) {
      setIsHandRaised(true);
      toast.success("✋ تم رفع يدك بنجاح!", {
        description: "وصل تنبيه للمضيف لطلب إذن التحدث، يرجى الانتظار.",
      });

      // Add to hand raise queue
      setHandRaiseQueue((prev) => [
        ...prev.filter((r) => r.userName !== userName),
        { userName, initials: userInitials, tone: "tone-coral", timestamp: Date.now() },
      ]);

      toast.info("تم إرسال الطلب للمضيف", {
        description: "ستتلقى الإذن عند موافقة مضيف الغرفة.",
      });
    } else {
      setIsHandRaised(false);
      setHandRaiseQueue((prev) => prev.filter((r) => r.userName !== userName));
      toast.info("تم إنزال اليد وإلغاء طلب التحدث.");
    }
  };

  // Host approves speaker request
  const handleApproveSpeaker = (req: HandRaiseRequest) => {
    setHandRaiseQueue((prev) => prev.filter((r) => r.userName !== req.userName));
    setMembers((prev) =>
      prev.map((m) => (m.name === req.userName ? { ...m, role: "متحدث", handRaised: false } : m))
    );
    toast.success(`تم قبول طلب «${req.userName}» ومنحه المايكروفون!`);
  };

  // Host dismisses speaker request
  const handleDismissSpeaker = (req: HandRaiseRequest) => {
    setHandRaiseQueue((prev) => prev.filter((r) => r.userName !== req.userName));
    setMembers((prev) =>
      prev.map((m) => (m.name === req.userName ? { ...m, handRaised: false } : m))
    );
    toast.info(`تم رفض طلب التحدث لـ «${req.userName}».`);
  };

  // Step down to listener
  const handleStepDown = () => {
    micStream?.getTracks().forEach((t) => t.stop());
    setMicStream(null);
    setMicEnabled(false);
    setUserRole("مستمع");
    toast.info("عدت إلى مقاعد المستمعين.");
  };

  // Leave Room
  const handleLeaveRoom = () => {
    micStream?.getTracks().forEach((track) => track.stop());
    setMicStream(null);
    toast.info("غادرت الغرفة بهدوء ✌️");
    setLocation("/");
  };

  // Send Floating Emoji Reaction
  const handleSendReaction = (emoji: string) => {
    const id = Date.now() + Math.random();
    const left = 20 + Math.random() * 60; // 20% to 80%
    setReactions((prev) => [...prev, { id, emoji, left }]);
    setTimeout(() => {
      setReactions((prev) => prev.filter((r) => r.id !== id));
    }, 2500);
  };

  // Send Chat Message
  const handleSendChat = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!chatInput.trim()) return;
    if (!supabase || !user) {
      toast.error("تسجيل الدخول مطلوب لإرسال الرسائل");
      return;
    }
    const body = chatInput.trim();
    const { data, error } = await supabase
      .from("room_messages")
      .insert({ room_id: roomId, sender_id: user.id, body, message_type: "text" })
      .select("id, body, sender_id, created_at")
      .single();
    if (error || !data) {
      toast.error("تعذر إرسال الرسالة", { description: error?.message });
      return;
    }
    setChatMessages((prev) => {
      if (prev.some((message) => message.id === String(data.id))) return prev;
      return [...prev, { id: String(data.id), sender: userName, senderId: data.sender_id, body: data.body, time: new Date(data.created_at).toLocaleTimeString("ar", { hour: "2-digit", minute: "2-digit" }) }];
    });
    setChatInput("");
  };

  const handleShareRoom = () => {
    if (navigator.clipboard) {
      navigator.clipboard.writeText(window.location.href);
      toast.success("تم نسخ رابط الغرفة إلى الحافظة!");
    } else {
      toast.info("رابط الغرفة: " + window.location.href);
    }
  };

  if (authLoading) {
    return (
      <div style={{ minHeight: "100vh", display: "grid", placeItems: "center", background: "#0b1120", color: "#fff" }}>
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "14px" }}>
          <Radio size={36} className="spin" style={{ color: "#ff7a68" }} />
          <span style={{ fontSize: "12px", color: "#94a3b8" }}>جارٍ التحقق من الحساب…</span>
        </div>
      </div>
    );
  }

  if (!user) {
    return <AuthGate />;
  }

  if (roomLoading) {
    return (
      <div dir="rtl" style={{ minHeight: "100vh", display: "grid", placeItems: "center", background: "#0b1120", color: "#fff" }}>
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "12px" }}>
          <Radio size={34} className="spin" style={{ color: "#ff7a68" }} />
          <span style={{ color: "#94a3b8", fontSize: "12px" }}>جارٍ فتح الغرفة…</span>
        </div>
      </div>
    );
  }

  if (roomNotFound) {
    return (
      <div dir="rtl" style={{ minHeight: "100vh", display: "grid", placeItems: "center", background: "#0b1120", color: "#fff", padding: "20px" }}>
        <div style={{ textAlign: "center", maxWidth: "360px" }}>
          <Radio size={38} style={{ color: "#ff7a68", marginBottom: "14px" }} />
          <h1 style={{ margin: "0 0 8px", fontSize: "22px" }}>الغرفة غير متاحة</h1>
          <p style={{ margin: "0 0 20px", color: "#94a3b8", fontSize: "13px", lineHeight: 1.8 }}>قد تكون الغرفة أُغلقت أو أن الرابط غير صحيح.</p>
          <button type="button" className="dialog-submit" onClick={() => setLocation("/")}>العودة إلى استكشاف الغرف <ArrowRight size={16} /></button>
        </div>
      </div>
    );
  }

  return (
    <div
      dir="rtl"
      style={{
        minHeight: "100vh",
        background: "radial-gradient(ellipse at top, #1e293b 0%, #0f172a 100%)",
        color: "#f8fafc",
        display: "flex",
        flexDirection: "column",
        position: "relative",
        overflowX: "hidden",
        fontFamily: "'IBM Plex Sans Arabic', sans-serif",
      }}
    >
      {/* Floating Reactions Emojis */}
      {reactions.map((r) => (
        <span
          key={r.id}
          style={{
            position: "fixed",
            left: `${r.left}%`,
            bottom: "90px",
            fontSize: "36px",
            pointerEvents: "none",
            zIndex: 1000,
            animation: "floatUpReaction 2.4s ease-out forwards",
          }}
        >
          {r.emoji}
        </span>
      ))}

      {/* TOP BAR */}
      <header className="room-page-header">
        <div className="room-header-title-wrap">
          <button
            type="button"
            onClick={handleLeaveRoom}
            className="room-leave-top-btn"
            title="مغادرة والعودة للرئيسية"
          >
            <ArrowRight size={15} /> <span>مغادرة</span>
          </button>

          <div style={{ minWidth: 0, flex: 1 }}>
            <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
              <span
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "4px",
                  fontSize: "10px",
                  background: "#ff7a68",
                  color: "#fff",
                  padding: "2px 7px",
                  borderRadius: "12px",
                  fontWeight: 700,
                  whiteSpace: "nowrap",
                }}
              >
                <Radio size={11} className="pulse" /> مباشر
              </span>
              <span style={{ fontSize: "11px", color: "#94a3b8", whiteSpace: "nowrap" }}>{room.topic}</span>
            </div>
            <h1 className="room-header-title">
              {room.title}
            </h1>
          </div>
        </div>

        <div className="room-header-actions">
          {/* Host Queue Button (if host) */}
          {isHost && handRaiseQueue.length > 0 && (
            <button
              type="button"
              onClick={() => setIsQueueOpen((prev) => !prev)}
              style={{
                background: "linear-gradient(135deg, #f59e0b, #d97706)",
                color: "#fff",
                border: 0,
                padding: "6px 10px",
                borderRadius: "10px",
                fontSize: "11px",
                fontWeight: 700,
                cursor: "pointer",
                display: "inline-flex",
                alignItems: "center",
                gap: "5px",
                animation: "pulse 1.5s infinite",
                whiteSpace: "nowrap",
              }}
            >
              <Hand size={14} /> <span>طلبات ({handRaiseQueue.length})</span>
            </button>
          )}

          {/* Coins balance button */}
          <button
            type="button"
            onClick={() => {
              setGiftRecipient(room.host);
              setIsGiftsStoreOpen(true);
            }}
            className="room-coins-chip"
            title="رصيد الكوينز ومتجر الهدايا"
          >
            <Coins size={14} /> <span>{userCoins.toLocaleString()}</span>
          </button>

          {/* Share Button */}
          <button
            type="button"
            onClick={handleShareRoom}
            className="room-icon-action"
            title="مشاركة رابط الغرفة"
          >
            <Share2 size={14} />
          </button>

          {/* In-Room Chat Toggle */}
          <button
            type="button"
            onClick={() => setIsChatOpen((v) => !v)}
            className={`room-icon-action ${isChatOpen ? "active" : ""}`}
            title="دردشة الغرفة"
          >
            <MessageSquare size={14} />
          </button>
        </div>
      </header>

      {/* STAGE CONTAINER */}
      <main className="room-stage-wrap">
        {/* ROOM DETAILS BANNER */}
        {room.description && (
          <div
            style={{
              background: "rgba(255,255,255,0.04)",
              border: "1px solid rgba(255,255,255,0.08)",
              borderRadius: "14px",
              padding: "12px 18px",
              fontSize: "12px",
              color: "#cbd5e1",
              display: "flex",
              alignItems: "center",
              gap: "10px",
            }}
          >
            <Sparkles size={16} style={{ color: "#ff8f7f", flexShrink: 0 }} />
            <span>{room.description}</span>
          </div>
        )}

        {/* SECTION 1: SPEAKERS STAGE (المنصة الرئيسية للمتحدثين) */}
        <section aria-label="منصة المتحدثين">
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "16px" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
              <div style={{ width: "8px", height: "8px", borderRadius: "50%", background: "#32b9af" }} />
              <h2 style={{ fontSize: "14px", fontWeight: 700, margin: 0, color: "#e2e8f0" }}>
                المنصة والمتحدثون ({speakers.length})
              </h2>
            </div>
            {isSpeaker && !isHost && (
              <button
                type="button"
                onClick={handleStepDown}
                style={{
                  background: "transparent",
                  border: "1px solid rgba(255,255,255,0.15)",
                  color: "#94a3b8",
                  padding: "3px 9px",
                  borderRadius: "8px",
                  fontSize: "10px",
                  cursor: "pointer",
                }}
              >
                النزول إلى المستمعين
              </button>
            )}
          </div>

          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fill, minmax(130px, 1fr))",
              gap: "18px",
            }}
          >
            {speakers.map((spk) => {
              const isCurrentUser = spk.name === userName;
              const isSpeakingNow = isCurrentUser ? micEnabled : spk.speaking;
              return (
                <div
                  key={spk.name}
                  style={{
                    background: isSpeakingNow ? "rgba(255, 122, 104, 0.12)" : "rgba(255,255,255,0.03)",
                    border: isSpeakingNow ? "2px solid #ff7a68" : "1px solid rgba(255,255,255,0.08)",
                    borderRadius: "18px",
                    padding: "16px 10px",
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "center",
                    gap: "8px",
                    position: "relative",
                    transition: "all 0.25s ease",
                    boxShadow: isSpeakingNow ? "0 0 20px rgba(255, 122, 104, 0.25)" : "none",
                  }}
                >
                  {/* Speaker Wave Ring Avatar */}
                  <div style={{ position: "relative" }}>
                    <div
                      style={{
                        width: "64px",
                        height: "64px",
                        borderRadius: "50%",
                        background:
                          spk.role === "مضيف"
                            ? "linear-gradient(135deg, #ff7a68, #ff9e8f)"
                            : "linear-gradient(135deg, #32b9af, #5eead4)",
                        display: "grid",
                        placeItems: "center",
                        fontSize: "20px",
                        fontWeight: 700,
                        color: "#fff",
                        boxShadow: "0 4px 14px rgba(0,0,0,0.3)",
                      }}
                    >
                      {spk.initials}
                    </div>

                    {/* Mic indicator badge */}
                    <div
                      style={{
                        position: "absolute",
                        bottom: "-2px",
                        left: "-2px",
                        background: isSpeakingNow ? "#10b981" : "#475569",
                        color: "#fff",
                        width: "22px",
                        height: "22px",
                        borderRadius: "50%",
                        display: "grid",
                        placeItems: "center",
                        border: "2px solid #0f172a",
                      }}
                    >
                      {isSpeakingNow ? <Mic size={12} /> : <MicOff size={12} />}
                    </div>

                    {/* Crown for host */}
                    {spk.role === "مضيف" && (
                      <div
                        style={{
                          position: "absolute",
                          top: "-6px",
                          right: "-4px",
                          background: "#f59e0b",
                          color: "#fff",
                          width: "20px",
                          height: "20px",
                          borderRadius: "50%",
                          display: "grid",
                          placeItems: "center",
                          border: "2px solid #0f172a",
                        }}
                      >
                        <Crown size={11} />
                      </div>
                    )}
                  </div>

                  <strong
                    style={{
                      fontSize: "12px",
                      color: "#fff",
                      textAlign: "center",
                      whiteSpace: "nowrap",
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                      width: "100%",
                    }}
                  >
                    {spk.name} {isCurrentUser && "(أنت)"}
                  </strong>

                  <span
                    style={{
                      fontSize: "10px",
                      color: spk.role === "مضيف" ? "#fbbf24" : "#5eead4",
                      background: "rgba(255,255,255,0.06)",
                      padding: "2px 8px",
                      borderRadius: "10px",
                      fontWeight: 600,
                    }}
                  >
                    {spk.role}
                  </span>

                  {/* Gift button for this speaker */}
                  {!isCurrentUser && (
                    <button
                      type="button"
                      onClick={() => {
                        setGiftRecipient(spk.name);
                        setIsGiftsStoreOpen(true);
                      }}
                      style={{
                        background: "rgba(255, 122, 104, 0.15)",
                        border: "1px solid rgba(255, 122, 104, 0.3)",
                        color: "#ff8f7f",
                        padding: "3px 8px",
                        borderRadius: "8px",
                        fontSize: "10px",
                        cursor: "pointer",
                        display: "inline-flex",
                        alignItems: "center",
                        gap: "3px",
                        marginTop: "2px",
                      }}
                    >
                      <Gift size={11} /> <span>إهداء</span>
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        </section>

        {/* SECTION 2: AUDIENCE & LISTENERS (المستمعون والحضور) */}
        <section aria-label="المستمعون والحضور">
          <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "16px" }}>
            <Users size={16} style={{ color: "#94a3b8" }} />
            <h2 style={{ fontSize: "14px", fontWeight: 700, margin: 0, color: "#94a3b8" }}>
              المستمعون والجمهور ({listeners.length})
            </h2>
          </div>

          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fill, minmax(100px, 1fr))",
              gap: "14px",
            }}
          >
            {listeners.map((lst) => {
              const isCurrentUser = lst.name === userName;
              const hasHandRaised = isCurrentUser ? isHandRaised : lst.handRaised;
              return (
                <div
                  key={lst.name}
                  style={{
                    background: "rgba(255,255,255,0.02)",
                    border: hasHandRaised ? "1.5px solid #f59e0b" : "1px solid rgba(255,255,255,0.05)",
                    borderRadius: "14px",
                    padding: "12px 8px",
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "center",
                    gap: "6px",
                    position: "relative",
                  }}
                >
                  <div style={{ position: "relative" }}>
                    <div
                      style={{
                        width: "48px",
                        height: "48px",
                        borderRadius: "50%",
                        background: "rgba(255,255,255,0.1)",
                        display: "grid",
                        placeItems: "center",
                        fontSize: "16px",
                        fontWeight: 600,
                        color: "#cbd5e1",
                      }}
                    >
                      {lst.initials}
                    </div>

                    {/* Hand Raised Icon Badge */}
                    {hasHandRaised && (
                      <div
                        style={{
                          position: "absolute",
                          bottom: "-4px",
                          right: "-4px",
                          background: "#f59e0b",
                          color: "#fff",
                          width: "20px",
                          height: "20px",
                          borderRadius: "50%",
                          display: "grid",
                          placeItems: "center",
                          border: "2px solid #0f172a",
                          animation: "pulse 1.2s infinite",
                        }}
                        title="طلب التحدث"
                      >
                        <Hand size={11} />
                      </div>
                    )}
                  </div>

                  <span
                    style={{
                      fontSize: "11px",
                      color: "#cbd5e1",
                      textAlign: "center",
                      whiteSpace: "nowrap",
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                      width: "100%",
                    }}
                  >
                    {lst.name} {isCurrentUser && "(أنت)"}
                  </span>

                  {hasHandRaised && (
                    <span style={{ fontSize: "9px", color: "#fbbf24", fontWeight: 700 }}>طلب الكلمة</span>
                  )}
                </div>
              );
            })}
          </div>
        </section>
      </main>

      {/* HOST RAISED HANDS MODAL / POPUP */}
      {isQueueOpen && (
        <div
          style={{
            position: "fixed",
            top: "70px",
            left: "20px",
            zIndex: 100,
            background: "#1e293b",
            border: "1px solid #334155",
            borderRadius: "16px",
            padding: "16px",
            boxShadow: "0 10px 30px rgba(0,0,0,0.5)",
            width: "320px",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "12px" }}>
            <strong style={{ fontSize: "13px", color: "#f8fafc", display: "flex", alignItems: "center", gap: "6px" }}>
              <Hand size={15} style={{ color: "#f59e0b" }} /> طلبات التحدث المرفوعة
            </strong>
            <button
              type="button"
              onClick={() => setIsQueueOpen(false)}
              style={{ background: "transparent", border: 0, color: "#94a3b8", cursor: "pointer" }}
            >
              <X size={16} />
            </button>
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: "8px", maxHeight: "240px", overflowY: "auto" }}>
            {handRaiseQueue.map((req) => (
              <div
                key={req.userName}
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  padding: "8px 10px",
                  borderRadius: "10px",
                  background: "rgba(255,255,255,0.05)",
                }}
              >
                <div>
                  <strong style={{ fontSize: "12px", color: "#fff", display: "block" }}>{req.userName}</strong>
                  <small style={{ color: "#94a3b8", fontSize: "10px" }}>طلب قبل قليل</small>
                </div>
                <div style={{ display: "flex", gap: "6px" }}>
                  <button
                    type="button"
                    onClick={() => handleApproveSpeaker(req)}
                    style={{
                      background: "#10b981",
                      border: 0,
                      color: "#fff",
                      padding: "4px 8px",
                      borderRadius: "6px",
                      fontSize: "11px",
                      cursor: "pointer",
                      display: "inline-flex",
                      alignItems: "center",
                      gap: "3px",
                    }}
                  >
                    <Check size={12} /> قبول
                  </button>
                  <button
                    type="button"
                    onClick={() => handleDismissSpeaker(req)}
                    style={{
                      background: "rgba(255,255,255,0.1)",
                      border: 0,
                      color: "#94a3b8",
                      padding: "4px 8px",
                      borderRadius: "6px",
                      fontSize: "11px",
                      cursor: "pointer",
                    }}
                  >
                    رفض
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* CHAT DRAWER */}
      {isChatOpen && (
        <aside
          style={{
            position: "fixed",
            top: "64px",
            bottom: "84px",
            left: 0,
            width: "320px",
            background: "rgba(15, 23, 42, 0.95)",
            backdropFilter: "blur(16px)",
            borderRight: "1px solid rgba(255,255,255,0.1)",
            zIndex: 60,
            display: "flex",
            flexDirection: "column",
            boxShadow: "10px 0 30px rgba(0,0,0,0.4)",
          }}
        >
          <div
            style={{
              padding: "14px 16px",
              borderBottom: "1px solid rgba(255,255,255,0.08)",
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
            }}
          >
            <strong style={{ fontSize: "13px", color: "#fff" }}>دردشة الغرفة الحية</strong>
            <button
              type="button"
              onClick={() => setIsChatOpen(false)}
              style={{ background: "transparent", border: 0, color: "#94a3b8", cursor: "pointer" }}
            >
              <X size={16} />
            </button>
          </div>

          <div style={{ flex: 1, overflowY: "auto", padding: "14px", display: "flex", flexDirection: "column", gap: "10px" }}>
            {chatMessages.map((msg) => (
              <div key={msg.id} style={{ display: "flex", flexDirection: "column", gap: "2px" }}>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                  <span style={{ fontSize: "11px", fontWeight: 700, color: "#ff8f7f" }}>{msg.sender}</span>
                  <time style={{ fontSize: "9px", color: "#64748b" }}>{msg.time}</time>
                </div>
                <div
                  style={{
                    background: "rgba(255,255,255,0.06)",
                    padding: "8px 10px",
                    borderRadius: "8px",
                    fontSize: "12px",
                    color: "#e2e8f0",
                  }}
                >
                  {msg.body}
                </div>
              </div>
            ))}
          </div>

          <form
            onSubmit={handleSendChat}
            style={{
              padding: "12px",
              borderTop: "1px solid rgba(255,255,255,0.08)",
              display: "flex",
              gap: "8px",
            }}
          >
            <input
              type="text"
              value={chatInput}
              onChange={(e) => setChatInput(e.target.value)}
              placeholder="اكتب رسالة للغرفة…"
              style={{
                flex: 1,
                height: "36px",
                background: "rgba(255,255,255,0.08)",
                border: "1px solid rgba(255,255,255,0.12)",
                borderRadius: "8px",
                padding: "0 10px",
                color: "#fff",
                fontSize: "11px",
                outline: 0,
              }}
            />
            <button
              type="submit"
              style={{
                background: "#ff7a68",
                border: 0,
                color: "#fff",
                padding: "0 14px",
                borderRadius: "8px",
                fontSize: "11px",
                fontWeight: 600,
                cursor: "pointer",
              }}
            >
              إرسال
            </button>
          </form>
        </aside>
      )}

      {/* BOTTOM FLOATING DOCK (شريط التحكم الدائم بالسماعة والميكروفون ورفع اليد) */}
      <footer className="room-page-dock">
        {/* Quick Reactions Bar */}
        <div className="room-reactions-dock">
          {["👏", "❤️", "🔥", "🚀", "💡"].map((emoji) => (
            <button
              key={emoji}
              type="button"
              onClick={() => handleSendReaction(emoji)}
              className="room-reaction-btn"
              title={`إرسال تفاعل ${emoji}`}
            >
              {emoji}
            </button>
          ))}
        </div>

        {/* Center Main Controls: Mic & Raise Hand & Gifts */}
        <div className="room-controls-dock">
          {/* MICROPHONE BUTTON */}
          <button
            type="button"
            onClick={handleToggleMic}
            className={`room-mic-btn ${micEnabled ? "mic-on" : isSpeaker ? "mic-off" : "mic-locked"}`}
          >
            {micEnabled ? <Mic size={18} /> : <MicOff size={18} />}
            <span className="room-btn-label">
              {micEnabled ? "يعمل" : isSpeaker ? "مكتوم" : "طلب الكلمة"}
            </span>
          </button>

          {/* RAISE HAND BUTTON (خاصية رفع اليد قبل التكلم) */}
          {!isSpeaker && (
            <button
              type="button"
              onClick={handleToggleHandRaise}
              className={`room-hand-btn ${isHandRaised ? "hand-raised" : ""}`}
              title="ارفع يدك لطلب الكلمة من المضيف"
            >
              <Hand size={18} />
              <span className="room-btn-label">{isHandRaised ? "مرفوعة ✋" : "رفع اليد ✋"}</span>
            </button>
          )}

          {/* GIFTS STORE BUTTON */}
          <button
            type="button"
            onClick={() => {
              setGiftRecipient(room.host);
              setIsGiftsStoreOpen(true);
            }}
            className="room-gift-dock-btn"
            title="متجر الهدايا وإرسال هدية"
          >
            <Gift size={18} />
            <span className="room-btn-label">إهداء 🎁</span>
          </button>
        </div>

        {/* Right actions: Speaker & Leave */}
        <div className="room-side-dock">
          {/* Audio Speaker Mute Toggle */}
          <button
            type="button"
            onClick={() => setSpeakerEnabled((v) => !v)}
            className="room-speaker-btn"
            title={speakerEnabled ? "كتم صوت الغرفة" : "تشغيل صوت الغرفة"}
          >
            {speakerEnabled ? <Speaker size={18} /> : <VolumeX size={18} />}
          </button>

          {/* Leave Quietly */}
          <button
            type="button"
            onClick={handleLeaveRoom}
            className="room-leave-dock-btn"
            title="مغادرة الغرفة بهدوء"
          >
            <span>خروج ✌️</span>
          </button>
        </div>
      </footer>

      {/* Floating Gifts Animation Overlay */}
      <LiveGiftAnimationOverlay />

      {/* Gifts Store Dialog */}
      <GiftsStoreDialog
        open={isGiftsStoreOpen}
        onClose={() => setIsGiftsStoreOpen(false)}
        defaultRecipient={giftRecipient || room.host}
        roomMembers={members}
        currentRoomTitle={room.title}
        currentRoomId={room.id}
        currentUserName={userName}
      />

      <style>{`
        .room-page-header {
          height: 64px;
          padding: 0 clamp(12px, 3vw, 24px);
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 12px;
          border-bottom: 1px solid rgba(255,255,255,0.08);
          background: rgba(15, 23, 42, 0.85);
          backdrop-filter: blur(12px);
          position: sticky;
          top: 0;
          z-index: 50;
        }
        .room-header-title-wrap {
          display: flex;
          align-items: center;
          gap: 12px;
          min-width: 0;
          flex: 1;
        }
        .room-leave-top-btn {
          background: rgba(255,255,255,0.08);
          border: 0;
          color: #e2e8f0;
          padding: 6px 12px;
          border-radius: 10px;
          font-size: 11px;
          font-weight: 600;
          cursor: pointer;
          display: inline-flex;
          align-items: center;
          gap: 5px;
          flex-shrink: 0;
        }
        .room-header-title {
          margin: 2px 0 0;
          font-size: 14px;
          font-weight: 700;
          color: #fff;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
          max-width: min(340px, 45vw);
        }
        .room-header-actions {
          display: flex;
          align-items: center;
          gap: 8px;
          flex-shrink: 0;
        }
        .room-coins-chip {
          display: inline-flex;
          align-items: center;
          gap: 5px;
          padding: 5px 10px;
          border-radius: 10px;
          background: rgba(254, 243, 199, 0.12);
          color: #fbbf24;
          border: 1px solid rgba(251, 191, 36, 0.25);
          font-size: 11px;
          font-weight: 700;
          cursor: pointer;
        }
        .room-icon-action {
          width: 36px;
          height: 36px;
          border-radius: 9px;
          background: rgba(255,255,255,0.08);
          border: 0;
          color: #cbd5e1;
          display: grid;
          place-items: center;
          cursor: pointer;
        }
        .room-icon-action.active {
          background: #ff7a68;
          color: #fff;
        }
        .room-stage-wrap {
          flex: 1;
          max-width: 1080px;
          width: 100%;
          margin: 0 auto;
          padding: clamp(14px, 3vw, 24px) clamp(12px, 3vw, 20px) 140px;
          display: flex;
          flex-direction: column;
          gap: 24px;
        }
        .room-page-dock {
          position: fixed;
          bottom: 0;
          left: 0;
          right: 0;
          min-height: 78px;
          background: rgba(15, 23, 42, 0.94);
          backdrop-filter: blur(20px);
          border-top: 1px solid rgba(255,255,255,0.1);
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 8px clamp(12px, 3vw, 28px);
          z-index: 70;
          gap: 10px;
        }
        .room-reactions-dock {
          display: flex;
          align-items: center;
          gap: 6px;
        }
        .room-reaction-btn {
          background: rgba(255,255,255,0.06);
          border: 0;
          font-size: 16px;
          width: 36px;
          height: 36px;
          border-radius: 50%;
          cursor: pointer;
          display: grid;
          place-items: center;
          transition: transform 0.15s;
        }
        .room-reaction-btn:hover {
          transform: scale(1.15);
        }
        .room-controls-dock {
          display: flex;
          align-items: center;
          gap: 10px;
        }
        .room-mic-btn {
          height: 44px;
          padding: 0 16px;
          border-radius: 22px;
          border: 0;
          cursor: pointer;
          display: inline-flex;
          align-items: center;
          gap: 6px;
          font-weight: 700;
          font-size: 12px;
          color: #fff;
          transition: all 0.2s;
        }
        .room-mic-btn.mic-on {
          background: #10b981;
          box-shadow: 0 0 16px rgba(16, 185, 129, 0.4);
        }
        .room-mic-btn.mic-off {
          background: #ef4444;
        }
        .room-mic-btn.mic-locked {
          background: rgba(255,255,255,0.12);
        }
        .room-hand-btn {
          height: 44px;
          padding: 0 15px;
          border-radius: 22px;
          border: 1px solid rgba(255,255,255,0.2);
          background: rgba(255,255,255,0.08);
          color: #fff;
          cursor: pointer;
          display: inline-flex;
          align-items: center;
          gap: 6px;
          font-weight: 700;
          font-size: 12px;
        }
        .room-hand-btn.hand-raised {
          background: linear-gradient(135deg, #f59e0b, #d97706);
          border-color: #f59e0b;
          box-shadow: 0 0 18px rgba(245, 158, 11, 0.4);
          animation: pulse 1.8s infinite;
        }
        .room-gift-dock-btn {
          height: 44px;
          padding: 0 15px;
          border-radius: 22px;
          border: 0;
          background: linear-gradient(135deg, #ff7a68, #f43f5e);
          color: #fff;
          cursor: pointer;
          display: inline-flex;
          align-items: center;
          gap: 6px;
          font-weight: 700;
          font-size: 12px;
          box-shadow: 0 4px 14px rgba(255, 122, 104, 0.3);
        }
        .room-side-dock {
          display: flex;
          align-items: center;
          gap: 8px;
        }
        .room-speaker-btn {
          width: 38px;
          height: 38px;
          border-radius: 50%;
          background: rgba(255,255,255,0.08);
          border: 0;
          color: #cbd5e1;
          display: grid;
          place-items: center;
          cursor: pointer;
        }
        .room-leave-dock-btn {
          height: 38px;
          padding: 0 12px;
          border-radius: 10px;
          background: rgba(239, 68, 68, 0.15);
          border: 1px solid rgba(239, 68, 68, 0.3);
          color: #f87171;
          font-size: 11px;
          font-weight: 600;
          cursor: pointer;
          display: inline-flex;
          align-items: center;
        }

        /* Mobile Adjustments */
        @media (max-width: 768px) {
          .room-page-dock {
            flex-direction: column;
            padding: 8px 12px;
            gap: 8px;
            min-height: 98px;
          }
          .room-reactions-dock {
            width: 100%;
            justify-content: center;
            overflow-x: auto;
            padding-bottom: 2px;
          }
          .room-reactions-dock::-webkit-scrollbar {
            display: none;
          }
          .room-controls-dock {
            width: 100%;
            justify-content: space-between;
            gap: 6px;
          }
          .room-controls-dock > button {
            flex: 1;
            padding: 0 8px;
            justify-content: center;
            font-size: 11px;
          }
          .room-side-dock {
            display: none;
          }
        }

        @keyframes floatUpReaction {
          0% { opacity: 0; transform: translateY(0) scale(0.5); }
          15% { opacity: 1; transform: translateY(-40px) scale(1.2); }
          80% { opacity: 0.9; }
          100% { opacity: 0; transform: translateY(-380px) scale(1.5) rotate(15deg); }
        }
        @keyframes pulse {
          0%, 100% { transform: scale(1); }
          50% { transform: scale(1.05); }
        }
      `}</style>
    </div>
  );
}
