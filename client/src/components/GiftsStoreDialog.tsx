import { useEffect, useMemo, useState } from "react";
import { ArrowUpLeft, Check, CheckCircle2, Coins, CreditCard, Gift, History, Plus, Send, Sparkles, Trophy, Users, X, Zap } from "lucide-react";
import { toast } from "sonner";
import {
  COIN_PACKS,
  type CoinPack,
  getGiftTransactions,
  type GiftTransaction,
  getUserCoins,
  sendGift,
  topUpCoins,
  VIRTUAL_GIFTS,
  type VirtualGift,
} from "@/lib/gifts";

type GiftsStoreDialogProps = {
  open: boolean;
  onClose: () => void;
  defaultRecipient?: string;
  roomMembers?: { name: string; role: string; initials: string }[];
  currentRoomTitle?: string;
  currentRoomId?: string;
  currentUserName?: string;
};

export default function GiftsStoreDialog({
  open,
  onClose,
  defaultRecipient = "",
  roomMembers = [],
  currentRoomTitle = "",
  currentRoomId = "",
  currentUserName = "أنت",
}: GiftsStoreDialogProps) {
  const [activeTab, setActiveTab] = useState<"store" | "topup" | "history">("store");
  const [selectedCategory, setSelectedCategory] = useState<string>("الكل");
  const [selectedGift, setSelectedGift] = useState<VirtualGift | null>(VIRTUAL_GIFTS[0]);
  const [recipient, setRecipient] = useState<string>(defaultRecipient);
  const [message, setMessage] = useState<string>("");
  const [coinsBalance, setCoinsBalance] = useState<number>(getUserCoins);
  const [history, setHistory] = useState<GiftTransaction[]>([]);
  const [sending, setSending] = useState(false);
  const [buyingPackId, setBuyingPackId] = useState<string | null>(null);

  // Sync balance
  useEffect(() => {
    if (open) {
      setCoinsBalance(getUserCoins());
      setHistory(getGiftTransactions());
      if (defaultRecipient) setRecipient(defaultRecipient);
    }
  }, [open, defaultRecipient]);

  // Listen to external balance updates
  useEffect(() => {
    const handleCoinsChange = () => setCoinsBalance(getUserCoins());
    window.addEventListener("sawtio_coins_change", handleCoinsChange);
    return () => window.removeEventListener("sawtio_coins_change", handleCoinsChange);
  }, []);

  const filteredGifts = useMemo(() => {
    if (selectedCategory === "الكل") return VIRTUAL_GIFTS;
    return VIRTUAL_GIFTS.filter((g) => g.category === selectedCategory);
  }, [selectedCategory]);

  if (!open) return null;

  const handleSendGift = () => {
    if (!selectedGift) {
      toast.error("يرجى اختيار هدية أولاً.");
      return;
    }

    const cleanRecipient = recipient.trim();
    if (!cleanRecipient) {
      toast.error("يرجى تحديد الشخص المستلم للهدية.");
      return;
    }

    setSending(true);
    const result = sendGift({
      gift: selectedGift,
      senderName: currentUserName,
      recipientName: cleanRecipient,
      roomId: currentRoomId,
      roomTitle: currentRoomTitle,
      message: message.trim(),
    });
    setSending(false);

    if (!result.success) {
      toast.error(result.error || "فشل إرسال الهدية");
      // If balance is not enough, open top up tab!
      if (result.error?.includes("رصيدك")) {
        setActiveTab("topup");
      }
      return;
    }

    toast.success(`تم إرسال ${selectedGift.name} إلى «${cleanRecipient}» بنجاح!`, {
      description: "ظهرت الهدية للجميع في الغرفة الآن.",
    });

    setMessage("");
    setCoinsBalance(getUserCoins());
    setHistory(getGiftTransactions());
    onClose();
  };

  const handleBuyPack = (pack: CoinPack) => {
    setBuyingPackId(pack.id);
    setTimeout(() => {
      const totalCoins = pack.coins + pack.bonus;
      topUpCoins(totalCoins);
      setCoinsBalance(getUserCoins());
      setBuyingPackId(null);
      toast.success(`تم شحن +${totalCoins} كوينز بنجاح!`, {
        description: `رصيدك الجديد أصبح ${getUserCoins()} كوينز.`,
      });
      setActiveTab("store");
    }, 400);
  };

  return (
    <div
      className="dialog-backdrop"
      role="presentation"
      onMouseDown={(e) => {
        if (e.currentTarget === e.target) onClose();
      }}
    >
      <div
        className="auth-dialog"
        role="dialog"
        aria-modal="true"
        aria-labelledby="gifts-store-title"
        style={{
          maxWidth: "680px",
          width: "95vw",
          maxHeight: "92vh",
          display: "flex",
          flexDirection: "column",
          padding: "clamp(16px, 3vw, 24px)",
          overflow: "hidden",
        }}
      >
        {/* Header */}
        <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: "16px" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
            <div className="auth-icon" style={{ background: "#fff1ee", color: "#ff7a68", margin: 0 }}>
              <Gift size={22} />
            </div>
            <div>
              <div className="eyebrow compact">
                <span className="eyebrow-line" /> متجر Sawtio الافتراضي
              </div>
              <h2 id="gifts-store-title" style={{ margin: "2px 0 0", fontSize: "20px" }}>
                متجر الهدايا والتفاعل
              </h2>
            </div>
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
            {/* Coins Balance Chip */}
            <div
              onClick={() => setActiveTab("topup")}
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: "6px",
                padding: "6px 12px",
                borderRadius: "20px",
                background: "linear-gradient(135deg, #fffbeb, #fef3c7)",
                border: "1px solid #fde68a",
                color: "#b45309",
                fontSize: "12px",
                fontWeight: 700,
                cursor: "pointer",
              }}
              title="انقر لشحن رصيد الكوينز"
            >
              <Coins size={15} style={{ color: "#d97706" }} />
              <span>{coinsBalance.toLocaleString()} كوينز</span>
              <Plus size={13} style={{ background: "#d97706", color: "#fff", borderRadius: "50%", padding: "1px" }} />
            </div>

            <button className="dialog-close" type="button" onClick={onClose} aria-label="إغلاق" style={{ position: "static" }}>
              <X size={18} />
            </button>
          </div>
        </div>

        {/* Tab Navigation */}
        <div
          style={{
            display: "flex",
            gap: "6px",
            borderBottom: "1px solid #edf0f4",
            paddingBottom: "10px",
            marginBottom: "16px",
          }}
        >
          <button
            type="button"
            onClick={() => setActiveTab("store")}
            style={{
              padding: "6px 14px",
              borderRadius: "8px",
              fontSize: "12px",
              fontWeight: 600,
              background: activeTab === "store" ? "#ff7a68" : "transparent",
              color: activeTab === "store" ? "#fff" : "#64748b",
              border: 0,
              cursor: "pointer",
              display: "inline-flex",
              alignItems: "center",
              gap: "6px",
            }}
          >
            <Gift size={14} /> تشكيلة الهدايا
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("topup")}
            style={{
              padding: "6px 14px",
              borderRadius: "8px",
              fontSize: "12px",
              fontWeight: 600,
              background: activeTab === "topup" ? "#ff7a68" : "transparent",
              color: activeTab === "topup" ? "#fff" : "#64748b",
              border: 0,
              cursor: "pointer",
              display: "inline-flex",
              alignItems: "center",
              gap: "6px",
            }}
          >
            <Coins size={14} /> شحن الكوينز
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("history")}
            style={{
              padding: "6px 14px",
              borderRadius: "8px",
              fontSize: "12px",
              fontWeight: 600,
              background: activeTab === "history" ? "#ff7a68" : "transparent",
              color: activeTab === "history" ? "#fff" : "#64748b",
              border: 0,
              cursor: "pointer",
              display: "inline-flex",
              alignItems: "center",
              gap: "6px",
              marginRight: "auto",
            }}
          >
            <History size={14} /> سجل الإرسال
          </button>
        </div>

        {/* TAB 1: GIFTS CATALOG */}
        {activeTab === "store" && (
          <div style={{ display: "flex", flexDirection: "column", flex: 1, minHeight: 0 }}>
            {/* Category Filter Pills */}
            <div style={{ display: "flex", gap: "6px", overflowX: "auto", paddingBottom: "10px", marginBottom: "8px" }}>
              {(["الكل", "شعبية", "تفاعلية", "فاخرة", "مؤثرات"] as const).map((cat) => (
                <button
                  key={cat}
                  type="button"
                  onClick={() => setSelectedCategory(cat)}
                  style={{
                    padding: "4px 10px",
                    borderRadius: "14px",
                    fontSize: "11px",
                    background: selectedCategory === cat ? "#fff1ee" : "#f1f5f9",
                    color: selectedCategory === cat ? "#d96254" : "#64748b",
                    border: selectedCategory === cat ? "1px solid #fecdd3" : "1px solid transparent",
                    cursor: "pointer",
                    whiteSpace: "nowrap",
                  }}
                >
                  {cat}
                </button>
              ))}
            </div>

            {/* Gifts Grid */}
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fill, minmax(95px, 1fr))",
                gap: "8px",
                overflowY: "auto",
                maxHeight: "240px",
                padding: "4px",
                marginBottom: "14px",
              }}
            >
              {filteredGifts.map((gift) => {
                const isSelected = selectedGift?.id === gift.id;
                return (
                  <button
                    key={gift.id}
                    type="button"
                    onClick={() => setSelectedGift(gift)}
                    style={{
                      background: isSelected ? gift.accentBg : "#fff",
                      border: isSelected ? `2px solid ${gift.badgeColor}` : "1px solid #e2e8f0",
                      borderRadius: "14px",
                      padding: "10px 8px",
                      display: "flex",
                      flexDirection: "column",
                      alignItems: "center",
                      gap: "6px",
                      cursor: "pointer",
                      transition: "all 0.2s ease",
                      transform: isSelected ? "scale(1.02)" : "scale(1)",
                      boxShadow: isSelected ? `0 6px 16px ${gift.badgeColor}25` : "0 1px 3px rgba(0,0,0,0.04)",
                    }}
                  >
                    <span style={{ fontSize: "32px", lineHeight: 1 }}>{gift.emoji}</span>
                    <strong style={{ fontSize: "11px", color: "#1e293b", textAlign: "center", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", width: "100%" }}>
                      {gift.name}
                    </strong>
                    <span
                      style={{
                        display: "inline-flex",
                        alignItems: "center",
                        gap: "3px",
                        fontSize: "10px",
                        fontWeight: 700,
                        color: "#b45309",
                        background: "#fef3c7",
                        padding: "2px 7px",
                        borderRadius: "10px",
                      }}
                    >
                      <Coins size={10} style={{ color: "#d97706" }} /> {gift.price}
                    </span>
                  </button>
                );
              })}
            </div>

            {/* Sending Control Panel */}
            {selectedGift && (
              <div
                style={{
                  background: "#f8fafc",
                  borderRadius: "14px",
                  padding: "14px 16px",
                  border: "1px solid #e2e8f0",
                  display: "flex",
                  flexDirection: "column",
                  gap: "10px",
                }}
              >
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                    <span style={{ fontSize: "22px" }}>{selectedGift.emoji}</span>
                    <div>
                      <strong style={{ fontSize: "12px", color: "#0f172a" }}>{selectedGift.name}</strong>
                      <span style={{ fontSize: "10px", color: "#64748b", display: "block" }}>{selectedGift.description}</span>
                    </div>
                  </div>

                  <span style={{ fontSize: "12px", fontWeight: 700, color: "#b45309", background: "#fef3c7", padding: "3px 9px", borderRadius: "12px" }}>
                    {selectedGift.price} كوينز
                  </span>
                </div>

                {/* Recipient Selector */}
                <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
                  <label style={{ fontSize: "11px", fontWeight: 600, color: "#475569" }}>
                    إرسال إلى:
                  </label>
                  {roomMembers.length > 0 && (
                    <div style={{ display: "flex", gap: "6px", flexWrap: "wrap", marginBottom: "4px" }}>
                      {roomMembers.map((member) => (
                        <button
                          key={member.name}
                          type="button"
                          onClick={() => setRecipient(member.name)}
                          style={{
                            padding: "3px 8px",
                            borderRadius: "12px",
                            fontSize: "10px",
                            background: recipient === member.name ? "#ff7a68" : "#fff",
                            color: recipient === member.name ? "#fff" : "#475569",
                            border: "1px solid #cbd5e1",
                            cursor: "pointer",
                            display: "inline-flex",
                            alignItems: "center",
                            gap: "4px",
                          }}
                        >
                          <span>{member.name}</span>
                          <small style={{ opacity: 0.8 }}>({member.role})</small>
                        </button>
                      ))}
                    </div>
                  )}

                  <input
                    type="text"
                    value={recipient}
                    onChange={(e) => setRecipient(e.target.value)}
                    placeholder="اكتب اسم المستلم أو اختر من أعضاء الغرفة أعلاه"
                    style={{
                      height: "34px",
                      padding: "0 10px",
                      borderRadius: "8px",
                      border: "1px solid #cbd5e1",
                      fontSize: "11px",
                      outline: 0,
                    }}
                  />
                </div>

                {/* Optional Message */}
                <div style={{ display: "flex", gap: "8px" }}>
                  <input
                    type="text"
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    placeholder="رسالة مع الهدية (مثال: شكرًا على المداخلة القيّمة!)"
                    style={{
                      flex: 1,
                      height: "34px",
                      padding: "0 10px",
                      borderRadius: "8px",
                      border: "1px solid #cbd5e1",
                      fontSize: "11px",
                      outline: 0,
                    }}
                  />

                  <button
                    type="button"
                    onClick={handleSendGift}
                    disabled={sending}
                    style={{
                      height: "34px",
                      padding: "0 18px",
                      borderRadius: "8px",
                      background: "#ff7a68",
                      color: "#fff",
                      border: 0,
                      fontWeight: 600,
                      fontSize: "11px",
                      cursor: "pointer",
                      display: "inline-flex",
                      alignItems: "center",
                      gap: "6px",
                      whiteSpace: "nowrap",
                    }}
                  >
                    <Send size={13} /> إرسال الهدية
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* TAB 2: COIN TOP-UP PACKS */}
        {activeTab === "topup" && (
          <div style={{ display: "flex", flexDirection: "column", gap: "12px", overflowY: "auto", maxHeight: "420px" }}>
            <div style={{ background: "#fffbeb", padding: "12px", borderRadius: "10px", border: "1px solid #fef3c7", fontSize: "11px", color: "#92400e" }}>
              💡 <strong>تجربة فورية:</strong> يمكنك شحن أي باقة فوراً لتجربة إرسال الهدايا لجميع المتحدثين في الغرف.
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(130px, 1fr))", gap: "10px" }}>
              {COIN_PACKS.map((pack) => (
                <div
                  key={pack.id}
                  style={{
                    border: pack.popular ? "2px solid #ff7a68" : "1px solid #e2e8f0",
                    background: pack.popular ? "linear-gradient(145deg, #fff9f8, #ffffff)" : "#fff",
                    borderRadius: "14px",
                    padding: "16px 14px",
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "center",
                    position: "relative",
                    boxShadow: "0 2px 8px rgba(0,0,0,0.04)",
                  }}
                >
                  {pack.badge && (
                    <span
                      style={{
                        position: "absolute",
                        top: "-9px",
                        background: "#ff7a68",
                        color: "#fff",
                        fontSize: "9px",
                        fontWeight: 700,
                        padding: "2px 8px",
                        borderRadius: "10px",
                      }}
                    >
                      {pack.badge}
                    </span>
                  )}

                  <div style={{ fontSize: "28px", margin: "6px 0 2px" }}>🪙</div>
                  <strong style={{ fontSize: "13px", color: "#0f172a" }}>{pack.label}</strong>

                  <div style={{ margin: "8px 0 12px", textAlign: "center" }}>
                    <span style={{ fontSize: "22px", fontWeight: 800, color: "#d97706" }}>
                      {(pack.coins + pack.bonus).toLocaleString()}
                    </span>
                    <small style={{ display: "block", color: "#64748b", fontSize: "10px" }}>
                      {pack.bonus > 0 ? `(${pack.coins} + ${pack.bonus} بونص)` : "كوينز صوتية"}
                    </small>
                  </div>

                  <button
                    type="button"
                    onClick={() => handleBuyPack(pack)}
                    disabled={buyingPackId === pack.id}
                    style={{
                      width: "100%",
                      padding: "8px 0",
                      borderRadius: "8px",
                      background: pack.popular ? "#ff7a68" : "#0f172a",
                      color: "#fff",
                      fontSize: "11px",
                      fontWeight: 600,
                      border: 0,
                      cursor: "pointer",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      gap: "6px",
                    }}
                  >
                    <CreditCard size={13} /> {buyingPackId === pack.id ? "جارٍ الشحن…" : `شحن الآن (${pack.priceUsd}$)`}
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* TAB 3: HISTORY */}
        {activeTab === "history" && (
          <div style={{ display: "flex", flexDirection: "column", gap: "8px", overflowY: "auto", maxHeight: "400px" }}>
            {history.length === 0 ? (
              <div style={{ textAlign: "center", padding: "40px 10px", color: "#94a3b8" }}>
                <History size={32} style={{ margin: "0 auto 8px", opacity: 0.6 }} />
                <strong style={{ display: "block", fontSize: "13px", color: "#475569" }}>لا توجد هدايا مرسلة بعد</strong>
                <span style={{ fontSize: "11px" }}>أرسل أول هدية لمضيفك المفضل الآن!</span>
              </div>
            ) : (
              history.map((tx) => (
                <div
                  key={tx.id}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    padding: "10px 14px",
                    borderRadius: "10px",
                    background: "#f8fafc",
                    border: "1px solid #e2e8f0",
                  }}
                >
                  <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                    <span style={{ fontSize: "24px" }}>{tx.emoji}</span>
                    <div>
                      <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                        <strong style={{ fontSize: "12px", color: "#1e293b" }}>{tx.giftName}</strong>
                        <span style={{ fontSize: "11px", color: "#64748b" }}>إلى <strong>{tx.recipientName}</strong></span>
                      </div>
                      {tx.message && <small style={{ color: "#64748b", fontStyle: "italic", display: "block", fontSize: "10px" }}>«{tx.message}»</small>}
                    </div>
                  </div>

                  <div style={{ textAlign: "left" }}>
                    <span style={{ fontSize: "11px", fontWeight: 700, color: "#b45309" }}>-{tx.coins} كوينز</span>
                    <time style={{ display: "block", fontSize: "9px", color: "#94a3b8" }}>{new Date(tx.timestamp).toLocaleTimeString("ar", { hour: "2-digit", minute: "2-digit" })}</time>
                  </div>
                </div>
              ))
            )}
          </div>
        )}
      </div>
    </div>
  );
}
