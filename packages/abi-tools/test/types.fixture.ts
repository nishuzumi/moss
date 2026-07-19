// Compile-time contract of the @themoss/abi-tools public API (AGENTS.md:
// exported types are public API behavior). Checked by `pnpm typecheck`.
import type { Abi } from "abitype";
import {
  type FetchAbiError,
  type FetchAbiErrorKind,
  fetchAbi,
  renderAbiModule,
} from "../src/index.js";

declare const address: string;
declare const key: string;
declare const error: FetchAbiError;

// fetchAbi returns a typed ABI, with fetch injectable.
const abi: Promise<Abi> = fetchAbi(address, key);
void fetchAbi(address, key, { fetch: globalThis.fetch });

// Error kinds stay a closed literal union.
const kind: FetchAbiErrorKind = error.kind;
void kind;
// @ts-expect-error unknown kinds are rejected
const badKind: FetchAbiErrorKind = "bogus";
void badKind;

// renderAbiModule requires the full provenance inputs and a real Abi.
void (async () =>
  renderAbiModule({ exportName: "wmon", address, abi: await abi, retrievedAt: new Date() }));
// @ts-expect-error retrievedAt is required — the renderer never reads the clock
void renderAbiModule({ exportName: "wmon", address, abi: [] });
// @ts-expect-error a raw string is not an Abi
void renderAbiModule({ exportName: "wmon", address, abi: "[]", retrievedAt: new Date() });

// @ts-expect-error the API key is required
void fetchAbi(address);
// @ts-expect-error fetch must be a function
void fetchAbi(address, key, { fetch: "fetch" });
