import { AIChatPanel } from "@/components/ai/chat-panel";

export default function BrainPage() {
  return (
    <div className="h-[calc(100dvh-3.5rem)] w-full flex flex-col overflow-hidden bg-gradient-to-b from-primary/[0.04] via-background to-background">
      <AIChatPanel variant="fullpage" />
    </div>
  );
}
