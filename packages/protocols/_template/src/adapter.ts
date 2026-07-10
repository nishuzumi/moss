/**
 * CHANGEME: <Protocol> — one sentence on what it is and what this adapter
 * covers. Document quirks the next maintainer must know: upgradeable proxies?
 * fee-on-transfer tokens? cooldown periods? cleanup calls?
 *
 * Authoring rules worth re-reading before you start (full guide:
 * docs/protocol-onboarding.md):
 *
 *   - Verbs are USER-PERSPECTIVE fund semantics from the closed set — never
 *     protocol function names. WMON's deposit() is `wrap`; a lending deposit
 *     is `supply`; a CLOB market order is `swap` + tags: ["clob"].
 *   - Params are human-readable; semantic types do the scaling. Contextual
 *     types (tokenAmount("asset")) must come AFTER the param they reference.
 *   - Every capability returns plan(steps, flows) with QUANTIFIED expects —
 *     max out, min in. Approvals via Token.approveStep are auto-declared.
 *   - Writes with a meaningful on-chain receipt declare it: @Event renders
 *     a protocol-authored observation, and `confirms` makes simulation fail
 *     loudly (CONFIRMATION_MISSING) when the receipt doesn't appear.
 *   - Verify every address on-chain and note how in a comment.
 */
import {
  type Address,
  address,
  Capability,
  type DecodedEvent,
  Event,
  type Handle,
  NATIVE,
  nativeAmount,
  type ObserveCtx,
  Protocol,
  plan,
  Query,
} from "@themoss/core";
import { ExampleVaultAbi } from "./abis/example.js";

// CHANGEME: verified on-chain how? (bytecode present, metadata matches, source?)
export const EXAMPLE_VAULT_ADDRESS: Address = "0x0000000000000000000000000000000000000001";

@Protocol({
  name: "template", // CHANGEME: unique lowercase slug — the discover coordinate
  category: "token", // closed set: dex lending staking rewards token nft
  description: "CHANGEME: one line an agent can understand.",
  contracts: {
    // Key must match the `declare` field below. For protocols that operate on
    // caller-supplied addresses, use `contracts: {}` and `declare runtime` —
    // see the generic erc20 protocol in @themoss/erc.
    vault: { abi: ExampleVaultAbi, addr: EXAMPLE_VAULT_ADDRESS },
  },
})
export class ExampleProtocol {
  declare vault: Handle<typeof ExampleVaultAbi>;

  @Capability({
    intent: "Deposit {amount} MON into the example vault",
    verb: "supply",
    params: { amount: nativeAmount },
    risk: ["fundOut"],
    tags: ["example"], // CHANGEME: long-tail semantics (clob, lst, ...)
    confirms: ["depositReceipt"], // this write must produce the receipt below
  })
  async deposit({ amount }: { amount: bigint }) {
    const step = this.vault.deposit([], { value: amount });
    return plan([step], {
      out: [{ token: NATIVE, amountMax: amount }],
      // CHANGEME: declare what must arrive (receipt tokens? nothing for a
      // pure deposit that only creates a position — that's legitimate).
    });
  }

  // The observation plane (ADR 0008): after simulation, this plan's logs are
  // decoded against your ABIs and handed here; the returned values fill the
  // intent template's {placeholders}. Return null to skip. A `dealer` option
  // (method name or function) can filter/aggregate events first, sharing
  // scratch state via ctx.shared — see Kuru's countFills.
  @Event<ExampleProtocol>({
    events: { vault: ["Deposited"] }, // contract-handle key → ABI event names
    intent: "Deposited {amount} MON into the example vault",
  })
  async depositReceipt(events: DecodedEvent[], ctx: ObserveCtx) {
    const hit = events.find((e) => e.name === "Deposited");
    if (!hit) return null;
    const { amount } = hit.args as { account: Address; amount: bigint };
    return { amount: (await ctx.token(NATIVE)).format(amount) };
  }

  @Query({
    intent: "Example vault balance of {owner}",
    params: { owner: address },
  })
  async balanceOf({ owner }: { owner: Address }) {
    const balance = await this.vault.read.balanceOf([owner]);
    return { balance: balance.toString() };
  }
}
