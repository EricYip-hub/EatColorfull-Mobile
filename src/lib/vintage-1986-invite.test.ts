import { describe, expect, it } from "vitest";
import {
  INVITE_CODE,
  INVITE_RSVP_URL,
  INVITE_TEXT,
  normalizeForPlatform,
  splitLines,
} from "./vintage-1986-invite";

const PLATFORMS = ["raw", "crlf", "cr", "noTrailingSpaces"] as const;

describe("vintage-1986 invite text", () => {
  it("contains the RSVP URL and invite code", () => {
    expect(INVITE_TEXT).toContain(INVITE_RSVP_URL);
    expect(INVITE_TEXT).toContain(`Invite code: ${INVITE_CODE}`);
  });

  it.each(PLATFORMS)(
    "keeps the RSVP URL on its own line on platform=%s",
    (platform) => {
      const lines = splitLines(normalizeForPlatform(INVITE_TEXT, platform));
      const urlLines = lines.filter((l) => l.includes(INVITE_RSVP_URL));
      expect(urlLines).toHaveLength(1);
      // Whole line equals the URL (no other text glued onto it)
      expect(urlLines[0]).toBe(INVITE_RSVP_URL);
    },
  );

  it.each(PLATFORMS)(
    "keeps the invite code on its own line on platform=%s",
    (platform) => {
      const lines = splitLines(normalizeForPlatform(INVITE_TEXT, platform));
      const codeLines = lines.filter((l) => l.includes(INVITE_CODE));
      expect(codeLines).toHaveLength(1);
      expect(codeLines[0]).toBe(`Invite code: ${INVITE_CODE}`);
    },
  );

  it.each(PLATFORMS)(
    "separates the RSVP URL and invite code by at least one blank line on platform=%s",
    (platform) => {
      const lines = splitLines(normalizeForPlatform(INVITE_TEXT, platform));
      const urlIdx = lines.findIndex((l) => l === INVITE_RSVP_URL);
      const codeIdx = lines.findIndex((l) => l === `Invite code: ${INVITE_CODE}`);
      expect(urlIdx).toBeGreaterThanOrEqual(0);
      expect(codeIdx).toBeGreaterThan(urlIdx);
      const between = lines.slice(urlIdx + 1, codeIdx);
      expect(between.some((l) => l.trim() === "")).toBe(true);
    },
  );

  it("does not glue the code onto the URL line", () => {
    expect(INVITE_TEXT).not.toMatch(
      new RegExp(`${INVITE_RSVP_URL}[^\\n]*${INVITE_CODE}`),
    );
  });

  it("has no stray spaces on the URL or code lines that could break parsing", () => {
    const lines = splitLines(INVITE_TEXT);
    const url = lines.find((l) => l.includes(INVITE_RSVP_URL))!;
    const code = lines.find((l) => l.includes(INVITE_CODE))!;
    expect(url).toBe(url.trim());
    expect(code).toBe(code.trim());
  });
});
