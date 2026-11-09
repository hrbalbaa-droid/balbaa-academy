import { useState } from "react";
import { Link, useNavigate } from "@tanstack/react-router";
import { toast } from "sonner";
import { Archive, ArchiveRestore, Copy, Eye, MoreVertical, MoveRight, Pencil, Trash2 } from "lucide-react";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button, buttonVariants } from "@/components/ui/button";
import { Field } from "@/components/common";
import { useData } from "@/lib/store";
import { canEditBag } from "@/lib/permissions";
import type { Lecture } from "@/lib/types";

export function LectureRowActions({ lecture }: { lecture: Lecture }) {
  const { data, user, deleteLecture, duplicateLecture, saveLecture, moveLecture } = useData();
  const navigate = useNavigate();
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [moving, setMoving] = useState(false);
  const [bagId, setBagId] = useState(lecture.bagId);
  const [levelId, setLevelId] = useState(lecture.levelId);
  const editable = canEditBag(user, lecture.bagId);
  const targetBag = data.bags.find((b) => b.id === bagId);

  return (
    <>
      <DropdownMenu dir="rtl">
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="icon" aria-label="خيارات المحاضرة"><MoreVertical className="size-4" /></Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem asChild><Link to="/lectures/$lectureId" params={{ lectureId: lecture.id }}><Eye className="size-4" /> عرض</Link></DropdownMenuItem>
          {editable && (
            <>
              <DropdownMenuItem asChild><Link to="/lectures/$lectureId/edit" params={{ lectureId: lecture.id }}><Pencil className="size-4" /> تعديل</Link></DropdownMenuItem>
              <DropdownMenuItem onClick={async () => {
                const id = await duplicateLecture(lecture.id);
                if (id) { toast.success("تم إنشاء نسخة كمسودة"); navigate({ to: "/lectures/$lectureId/edit", params: { lectureId: id } }); }
              }}><Copy className="size-4" /> نسخ</DropdownMenuItem>
              <DropdownMenuItem onClick={() => { setBagId(lecture.bagId); setLevelId(lecture.levelId); setMoving(true); }}><MoveRight className="size-4" /> نقل لحقيبة أو مستوى آخر</DropdownMenuItem>
              {lecture.status === "archived" ? (
                <DropdownMenuItem onClick={async () => { if (await saveLecture({ ...lecture, status: "draft" })) toast.success("تمت استعادة المحاضرة كمسودة"); }}><ArchiveRestore className="size-4" /> إلغاء الأرشفة</DropdownMenuItem>
              ) : (
                <DropdownMenuItem onClick={async () => { if (await saveLecture({ ...lecture, status: "archived" })) toast.success("تمت أرشفة المحاضرة"); }}><Archive className="size-4" /> أرشفة</DropdownMenuItem>
              )}
              <DropdownMenuSeparator />
              <DropdownMenuItem className="text-destructive focus:text-destructive" onClick={() => setConfirmDelete(true)}><Trash2 className="size-4" /> حذف</DropdownMenuItem>
            </>
          )}
        </DropdownMenuContent>
      </DropdownMenu>

      <AlertDialog open={confirmDelete} onOpenChange={setConfirmDelete}>
        <AlertDialogContent dir="rtl" className="text-right">
          <AlertDialogHeader className="text-right sm:text-right">
            <AlertDialogTitle>حذف المحاضرة نهائياً؟</AlertDialogTitle>
            <AlertDialogDescription>سيتم حذف «{lecture.title}» ومرفقاتها. لا يمكن التراجع. يمكنك الأرشفة بدلاً من الحذف للاحتفاظ بها.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="gap-2 sm:justify-start">
            <AlertDialogAction className={buttonVariants({ variant: "destructive" })} onClick={async () => { if (await deleteLecture(lecture.id)) toast.success("تم حذف المحاضرة"); }}>نعم، احذف</AlertDialogAction>
            <AlertDialogCancel>إلغاء</AlertDialogCancel>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <Dialog open={moving} onOpenChange={setMoving}>
        <DialogContent dir="rtl" className="text-right">
          <DialogHeader className="text-right sm:text-right"><DialogTitle>نقل المحاضرة</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <Field label="الحقيبة">
              <select className="field" value={bagId} onChange={(e) => { setBagId(e.target.value); setLevelId(data.bags.find((b) => b.id === e.target.value)?.levels[0]?.id ?? ""); }}>
                {data.bags.filter((b) => canEditBag(user, b.id)).map((b) => <option key={b.id} value={b.id}>{b.title}</option>)}
              </select>
            </Field>
            <Field label="المستوى">
              <select className="field" value={levelId} onChange={(e) => setLevelId(e.target.value)}>
                {targetBag?.levels.map((l) => <option key={l.id} value={l.id}>{l.name}</option>)}
              </select>
            </Field>
          </div>
          <DialogFooter className="gap-2 sm:justify-start">
            <Button onClick={async () => { if (await moveLecture(lecture.id, bagId, levelId)) { toast.success("تم نقل المحاضرة"); setMoving(false); } }}>نقل</Button>
            <Button variant="outline" onClick={() => setMoving(false)}>إلغاء</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
