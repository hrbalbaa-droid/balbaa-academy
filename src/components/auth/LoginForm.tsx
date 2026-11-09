import { useState } from "react";
import { Link } from "@tanstack/react-router";
import { ArrowLeft, FlaskConical, Loader2, LogIn } from "lucide-react";
import { toast } from "sonner";

import { useAuth } from "@/lib/auth/AuthProvider";
import { friendlyAuthError, safeRedirectPath } from "@/lib/auth/redirect";
import type { ProfileRole } from "@/lib/auth/identity";
import { Field } from "@/components/common";
import { Button } from "@/components/ui/button";

export function LoginForm({ redirectTo }: { redirectTo?: string | undefined }) {
  const { signIn, demoSignIn, configured } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  const go = () => window.location.assign(safeRedirectPath(redirectTo));

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError(null);
    if (!email.trim() || !password) {
      setError("اكتب البريد الإلكتروني وكلمة المرور.");
      return;
    }
    setPending(true);
    try {
      await signIn(email, password);
      toast.success("تم تسجيل الدخول");
      go();
    } catch (err) {
      setError(friendlyAuthError(err instanceof Error ? err.message : ""));
    } finally {
      setPending(false);
    }
  };

  const demo = async (role: ProfileRole) => {
    setError(null);
    setPending(true);
    try {
      await demoSignIn(role);
      toast.success("تم الدخول في وضع العرض التجريبي");
      go();
    } catch (err) {
      setError(friendlyAuthError(err instanceof Error ? err.message : ""));
    } finally {
      setPending(false);
    }
  };

  return (
    <div className="surface space-y-6 p-6 md:p-8">
      <div>
        <h1 className="text-2xl font-bold text-primary">تسجيل الدخول</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          ادخل ببيانات حساب الأكاديمية للوصول إلى الحقائب والمحاضرات.
        </p>
      </div>

      <form className="space-y-4" onSubmit={submit}>
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
        <Field label="كلمة المرور" required>
          <input
            type="password"
            dir="ltr"
            autoComplete="current-password"
            className="field text-start"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            placeholder="••••••••"
          />
        </Field>

        {error && (
          <p
            role="alert"
            className="rounded-xl bg-brand-blush p-3 text-sm font-medium text-brand-red"
          >
            {error}
          </p>
        )}

        <Button type="submit" className="w-full" disabled={pending}>
          {pending ? <Loader2 className="size-4 animate-spin" /> : <LogIn className="size-4" />}
          {pending ? "جارٍ تسجيل الدخول…" : "تسجيل الدخول"}
        </Button>
      </form>

      <p className="text-center text-sm text-muted-foreground">
        ليس لديك حساب؟{" "}
        <Link to="/signup" className="font-medium text-brand-green hover:underline">
          إنشاء حساب جديد
        </Link>
      </p>

      {!configured && (
        <div className="space-y-3 rounded-xl border border-dashed border-brand-green/40 bg-secondary/40 p-4">
          <div className="flex items-center gap-2 text-sm font-medium text-primary">
            <FlaskConical className="size-4 text-brand-red" />
            وضع العرض التجريبي
          </div>
          <p className="text-xs leading-relaxed text-muted-foreground">
            لم يتم ربط Supabase بعد. يمكنك تجربة المنصة بالبيانات المحلية باستخدام أحد الحسابين:
          </p>
          <div className="grid gap-2 sm:grid-cols-2">
            <Button
              type="button"
              variant="outline"
              disabled={pending}
              onClick={() => demo("admin")}
            >
              دخول كمدير
            </Button>
            <Button
              type="button"
              variant="outline"
              disabled={pending}
              onClick={() => demo("student")}
            >
              دخول كطالب
            </Button>
          </div>
        </div>
      )}

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
