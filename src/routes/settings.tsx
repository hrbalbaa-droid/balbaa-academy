import { createFileRoute } from "@tanstack/react-router";
import { useRef, useState } from "react";
import { Download, Upload, RotateCcw, Save, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { useData } from "@/lib/store";
import { useAuth } from "@/lib/auth/AuthProvider";
import { can } from "@/lib/permissions";
import { requireAdminIdentity } from "@/lib/auth/guards";
import { requireSupabase } from "@/lib/supabase/client";
import { backupFileName, downloadBlob } from "@/lib/backup";
import { Confirm, Field, PageHeader } from "@/components/common";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

const MAX_AVATAR_BYTES = 5 * 1024 * 1024;

export const Route = createFileRoute("/settings")({
  beforeLoad: async ({ location }) => {
    await requireAdminIdentity(location.href);
  },
  head: () => ({
    meta: [
      { title: "الإعدادات والنسخ الاحتياطي | أكاديمية صيدليات بلبع" },
      { name: "description", content: "إدارة بيانات الأكاديمية وتصدير واستعادة النسخ الاحتياطية." },
      { property: "og:title", content: "الإعدادات – أكاديمية بلبع" },
      {
        property: "og:description",
        content: "بيانات الأكاديمية والنسخ الاحتياطية للعرض التجريبي.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: SettingsPage,
});

function SettingsPage() {
  const { data, user, updateSettings, importData, resetDemo } = useData();
  const { configured, identity, updateAvatarUrl } = useAuth();
  const [form, setForm] = useState(data.settings);
  const [pending, setPending] = useState<unknown>(null);
  const [saving, setSaving] = useState(false);
  const [newPassword, setNewPassword] = useState("");
  const [confirmNewPassword, setConfirmNewPassword] = useState("");
  const [passwordSaving, setPasswordSaving] = useState(false);
  const fileInput = useRef<HTMLInputElement>(null);
  const avatarInput = useRef<HTMLInputElement>(null);
  const [avatarSaving, setAvatarSaving] = useState(false);
  if (!can(user, "manage_settings"))
    return <p className="py-10 text-center font-bold">ليست لديك صلاحية إدارة الإعدادات.</p>;
  const save = async () => {
    if (!form.name.trim()) {
      toast.error("اكتب اسم الأكاديمية أولاً.");
      return;
    }
    setSaving(true);
    const ok = await updateSettings(form);
    setSaving(false);
    if (ok) toast.success("تم حفظ بيانات الأكاديمية");
  };
  const readBackup = async (file?: File) => {
    if (!file) return;
    try {
      setPending(JSON.parse(await file.text()));
    } catch {
      toast.error("تعذر قراءة الملف. اختر نسخة احتياطية بصيغة JSON.");
    }
  };
  const changePassword = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (passwordSaving) return;
    if (newPassword.length < 6) {
      toast.error("يجب أن تتكون كلمة المرور من 6 أحرف على الأقل.");
      return;
    }
    if (newPassword !== confirmNewPassword) {
      toast.error("كلمتا المرور غير متطابقتين.");
      return;
    }

    setPasswordSaving(true);
    try {
      const { error } = await requireSupabase().auth.updateUser({ password: newPassword });
      if (error) throw new Error(error.message);
      toast.success("تم تغيير كلمة المرور بنجاح");
      setNewPassword("");
      setConfirmNewPassword("");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "تعذر تغيير كلمة المرور.");
    } finally {
      setPasswordSaving(false);
    }
  };
  const uploadAvatar = async (file?: File) => {
    if (!file || !identity || avatarSaving) return;
    if (file.type !== "image/png") {
      toast.error("اختر صورة بصيغة PNG.");
      return;
    }
    if (file.size > MAX_AVATAR_BYTES) {
      toast.error("حجم الصورة أكبر من الحد المسموح (5 ميجابايت).");
      return;
    }

    setAvatarSaving(true);
    try {
      const client = requireSupabase();
      const path = `${identity.id}/avatar.png`;
      const { error: uploadError } = await client.storage.from("avatars").upload(path, file, {
        cacheControl: "3600",
        contentType: "image/png",
        upsert: true,
      });
      if (uploadError) throw new Error(`تعذر رفع الصورة: ${uploadError.message}`);

      const { data: publicData } = client.storage.from("avatars").getPublicUrl(path);
      const avatarUrl = `${publicData.publicUrl}?v=${Date.now()}`;
      const { data: profile, error: profileError } = await client
        .from("profiles")
        .update({ avatar_url: avatarUrl })
        .eq("id", identity.id)
        .select("id")
        .maybeSingle();
      if (profileError) throw new Error(`تعذر حفظ رابط الصورة: ${profileError.message}`);
      if (!profile) throw new Error("تعذر تحديث الملف الشخصي لهذا المستخدم.");

      updateAvatarUrl(avatarUrl);
      toast.success("تم تحديث الصورة الشخصية");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "تعذر تحديث الصورة الشخصية.");
    } finally {
      setAvatarSaving(false);
    }
  };
  return (
    <div>
      <PageHeader title="الإعدادات" />
      {configured && identity && (
        <section className="max-w-3xl space-y-5 border-b py-8">
          <h2 className="text-lg font-bold text-primary">الصورة الشخصية</h2>
          <div className="flex flex-wrap items-center gap-4">
            <Avatar className="size-16">
              <AvatarImage src={identity.avatarUrl ?? undefined} alt="الصورة الشخصية" />
              <AvatarFallback className="bg-secondary text-xl font-bold text-primary">
                {identity.fullName.replace(/^(د\.|أ\.)\s*/, "").charAt(0) || "؟"}
              </AvatarFallback>
            </Avatar>
            <div className="space-y-2">
              <p className="text-sm text-muted-foreground">
                ارفع صورة PNG بحجم لا يتجاوز 5 ميجابايت.
              </p>
              <Button
                type="button"
                variant="outline"
                disabled={avatarSaving}
                onClick={() => avatarInput.current?.click()}
              >
                {avatarSaving ? (
                  <Loader2 className="size-4 animate-spin" />
                ) : (
                  <Upload className="size-4" />
                )}
                {avatarSaving ? "جارٍ رفع الصورة…" : "تغيير الصورة"}
              </Button>
              <input
                ref={avatarInput}
                type="file"
                accept="image/png"
                className="hidden"
                aria-label="الصورة الشخصية بصيغة PNG"
                disabled={avatarSaving}
                onChange={(event) => {
                  void uploadAvatar(event.target.files?.[0]);
                  event.target.value = "";
                }}
              />
            </div>
          </div>
        </section>
      )}
      {configured && (
        <section className="max-w-3xl space-y-5 border-b py-8">
          <h2 className="text-lg font-bold text-primary">تغيير كلمة المرور</h2>
          <form className="space-y-5" onSubmit={changePassword}>
            <Field label="كلمة المرور الجديدة" required>
              <input
                type="password"
                autoComplete="new-password"
                minLength={6}
                required
                className="field"
                value={newPassword}
                onChange={(event) => setNewPassword(event.target.value)}
              />
            </Field>
            <Field label="تأكيد كلمة المرور الجديدة" required>
              <input
                type="password"
                autoComplete="new-password"
                minLength={6}
                required
                className="field"
                value={confirmNewPassword}
                onChange={(event) => setConfirmNewPassword(event.target.value)}
              />
            </Field>
            <Button type="submit" disabled={passwordSaving}>
              {passwordSaving ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                <Save className="size-4" />
              )}
              {passwordSaving ? "جارٍ الحفظ…" : "حفظ كلمة المرور"}
            </Button>
          </form>
        </section>
      )}
      <section className="max-w-3xl space-y-5 border-b pb-8">
        <h2 className="text-lg font-bold text-primary">بيانات الأكاديمية</h2>
        <Field label="اسم الأكاديمية" required>
          <input
            className="field"
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
          />
        </Field>
        <Field label="العنوان الفرعي">
          <input
            className="field"
            value={form.tagline}
            onChange={(e) => setForm({ ...form, tagline: e.target.value })}
          />
        </Field>
        <Field label="شعار الأكاديمية النصي">
          <input
            className="field"
            value={form.motto}
            onChange={(e) => setForm({ ...form, motto: e.target.value })}
          />
        </Field>
        <Button disabled={saving} onClick={save}>
          <Save className="size-4" />
          حفظ التغييرات
        </Button>
      </section>
      <section className="space-y-5 border-b py-8">
        <h2 className="text-lg font-bold text-primary">النسخ الاحتياطي</h2>
        <div className="flex flex-wrap gap-3">
          <Button
            variant="outline"
            onClick={() =>
              downloadBlob(
                new Blob([JSON.stringify(data, null, 2)], { type: "application/json" }),
                backupFileName(),
              )
            }
          >
            <Download className="size-4" />
            تنزيل نسخة احتياطية
          </Button>
          <Button variant="outline" onClick={() => fileInput.current?.click()}>
            <Upload className="size-4" />
            اختيار نسخة للاستعادة
          </Button>
          <input
            ref={fileInput}
            type="file"
            accept=".json,application/json"
            className="hidden"
            aria-label="ملف النسخة الاحتياطية"
            onChange={(e) => {
              readBackup(e.target.files?.[0]);
              e.target.value = "";
            }}
          />
        </div>
        {pending !== null && (
          <Confirm
            title="استعادة النسخة الاحتياطية؟"
            description="ستستبدل النسخة المختارة جميع البيانات الحالية في هذا المتصفح. نزّل نسخة احتياطية أولاً."
            confirmLabel="استعادة البيانات"
            trigger={
              <Button>
                <Upload className="size-4" />
                تأكيد الاستعادة
              </Button>
            }
            onConfirm={async () => {
              if (await importData(pending)) {
                setPending(null);
                toast.success("تمت استعادة النسخة الاحتياطية");
                window.location.reload();
              }
            }}
          />
        )}
      </section>
      {!configured && (
        <section className="space-y-5 py-8">
          <h2 className="text-lg font-bold text-primary">البيانات التجريبية</h2>
          <Confirm
            title="إعادة ضبط البيانات التجريبية؟"
            description="سيتم حذف تعديلاتك في هذا المتصفح وإعادة البيانات التجريبية الأصلية. احتفظ بنسخة احتياطية قبل المتابعة."
            confirmLabel="إعادة الضبط"
            trigger={
              <Button variant="outline" className="text-destructive">
                <RotateCcw className="size-4" />
                إعادة ضبط النسخة التجريبية
              </Button>
            }
            onConfirm={async () => {
              await resetDemo();
              window.location.reload();
            }}
          />
        </section>
      )}
    </div>
  );
}
