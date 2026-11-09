import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { Pencil, Save, X } from "lucide-react";
import { toast } from "sonner";
import { useData } from "@/lib/store";
import { can } from "@/lib/permissions";
import { PageHeader, Field } from "@/components/common";
import { Button } from "@/components/ui/button";
import type { Kpi } from "@/lib/types";
import { requireAdminIdentity } from "@/lib/auth/guards";

export const Route = createFileRoute("/kpis")({
  beforeLoad: async ({ location }) => {
    await requireAdminIdentity(location.href);
  },
  head: () => ({ meta: [
    { title: "مؤشرات الأداء | أكاديمية صيدليات بلبع" },
    { name: "description", content: "تعريفات مؤشرات الأداء والحقائب التدريبية المرتبطة بها." },
    { property: "og:title", content: "مؤشرات الأداء – أكاديمية بلبع" },
    { property: "og:description", content: "تعريفات مؤشرات الأداء والتدريب المرتبط بها." },
    { property: "og:type", content: "website" },
    { name: "twitter:card", content: "summary_large_image" },
  ] }),
  component: KpisPage,
});

function KpisPage() {
  const { data, user, saveKpi } = useData();
  const [editing, setEditing] = useState<Kpi | null>(null);
  const [saving, setSaving] = useState(false);
  const save = async () => {
    if (!editing) return;
    setSaving(true);
    const ok = await saveKpi(editing);
    setSaving(false);
    if (ok) { setEditing(null); toast.success("تم حفظ تعريف المؤشر"); }
  };
  return <div>
    <PageHeader title="مؤشرات الأداء" />
    <div className="grid gap-5 md:grid-cols-2">
      {data.kpis.map((kpi) => <article key={kpi.id} className="surface space-y-4 p-6">
        <div className="flex items-center justify-between gap-3">
          <h2 dir="ltr" className="text-xl font-bold text-primary">{kpi.label}</h2>
          {can(user, "edit_kpis") && <Button variant="ghost" size="icon" aria-label={`تعديل ${kpi.label}`} onClick={() => setEditing({ ...kpi })}><Pencil className="size-4" /></Button>}
        </div>
        {editing?.id === kpi.id ? <>
          <Field label="التعريف المعتمد"><textarea className="field min-h-28" value={editing.definition} onChange={(e) => setEditing({ ...editing, definition: e.target.value })} /></Field>
          <div className="flex gap-2"><Button disabled={saving} onClick={save}><Save className="size-4" />حفظ التعريف</Button><Button variant="outline" onClick={() => setEditing(null)}><X className="size-4" />إلغاء</Button></div>
        </> : <p className="whitespace-pre-line text-sm leading-loose text-muted-foreground">{kpi.definition || "لم يُحدد التعريف الرسمي بعد."}</p>}
        <ul className="space-y-2 border-t pt-4 text-sm">{data.bags.filter((bag) => bag.kpis.includes(kpi.id)).map((bag) => <li key={bag.id}>{bag.title}</li>)}</ul>
      </article>)}
    </div>
  </div>;
}