import { useState } from "react";
import { Link } from "@tanstack/react-router";
import { ArrowLeft, CheckCircle2, Loader2, MailCheck, ShieldCheck, UserPlus } from "lucide-react";
import { toast } from "sonner";

import { useAuth } from "@/lib/auth/AuthProvider";
import { friendlyAuthError, safeRedirectPath } from "@/lib/auth/redirect";
import { Field } from "@/components/common";
import { Button } from "@/components/ui/button";

export function SignupForm({ redirectTo }: { redirectTo?: string | undefined }) {
  const { signUp, configured } = useAuth();
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const [sent, setSent] = useState(false);

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError(null);
    if (!fullName.trim()) return setError("اكتب الاسم بالكامل.");
    if (!email.trim()) return setError("اكتب البريد الإلكتروني.");
    if (password.length < 6) return setError("كلمة المرور يجب أن تكون 6 أحرف على الأقل.");
    if (password !== confirm) return setError("كلمتا المرور غير متطابقتين.");

    setPending(true);
    try {
      const result = await signUp({ fullName, email, password });
      if (result.needsEmailConfirmation) {
        setSent(true);
        toast.success("تم إنشاء الحساب. تحقق من بريدك الإلكتروني لتأكيده.");
        return;
      }
      toast.success("تم إنشاء الحساب وتسجيل الدخول");
      window.location.assign(safeRedirectPath(redirectTo));
    } catch (err) {
      setError(friendlyAuthError(err instanceof Error ? err.message : ""));
    } finally {
      setPending(false);
    }
  };

  if (sent) {
    return (
      <div className="surface space-y-4 p-6 text-center md:p-8">
        <div className="mx-auto grid size-14 place-items-center rounded-2xl bg-secondary text-primary">
          <MailCheck className="size-7" />
        </div>
        <h1 className="text-2xl font-bold text-primary">تحقق من بريدك الإلكتروني</h1>
        <p className="text-sm leading-loose text-muted-foreground">
          أرسلنا رابط تأكيد إلى{" "}
          <span dir="ltr" className="font-medium text-foreground">
            {email}
          </span>
          . بعد التأكيد يمكنك تسجيل الدخول إلى الأكاديمية.
        </p>
        <Button asChild className="w-full">
          <Link to="/login">الذهاب لتسجيل الدخول</Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="surface space-y-6 p-6 md:p-8">
      <div>
        <h1 className="text-2xl font-bold text-primary">إنشاء حساب جديد</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          أنشئ حساب متدرب للوصول إلى الحقائب التدريبية ومتابعة إنجازك.
        </p>
      </div>

      {!configured && (
        <div className="rounded-xl border border-dashed border-warning bg-warning-soft p-4 text-sm">
          <p className="flex items-center gap-2 font-medium">
            <ShieldCheck className="size-4 text-warning" />
            إنشاء الحسابات الحقيقي يتطلب ربط Supabase
          </p>
          <p className="mt-1 text-xs text-muted-foreground">
            يمكنك تجربة المنصة الآن من صفحة{" "}
            <Link to="/login" className="font-medium text-brand-green hover:underline">
              تسجيل الدخول
            </Link>{" "}
            باستخدام حساب تجريبي.
          </p>
        </div>
      )}

      <form className="space-y-4" onSubmit={submit}>
        <Field label="الاسم بالكامل" required>
          <input
            autoComplete="name"
            className="field"
            value={fullName}
            onChange={(event) => setFullName(event.target.value)}
            placeholder="مثال: أحمد محمود"
          />
        </Field>
        <Field label="البريد الإلكتروني" required>
          <input
            type="email"
            dir="ltr"
            autoComplete="email"
            className="field text-start"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            placeholder="name@balbaa.com"
          />
        </Field>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="كلمة المرور" required>
            <input
              type="password"
              dir="ltr"
              autoComplete="new-password"
              className="field text-start"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              placeholder="6 أحرف على الأقل"
            />
          </Field>
          <Field label="تأكيد كلمة المرور" required>
            <input
              type="password"
              dir="ltr"
              autoComplete="new-password"
              className="field text-start"
              value={confirm}
              onChange={(event) => setConfirm(event.target.value)}
              placeholder="أعد كتابتها"
            />
          </Field>
        </div>

        {error && (
          <p
            role="alert"
            className="rounded-xl bg-brand-blush p-3 text-sm font-medium text-brand-red"
          >
            {error}
          </p>
        )}

        <Button type="submit" className="w-full" disabled={pending}>
          {pending ? <Loader2 className="size-4 animate-spin" /> : <UserPlus className="size-4" />}
          {pending ? "جارٍ إنشاء الحساب…" : "إنشاء الحساب"}
        </Button>
      </form>

      <div className="flex items-center gap-2 rounded-xl bg-muted/60 p-3 text-xs text-muted-foreground">
        <CheckCircle2 className="size-4 shrink-0 text-brand-green" />
        يتم إنشاء الحساب بدور «طالب». ترقية الحسابات الإدارية تتم من لوحة تحكم Supabase فقط.
      </div>

      <p className="text-center text-sm text-muted-foreground">
        لديك حساب بالفعل؟{" "}
        <Link to="/login" className="font-medium text-brand-green hover:underline">
          تسجيل الدخول
        </Link>
      </p>

      <Link
        to="/"
        className="flex items-center justify-center gap-1 text-xs text-muted-foreground hover:text-primary"
      >
        <ArrowLeft className="size-3" />
        العودة للرئيسية
      </Link>
    </div>
  );
}
