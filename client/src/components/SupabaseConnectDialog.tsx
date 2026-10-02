import { FormEvent, useEffect, useState } from "react";
import { ArrowUpLeft, CheckCircle2, Copy, Database, ExternalLink, HelpCircle, Loader2, ShieldCheck, Trash2, X } from "lucide-react";
import { toast } from "sonner";
import {
  disconnectSupabase,
  getSupabaseCredentials,
  saveSupabaseConnection,
  testSupabaseConnection,
} from "@/lib/supabase";

type SupabaseConnectDialogProps = {
  open: boolean;
  onClose: () => void;
  onConnected?: () => void;
};

export default function SupabaseConnectDialog({ open, onClose, onConnected }: SupabaseConnectDialogProps) {
  const [url, setUrl] = useState("");
  const [anonKey, setAnonKey] = useState("");
  const [testing, setTesting] = useState(false);
  const [currentCreds, setCurrentCreds] = useState<{ url: string; anonKey: string; isCustom: boolean }>({
    url: "",
    anonKey: "",
    isCustom: false,
  });
  const [showSqlGuide, setShowSqlGuide] = useState(false);

  useEffect(() => {
    if (open) {
      const creds = getSupabaseCredentials();
      setCurrentCreds(creds);
      setUrl(creds.url);
      setAnonKey(creds.anonKey);
    }
  }, [open]);

  if (!open) return null;

  const isAlreadyConnected = Boolean(currentCreds.url && currentCreds.anonKey);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const cleanUrl = url.trim();
    const cleanKey = anonKey.trim();

    if (!cleanUrl || !cleanKey) {
      toast.error("يرجى إدخال رابط المشروع والمفتاح العام");
      return;
    }

    setTesting(true);
    const result = await testSupabaseConnection(cleanUrl, cleanKey);
    setTesting(false);

    if (!result.success) {
      toast.error(result.message);
      return;
    }

    saveSupabaseConnection(cleanUrl, cleanKey);
    setCurrentCreds({ url: cleanUrl, anonKey: cleanKey, isCustom: true });

    if (result.tablesFound) {
      toast.success("تم ربط قاعدة البيانات بنجاح!", {
        description: "تم تحميل الغرف والمحادثات من مشروع Supabase الخاص بك.",
      });
    } else {
      toast.info("تم التحقق من بيانات الاتصال بنجاح!", {
        description: "الجداول غير منشأة بعد. يرجى تشغيل supabase/full_schema.sql في Supabase SQL Editor.",
      });
      setShowSqlGuide(true);
    }

    onConnected?.();
  };

  const handleDisconnect = () => {
    disconnectSupabase();
    setUrl("");
    setAnonKey("");
    setCurrentCreds({ url: "", anonKey: "", isCustom: false });
    toast.success("تم فصل قاعدة البيانات والعودة للوضع المحلي.");
    onConnected?.();
  };

  const handleCopySqlHint = () => {
    navigator.clipboard?.writeText("supabase/full_schema.sql");
    toast.info("تم نسخ مسار الملف: supabase/full_schema.sql");
  };

  return (
    <div
      className="dialog-backdrop"
      role="presentation"
      onMouseDown={(event) => {
        if (event.currentTarget === event.target) onClose();
      }}
    >
      <div className="auth-dialog" role="dialog" aria-modal="true" aria-labelledby="supabase-dialog-title" style={{ maxWidth: "480px" }}>
        <button className="dialog-close" type="button" onClick={onClose} aria-label="إغلاق">
          <X size={18} />
        </button>

        <div className="auth-icon" style={{ background: "#e8f8f6", color: "#167c77" }}>
          <Database size={21} />
        </div>

        <div className="eyebrow compact">
          <span className="eyebrow-line" style={{ background: "#32b9af" }} /> تكامل السحابة
        </div>

        <h2 id="supabase-dialog-title" style={{ margin: "10px 0 6px" }}>
          ربط قاعدة بيانات Supabase
        </h2>
        <p style={{ margin: "0 0 16px", color: "#7a8493", fontSize: "11px", lineHeight: "1.7" }}>
          اربط مشروع Supabase الخاص بك لتفعيل حفظ الغرف الصوتية، والرسائل اللحظية، والملفات الشخصية عبر جميع الأجهزة.
        </p>

        {isAlreadyConnected && (
          <div
            style={{
              padding: "12px 14px",
              borderRadius: "10px",
              background: "#f3fcfb",
              border: "1px solid #c9eee9",
              marginBottom: "16px",
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
              <CheckCircle2 size={18} style={{ color: "#32b9af" }} />
              <div>
                <strong style={{ display: "block", fontSize: "11px", color: "#167c77" }}>المشروع متصل حاليًا</strong>
                <small style={{ color: "#7a8493", fontSize: "10px", direction: "ltr", display: "block" }}>
                  {currentCreds.url.replace(/^https?:\/\//, "")}
                </small>
              </div>
            </div>
            {currentCreds.isCustom && (
              <button
                type="button"
                onClick={handleDisconnect}
                style={{
                  background: "transparent",
                  color: "#d9485f",
                  fontSize: "10px",
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "4px",
                  padding: "4px 8px",
                  borderRadius: "6px",
                  cursor: "pointer",
                }}
                title="إلغاء الربط"
              >
                <Trash2 size={13} /> قطع الاتصال
              </button>
            )}
          </div>
        )}

        <form onSubmit={handleSubmit}>
          <label className="auth-label">
            رابط المشروع (Project URL)
            <input
              type="url"
              dir="ltr"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              placeholder="https://xxxxxxxxxxxx.supabase.co"
              required
            />
          </label>

          <label className="auth-label">
            المفتاح العام (anon public key)
            <input
              type="text"
              dir="ltr"
              value={anonKey}
              onChange={(e) => setAnonKey(e.target.value)}
              placeholder="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
              required
            />
          </label>

          <button className="dialog-submit" type="submit" disabled={testing} style={{ background: "#258d86" }}>
            {testing ? (
              <>
                <Loader2 size={16} className="spin" /> جارٍ التحقق من الاتصال…
              </>
            ) : (
              <>
                فحص الاتصال والربط <ArrowUpLeft size={17} />
              </>
            )}
          </button>
        </form>

        <div style={{ marginTop: "14px", borderTop: "1px solid #edf0f4", paddingTop: "12px" }}>
          <button
            type="button"
            onClick={() => setShowSqlGuide((prev) => !prev)}
            style={{
              background: "transparent",
              color: "#6b7787",
              fontSize: "11px",
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              width: "100%",
              cursor: "pointer",
              padding: "4px 0",
            }}
          >
            <span style={{ display: "inline-flex", alignItems: "center", gap: "6px" }}>
              <HelpCircle size={14} /> أين أجد هذه المفاتيح؟ وكيف أهيئ الجداول؟
            </span>
            <span>{showSqlGuide ? "▲" : "▼"}</span>
          </button>

          {showSqlGuide && (
            <div style={{ background: "#f8fafc", padding: "12px", borderRadius: "8px", marginTop: "8px", fontSize: "11px", color: "#475364", lineHeight: "1.7" }}>
              <ol style={{ paddingRight: "18px", margin: "0 0 10px" }}>
                <li>
                  من لوحة تحكم <strong>Supabase</strong>، اذهب إلى <strong>Project Settings → API</strong>.
                </li>
                <li>
                  انسخ <strong>Project URL</strong> و <strong>Project API Keys (anon public)</strong>.
                </li>
                <li>
                  لتهيئة الجداول (الغرف، الرسائل، الأعضاء)، اذهب إلى <strong>SQL Editor</strong>، وافتح ملف:
                  <div style={{ display: "flex", alignItems: "center", gap: "6px", margin: "6px 0" }}>
                    <code style={{ background: "#eef2f6", padding: "3px 7px", borderRadius: "5px", fontSize: "10px", direction: "ltr" }}>
                      supabase/full_schema.sql
                    </code>
                    <button
                      type="button"
                      onClick={handleCopySqlHint}
                      style={{ background: "#fff", border: "1px solid #d2d8e2", padding: "2px 6px", borderRadius: "5px", cursor: "pointer", display: "inline-flex", alignItems: "center", gap: "3px", fontSize: "10px" }}
                    >
                      <Copy size={11} /> نسخ
                    </button>
                  </div>
                  شغّل الاستعلام مرة واحدة لإنشاء الجداول وسياسات الأمان وتفعيل الـ Realtime.
                </li>
              </ol>
              <a
                href="https://supabase.com/dashboard"
                target="_blank"
                rel="noreferrer"
                style={{ color: "#258d86", fontWeight: "600", display: "inline-flex", alignItems: "center", gap: "4px" }}
              >
                فتح Supabase Dashboard <ExternalLink size={12} />
              </a>
            </div>
          )}
        </div>

        <div className="auth-note" style={{ marginTop: "12px" }}>
          <ShieldCheck size={14} />
          <span>المفتاح العام (anon) آمن للاستخدام في المتصفح ويخضع لسياسات RLS.</span>
        </div>
      </div>
    </div>
  );
}
