import { Loader2, UserPlus } from "lucide-react";
import { useNavigate, useRouterState } from "@tanstack/react-router";

import { Button } from "@/components/ui/button";
import { useAuth } from "@/lib/auth/AuthProvider";
import { coverSrc } from "@/lib/format";
import type { Bag } from "@/lib/types";

export function CourseEnrollCard({
  course,
  busy,
  onEnroll,
  className = "",
}: {
  course: Bag;
  busy: boolean;
  onEnroll: () => void;
  className?: string;
}) {
  const { identity } = useAuth();
  const navigate = useNavigate();
  const currentUrl = useRouterState({ select: (state) => state.location.href });

  const enroll = () => {
    if (!identity) {
      void navigate({ to: "/login", search: { redirect: currentUrl } });
      return;
    }
    onEnroll();
  };

  return (
    <section className={`surface overflow-hidden ${className}`}>
      <div className="grid gap-0 md:grid-cols-[220px_1fr]">
        <img
          src={coverSrc(course.cover)}
          alt=""
          className="h-40 w-full object-cover md:h-full"
          loading="lazy"
        />
        <div className="p-6">
          <p className="flex items-center gap-2 text-sm font-medium text-brand-green">
            <UserPlus className="size-4" /> التسجيل في الحقيبة
          </p>
          <h2 className="mt-2 text-xl font-bold text-primary">أنت غير مسجل في «{course.title}»</h2>
          <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
            سجل في الحقيبة للوصول إلى محاضراتها، ومتابعة تقدمك، وإكمال الدروس محاضرة بعد محاضرة.
          </p>
          <Button className="mt-4" onClick={enroll} disabled={busy}>
            {busy ? <Loader2 className="size-4 animate-spin" /> : <UserPlus className="size-4" />}
            التسجيل في الحقيبة
          </Button>
        </div>
      </div>
    </section>
  );
}
