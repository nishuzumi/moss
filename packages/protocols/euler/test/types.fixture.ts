/**
 * Compile-time contract for the Euler package. Never executed — `.fixture.ts`
 * is outside the vitest glob — but type-checked by `pnpm typecheck`, so the
 * exported decorator, parameter and Receipt inference stays a reviewed API.
 */
import {
  Address,
  type Capability,
  type Change,
  type Handle,
  type InferParams,
  type MossRuntime,
  type ParamsSpec,
  PositiveDecimalString,
  type ProtocolRef,
  type ReceiptResult,
  Registry,
} from "@themoss/core";
import type { EulerSupplyOutcome } from "../src/index.js";
import { Euler, EulerVaultConnector, type EVaultAbi } from "../src/index.js";

declare const runtime: MossRuntime;
declare const registry: Registry;

const ACCOUNT = "0xcccccccccccccccccccccccccccccccccccccccc" as const;
const VAULT = "0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa" as const;

// Registration accepts the decorated classes directly.
new Registry(runtime).use(Euler, EulerVaultConnector);

// @ts-expect-error — Protocols are registered as classes, never instances.
new Registry(runtime).use(new Euler());

// Capability parameters infer from the declared ParamsSpec. (`registry.action`
// is the string-keyed MCP seam and validates at runtime; the compile-time
// contract lives on the decorated method itself.)
void registry;
declare const euler: Euler;
void euler.supply({ vault: VAULT, amount: "1.5" }, { account: ACCOUNT });
// @ts-expect-error — `amount` is a decimal string, not a number.
void euler.supply({ vault: VAULT, amount: 1.5 }, { account: ACCOUNT });
// @ts-expect-error — `vault` is required.
void euler.supply({ amount: "1.5" }, { account: ACCOUNT });
// `collateral` is the one optional borrow parameter, and the public overload
// keeps it genuinely optional rather than required-but-undefined.
void euler.borrow({ vault: VAULT, amount: "1" }, { account: ACCOUNT });
void euler.borrow({ vault: VAULT, amount: "1", collateral: VAULT }, { account: ACCOUNT });
// @ts-expect-error — an unknown parameter is rejected.
void euler.borrow({ vault: VAULT, amount: "1", leverage: 2 }, { account: ACCOUNT });

// ProtocolRef exposes methods, not Handles or Runtime.
type ConnectorRef = ProtocolRef<EulerVaultConnector>;
declare const connector: ConnectorRef;
const _enable: Promise<{ kind: "capability" }> = connector.enableCollateral({
  vault: VAULT,
}) as never;
// @ts-expect-error — a dependency reference never exposes the injected Handle.
connector.evc;
// @ts-expect-error — nor the Runtime.
connector.runtime;

// A Receipt parser authors ReceiptResult; the Protocol-stamped Receipt is core's.
declare const changes: readonly Change[];
const _supply: ReceiptResult<EulerSupplyOutcome> = new Euler().supplyReceipt(changes);
const _outcome: EulerSupplyOutcome = _supply.outcome;
const _assets: string = _outcome.assets;
// @ts-expect-error — Outcome quantities are decimal strings, never bigint.
const _wrong: bigint = _outcome.assets;

// The vault Handle is ABI-typed: reads and writes must match EVault's surface.
declare const vault: Handle<typeof EVaultAbi>;
const _cash: Promise<bigint> = vault.read.cash();
const _deposit = vault.deposit([1n, ACCOUNT]);
// @ts-expect-error — `deposit` takes (uint256, address), not one argument.
vault.deposit([1n]);
// @ts-expect-error — no such function on the EVault ABI.
vault.notAFunction([]);

// Parameter types stay reusable value contracts with their own descriptions.
const _params = {
  vault: { type: Address, description: "Vault acted on." },
  amount: { type: PositiveDecimalString, description: "Amount supplied." },
} satisfies ParamsSpec;
type _Inferred = InferParams<typeof _params>;
const _typed: _Inferred = { vault: VAULT, amount: "1" };
// @ts-expect-error — a ParamsSpec field needs both a type and a description.
const _missing = { vault: { type: Address } } satisfies ParamsSpec;

export type { Capability };
