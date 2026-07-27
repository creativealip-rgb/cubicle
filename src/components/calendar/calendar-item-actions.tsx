"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Download, Loader2, XCircle } from "lucide-react";
import { cancelAppointment, deleteAvailabilityRule } from "@/lib/actions/appointments";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useT } from "@/lib/i18n-client";

type PendingAction =
  | { type: "rule"; id: string; label: string }
  | { type: "appointment"; id: string; label: string }
  | null;

export function DeleteAvailabilityRuleButton({ id, label }: { id: string; label: string }) {
  return <CalendarDestructiveAction action={{ type: "rule", id, label }} />;
}

export function AppointmentActions({ id, title }: { id: string; title: string }) {
  const { t } = useT();
  return (
    <div className="flex items-center gap-2">
      <Button variant="outline" size="sm" className="h-10 gap-1.5 px-3" asChild>
        <a href={`/api/calendar/${id}/ics`} target="_blank" rel="noreferrer">
          <Download className="h-4 w-4" />
          <span className="hidden sm:inline">{t("Unduh .ics", "Download .ics")}</span>
          <span className="sm:hidden">.ics</span>
        </a>
      </Button>
      <CalendarDestructiveAction action={{ type: "appointment", id, label: title }} />
    </div>
  );
}

function CalendarDestructiveAction({ action }: { action: Exclude<PendingAction, null> }) {
  const { t } = useT();
  const router = useRouter();
  const [pendingAction, setPendingAction] = useState<PendingAction>(null);
  const [isPending, startTransition] = useTransition();
  const isRule = action.type === "rule";

  function confirm() {
    if (!pendingAction) return;
    startTransition(async () => {
      try {
        if (pendingAction.type === "rule") await deleteAvailabilityRule(pendingAction.id);
        else await cancelAppointment(pendingAction.id);
        toast.success(
          pendingAction.type === "rule"
            ? t("Aturan ketersediaan dihapus", "Availability rule deleted")
            : t("Janji temu dibatalkan", "Appointment cancelled"),
        );
        setPendingAction(null);
        router.refresh();
      } catch (error) {
        toast.error(error instanceof Error ? error.message : t("Tindakan gagal", "Action failed"));
      }
    });
  }

  return (
    <>
      <Button
        type="button"
        variant="ghost"
        size="icon"
        className="h-11 w-11 text-destructive hover:bg-destructive/10 hover:text-destructive sm:h-10 sm:w-10"
        onClick={() => setPendingAction(action)}
        aria-label={isRule ? t(`Hapus aturan ${action.label}`, `Delete ${action.label} rule`) : t(`Batalkan ${action.label}`, `Cancel ${action.label}`)}
        title={isRule ? t("Hapus aturan", "Delete rule") : t("Batalkan janji", "Cancel appointment")}
      >
        <XCircle className="h-4 w-4" />
      </Button>

      <Dialog open={Boolean(pendingAction)} onOpenChange={(open) => !open && !isPending && setPendingAction(null)}>
        <DialogContent className="max-w-[calc(100%-2rem)] sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>{isRule ? t("Hapus aturan ketersediaan?", "Delete availability rule?") : t("Batalkan janji temu?", "Cancel appointment?")}</DialogTitle>
            <DialogDescription>
              {isRule
                ? t(`Aturan “${action.label}” akan dihapus permanen.`, `Rule “${action.label}” will be permanently deleted.`)
                : t(`Janji “${action.label}” akan dibatalkan.`, `Appointment “${action.label}” will be cancelled.`)}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2 sm:gap-3">
            <DialogClose asChild>
              <Button className="min-h-11 flex-1" variant="outline" disabled={isPending}>{t("Batal", "Back")}</Button>
            </DialogClose>
            <Button className="min-h-11 flex-1" variant="destructive" onClick={confirm} disabled={isPending}>
              {isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              {isRule ? t("Hapus", "Delete") : t("Batalkan janji", "Cancel booking")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
