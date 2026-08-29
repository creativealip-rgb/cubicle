import { expect, it } from "vitest";
import { readFileSync } from "node:fs";

const properties = readFileSync("src/components/site/canvas/properties-panel.tsx", "utf8");
const canvas = readFileSync("src/components/site/canvas/canvas-editor.tsx", "utf8");

it("localizes nested Personal Site tab controls", () => {
  for (const english of [
    "AI Copy Generator", "Tone", "Preview", "Heading", "Animation",
    "Add service", "Add offer", "Add question", "Call to action",
    "Button label", "Button URL", "Add image", "Alt text",
  ]) expect(properties).toContain(english);
  for (const stale of [
    ">AI Copy Generator</Label>", ">Tone</Label>", ">Heading</Label>",
    'label="Add service"', 'label="Add offer"', 'label="Add question"',
    'label="Add image"', '>Alt text</Label>',
  ]) expect(properties).not.toContain(stale);
  expect(canvas).toContain("Untuk mengambil item yang dapat diseret");
  expect(canvas).toContain("To pick up a draggable item");
});
