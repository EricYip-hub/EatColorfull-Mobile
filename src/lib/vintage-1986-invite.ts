export const INVITE_RSVP_URL = "https://www.eatcolorfull.com/vintage-1986";
export const INVITE_CODE = "shai2026";
export const VINTAGE_1986_ADDRESS = "6546 Colgate Ave, Los Angeles, CA 90048";

export const INVITE_TEXT = `Please join me for an intimate evening of great food, great wine, and even better company as I celebrate 40.

Tomorrow night 🌿

Monday, June 8 • 8 PM

Curated Italian menu by Molino.

Location disclosed upon confirmation.

RSVP here:
${INVITE_RSVP_URL}

Invite code: ${INVITE_CODE}`;

/**
 * Normalize line endings the way different platforms (iOS Messages, Android
 * SMS, Gmail, WhatsApp, Slack) tend to deliver pasted text. We test against
 * each of these to make sure the URL and invite code always end up on their
 * own lines.
 */
export function normalizeForPlatform(
  text: string,
  platform: "raw" | "crlf" | "cr" | "noTrailingSpaces",
): string {
  switch (platform) {
    case "raw":
      return text;
    case "crlf":
      return text.replace(/\n/g, "\r\n");
    case "cr":
      return text.replace(/\n/g, "\r");
    case "noTrailingSpaces":
      return text
        .split("\n")
        .map((l) => l.replace(/[ \t]+$/g, ""))
        .join("\n");
  }
}

export function splitLines(text: string): string[] {
  return text.split(/\r\n|\r|\n/);
}
