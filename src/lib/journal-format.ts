export type ParsedJournalBody = {
  tags: string[];
  mood: string;
  content: string;
};

const LEGACY_MOODS: Record<string, string> = {
  focused: "🔥",
  productive: "🔥",
  cautious: "🤔",
  thoughtful: "🤔",
  happy: "😊",
  neutral: "😐",
  frustrated: "😤",
  tired: "😴",
  sad: "😢",
  excited: "🎉",
};

function normalizeJournalMood(raw: string): string {
  const mood = raw.trim();
  return LEGACY_MOODS[mood.toLowerCase()] || mood;
}

export function normalizeJournalTags(raw: string): string[] {
  const seen = new Set<string>();
  for (const part of raw.split(",")) {
    const tag = part.trim().toLocaleLowerCase("id-ID");
    if (tag) seen.add(tag);
  }
  return [...seen];
}

export function parseJournalBody(rawBody: string): ParsedJournalBody {
  // Older seed/import paths stored literal "\\n" instead of line breaks.
  const body = rawBody.replace(/\\n/g, "\n");
  const metaMatch = body.match(
    /^---tags:\s*(.*?)\nmood:\s*(.*?)---\n?([\s\S]*)$/i,
  );
  if (metaMatch) {
    return {
      tags: normalizeJournalTags(metaMatch[1]),
      mood: normalizeJournalMood(metaMatch[2]),
      content: metaMatch[3],
    };
  }

  // Legacy records stored only a mood prefix in body.
  const legacyMood = body.match(/^mood:\s*([^\n]+)\n([\s\S]*)$/i);
  if (legacyMood) {
    return {
      tags: [],
      mood: normalizeJournalMood(legacyMood[1]),
      content: legacyMood[2],
    };
  }

  return { tags: [], mood: "", content: body };
}

export function buildJournalBody(
  tagsRaw: string,
  mood: string,
  content: string,
): string {
  return `---tags: ${normalizeJournalTags(tagsRaw).join(", ")}\nmood: ${mood.trim()}---\n${content}`;
}

export function stripJournalPrefix(title: string): string {
  return title.replace(/^\[journal\]\s*/i, "");
}
