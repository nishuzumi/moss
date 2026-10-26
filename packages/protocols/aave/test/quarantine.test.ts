import { afterEach, describe, expect, it, vi } from "vitest";
import { expectQuarantineActive } from "./quarantine.js";

const QUARANTINE = { sourceId: "PT_EXAMPLE", eligibleAfter: "2026-10-16T00:00:00.000Z" } as const;
const EXPIRY = Date.parse(QUARANTINE.eligibleAfter);
const NOTE =
  "PT_EXAMPLE cleared its quarantine at 2026-10-16T00:00:00.000Z; vendor it and remove this quarantine";

function recorder() {
  const notes: string[] = [];
  return { notes, context: { skip: (note: string) => void notes.push(note) } };
}

describe("expectQuarantineActive", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  for (const mode of [undefined, "enforce"]) {
    it(`passes before eligibleAfter (MOSS_QUARANTINE_EXPIRY=${mode ?? "unset"})`, () => {
      vi.stubEnv("MOSS_QUARANTINE_EXPIRY", mode);
      const { notes, context } = recorder();
      expectQuarantineActive(context, QUARANTINE, EXPIRY - 1);
      expect(notes).toEqual([]);
    });
  }

  for (const mode of [undefined, ""]) {
    it(`skips with a note once expired (MOSS_QUARANTINE_EXPIRY=${mode ?? "unset"})`, () => {
      vi.stubEnv("MOSS_QUARANTINE_EXPIRY", mode);
      const { notes, context } = recorder();
      expectQuarantineActive(context, QUARANTINE, EXPIRY);
      expect(notes).toEqual([NOTE]);
    });
  }

  it("fails once expired under MOSS_QUARANTINE_EXPIRY=enforce", () => {
    vi.stubEnv("MOSS_QUARANTINE_EXPIRY", "enforce");
    const { notes, context } = recorder();
    expect(() => expectQuarantineActive(context, QUARANTINE, EXPIRY)).toThrow(NOTE);
    expect(notes).toEqual([]);
  });

  for (const mode of [undefined, "enforce"]) {
    for (const eligibleAfter of [
      "soon",
      "2026-10-16",
      "2026-10-16T00:00:00",
      "Oct 16 2026",
      "2026-10-16T00:00:00Z",
      "2026-02-30T00:00:00.000Z",
    ]) {
      it(`rejects eligibleAfter ${JSON.stringify(eligibleAfter)} (MOSS_QUARANTINE_EXPIRY=${mode ?? "unset"})`, () => {
        vi.stubEnv("MOSS_QUARANTINE_EXPIRY", mode);
        const { context } = recorder();
        expect(() =>
          expectQuarantineActive(context, { sourceId: "BAD", eligibleAfter }, 0),
        ).toThrow(
          "BAD: eligibleAfter must be written as toISOString() writes it, YYYY-MM-DDTHH:mm:ss.sssZ",
        );
      });
    }
  }

  for (const mode of ["ENFORCE", "true", "1", "warn"]) {
    it(`rejects MOSS_QUARANTINE_EXPIRY=${mode} before checking the date`, () => {
      vi.stubEnv("MOSS_QUARANTINE_EXPIRY", mode);
      const { notes, context } = recorder();
      expect(() => expectQuarantineActive(context, QUARANTINE, EXPIRY - 1)).toThrow(
        `MOSS_QUARANTINE_EXPIRY must be unset or "enforce", got "${mode}"`,
      );
      expect(notes).toEqual([]);
    });
  }

  it("accepts the vitest test context", (context) => {
    expectQuarantineActive(context, QUARANTINE, EXPIRY - 1);
  });
});
