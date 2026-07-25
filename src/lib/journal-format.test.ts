import { describe, expect, it } from "vitest";
import {
  buildJournalBody,
  normalizeJournalTags,
  parseJournalBody,
} from "./journal-format";

describe("journal format", () => {
  it("round-trips v2 metadata and content", () => {
    const body = buildJournalBody(" Kerja, rapat, kerja ", "😊", "Isi jurnal");
    expect(parseJournalBody(body)).toEqual({
      tags: ["kerja", "rapat"],
      mood: "😊",
      content: "Isi jurnal",
    });
  });

  it("parses metadata containing literal escaped newlines", () => {
    expect(
      parseJournalBody("---tags: kerja\\nmood: 🤔---\\nKeputusan penting"),
    ).toEqual({
      tags: ["kerja"],
      mood: "🤔",
      content: "Keputusan penting",
    });
  });

  it("strips legacy mood prefix from content", () => {
    expect(
      parseJournalBody("mood: focused\\nFinished checkout audit."),
    ).toEqual({
      tags: [],
      mood: "focused",
      content: "Finished checkout audit.",
    });
  });

  it("normalizes tags case-insensitively and removes duplicates", () => {
    expect(normalizeJournalTags(" Kerja, kerja, RAPAT, ")).toEqual([
      "kerja",
      "rapat",
    ]);
  });
});
