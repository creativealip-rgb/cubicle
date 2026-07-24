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
    <div className="hidden overflow-hidden rounded-lg border bg-card md:block">
      <Table className="[&_td]:p-3 [&_th]:px-3">
        <TableHeader>
          <TableRow>
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
          {sorted.map((q, index) => (
            <TableRow
              key={q.id}
              className={`border-b border-slate-200 hover:bg-slate-100/70 ${index % 2 === 1 ? "!bg-slate-50" : "!bg-white"}`}
            >
              <TableCell>
                <Link
                  href={`/app/questionnaires/${q.id}`}
                  className="text-sm font-medium hover:underline"
                >
                  {q.name}
                </Link>
                {q.description && (
                  <p className="mt-0.5 line-clamp-1 text-xs text-slate-500">
                    {q.description}
                  </p>
                )}
              </TableCell>
              <TableCell className="text-sm text-slate-600">{q.fieldCount}</TableCell>
              <TableCell className="text-sm">
                <Badge variant="default">{q.submitted}</Badge>
              </TableCell>
              <TableCell className="text-sm">
                {q.pending > 0 ? (
                  <Badge variant="secondary">{q.pending}</Badge>
                ) : (
                  <span className="text-slate-400">0</span>
                )}
              </TableCell>
              <TableCell className="text-xs text-slate-500">
                {new Date(q.updatedAt).toLocaleDateString(
                  lang === "en" ? "en-US" : "id-ID",
                )}
              </TableCell>
              <TableCell className="text-right">
                <Link
                  href={`/app/questionnaires/${q.id}`}
                  className="text-sm text-indigo-600 hover:underline"
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
