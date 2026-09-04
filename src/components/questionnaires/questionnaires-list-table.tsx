"use client";

import { useMemo } from "react";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { SortableHeader } from "@/components/ui/sortable-header";
import { useTableSort } from "@/hooks/use-table-sort";
import { useT } from "@/lib/i18n-client";
import { ClipboardList } from "lucide-react";

export type QuestionnaireListItem = {
  id: string;
  name: string;
  description: string | null;
  fieldCount: number;
  submitted: number;
  pending: number;
  updatedAt: Date | string;
};

type SortKey = "name" | "fields" | "submitted" | "pending" | "updated";

export function QuestionnairesListTable({
  rows,
}: {
  rows: QuestionnaireListItem[];
}) {
  const { t, lang } = useT();

  const getters = useMemo(
    () => ({
      name: (r: QuestionnaireListItem) => r.name,
      fields: (r: QuestionnaireListItem) => r.fieldCount,
      submitted: (r: QuestionnaireListItem) => r.submitted,
      pending: (r: QuestionnaireListItem) => r.pending,
      updated: (r: QuestionnaireListItem) => r.updatedAt,
    }),
    [],
  );

  const { sorted, toggle, dirFor } = useTableSort<QuestionnaireListItem, SortKey>(
    rows,
    getters,
  );

  return (
    <div className="hidden overflow-hidden rounded-xl border border-border/80 bg-card shadow-xs md:block">
      <Table className="[&_td]:px-3.5 [&_td]:py-2 [&_th]:px-3.5 [&_th]:py-2">
        <TableHeader>
          <TableRow className="bg-muted/40 hover:bg-muted/40 border-b border-border/80">
            <TableHead>
              <SortableHeader
                label={t("Nama", "Name")}
                dir={dirFor("name")}
                onClick={() => toggle("name")}
                className="text-[11px] uppercase tracking-wider"
              />
            </TableHead>
            <TableHead className="w-24">
              <SortableHeader
                label={t("Kolom", "Fields")}
                dir={dirFor("fields")}
                onClick={() => toggle("fields")}
                className="text-[11px] uppercase tracking-wider"
              />
            </TableHead>
            <TableHead className="w-28">
              <SortableHeader
                label={t("Diserahkan", "Submitted")}
                dir={dirFor("submitted")}
                onClick={() => toggle("submitted")}
                className="text-[11px] uppercase tracking-wider"
              />
            </TableHead>
            <TableHead className="w-24">
              <SortableHeader
                label={t("Tertunda", "Pending")}
                dir={dirFor("pending")}
                onClick={() => toggle("pending")}
                className="text-[11px] uppercase tracking-wider"
              />
            </TableHead>
            <TableHead className="w-28">
              <SortableHeader
                label={t("Diperbarui", "Updated")}
                dir={dirFor("updated")}
                onClick={() => toggle("updated")}
                className="text-[11px] uppercase tracking-wider"
              />
            </TableHead>
            <TableHead className="w-16 text-right text-[11px] uppercase tracking-wider">{t("Aksi", "Action")}</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {sorted.map((q) => (
            <TableRow
              key={q.id}
              className="border-b border-border/80 transition-colors hover:bg-muted/40"
            >
              <TableCell>
                <div className="flex items-center gap-2">
                  <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-md bg-primary/10 text-primary">
                    <ClipboardList className="h-3 w-3" />
                  </div>
                  <div className="min-w-0">
                    <Link
                      href={`/app/questionnaires/${q.id}`}
                      className="text-sm font-semibold text-foreground hover:text-primary transition-colors block truncate max-w-[15rem]"
                    >
                      {q.name}
                    </Link>
                    {q.description && (
                      <p className="text-[11px] text-muted-foreground truncate max-w-[15rem]">
                        {q.description}
                      </p>
                    )}
                  </div>
                </div>
              </TableCell>
              <TableCell className="text-sm text-muted-foreground tabular-nums">{q.fieldCount}</TableCell>
              <TableCell className="text-sm">
                <Badge variant="outline" className="text-[10px] px-2 py-0 h-5 rounded-full font-medium border-border/80 bg-muted/60 text-muted-foreground">{q.submitted}</Badge>
              </TableCell>
              <TableCell className="text-sm">
                {q.pending > 0 ? (
                  <Badge variant="outline" className="text-[10px] px-2 py-0 h-5 rounded-full font-medium border-amber-500/30 bg-amber-500/10 text-amber-700 dark:text-amber-400">{q.pending}</Badge>
                ) : (
                  <span className="text-sm text-muted-foreground font-mono">0</span>
                )}
              </TableCell>
              <TableCell className="text-xs text-muted-foreground whitespace-nowrap font-mono">
                {new Date(q.updatedAt).toLocaleDateString(
                  lang === "en" ? "en-US" : "id-ID",
                )}
              </TableCell>
              <TableCell className="text-right">
                <Button asChild variant="ghost" size="sm" className="h-6.5 px-2 text-[11px] rounded-md">
                  <Link href={`/app/questionnaires/${q.id}`}>
                    {t("Buka", "Open")}
                  </Link>
                </Button>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
