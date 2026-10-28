import { describe, expect, it } from "vitest";
import { isDirectVideo, youtubeEmbedUrl, youtubeId } from "./video";

describe("youtubeId", () => {
  it.each([
    ["https://www.youtube.com/watch?v=dQw4w9WgXcQ", "dQw4w9WgXcQ"],
    ["https://youtu.be/dQw4w9WgXcQ?t=10", "dQw4w9WgXcQ"],
    ["https://m.youtube.com/shorts/dQw4w9WgXcQ", "dQw4w9WgXcQ"],
    ["https://www.youtube.com/embed/dQw4w9WgXcQ", "dQw4w9WgXcQ"],
    ["https://vimeo.com/123", null],
    ["https://youtube.com/watch?v=curto", null],
    ["não é url", null],
  ])("%s", (url, id) => expect(youtubeId(url)).toBe(id));
  it("embed usa youtube-nocookie", () => {
    expect(youtubeEmbedUrl("https://youtu.be/dQw4w9WgXcQ")).toMatch(/^https:\/\/www\.youtube-nocookie\.com\/embed\/dQw4w9WgXcQ/);
  });
  it("isDirectVideo", () => {
    expect(isDirectVideo("https://x.supabase.co/storage/v1/object/public/exercise-videos/u/a.mp4")).toBe(true);
    expect(isDirectVideo("https://youtu.be/dQw4w9WgXcQ")).toBe(false);
  });
});
