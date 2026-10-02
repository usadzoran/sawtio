import type { SupabaseRoomRow } from "./supabase";

export type Member = {
  name: string;
  role: "مضيف" | "متحدث" | "مستمع";
  initials: string;
  tone: string;
  speaking?: boolean;
  handRaised?: boolean;
};

export type Room = {
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
  description?: string;
};

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
    description: "نقاش حي حول الثورة الرقمية ونماذج الذكاء التوليدي وفرص رواد الأعمال في المنطقة العربية.",
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
    description: "تجارب حقيقية من مؤسسي شركات ناشئة، من الفكرة إلى العميل الأول وطرق جمع الاستثمار الأولي.",
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
    description: "بداية هادئة ويوم جديد، أفكار إيجابية وموسيقى خفيفة وتطلعات لمشاريعنا القادمة.",
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
    description: "نقد تصميمي وتفكيك لواجهات تطبيقات عربية ناجحة وأهم مبادئ التيبوغرافي وتجربة المستخدم السلسة.",
    members: [
      { name: "خالد بن صالح", role: "مضيف", initials: "خص", tone: "tone-violet", speaking: true },
      { name: "ريم العتيبي", role: "متحدث", initials: "رع", tone: "tone-coral", speaking: false },
    ],
  },
];

export const emptyRoom: Room = {
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

export function getInitialRooms(): Room[] {
  return [];
}

export function saveCustomRoom(room: Room): void {
  try {
    const current = getInitialRooms();
    const updated = [room, ...current.filter((r) => r.id !== room.id)];
    localStorage.setItem("sawtio_custom_rooms", JSON.stringify(updated.slice(0, 30)));
    window.dispatchEvent(new CustomEvent("sawtio_rooms_change", { detail: { room } }));
  } catch {}
}

export function getRoomById(id: string): Room | null {
  const rooms = getInitialRooms();
  return rooms.find((r) => r.id === id || (r as any).slug === id) || null;
}

export function normalizeRoom(row: SupabaseRoomRow): Room {
  const members: Member[] = [];
  const color = row.cover_color?.toLowerCase() ?? "";
  const accent: Room["accent"] =
    color.includes("teal") || color.includes("green")
      ? "teal"
      : color.includes("violet") || color.includes("purple")
        ? "violet"
        : color.includes("amber") || color.includes("yellow")
          ? "amber"
          : "coral";

  return {
    id: row.id,
    title: row.title,
    topic: row.topic || "مجتمع",
    category: "الأكثر نشاطًا",
    listeners: row.listener_count ?? 1,
    status: row.status === "live" || row.status === "active" ? "مباشر الآن" : row.status,
    accent,
    host: row.host_id ? "مضيف Sawtio" : "فريق Sawtio",
    hostInitials: "سو",
    hostTone: "tone-coral",
    private: false,
    description: row.description || "",
    members,
  };
}
