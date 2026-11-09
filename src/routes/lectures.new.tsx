import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { useData } from "@/lib/store";
import { can, canEditBag } from "@/lib/permissions";
import { requireAdminIdentity } from "@/lib/auth/guards";
import { PageHeader } from "@/components/common";
import { LectureForm, newLecture } from "@/components/LectureForm";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/lectures/new")({
  beforeLoad: async ({ location }) => {
    await requireAdminIdentity(location.href);
  },
  validateSearch: (s: Record<string, unknown>): { bag?: string } => (typeof s["bag"] === "string" ? { bag: s["bag"] } : {}),
  head: () => ({
    meta: [
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
      { title: "إضافة محاضرة جديدة | أكاديمية صيدليات بلبع" },
      { name: "description", content: "إضافة محاضرة جديدة إلى إحدى الحقائب التدريبية." },
      { property: "og:title", content: "إضافة محاضرة – أكاديمية بلبع" },
      { property: "og:description", content: "نموذج إضافة محاضرة جديدة." },
    ],
  }),
  component: NewLecture,
});

function NewLecture() {
  const { data, user } = useData();
  const { bag: bagParam } = Route.useSearch();
  const bags = data.bags.filter((b) => canEditBag(user, b.id));
  const [initial] = useState(() => {
    const b = bags.find((x) => x.id === bagParam) ?? bags[0];
    return b ? newLecture(b.id, b.levels[0]?.id ?? "", b.audience) : null;
  });

  if (!can(user, "manage_lectures") || !initial) {
    return (
      <div className="surface p-10 text-center">
        <p className="font-bold">{bags.length ? "ليست لديك صلاحية إضافة محاضرات." : "أضف حقيبة تدريبية أولاً قبل إضافة المحاضرات."}</p>
        <Button asChild className="mt-4"><Link to="/bags">الذهاب للحقائب</Link></Button>
      </div>
    );
  }
  return (
    <div>
      <PageHeader crumbs={[{ label: "مكتبة المحاضرات", to: "/lectures" }, { label: "محاضرة جديدة" }]} title="+ إضافة محاضرة جديدة" />
      <LectureForm initial={initial} isNew />
    </div>
  );
}
