"use client";

import { useState, useTransition } from "react";
import { useAppTransition } from "@/lib/transition-provider";
import { toast } from "sonner";
import { Download, Loader2, XCircle, Trash2 } from "lucide-react";
import { cancelAppointment, deleteAppointment, deleteAvailabilityRule } from "@/lib/actions/appointments";
import { Button } from "@/components/ui/button";
import { useT } from "@/lib/i18n-client";

type PendingAction =
  | { type: "rule"; id: string; label: string }
  | { type: "cancel_appointment"; id: string; label: string }
  | { type: "delete_appointment"; id: string; label: string }
  | null;

export function DeleteAvailabilityRuleButton({ id, label }: { id: string; label: string }) {
  return <CalendarActionBtn action={{ type: "rule", id, label }} />;
}

export function AppointmentActions({
  id,
  title,
  status,
}: {
  id: string;
  title: string;
  status: string;
}) {
  const { t } = useT();
  const isCancelled = status === "cancelled";

  return (
    <div className="flex items-center gap-1.5">
      <Button variant="outline" size="sm" className="h-8 gap-1.5 px-2.5 text-xs" asChild>
        <a href={`/api/calendar/${id}/ics`} target="_blank" rel="noreferrer">
          <Download className="h-3.5 w-3.5" />
          <span className="hidden sm:inline">{t("Unduh .ics", "Download .ics")}</span>
          <span className="sm:hidden">.ics</span>
        </a>
      </Button>

      {isCancelled ? (
        <CalendarActionBtn action={{ type: "delete_appointment", id, label: title }} />
      ) : (
        <CalendarActionBtn action={{ type: "cancel_appointment", id, label: title }} />
      )}
    </div>
  );
}

function CalendarActionBtn({ action }: { action: Exclude<PendingAction, null> }) {
  const { t } = useT();
  const { refresh } = useAppTransition();
  const [confirming, setConfirming] = useState(false);
  const [isPending, startTransition] = useTransition();

  const isRule = action.type === "rule";
  const isDelete = action.type === "delete_appointment";

  function confirm() {
    startTransition(async () => {
      try {
        if (action.type === "rule") {
          await deleteAvailabilityRule(action.id);
          toast.success(t("Aturan ketersediaan dihapus", "Availability rule deleted"));
        } else if (action.type === "delete_appointment") {
          await deleteAppointment(action.id);
          toast.success(t("Janji temu dihapus", "Appointment deleted"));
        } else {
          await cancelAppointment(action.id);
          toast.success(t("Janji temu dibatalkan", "Appointment cancelled"));
        }
        setConfirming(false);
        refresh();
      } catch (error) {
        toast.error(error instanceof Error ? error.message : t("Tindakan gagal", "Action failed"));
      }
    });
  }

  if (confirming) {
    return (
      <span className="inline-flex shrink-0 items-center gap-1.5" role="group">
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="h-8 px-2 text-xs"
          disabled={isPending}
          onClick={() => setConfirming(false)}
        >
          {t("Batal", "Cancel")}
        </Button>
        <Button
          type="button"
          variant="destructive"
          size="sm"
          className="h-8 px-2 text-xs"
          disabled={isPending}
          onClick={confirm}
        >
          {isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin mr-1" /> : null}
          {isRule || isDelete ? t("Hapus", "Delete") : t("Batalkan", "Cancel")}
        </Button>
      </span>
    );
  }

  return (
    <Button
      type="button"
      variant="ghost"
      size="icon"
      className="h-8 w-8 shrink-0 text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
      onClick={() => setConfirming(true)}
      aria-label={
        isRule
          ? t(`Hapus aturan ${action.label}`, `Delete ${action.label} rule`)
          : isDelete
          ? t(`Hapus janji temu ${action.label}`, `Delete appointment ${action.label}`)
          : t(`Batalkan janji temu ${action.label}`, `Cancel appointment ${action.label}`)
      }
      title={
        isRule || isDelete
          ? t("Hapus", "Delete")
          : t("Batalkan janji", "Cancel appointment")
      }
    >
      {isDelete ? <Trash2 className="h-3.5 w-3.5 text-destructive/80" /> : <XCircle className="h-3.5 w-3.5" />}
    </Button>
  );
}
