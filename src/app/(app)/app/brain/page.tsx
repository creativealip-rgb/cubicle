import { AIChatPanel } from "@/components/ai/chat-panel";

export default function BrainPage() {
  return (
    // Brain wrapper is the ONLY page-level scroll container.
    //
    // Three layers of negative margin cancel main's padding:
    //   -mx-4/-mx-6 → cancel main's px-4/px-6 (left/right full-bleed)
    //   -mt-4/-mt-6 → cancel main's pt-4/pt-6 (flush under topbar)
    //   -mb-24/-mb-28 → cancel main's pb-24/pb-28 (no bottom buffer;
    //                   pb exists for the floating AI button which is
    //                   hidden on /app/brain via onBrainPage flag)
    //
    // Height uses real topbar (h-14 = 3.5rem), not 4rem.
    // 100dvh avoids mobile URL-bar jump.
    //
    // Block layout (not flex-col) on the outer wrapper so the inner padded
    // div grows with its content. min-h-full keeps it ≥ wrapper height so
    // justify-center has room to vertically center when content is short.
    // When content > viewport, inner padded grows past wrapper and the
    // wrapper's overflow-y-auto scrolls — single scroll, no nesting.
    <div className="-mx-4 md:-mx-6 -mt-4 md:-mt-6 -mb-24 md:-mb-28 h-[calc(100dvh-3.5rem)] overflow-y-auto bg-white">
      <div className="mx-auto flex min-h-full w-full max-w-4xl flex-col items-center justify-center px-4 py-8 md:px-6 md:py-12">
        <AIChatPanel variant="fullpage" />
      </div>
    </div>
  );
}