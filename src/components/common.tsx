import type { ReactNode } from "react";
import { Link } from "@tanstack/react-router";
import { ChevronLeft } from "lucide-react";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { buttonVariants } from "@/components/ui/button";
import type { LectureStatus, ReviewStatus } from "@/lib/types";
import { REVIEW_LABEL, STATUS_LABEL } from "@/lib/format";

export function PageHeader({ title, subtitle, actions, crumbs }: { title: string; subtitle?: string; actions?: ReactNode; crumbs?: Array<{ label: string; to?: string; params?: Record<string, string> }> }) {
  return (
    <div className="mb-8">
      {crumbs && (
        <nav aria-label="مسار الصفحة" className="mb-3 flex flex-wrap items-center gap-1 text-sm text-muted-foreground">
          {crumbs.map((c, i) => (
            <span key={i} className="flex items-center gap-1">
              {c.to ? <Link to={c.to} params={c.params as never} className="hover:text-primary">{c.label}</Link> : <span className="text-foreground">{c.label}</span>}
              {i < crumbs.length - 1 && <ChevronLeft className="size-3" />}
            </span>
          ))}
        </nav>
      )}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div className="min-w-0">
          <h1 className="title-underline text-2xl font-bold text-primary md:text-3xl">{title}</h1>
          {subtitle && <p className="mt-4 text-sm text-muted-foreground">{subtitle}</p>}
        </div>
        {actions && <div className="flex shrink-0 flex-wrap gap-2">{actions}</div>}
      </div>
    </div>
  );
}

const statusStyle: Record<LectureStatus, string> = {
  published: "bg-secondary text-secondary-foreground",
  draft: "bg-warning-soft text-foreground",
  archived: "bg-muted text-muted-foreground",
};
export const StatusBadge = ({ status }: { status: LectureStatus }) => (
  <span className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium ${statusStyle[status]}`}>{STATUS_LABEL[status]}</span>
);

const reviewStyle: Record<ReviewStatus, string> = {
  approved: "bg-secondary text-secondary-foreground",
  pending: "bg-brand-blush text-brand-red",
  not_required: "hidden",
};
export const ReviewBadge = ({ review }: { review: ReviewStatus }) => (
  <span className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium ${reviewStyle[review]}`}>{REVIEW_LABEL[review]}</span>
);

export function Confirm({ trigger, title, description, confirmLabel = "تأكيد", onConfirm, destructive = true }: {
  trigger: ReactNode; title: string; description: string; confirmLabel?: string; onConfirm: () => void; destructive?: boolean;
}) {
  return (
    <AlertDialog>
      <AlertDialogTrigger asChild>{trigger}</AlertDialogTrigger>
      <AlertDialogContent dir="rtl" className="text-right">
        <AlertDialogHeader className="text-right sm:text-right">
          <AlertDialogTitle>{title}</AlertDialogTitle>
          <AlertDialogDescription>{description}</AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter className="gap-2 sm:justify-start">
          <AlertDialogAction onClick={onConfirm} className={buttonVariants({ variant: destructive ? "destructive" : "default" })}>{confirmLabel}</AlertDialogAction>
          <AlertDialogCancel>إلغاء</AlertDialogCancel>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

export function EmptyState({ icon, title, hint, action }: { icon: ReactNode; title: string; hint: string; action?: ReactNode }) {
  return (
    <div className="surface flex flex-col items-center px-6 py-14 text-center">
      <div className="mb-4 grid size-14 place-items-center rounded-2xl bg-secondary text-primary">{icon}</div>
      <h3 className="text-lg font-bold">{title}</h3>
      <p className="mt-1 max-w-md text-sm text-muted-foreground">{hint}</p>
      {action && <div className="mt-5">{action}</div>}
    </div>
  );
}

export function Field({ label, hint, children, required }: { label: string; hint?: string; children: ReactNode; required?: boolean }) {
  return (
    <label className="block space-y-1.5">
      <span className="text-sm font-medium">{label}{required && <span className="text-destructive"> *</span>}</span>
      {children}
      {hint && <span className="block text-xs text-muted-foreground">{hint}</span>}
    </label>
  );
}
