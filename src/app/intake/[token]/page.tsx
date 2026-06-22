import { getPublicQuestionnaire } from "@/lib/actions/questionnaires";
import { IntakeForm } from "@/components/questionnaires/intake-form";
import { Card, CardContent } from "@/components/ui/card";
import Link from "next/link";
import { Button } from "@/components/ui/button";

export default async function IntakePage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const result = await getPublicQuestionnaire(token);

  if ("error" in result) {
    const messages: Record<string, { title: string; body: string }> = {
      not_found: { title: "Link not found", body: "This intake link doesn't exist or was deleted." },
      revoked: { title: "Link revoked", body: "This intake link was revoked by the workspace owner." },
      expired: { title: "Link expired", body: "This intake link has expired. Please ask for a new one." },
      already_submitted: { title: "Already submitted", body: "Your responses have been received. Thank you." },
    };
    const m = messages[result.error as keyof typeof messages];
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
        <Card className="max-w-md w-full">
          <CardContent className="py-12 text-center space-y-3">
            <h1 className="text-xl font-semibold">{m.title}</h1>
            <p className="text-sm text-slate-500">{m.body}</p>
            <Button variant="outline" asChild>
              <Link href="/">Back to home</Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const { questionnaire } = result;
  const fields = (questionnaire.schema as Array<{
    id: string;
    type: "text" | "textarea" | "select" | "multiselect" | "number" | "date" | "email" | "url";
    label: string;
    required: boolean;
    options?: string[];
    placeholder?: string;
  }>) || [];

  return (
    <div className="min-h-screen bg-gradient-to-b from-indigo-50 via-white to-white">
      <div className="max-w-2xl mx-auto p-6 space-y-6">
        <div className="text-center pt-6">
          <Link href="/" className="inline-block text-2xl font-semibold text-slate-900">Cubicle</Link>
          <p className="text-xs text-slate-500 mt-1">Client intake</p>
        </div>

        <div className="bg-white rounded-2xl border shadow-sm p-6 md:p-8 space-y-6">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight">{questionnaire.name}</h1>
            {questionnaire.description && (
              <p className="text-sm text-slate-500 mt-2">{questionnaire.description}</p>
            )}
          </div>

          <IntakeForm token={token} fields={fields} />
        </div>

        <p className="text-center text-xs text-slate-400">
          Powered by <Link href="/" className="hover:underline">Cubicle</Link>
        </p>
      </div>
    </div>
  );
}
