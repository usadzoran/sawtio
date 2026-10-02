import { useEffect, useState } from "react";
import type { GiftTransaction, VirtualGift } from "@/lib/gifts";

type ActiveGiftBanner = {
  id: string;
  gift: VirtualGift;
  tx: GiftTransaction;
  particles: { id: number; left: number; delay: number; scale: number }[];
};

export default function LiveGiftAnimationOverlay() {
  const [activeGifts, setActiveGifts] = useState<ActiveGiftBanner[]>([]);

  useEffect(() => {
    const handleLiveGift = (event: Event) => {
      const customEvent = event as CustomEvent<{ gift: VirtualGift; transaction: GiftTransaction }>;
      if (!customEvent.detail) return;

      const { gift, transaction } = customEvent.detail;
      const bannerId = `banner-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;

      // Generate 12 floating particle coordinates
      const particles = Array.from({ length: 14 }).map((_, index) => ({
        id: index,
        left: 10 + Math.random() * 80, // percentage 10% - 90%
        delay: Math.random() * 0.4,
        scale: 0.8 + Math.random() * 0.8,
      }));

      const newBanner: ActiveGiftBanner = {
        id: bannerId,
        gift,
        tx: transaction,
        particles,
      };

      setActiveGifts((prev) => [newBanner, ...prev.slice(0, 2)]);

      // Auto dismiss after 4.5 seconds
      setTimeout(() => {
        setActiveGifts((prev) => prev.filter((b) => b.id !== bannerId));
      }, 4500);
    };

    window.addEventListener("sawtio_live_gift", handleLiveGift);
    return () => window.removeEventListener("sawtio_live_gift", handleLiveGift);
  }, []);

  if (activeGifts.length === 0) return null;

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        pointerEvents: "none",
        zIndex: 9999,
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "flex-start",
        paddingTop: "90px",
        overflow: "hidden",
      }}
    >
      {activeGifts.map((item) => (
        <div key={item.id} style={{ position: "relative", width: "100%", maxWidth: "520px", display: "flex", justifyContent: "center", marginBottom: "12px" }}>
          {/* Floating Emoji Particles */}
          {item.particles.map((p) => (
            <span
              key={p.id}
              style={{
                position: "absolute",
                left: `${p.left}%`,
                bottom: "-20px",
                fontSize: "28px",
                transform: `scale(${p.scale})`,
                animation: `floatUpEmoji 2.8s ease-out forwards ${p.delay}s`,
                opacity: 0,
                filter: "drop-shadow(0 4px 10px rgba(0,0,0,0.2))",
              }}
            >
              {item.gift.emoji}
            </span>
          ))}

          {/* Announcement Banner */}
          <div
            style={{
              background: "rgba(22, 33, 49, 0.95)",
              color: "#fff",
              backdropFilter: "blur(14px)",
              border: `1.5px solid ${item.gift.badgeColor}`,
              boxShadow: `0 14px 38px rgba(0,0,0,0.3), 0 0 24px ${item.gift.badgeColor}40`,
              borderRadius: "18px",
              padding: "12px 20px",
              display: "flex",
              alignItems: "center",
              gap: "14px",
              animation: "popInBanner 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275) forwards",
              direction: "rtl",
              maxWidth: "92vw",
            }}
          >
            <div
              style={{
                fontSize: "36px",
                width: "54px",
                height: "54px",
                display: "grid",
                placeItems: "center",
                borderRadius: "14px",
                background: "rgba(255,255,255,0.1)",
                animation: "pulseEmoji 1s infinite alternate ease-in-out",
                flexShrink: 0,
              }}
            >
              {item.gift.emoji}
            </div>

            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ display: "flex", alignItems: "center", gap: "8px", flexWrap: "wrap" }}>
                <span style={{ color: "#ff8f7f", fontWeight: 700, fontSize: "13px" }}>{item.tx.senderName}</span>
                <span style={{ color: "#a0aec0", fontSize: "11px" }}>أهدى</span>
                <span
                  style={{
                    background: item.gift.badgeColor,
                    color: "#fff",
                    padding: "2px 8px",
                    borderRadius: "20px",
                    fontSize: "11px",
                    fontWeight: 600,
                  }}
                >
                  {item.gift.name}
                </span>
                <span style={{ color: "#a0aec0", fontSize: "11px" }}>إلى</span>
                <strong style={{ color: "#32b9af", fontSize: "13px" }}>{item.tx.recipientName}</strong>
              </div>

              {item.tx.message && (
                <p style={{ margin: "4px 0 0", color: "#e2e8f0", fontSize: "11px", fontStyle: "italic", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                  «{item.tx.message}»
                </p>
              )}
            </div>

            <div
              style={{
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                padding: "4px 10px",
                borderRadius: "10px",
                background: "rgba(255,255,255,0.08)",
                flexShrink: 0,
              }}
            >
              <span style={{ fontSize: "11px", color: "#fbbf24", fontWeight: 700 }}>+{item.gift.price}</span>
              <small style={{ fontSize: "9px", color: "#94a3b8" }}>كوينز</small>
            </div>
          </div>
        </div>
      ))}

      <style>{`
        @keyframes popInBanner {
          0% { opacity: 0; transform: translateY(-30px) scale(0.9); }
          100% { opacity: 1; transform: translateY(0) scale(1); }
        }
        @keyframes floatUpEmoji {
          0% { opacity: 0; transform: translateY(0) scale(0.6); }
          15% { opacity: 1; }
          85% { opacity: 0.9; }
          100% { opacity: 0; transform: translateY(-240px) scale(1.3) rotate(20deg); }
        }
        @keyframes pulseEmoji {
          0% { transform: scale(1); }
          100% { transform: scale(1.15) rotate(5deg); }
        }
      `}</style>
    </div>
  );
}
