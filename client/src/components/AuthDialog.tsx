import { FormEvent, useState } from "react";
import { ArrowUpLeft, Mail, ShieldCheck, X } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/lib/supabase";

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

    if (!normalizedEmail || !normalizedEmail.includes("@")) {
      toast.error("أدخل بريدًا إلكترونيًا صحيحًا.");
      return;
    }
    if (!supabase) {
      toast.error("تعذر الاتصال بالخدمة", { description: "أعد تحميل الموقع وحاول مرة أخرى." });
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
              سجّل بريدك لتصلك روابط الدخول الآمنة وتحفظ غرفك في الخدمة.
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
                  autoFocus
                  type="email"
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  placeholder="you@example.com"
                />
              </label>
              <button className="dialog-submit" type="submit" disabled={busy}>
                {busy
                  ? "جارٍ المعالجة…"
                  : <>أرسل رابط الدخول <ArrowUpLeft size={17} /></>}
              </button>
            </form>

            <div className="auth-note">
              <ShieldCheck size={14} />
              <span>
                لا نطلب كلمة مرور. الرابط صالح للاستخدام مرة واحدة.
              </span>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
