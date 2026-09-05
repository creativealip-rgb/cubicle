import { AIChatPanel } from "@/components/ai/chat-panel";

export default function BrainPage() {
  return (
    // Brain wrapper is the ONLY page-level scroll container with modern ambient backdrop.
    <div className="-mx-3 md:-mx-6 -mt-4 md:-mt-6 -mb-24 md:-mb-28 min-h-[calc(100dvh-3.5rem)] overflow-y-auto bg-gradient-to-b from-primary/[0.04] via-background to-background">
      <div className="mx-auto flex min-h-full w-full max-w-4xl flex-col items-center justify-center px-4 py-8 md:px-6 md:py-10">
        <AIChatPanel variant="fullpage" />
      </div>
    </div>
  );
}
