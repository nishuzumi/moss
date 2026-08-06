import type { AddressValue, TokenRef } from "@themoss/core";

export type KuruQuoteErrorCode =
  /** Discovery and verification completed, but no candidate route remained. */
  | "NO_VERIFIED_ROUTE"
  /** Every exact-input route completed and returned zero output. */
  | "NO_POSITIVE_QUOTE"
  /** At least one verified route could not be evaluated, making comparison incomplete. */
  | "ROUTE_QUOTE_UNAVAILABLE"
  /** Every target-output route was locally proven unable to satisfy the target. */
  | "TARGET_OUTPUT_UNSATISFIABLE";

/** Stable context for one verified route whose quote evaluation failed. */
export type KuruRouteQuoteFailure = {
  readonly path: readonly TokenRef[];
  readonly markets: readonly AddressValue[];
  readonly message: string;
};

/** A machine-readable Kuru discovery or quote-comparison failure. */
export class KuruQuoteError extends Error {
  readonly code: KuruQuoteErrorCode;
  readonly failures: readonly KuruRouteQuoteFailure[];

  constructor(
    code: KuruQuoteErrorCode,
    message: string,
    options: {
      readonly failures?: readonly KuruRouteQuoteFailure[];
      readonly cause?: unknown;
    } = {},
  ) {
    super(message, { cause: options.cause });
    this.name = "KuruQuoteError";
    this.code = code;
    this.failures = options.failures ?? [];
  }
}
