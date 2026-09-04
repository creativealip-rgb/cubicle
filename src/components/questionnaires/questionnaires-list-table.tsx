"use client";

import { useMemo } from "react";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
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
      <Table className="[&_td]:p-3 sm:[&_td]:px-4 sm:[&_td]:py-3.5 [&_th]:px-3 sm:[&_th]:px-4">
        <TableHeader>
          <TableRow className="bg-muted/40 hover:bg-muted/40 border-b border-border/80">
            <TableHead>
              <SortableHeader
                label={t("Nama", "Name")}
                dir={dirFor("name")}
                onClick={() => toggle("name")}
              />
            </TableHead>
            <TableHead>
              <SortableHeader
                label={t("Kolom", "Fields")}
                dir={dirFor("fields")}
                onClick={() => toggle("fields")}
              />
            </TableHead>
            <TableHead>
              <SortableHeader
                label={t("Terkirim", "Submitted")}
                dir={dirFor("submitted")}
                onClick={() => toggle("submitted")}
              />
            </TableHead>
            <TableHead>
              <SortableHeader
                label={t("Menunggu", "Pending")}
                dir={dirFor("pending")}
                onClick={() => toggle("pending")}
              />
            </TableHead>
            <TableHead>
              <SortableHeader
                label={t("Diperbarui", "Updated")}
                dir={dirFor("updated")}
                onClick={() => toggle("updated")}
              />
            </TableHead>
            <TableHead></TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {sorted.map((q) => (
            <TableRow
              key={q.id}
              className="border-b border-border/60 transition-colors hover:bg-muted/40"
            >
              <TableCell>
                <Link
                  href={`/app/questionnaires/${q.id}`}
                  className="text-sm font-semibold text-foreground hover:text-primary transition-colors"
                >
                  {q.name}
                </Link>
                {q.description && (
                  <p className="mt-0.5 line-clamp-1 text-xs text-muted-foreground">
                    {q.description}
                  </p>
                )}
              </TableCell>
              <TableCell className="text-xs text-muted-foreground">{q.fieldCount}</TableCell>
              <TableCell className="text-xs">
                <Badge variant="outline" className="text-xs font-semibold rounded-md border-border/70">{q.submitted}</Badge>
              </TableCell>
              <TableCell className="text-xs">
                {q.pending > 0 ? (
                  <Badge variant="outline" className="text-xs font-semibold rounded-md border-amber-500/30 bg-amber-500/10 text-amber-700 dark:text-amber-400">{q.pending}</Badge>
                ) : (
                  <span className="text-xs text-muted-foreground">0</span>
                )}
              </TableCell>
              <TableCell className="text-xs text-muted-foreground">
                {new Date(q.updatedAt).toLocaleDateString(
                  lang === "en" ? "en-US" : "id-ID",
                )}
              </TableCell>
              <TableCell className="text-right">
                <Link
                  href={`/app/questionnaires/${q.id}`}
                  className="text-xs font-semibold text-primary hover:underline"
                >
                  {t("Buka", "Open")}
                </Link>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
