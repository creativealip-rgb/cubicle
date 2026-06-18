import { AIChatPanel } from "@/components/ai/chat-panel";

export default function BrainPage() {
  return (
    <div className="-m-4 md:-m-6 flex h-[calc(100vh-4rem)] flex-col">
      <div className="min-h-0 flex-1 p-4 md:p-6">
        <AIChatPanel variant="fullpage" />
      </div>
    </div>
  );
}
