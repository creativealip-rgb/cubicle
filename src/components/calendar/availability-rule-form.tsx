"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { createAvailabilityRule } from "@/lib/actions/appointments";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Loader2, Plus } from "lucide-react";

const DAYS = [
  { value: "0", label: "Sunday" },
  { value: "1", label: "Monday" },
  { value: "2", label: "Tuesday" },
  { value: "3", label: "Wednesday" },
  { value: "4", label: "Thursday" },
  { value: "5", label: "Friday" },
  { value: "6", label: "Saturday" },
];

export function AvailabilityRuleForm() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [dayOfWeek, setDayOfWeek] = useState("1");
  const [startTime, setStartTime] = useState("09:00");
  const [endTime, setEndTime] = useState("17:00");
  const [timezone, setTimezone] = useState("Asia/Jakarta");

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (startTime >= endTime) {
      toast.error("Waktu selesai harus setelah waktu mulai");
      return;
    }

    setLoading(true);
    try {
      await createAvailabilityRule({
        dayOfWeek: Number(dayOfWeek),
        startTime,
        endTime,
        timezone,
      });
      toast.success("Aturan ketersediaan ditambahkan");
      setOpen(false);
      router.refresh();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to add rule");
    } finally {
      setLoading(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm" className="gap-1">
          <Plus className="h-3.5 w-3.5" /> Add rule
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[420px]">
        <DialogHeader>
          <DialogTitle>Tambah aturan ketersediaan</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4 pt-2">
          <div className="space-y-2">
            <Label className="text-xs">Day</Label>
            <Select value={dayOfWeek} onValueChange={setDayOfWeek}>
              <SelectTrigger className="h-9">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {DAYS.map((day) => (
                  <SelectItem key={day.value} value={day.value}>{day.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label className="text-xs">Start time</Label>
              <Input type="time" value={startTime} onChange={(e) => setStartTime(e.target.value)} className="h-9" required />
            </div>
            <div className="space-y-2">
              <Label className="text-xs">End time</Label>
              <Input type="time" value={endTime} onChange={(e) => setEndTime(e.target.value)} className="h-9" required />
            </div>
          </div>

          <div className="space-y-2">
            <Label className="text-xs">Timezone</Label>
            <Input value={timezone} onChange={(e) => setTimezone(e.target.value)} className="h-9" placeholder="Asia/Jakarta" required />
          </div>

          <Button type="submit" disabled={loading} className="w-full">
            {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
            Save rule
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
