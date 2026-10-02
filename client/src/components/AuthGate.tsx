import { FormEvent, useState } from "react";
import {
  ArrowLeft,
  ArrowUpLeft,
  CheckCircle2,
  Eye,
  EyeOff,
  Gift,
  Hand,
  KeyRound,
  Lock,
  Mail,
  Mic,
  Radio,
  ShieldCheck,
  Sparkles,
  User,
  UserPlus,
  Volume2,
} from "lucide-react";
import { toast } from "sonner";
import { signInWithEmail, signUpWithEmail } from "@/lib/auth";

type AuthGateProps = {
  onSuccess?: () => void;
};

export default function AuthGate({ onSuccess }: AuthGateProps) {
  const [activeTab, setActiveTab] = useState<"login" | "signup">("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [handle, setHandle] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleLogin = async (e: FormEvent) => {
    e.preventDefault();
    if (!email.trim() || !password) {
      toast.error("يرجى إدخال البريد الإلكتروني وكلمة المرور.");
      return;
    }

    setLoading(true);
    const result = await signInWithEmail(email, password);
    setLoading(false);

    if (!result.success) {
      toast.error("فشل تسجيل الدخول", {
        description: result.error || "تأكد من صحة بياناتك أو أنشئ حسابًا جديدًا.",
      });
      return;
    }

    toast.success("مرحبًا بك مجددًا في Sawtio!", {
      description: "تم تسجيل دخولك بنجاح.",
    });
    onSuccess?.();
  };

  const handleSignUp = async (e: FormEvent) => {
    e.preventDefault();
    if (!displayName.trim()) {
      toast.error("يرجى كتابة اسمك الكامل أو اسم العرض.");
      return;
    }
    if (!email.trim() || !email.includes("@")) {
      toast.error("يرجى إدخال بريد إلكتروني صالح.");
      return;
    }
    if (!password || password.length < 6) {
      toast.error("كلمة المرور يجب أن تتكون من 6 أحرف أو أرقام على الأقل.");
      return;
    }

    setLoading(true);
    const result = await signUpWithEmail(email, password, displayName, handle);
    setLoading(false);

    if (!result.success) {
      toast.error("فشل إنشاء الحساب", {
        description: result.error || "حدث خطأ أثناء إنشاء الحساب.",
      });
      return;
    }

    toast.success(`أهلاً بك يا ${displayName} في Sawtio!`, {
      description: "تم إنشاء حسابك الحقيقي عبر .",
    });
    onSuccess?.();
  };

  return (
    <div
      dir="rtl"
      className="authgate-viewport"
      style={{
        minHeight: "100vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: "radial-gradient(ellipse at 80% 20%, #1e293b 0%, #0b1120 100%)",
        color: "#f8fafc",
        padding: "clamp(12px, 3vw, 32px)",
        fontFamily: "'IBM Plex Sans Arabic', sans-serif",
        position: "relative",
        overflowX: "hidden",
      }}
    >
      {/* Background Decorative Glows */}
      <div
        style={{
          position: "absolute",
          width: "min(500px, 90vw)",
          height: "min(500px, 90vw)",
          borderRadius: "50%",
          background: "radial-gradient(circle, rgba(255, 122, 104, 0.12) 0%, transparent 70%)",
          top: "-100px",
          right: "-100px",
          pointerEvents: "none",
        }}
      />
      <div
        style={{
          position: "absolute",
          width: "min(450px, 80vw)",
          height: "min(450px, 80vw)",
          borderRadius: "50%",
          background: "radial-gradient(circle, rgba(50, 185, 175, 0.1) 0%, transparent 70%)",
          bottom: "-80px",
          left: "-80px",
          pointerEvents: "none",
        }}
      />

      <div className="authgate-card">
        {/* RIGHT SIDE: BRANDING & HERO */}
        <div className="authgate-hero">
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "18px" }}>
              <div
                style={{
                  width: "42px",
                  height: "42px",
                  borderRadius: "12px",
                  background: "linear-gradient(135deg, #ff7a68, #ff8f7f)",
                  display: "grid",
                  placeItems: "center",
                  color: "#fff",
                  boxShadow: "0 6px 18px rgba(255, 122, 104, 0.35)",
                  flexShrink: 0,
                }}
              >
                <Radio size={22} />
              </div>
              <div>
                <strong style={{ fontSize: "19px", color: "#fff", letterSpacing: "-0.5px" }}>Sawtio · صوتيو</strong>
                <span style={{ fontSize: "11px", color: "#94a3b8", display: "block" }}>مساحات الحوار الصوتي المباشر</span>
              </div>
            </div>

            <div
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: "6px",
                background: "rgba(255, 122, 104, 0.15)",
                color: "#ff8f7f",
                padding: "4px 12px",
                borderRadius: "20px",
                fontSize: "11px",
                fontWeight: 600,
                marginBottom: "14px",
              }}
            >
              <Sparkles size={13} /> المنصة الحصرية للنقاشات العربية
            </div>

            <h1 className="authgate-title">
              صوتك يستحق مساحة، <br />
              <span style={{ color: "#ff8f7f" }}>وحكايتك تستحق أن تُسمع.</span>
            </h1>

            <p className="authgate-desc">
              سجّل دخولك الآن للوصول إلى الغرف الصوتية المباشرة، والمشاركة في الحوارات، وتبادل الهدايا والرسائل مع المتحدثين.
            </p>

            {/* Feature Bullets (hidden on very small phones to keep form prominent) */}
            <div className="authgate-bullets">
              {[
                { icon: <Mic size={15} style={{ color: "#ff7a68" }} />, text: "غرف صوتية حية عالية النقاء بتفاعل لحظي" },
                { icon: <Hand size={15} style={{ color: "#f59e0b" }} />, text: "خاصية رفع اليد لطلب الكلمة والمشاركة الصوتية" },
                { icon: <Gift size={15} style={{ color: "#ec4899" }} />, text: "متجر هدايا افتراضية مرتبط برصيد الحساب الحقيقي" },
                { icon: <ShieldCheck size={15} style={{ color: "#32b9af" }} />, text: "خصوصية كاملة ورسائل مباشرة آمنة" },
              ].map((item, idx) => (
                <div key={idx} style={{ display: "flex", alignItems: "center", gap: "10px", fontSize: "12px", color: "#cbd5e1" }}>
                  <div style={{ width: "26px", height: "26px", borderRadius: "8px", background: "rgba(255,255,255,0.06)", display: "grid", placeItems: "center", flexShrink: 0 }}>
                    {item.icon}
                  </div>
                  <span>{item.text}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="authgate-footer-note">
            <span>© 2025 Sawtio Audio Spaces</span>
            <span style={{ color: "#32b9af" }}>مساحة عربية أصيلة</span>
          </div>
        </div>

        {/* LEFT SIDE: FORM */}
        <div className="authgate-form-wrap">
          {/* TAB SWITCHER */}
          <div
            style={{
              display: "flex",
              background: "rgba(255, 255, 255, 0.05)",
              padding: "4px",
              borderRadius: "14px",
              marginBottom: "20px",
              border: "1px solid rgba(255, 255, 255, 0.08)",
            }}
          >
            <button
              type="button"
              onClick={() => setActiveTab("login")}
              style={{
                flex: 1,
                padding: "9px 0",
                borderRadius: "10px",
                border: 0,
                fontSize: "13px",
                fontWeight: 700,
                cursor: "pointer",
                background: activeTab === "login" ? "#ff7a68" : "transparent",
                color: activeTab === "login" ? "#fff" : "#94a3b8",
                transition: "all 0.2s",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: "6px",
              }}
            >
              <KeyRound size={15} /> تسجيل الدخول
            </button>

            <button
              type="button"
              onClick={() => setActiveTab("signup")}
              style={{
                flex: 1,
                padding: "9px 0",
                borderRadius: "10px",
                border: 0,
                fontSize: "13px",
                fontWeight: 700,
                cursor: "pointer",
                background: activeTab === "signup" ? "#ff7a68" : "transparent",
                color: activeTab === "signup" ? "#fff" : "#94a3b8",
                transition: "all 0.2s",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: "6px",
              }}
            >
              <UserPlus size={15} /> حساب جديد
            </button>
          </div>

          {/* TAB 1: LOGIN FORM */}
          {activeTab === "login" ? (
            <form onSubmit={handleLogin} style={{ display: "flex", flexDirection: "column", gap: "15px" }}>
              <div>
                <label style={{ display: "block", fontSize: "11px", fontWeight: 600, color: "#cbd5e1", marginBottom: "6px" }}>
                  البريد الإلكتروني
                </label>
                <div style={{ position: "relative" }}>
                  <input
                    type="email"
                    dir="ltr"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="name@example.com"
                    required
                    style={{
                      width: "100%",
                      height: "44px",
                      background: "rgba(255,255,255,0.06)",
                      border: "1px solid rgba(255,255,255,0.12)",
                      borderRadius: "10px",
                      padding: "0 14px 0 38px",
                      color: "#fff",
                      fontSize: "13px",
                      outline: 0,
                    }}
                  />
                  <Mail size={16} style={{ position: "absolute", left: "12px", top: "14px", color: "#64748b" }} />
                </div>
              </div>

              <div>
                <label style={{ display: "block", fontSize: "11px", fontWeight: 600, color: "#cbd5e1", marginBottom: "6px" }}>
                  كلمة المرور
                </label>
                <div style={{ position: "relative" }}>
                  <input
                    type={showPassword ? "text" : "password"}
                    dir="ltr"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    required
                    style={{
                      width: "100%",
                      height: "44px",
                      background: "rgba(255,255,255,0.06)",
                      border: "1px solid rgba(255,255,255,0.12)",
                      borderRadius: "10px",
                      padding: "0 14px 0 38px",
                      color: "#fff",
                      fontSize: "13px",
                      outline: 0,
                    }}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((v) => !v)}
                    style={{ position: "absolute", left: "12px", top: "13px", background: "transparent", border: 0, color: "#64748b", cursor: "pointer" }}
                    aria-label={showPassword ? "إخفاء كلمة المرور" : "إظهار كلمة المرور"}
                  >
                    {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                style={{
                  height: "46px",
                  borderRadius: "12px",
                  background: "#ff7a68",
                  color: "#fff",
                  fontSize: "13px",
                  fontWeight: 700,
                  border: 0,
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: "8px",
                  marginTop: "6px",
                  boxShadow: "0 4px 18px rgba(255, 122, 104, 0.4)",
                  transition: "opacity 0.2s",
                }}
              >
                {loading ? "جارٍ تسجيل الدخول…" : <>دخول إلى Sawtio <ArrowLeft size={16} /></>}
              </button>
            </form>
          ) : (
            /* TAB 2: SIGN UP FORM */
            <form onSubmit={handleSignUp} style={{ display: "flex", flexDirection: "column", gap: "13px" }}>
              <div>
                <label style={{ display: "block", fontSize: "11px", fontWeight: 600, color: "#cbd5e1", marginBottom: "5px" }}>
                  الاسم الكامل / اسم العرض
                </label>
                <input
                  type="text"
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  placeholder="مثال: فيصل الشمري"
                  required
                  style={{
                    width: "100%",
                    height: "42px",
                    background: "rgba(255,255,255,0.06)",
                    border: "1px solid rgba(255,255,255,0.12)",
                    borderRadius: "10px",
                    padding: "0 14px",
                    color: "#fff",
                    fontSize: "12px",
                    outline: 0,
                  }}
                />
              </div>

              <div>
                <label style={{ display: "block", fontSize: "11px", fontWeight: 600, color: "#cbd5e1", marginBottom: "5px" }}>
                  اسم المستخدم (المعرف الفريد)
                </label>
                <input
                  type="text"
                  dir="ltr"
                  value={handle}
                  onChange={(e) => setHandle(e.target.value)}
                  placeholder="@username"
                  style={{
                    width: "100%",
                    height: "42px",
                    background: "rgba(255,255,255,0.06)",
                    border: "1px solid rgba(255,255,255,0.12)",
                    borderRadius: "10px",
                    padding: "0 14px",
                    color: "#fff",
                    fontSize: "12px",
                    outline: 0,
                  }}
                />
              </div>

              <div>
                <label style={{ display: "block", fontSize: "11px", fontWeight: 600, color: "#cbd5e1", marginBottom: "5px" }}>
                  البريد الإلكتروني
                </label>
                <div style={{ position: "relative" }}>
                  <input
                    type="email"
                    dir="ltr"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="name@example.com"
                    required
                    style={{
                      width: "100%",
                      height: "42px",
                      background: "rgba(255,255,255,0.06)",
                      border: "1px solid rgba(255,255,255,0.12)",
                      borderRadius: "10px",
                      padding: "0 14px 0 38px",
                      color: "#fff",
                      fontSize: "12px",
                      outline: 0,
                    }}
                  />
                  <Mail size={15} style={{ position: "absolute", left: "12px", top: "13px", color: "#64748b" }} />
                </div>
              </div>

              <div>
                <label style={{ display: "block", fontSize: "11px", fontWeight: 600, color: "#cbd5e1", marginBottom: "5px" }}>
                  كلمة المرور (6 خانات على الأقل)
                </label>
                <div style={{ position: "relative" }}>
                  <input
                    type={showPassword ? "text" : "password"}
                    dir="ltr"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    required
                    minLength={6}
                    style={{
                      width: "100%",
                      height: "42px",
                      background: "rgba(255,255,255,0.06)",
                      border: "1px solid rgba(255,255,255,0.12)",
                      borderRadius: "10px",
                      padding: "0 14px 0 38px",
                      color: "#fff",
                      fontSize: "12px",
                      outline: 0,
                    }}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((v) => !v)}
                    style={{ position: "absolute", left: "12px", top: "12px", background: "transparent", border: 0, color: "#64748b", cursor: "pointer" }}
                    aria-label={showPassword ? "إخفاء كلمة المرور" : "إظهار كلمة المرور"}
                  >
                    {showPassword ? <EyeOff size={15} /> : <Eye size={15} />}
                  </button>
                </div>
              </div>

              <div
                style={{
                  background: "rgba(245, 158, 11, 0.12)",
                  border: "1px solid rgba(245, 158, 11, 0.25)",
                  borderRadius: "10px",
                  padding: "8px 12px",
                  display: "flex",
                  alignItems: "center",
                  gap: "8px",
                  fontSize: "11px",
                  color: "#fbbf24",
                }}
              >
                <Gift size={15} style={{ flexShrink: 0 }} />
                <span>حساب حقيقي ورسائل وغرف متزامنة عبر أجهزتك.</span>
              </div>

              <button
                type="submit"
                disabled={loading}
                style={{
                  height: "46px",
                  borderRadius: "12px",
                  background: "#ff7a68",
                  color: "#fff",
                  fontSize: "13px",
                  fontWeight: 700,
                  border: 0,
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: "8px",
                  marginTop: "4px",
                  boxShadow: "0 4px 18px rgba(255, 122, 104, 0.4)",
                }}
              >
                {loading ? "جارٍ إنشاء الحساب…" : <>إنشاء الحساب وبدء الاستخدام <ArrowLeft size={16} /></>}
              </button>
            </form>
          )}

        </div>
      </div>

      <style>{`
        .authgate-card {
          width: 100%;
          max-width: 960px;
          display: grid;
          grid-template-columns: 1fr 1fr;
          background: rgba(15, 23, 42, 0.85);
          backdrop-filter: blur(20px);
          border: 1px solid rgba(255, 255, 255, 0.1);
          border-radius: 24px;
          box-shadow: 0 25px 60px -15px rgba(0, 0, 0, 0.6);
          overflow: hidden;
          z-index: 10;
        }
        .authgate-hero {
          padding: 44px 36px;
          background: linear-gradient(145deg, rgba(30, 41, 59, 0.7), rgba(15, 23, 42, 0.9));
          border-left: 1px solid rgba(255, 255, 255, 0.08);
          display: flex;
          flex-direction: column;
          justifyContent: space-between;
        }
        .authgate-form-wrap {
          padding: 38px 34px;
          display: flex;
          flex-direction: column;
          justifyContent: center;
        }
        .authgate-title {
          font-size: 24px;
          font-weight: 800;
          margin: 0 0 12px;
          line-height: 1.4;
          color: #fff;
        }
        .authgate-desc {
          font-size: 12px;
          color: #94a3b8;
          line-height: 1.7;
          margin: 0 0 24px;
        }
        .authgate-bullets {
          display: flex;
          flex-direction: column;
          gap: 12px;
        }
        .authgate-footer-note {
          margin-top: 32px;
          padding-top: 20px;
          border-top: 1px solid rgba(255,255,255,0.08);
          font-size: 11px;
          color: #64748b;
          display: flex;
          align-items: center;
          justify-content: space-between;
        }
        @media (max-width: 820px) {
          .authgate-card {
            grid-template-columns: 1fr;
            max-width: 480px;
            border-radius: 20px;
          }
          .authgate-hero {
            padding: 24px 20px 18px;
            border-left: 0;
            border-bottom: 1px solid rgba(255, 255, 255, 0.08);
          }
          .authgate-title {
            font-size: 20px;
            margin-bottom: 8px;
          }
          .authgate-desc {
            display: none;
          }
          .authgate-bullets {
            display: none;
          }
          .authgate-footer-note {
            display: none;
          }
          .authgate-form-wrap {
            padding: 24px 20px 28px;
          }
        }
      `}</style>
    </div>
  );
}
