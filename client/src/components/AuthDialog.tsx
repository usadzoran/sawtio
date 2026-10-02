import { FormEvent, useState } from "react";
import { ArrowUpLeft, Mail, ShieldCheck, UserCheck, X } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/lib/supabase";
import { saveGuestUser } from "@/lib/auth";

type AuthDialogProps = {
  open: boolean;
  onClose: () => void;
};

export default function AuthDialog({ open, onClose }: AuthDialogProps) {
  const [email, setEmail] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [busy, setBusy] = useState(false);
  const [sent, setSent] = useState(false);

  if (!open) return null;

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const normalizedEmail = email.trim();

    if (!supabase) {
      // In static / GitHub Pages mode without Supabase:
      const name = displayName.trim() || normalizedEmail.split("@")[0] || "ضيف Sawtio";
      saveGuestUser(name, normalizedEmail || undefined);
      toast.success(`مرحبًا بك، ${name}!`, {
        description: "تم تسجيل دخولك بنجاح في وضع العرض المباشر (GitHub Pages).",
      });
      onClose();
      return;
    }

    if (!normalizedEmail || !normalizedEmail.includes("@")) {
      toast.error("أدخل بريدًا إلكترونيًا صحيحًا.");
      return;
    }

    setBusy(true);
    const { error } = await supabase.auth.signInWithOtp({
      email: normalizedEmail,
      options: { emailRedirectTo: window.location.origin },
    });
    setBusy(false);

    if (error) {
      toast.error("تعذر إرسال رابط الدخول", { description: error.message });
      return;
    }
    setSent(true);
  };

  const handleGuestLogin = () => {
    const name = displayName.trim() || "ضيف Sawtio";
    saveGuestUser(name);
    toast.success(`مرحبًا بك، ${name}!`, {
      description: "يمكنك الآن استكشاف الغرف، وتفعيل الصوت، والمشاركة.",
    });
    onClose();
  };

  return (
    <div
      className="dialog-backdrop"
      role="presentation"
      onMouseDown={(event) => {
        if (event.currentTarget === event.target) onClose();
      }}
    >
      <div className="auth-dialog" role="dialog" aria-modal="true" aria-labelledby="auth-title">
        <button className="dialog-close" type="button" onClick={onClose} aria-label="إغلاق">
          <X size={18} />
        </button>
        <div className="auth-icon">
          <Mail size={21} />
        </div>
        <div className="eyebrow compact">
          <span className="eyebrow-line" /> مساحة آمنة
        </div>
        {sent ? (
          <>
            <h2 id="auth-title">تحقق من بريدك.</h2>
            <p>
              أرسلنا رابط دخول آمن إلى <strong>{email}</strong>. افتحه للعودة إلى Sawtio بحسابك.
            </p>
            <button className="dialog-submit" type="button" onClick={() => setSent(false)}>
              استخدم بريدًا آخر <ArrowUpLeft size={17} />
            </button>
          </>
        ) : (
          <>
            <h2 id="auth-title">ادخل إلى مساحتك.</h2>
            <p>
              {supabase
                ? "سجّل بريدك لتصلك روابط الدخول الآمنة وتحفظ غرفك."
                : "يمكنك الدخول السريع باسمك لتجربة كافة مزايا الغرف الصوتية على صفحات GitHub."}
            </p>
            <form onSubmit={handleSubmit}>
              <label className="auth-label">
                الاسم أو اللقب (اختياري)
                <input
                  type="text"
                  value={displayName}
                  onChange={(event) => setDisplayName(event.target.value)}
                  placeholder="مثال: سارة أو عبد الرحمن"
                />
              </label>
              <label className="auth-label">
                البريد الإلكتروني
                <input
                  autoFocus={Boolean(supabase)}
                  type="email"
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  placeholder="you@example.com"
                />
              </label>
              <button className="dialog-submit" type="submit" disabled={busy}>
                {busy
                  ? "جارٍ المعالجة…"
                  : supabase
                    ? <>أرسل رابط الدخول <ArrowUpLeft size={17} /></>
                    : <>متابعة الدخول <ArrowUpLeft size={17} /></>}
              </button>
            </form>

            <div style={{ marginTop: "14px", textAlign: "center" }}>
              <button
                type="button"
                onClick={handleGuestLogin}
                style={{
                  background: "transparent",
                  border: "1px dashed #d5dce5",
                  padding: "8px 14px",
                  borderRadius: "8px",
                  color: "#6b7787",
                  fontSize: "11px",
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "6px",
                  cursor: "pointer",
                }}
              >
                <UserCheck size={14} /> دخول سريع كضيف بدون بريد
              </button>
            </div>

            <div className="auth-note">
              <ShieldCheck size={14} />
              <span>
                {supabase
                  ? "لا نطلب كلمة مرور. الرابط صالح للاستخدام مرة واحدة."
                  : "يعمل التطبيق كنسخة ثابتة على GitHub Pages بتجربة تفاعلية متكاملة."}
              </span>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
