import { AIChatPanel } from "@/components/ai/chat-panel";

export default function BrainPage() {
  return (
    <div className="-m-4 md:-m-6 flex h-[calc(100vh-4rem)] flex-col">
      <div className="px-4 pt-2 md:px-6 md:pt-3">
        <h1 className="text-xl font-semibold tracking-tight">Brain</h1>
        <p className="text-sm text-muted-foreground">
          Your AI workspace assistant. Ask about clients, projects, tasks, invoices, or anything in your data.
        </p>
      </div>
      <div className="min-h-0 flex-1 px-4 pb-6 pt-4 md:px-6">
        <AIChatPanel variant="fullpage" />
      </div>
    </div>
  );
}
