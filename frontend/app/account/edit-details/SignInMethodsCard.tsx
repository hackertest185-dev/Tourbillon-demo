// Sign-in methods for the edit-details page.
"use client";

import { egyptianError } from '@/lib/egyptianError';
import Link from "next/link";
import { AnimatePresence, motion } from "framer-motion";
import { useEffect, useRef, useState } from "react";
import {
  User,
  changePassword,
  confirmPasswordSetup,
  requestPasswordSetup,
} from "@/lib/api";
import { useAuth } from "@/contexts/AuthContext";
import { EASE_ENTER } from "@/lib/motion";

const CODE_LENGTH = 6;
const RESEND_COOLDOWN = 30;

const panelMotion = {
  initial: { opacity: 0, y: 8 },
  animate: { opacity: 1, y: 0, transition: { duration: 0.28, ease: EASE_ENTER } },
  exit: { opacity: 0, y: -6, transition: { duration: 0.18, ease: EASE_ENTER } },
};

function validateNewPassword(pw: string, confirm: string, current?: string): string | null {
  if (pw.length < 12) return "الباسورد لازم يكون 12 حرف على الأقل";
  if (!/[A-Z]/.test(pw)) return "لازم يكون فيه حرف إنجليزي كبير";
  if (!/\d/.test(pw)) return "لازم يكون فيه رقم";
  if (current && pw === current) return "اختار باسورد مختلف عن الحالي";
  if (pw !== confirm) return "الباسوردين الجداد مش زي بعض";
  return null;
}

function StatusBadge({ label, tone = "gold" }: { label: string; tone?: "gold" | "quiet" }) {
  return (
    <span
      className="rounded-full px-2.5 py-1 text-[10px] font-medium uppercase tracking-[0.18em]"
      style={{
        background: tone === "gold" ? "rgba(191,166,138,0.12)" : "rgba(255,255,255,0.06)",
        color: tone === "gold" ? "#bfa68a" : "rgba(255,255,255,0.45)",
      }}
    >
      {label}
    </span>
  );
}

function GoldButton({
  type = "button",
  onClick,
  disabled,
  children,
}: {
  type?: "button" | "submit";
  onClick?: () => void;
  disabled?: boolean;
  children: React.ReactNode;
}) {
  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      className="w-full py-3 text-[9.5px] font-medium uppercase tracking-[0.28em] text-[#1e1206] transition-all duration-500 disabled:cursor-not-allowed disabled:opacity-40 sm:w-auto sm:px-7"
      style={{
        background: "linear-gradient(105deg, #bfa68a 0%, #d4b898 50%, #bfa68a 100%)",
        backgroundSize: "200% 100%",
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.backgroundPosition = "100% 0";
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.backgroundPosition = "0% 0";
      }}
    >
      {children}
    </button>
  );
}

function FieldInput({
  label,
  type = "text",
  value,
  onChange,
  placeholder,
  autoComplete,
  autoFocus,
  disabled,
}: {
  label: string;
  type?: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  autoComplete?: string;
  autoFocus?: boolean;
  disabled?: boolean;
}) {
  const [focused, setFocused] = useState(false);

  return (
    <label className="block">
      <span className="mb-2 block text-[8.5px] uppercase tracking-[0.28em] text-[#bfa68a]/65">
        {label}
      </span>
      <span className="relative block">
        <input
          type={type}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          placeholder={placeholder}
          autoComplete={autoComplete}
          autoFocus={autoFocus}
          disabled={disabled}
          className="w-full border-b border-white/15 bg-transparent py-2.5 text-sm text-white placeholder:text-white/25 focus:outline-none disabled:opacity-45"
        />
        <span
          className="absolute bottom-0 left-0 h-px origin-left bg-[#bfa68a]/70 transition-transform duration-300"
          style={{ width: "100%", transform: focused ? "scaleX(1)" : "scaleX(0)" }}
        />
      </span>
    </label>
  );
}

function OtpBoxes({
  chars,
  onChange,
  disabled,
}: {
  chars: string[];
  onChange: (c: string[]) => void;
  disabled?: boolean;
}) {
  const refs = useRef<(HTMLInputElement | null)[]>([]);

  const update = (i: number, value: string) => {
    const ch = value.replace(/[^a-zA-Z0-9]/g, "").slice(-1).toUpperCase();
    const next = [...chars];
    next[i] = ch;
    onChange(next);
    if (ch && i < CODE_LENGTH - 1) refs.current[i + 1]?.focus();
  };

  const keyDown = (i: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Backspace" && !chars[i] && i > 0) refs.current[i - 1]?.focus();
  };

  const paste = (e: React.ClipboardEvent) => {
    e.preventDefault();
    const text = e.clipboardData
      .getData("text")
      .replace(/[^a-zA-Z0-9]/g, "")
      .toUpperCase()
      .slice(0, CODE_LENGTH);
    const next = Array(CODE_LENGTH).fill("");
    text.split("").forEach((c, i) => {
      next[i] = c;
    });
    onChange(next);
    refs.current[Math.min(text.length, CODE_LENGTH - 1)]?.focus();
  };

  return (
    <div className="flex gap-2" onPaste={paste}>
      {chars.map((ch, i) => (
        <input
          key={i}
          ref={(el) => {
            refs.current[i] = el;
          }}
          type="text"
          inputMode="text"
          maxLength={1}
          value={ch}
          disabled={disabled}
          onChange={(e) => update(i, e.target.value)}
          onKeyDown={(e) => keyDown(i, e)}
          className="h-12 w-10 border-b-2 bg-transparent text-center text-base font-medium uppercase text-white transition-colors duration-200 focus:outline-none disabled:opacity-40"
          style={{ borderColor: ch ? "rgba(191,166,138,0.65)" : "rgba(255,255,255,0.14)" }}
        />
      ))}
    </div>
  );
}

function SetupFlow({ user, onSuccess }: { user: User; onSuccess: () => void }) {
  const [phase, setPhase] = useState<"send" | "otp">("send");
  const [sending, setSending] = useState(false);
  const [cooldown, setCooldown] = useState(0);
  const [chars, setChars] = useState<string[]>(Array(CODE_LENGTH).fill(""));
  const [newPw, setNewPw] = useState("");
  const [confirmPw, setConfirmPw] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  const code = chars.join("");
  const codeComplete = code.length === CODE_LENGTH;
  const passwordsMatch = confirmPw.length > 0 && newPw === confirmPw;
  const passwordsMismatch = confirmPw.length > 0 && newPw !== confirmPw;

  useEffect(() => {
    if (cooldown <= 0) return;
    const t = setTimeout(() => setCooldown((c) => c - 1), 1000);
    return () => clearTimeout(t);
  }, [cooldown]);

  const sendCode = async () => {
    setSending(true);
    setError("");
    try {
      await requestPasswordSetup();
      setPhase("otp");
      setCooldown(RESEND_COOLDOWN);
      setChars(Array(CODE_LENGTH).fill(""));
    } catch (err) {
      setError(egyptianError(err, "معرفناش نبعت الكود. جرّب تاني."));
    } finally {
      setSending(false);
    }
  };

  const resend = async () => {
    if (cooldown > 0) return;
    setError("");
    try {
      await requestPasswordSetup();
      setCooldown(RESEND_COOLDOWN);
      setChars(Array(CODE_LENGTH).fill(""));
    } catch {
      setError("معرفناش نبعت الكود تاني. جرّب بعد شوية.");
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const validErr = validateNewPassword(newPw, confirmPw);
    if (validErr) {
      setError(validErr);
      return;
    }
    setSubmitting(true);
    setError("");
    try {
      await confirmPasswordSetup(code, newPw);
      onSuccess();
    } catch (err) {
      setError(egyptianError(err, "معرفناش نحفظ الباسورد. جرّب تاني."));
      setChars(Array(CODE_LENGTH).fill(""));
    } finally {
      setSubmitting(false);
    }
  };

  if (phase === "send") {
    return (
      <motion.div {...panelMotion} className="space-y-4">
        <p className="max-w-md text-xs leading-relaxed text-white/35">
          هنبعتلك كود لتحديد الباسورد على <span className="text-[#bfa68a]/85">{user.email}</span>.
        </p>
        {error && <p className="text-xs text-[#e07575]">{error}</p>}
        <GoldButton onClick={sendCode} disabled={sending}>
          {sending ? "بنبعت..." : "ابعت الكود"}
        </GoldButton>
      </motion.div>
    );
  }

  return (
    <motion.form {...panelMotion} onSubmit={handleSubmit} className="space-y-5">
      <div className="space-y-3">
        <p className="text-xs text-white/35">
          بعتنا الكود على <span className="text-[#bfa68a]/85">{user.email}</span>.
        </p>
        <OtpBoxes chars={chars} onChange={setChars} disabled={submitting} />
        <button
          type="button"
          onClick={resend}
          disabled={cooldown > 0}
          className="text-xs text-white/32 transition hover:text-[#bfa68a] disabled:cursor-not-allowed disabled:opacity-35"
        >
          {cooldown > 0 ? `ابعت الكود تاني بعد ${cooldown} ثانية` : "ابعت الكود تاني"}
        </button>
      </div>

      <AnimatePresence initial={false}>
        {codeComplete && (
          <motion.div {...panelMotion} className="space-y-4">
            <FieldInput
              label="الباسورد الجديد"
              type="password"
              value={newPw}
              onChange={(value) => {
                setNewPw(value);
                setError("");
              }}
              placeholder="الباسورد الجديد"
              autoComplete="new-password"
            />
            <div>
              <FieldInput
                label="اكتب الباسورد الجديد تاني"
                type="password"
                value={confirmPw}
                onChange={(value) => {
                  setConfirmPw(value);
                  setError("");
                }}
                placeholder="اكتب الباسورد الجديد تاني"
                autoComplete="new-password"
              />
              {passwordsMatch && (
                <p className="mt-2 text-[10px] tracking-wide text-[#bfa68a]/70">الباسوردين زي بعض</p>
              )}
              {passwordsMismatch && (
                <p className="mt-2 text-[10px] text-[#e07575]/85">الباسوردين الجداد مش زي بعض</p>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {error && <p className="text-xs text-[#e07575]">{error}</p>}

      {codeComplete && (
        <GoldButton type="submit" disabled={submitting || !newPw || !confirmPw}>
          {submitting ? "بنحفظ الباسورد..." : "حدد الباسورد"}
        </GoldButton>
      )}
    </motion.form>
  );
}

function ChangeFlow({ user, onSuccess }: { user: User; onSuccess: () => void }) {
  const [currentPw, setCurrentPw] = useState("");
  const [newPw, setNewPw] = useState("");
  const [confirmPw, setConfirmPw] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const passwordsMatch = confirmPw.length > 0 && newPw === confirmPw;
  const passwordsMismatch = confirmPw.length > 0 && newPw !== confirmPw;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSuccess("");

    if (!currentPw) {
      setError("اكتب الباسورد الحالي");
      return;
    }

    const validErr = validateNewPassword(newPw, confirmPw, currentPw);
    if (validErr) {
      setError(validErr);
      return;
    }

    setSubmitting(true);
    setError("");
    try {
      await changePassword(currentPw, newPw);
      setSuccess("الباسورد اتغيّر.");
      setCurrentPw("");
      setNewPw("");
      setConfirmPw("");
      await onSuccess();
    } catch (err) {
      setError(egyptianError(err, "معرفناش نغيّر الباسورد. جرّب تاني."));
    } finally {
      setSubmitting(false);
    }
  };

  const clearFeedback = () => {
    if (error) setError("");
    if (success) setSuccess("");
  };

  return (
    <motion.form {...panelMotion} onSubmit={handleSubmit} className="space-y-5">
      <FieldInput
        label="الباسورد الحالي"
        type="password"
        value={currentPw}
        onChange={(value) => {
          setCurrentPw(value);
          clearFeedback();
        }}
        placeholder="الباسورد الحالي"
        autoComplete="current-password"
        autoFocus
      />
      <div className="grid gap-5 md:grid-cols-2">
        <FieldInput
          label="الباسورد الجديد"
          type="password"
          value={newPw}
          onChange={(value) => {
            setNewPw(value);
            clearFeedback();
          }}
          placeholder="الباسورد الجديد"
          autoComplete="new-password"
        />
        <div>
          <FieldInput
            label="اكتب الباسورد الجديد تاني"
            type="password"
            value={confirmPw}
            onChange={(value) => {
              setConfirmPw(value);
              clearFeedback();
            }}
            placeholder="اكتب الباسورد الجديد تاني"
            autoComplete="new-password"
          />
          {passwordsMatch && (
            <p className="mt-2 text-[10px] tracking-wide text-[#bfa68a]/70">الباسوردين زي بعض</p>
          )}
          {passwordsMismatch && (
            <p className="mt-2 text-[10px] text-[#e07575]/85">الباسوردين الجداد مش زي بعض</p>
          )}
        </div>
      </div>

      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <Link
          href={`/forgot-password?email=${encodeURIComponent(user.email)}`}
          className="text-xs text-white/35 transition hover:text-[#bfa68a]"
        >
          نسيت الباسورد؟
        </Link>
        <GoldButton type="submit" disabled={submitting || !currentPw || !newPw || !confirmPw}>
          {submitting ? "بنتأكد من الباسورد الحالي..." : "غيّر الباسورد"}
        </GoldButton>
      </div>

      {error && <p className="text-xs text-[#e07575]">{error}</p>}
      {success && <p className="text-xs text-[#bfa68a]/80">{success}</p>}
    </motion.form>
  );
}

interface Props {
  user: User;
}

export default function SignInMethodsCard({ user }: Props) {
  const { login } = useAuth();
  const [expanded, setExpanded] = useState(false);
  const [justSetPassword, setJustSetPassword] = useState(false);

  const hasPassword = justSetPassword || user.hasPassword;

  const handleSuccess = async () => {
    await login("refresh");
    setExpanded(false);
    setJustSetPassword(true);
  };

  return (
    <section className="border-t border-white/10 pt-9">
      <div className="mb-6">
        <p className="text-[9px] uppercase tracking-[0.36em] text-[#bfa68a]">الأمان</p>
        <h2 className="mt-2 font-playfair text-2xl font-light text-[#f0e6d2]">طرق تسجيل الدخول</h2>
      </div>

      <div className="divide-y divide-white/10">
        {user.hasGoogle && (
          <div className="flex items-center justify-between gap-5 py-4">
            <div>
              <p className="text-sm font-medium text-[#f0e6d2]">جوجل</p>
              <p className="mt-1 text-xs text-white/32">ادخل بحساب جوجل بتاعك</p>
            </div>
            <StatusBadge label="متوصل" />
          </div>
        )}

        <div className="flex items-center justify-between gap-5 py-4">
          <div>
            <p className="text-sm font-medium text-[#f0e6d2]">لينك الدخول المباشر</p>
            <p className="mt-1 text-xs text-white/32">كود بيتبعت على إيميلك وبتستخدمه مرة واحدة</p>
          </div>
          <StatusBadge label="شغال" />
        </div>

        <div className="py-4">
          <div className="flex items-start justify-between gap-5">
            <div>
              <p className="text-sm font-medium text-[#f0e6d2]">الباسورد</p>
              <p className="mt-1 text-xs text-white/32">
                {hasPassword ? "غيّر الباسورد بعد ما تأكد الباسورد الحالي" : "حدد باسورد بكود على الإيميل"}
              </p>
            </div>
            <div className="flex shrink-0 items-center gap-3">
              {hasPassword && !expanded && <StatusBadge label="شغال" tone="quiet" />}
              <button
                type="button"
                onClick={() => setExpanded((value) => !value)}
                className="text-xs text-[#bfa68a]/70 transition hover:text-[#bfa68a]"
              >
                {expanded ? "إلغاء" : hasPassword ? "غيّر" : "ظبّط"}
              </button>
            </div>
          </div>

          <AnimatePresence initial={false}>
            {expanded && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto", transition: { duration: 0.28, ease: EASE_ENTER } }}
                exit={{ opacity: 0, height: 0, transition: { duration: 0.18, ease: EASE_ENTER } }}
                className="overflow-hidden"
              >
                <div className="pt-6">
                  {!hasPassword ? (
                    <SetupFlow user={user} onSuccess={handleSuccess} />
                  ) : (
                    <ChangeFlow user={user} onSuccess={handleSuccess} />
                  )}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </section>
  );
}
