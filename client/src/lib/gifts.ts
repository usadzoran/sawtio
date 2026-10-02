import { supabase } from "./supabase";

export type GiftTier = "common" | "rare" | "epic" | "legendary";

export type VirtualGift = {
  id: string;
  name: string;
  emoji: string;
  price: number;
  category: "الكل" | "شعبية" | "تفاعلية" | "فاخرة" | "مؤثرات";
  tier: GiftTier;
  description: string;
  badgeColor: string;
  accentBg: string;
};

export const VIRTUAL_GIFTS: VirtualGift[] = [
  {
    id: "rose",
    name: "وردة دمشقية",
    emoji: "🌹",
    price: 10,
    category: "شعبية",
    tier: "common",
    description: "تعبير لطيف عن التقدير والترحيب في الغرفة",
    badgeColor: "#ff7a68",
    accentBg: "#fff1ee",
  },
  {
    id: "coffee",
    name: "قهوة عربية وفنجان",
    emoji: "☕",
    price: 25,
    category: "شعبية",
    tier: "common",
    description: "كرم وضيافة للمضيف والمتحدثين في المجلس",
    badgeColor: "#c27803",
    accentBg: "#fff8ec",
  },
  {
    id: "applause",
    name: "تصفيق حار",
    emoji: "👏",
    price: 50,
    category: "تفاعلية",
    tier: "common",
    description: "تشجيع وإعجاب فوري بمداخلة المتحدث",
    badgeColor: "#32b9af",
    accentBg: "#e8f8f6",
  },
  {
    id: "golden-mic",
    name: "ميكروفون ذهبي",
    emoji: "🎙️",
    price: 100,
    category: "تفاعلية",
    tier: "rare",
    description: "تكريم للصوت المتميز وإدارة الحوار الاحترافية",
    badgeColor: "#e5a100",
    accentBg: "#fffbeb",
  },
  {
    id: "heart-fire",
    name: "قلب مشتعل",
    emoji: "❤️‍🔥",
    price: 150,
    category: "تفاعلية",
    tier: "rare",
    description: "تفاعل قوي وحماس متقد لموضوع النقاش",
    badgeColor: "#e63946",
    accentBg: "#fee2e2",
  },
  {
    id: "rocket",
    name: "صاروخ الإلهام",
    emoji: "🚀",
    price: 300,
    category: "فاخرة",
    tier: "epic",
    description: "انطلاقة قوية للأفكار والحديث الريادي المُلهم",
    badgeColor: "#6366f1",
    accentBg: "#eef2ff",
  },
  {
    id: "diamond",
    name: "ألماسة نادرة",
    emoji: "💎",
    price: 500,
    category: "فاخرة",
    tier: "epic",
    description: "هدية ثمينة تسطع في ملف المستلم وتزيد من مكانته",
    badgeColor: "#0ea5e9",
    accentBg: "#f0f9ff",
  },
  {
    id: "crown",
    name: "تاج الفخامة الملكي",
    emoji: "👑",
    price: 1000,
    category: "فاخرة",
    tier: "legendary",
    description: "وسام الشرف الرفيع لأفضل متحدث في المساحة",
    badgeColor: "#f59e0b",
    accentBg: "#fef3c7",
  },
  {
    id: "fireworks",
    name: "ألعاب نارية واحتفال",
    emoji: "🎆",
    price: 2000,
    category: "مؤثرات",
    tier: "legendary",
    description: "عرض بصري وصوتي احتفالي يملأ شاشة الغرفة بالكامل",
    badgeColor: "#ec4899",
    accentBg: "#fdf2f8",
  },
];

export type CoinPack = {
  id: string;
  coins: number;
  bonus: number;
  priceUsd: number;
  label: string;
  badge?: string;
  popular?: boolean;
};

export const COIN_PACKS: CoinPack[] = [
  { id: "pack-100", coins: 100, bonus: 0, priceUsd: 0.99, label: "باقة البداية" },
  { id: "pack-500", coins: 500, bonus: 50, priceUsd: 4.99, label: "باقة المتفاعل", popular: true },
  { id: "pack-1200", coins: 1200, bonus: 200, priceUsd: 9.99, label: "باقة النجم", badge: "+15% مجانًا" },
  { id: "pack-3000", coins: 3000, bonus: 700, priceUsd: 24.99, label: "باقة كبار الداعمين VIP", badge: "أفضل قيمة" },
];

export type GiftTransaction = {
  id: string;
  giftId: string;
  giftName: string;
  emoji: string;
  coins: number;
  senderName: string;
  recipientName: string;
  roomId?: string;
  roomTitle?: string;
  message?: string;
  timestamp: string;
};

const WALLET_STORAGE_KEY = "sawtio_coins_balance";
const TRANSACTIONS_STORAGE_KEY = "sawtio_gift_transactions";
const DEFAULT_INITIAL_BALANCE = 0; // Coins are granted only after a verified payment.

export function getUserCoins(): number {
  try {
    const stored = localStorage.getItem(WALLET_STORAGE_KEY);
    if (stored !== null) {
      const parsed = parseInt(stored, 10);
      if (!isNaN(parsed) && parsed >= 0) return parsed;
    }
  } catch {}
  // No balance is created locally; payments will credit the real wallet.
  setUserCoins(DEFAULT_INITIAL_BALANCE);
  return DEFAULT_INITIAL_BALANCE;
}

export function setUserCoins(amount: number): void {
  try {
    localStorage.setItem(WALLET_STORAGE_KEY, Math.max(0, amount).toString());
    window.dispatchEvent(new CustomEvent("sawtio_coins_change", { detail: { balance: amount } }));
  } catch {}
}

export function topUpCoins(amount: number): number {
  const current = getUserCoins();
  const next = current + amount;
  setUserCoins(next);
  playCoinSound();
  return next;
}

export function spendCoins(amount: number): boolean {
  const current = getUserCoins();
  if (current < amount) return false;
  const next = current - amount;
  setUserCoins(next);
  return true;
}

export function getGiftTransactions(): GiftTransaction[] {
  try {
    const raw = localStorage.getItem(TRANSACTIONS_STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) return parsed;
    }
  } catch {}
  return [];
}

export function recordGiftTransaction(tx: Omit<GiftTransaction, "id" | "timestamp">): GiftTransaction {
  const fullTx: GiftTransaction = {
    ...tx,
    id: `tx-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    timestamp: new Date().toISOString(),
  };

  try {
    const current = getGiftTransactions();
    const updated = [fullTx, ...current].slice(0, 50);
    localStorage.setItem(TRANSACTIONS_STORAGE_KEY, JSON.stringify(updated));
  } catch {}

  // If Supabase is connected, record transaction in supabase
  if (supabase) {
    try {
      void supabase.from("gift_transactions").insert({
        gift_id: tx.giftId,
        gift_name: tx.giftName,
        coins: tx.coins,
        sender_name: tx.senderName,
        recipient_name: tx.recipientName,
        room_id: tx.roomId || null,
        message: tx.message || null,
      });
    } catch {}
  }

  return fullTx;
}

export function sendGift(params: {
  gift: VirtualGift;
  senderName: string;
  recipientName: string;
  roomId?: string;
  roomTitle?: string;
  message?: string;
}): { success: boolean; error?: string; transaction?: GiftTransaction } {
  const currentCoins = getUserCoins();
  if (currentCoins < params.gift.price) {
    return {
      success: false,
      error: `رصيدك الحالي (${currentCoins} كوينز) لا يكفي لشراء «${params.gift.name}» (${params.gift.price} كوينز). يرجى شحن الرصيد.`,
    };
  }

  // Deduct coins
  spendCoins(params.gift.price);

  // Play sound
  playGiftSound(params.gift.tier);

  // Record transaction
  const tx = recordGiftTransaction({
    giftId: params.gift.id,
    giftName: params.gift.name,
    emoji: params.gift.emoji,
    coins: params.gift.price,
    senderName: params.senderName,
    recipientName: params.recipientName,
    roomId: params.roomId,
    roomTitle: params.roomTitle,
    message: params.message,
  });

  // Dispatch live gift event for in-room visual animations
  window.dispatchEvent(
    new CustomEvent("sawtio_live_gift", {
      detail: {
        gift: params.gift,
        transaction: tx,
      },
    })
  );

  return { success: true, transaction: tx };
}

// ----------------------------------------------------------------------------
// Audio Synthesis for Game-Like Feedback (No External Files Required)
// ----------------------------------------------------------------------------
export function playCoinSound() {
  try {
    const AudioContextClass = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    if (!AudioContextClass) return;
    const ctx = new AudioContextClass();

    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = "sine";
    osc.frequency.setValueAtTime(987.77, ctx.currentTime); // B5
    osc.frequency.setValueAtTime(1318.51, ctx.currentTime + 0.08); // E6
    gain.gain.setValueAtTime(0.2, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.35);

    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(ctx.currentTime);
    osc.stop(ctx.currentTime + 0.35);
  } catch {}
}

export function playGiftSound(tier: GiftTier) {
  try {
    const AudioContextClass = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    if (!AudioContextClass) return;
    const ctx = new AudioContextClass();

    const notes =
      tier === "legendary"
        ? [523.25, 659.25, 783.99, 1046.5, 1318.51] // C5, E5, G5, C6, E6
        : tier === "epic"
          ? [587.33, 739.99, 880.0, 1174.66] // D5, F#5, A5, D6
          : tier === "rare"
            ? [523.25, 659.25, 783.99] // C5, E5, G5
            : [659.25, 783.99]; // E5, G5

    notes.forEach((freq, i) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = "triangle";
      osc.frequency.setValueAtTime(freq, ctx.currentTime + i * 0.08);
      gain.gain.setValueAtTime(0.2, ctx.currentTime + i * 0.08);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + i * 0.08 + 0.4);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(ctx.currentTime + i * 0.08);
      osc.stop(ctx.currentTime + i * 0.08 + 0.4);
    });
  } catch {}
}
