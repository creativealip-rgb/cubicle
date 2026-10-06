
import { requireWorkspaceWritableOrRedirect } from "@/lib/require-workspace-owner";
import { QuestionnaireBuilder } from "@/components/questionnaires/questionnaire-builder";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import { getCurrentLang, createT } from "@/lib/i18n";

export default async function NewQuestionnairePage() {
  const { workspaceId } = await requireWorkspaceWritableOrRedirect("/app/questionnaires");

  return (
    <QuestionnaireBuilder
      workspaceId={workspaceId}
      initial={{
        name: "Formulir Baru",
        slug: null,
        description: "",
        schema: [
          {
            id: "field_1",
            type: "text",
            label: "Nama Lengkap",
            required: false,
            placeholder: "Masukkan nama Anda",
            colSpan: "full",
          },
          {
            id: "field_2",
            type: "email",
            label: "Email Bisnis",
            required: false,
            placeholder: "email@perusahaan.com",
            colSpan: "half",
          },
          {
            id: "field_3",
            type: "phone",
            label: "Nomor WhatsApp",
            required: false,
            placeholder: "+62 812...",
            colSpan: "half",
          },
        ],
      }}
    />
  );
}
