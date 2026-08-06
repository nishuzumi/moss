import { createRuntime, Registry } from "@themoss/core";
import { createTraceSimulator } from "@themoss/simulator";
import { getAddress } from "viem";
import { describe, expect, it } from "vitest";
import { type MerklClaimOutcome, MerklProtocol, type MerklRewardsResult } from "../src/index.js";

// Public, high-activity Merkl beneficiary. Override both values together when
// its reward is claimed or its active proof changes between CI runs.
const ACCOUNT = getAddress(
  process.env.MERKL_LIVE_ACCOUNT ?? "0x461549c73FFfB676860A0E49F5DaABEcf4E8D2d7",
);
const TOKEN = getAddress(
  process.env.MERKL_LIVE_TOKEN ?? "0x3bd359C1119dA7Da1D913D1C4D2B7c461115433A",
);

describe.skipIf(!!process.env.MOSS_SKIP_E2E)("Merkl live Monad mainnet self-claim", () => {
  it("builds and simulates a positive claim with exhaustive ordered evidence", {
    timeout: 240_000,
  }, async () => {
    const runtime = await createRuntime();
    expect(await runtime.client.getChainId()).toBe(143);
    const registry = new Registry(runtime).use(MerklProtocol);

    const query = await registry.action("merkl", "rewards", ACCOUNT, { account: ACCOUNT });
    if (query.kind !== "query") throw new Error("expected merkl.rewards Query result");
    const rewards = query.data as MerklRewardsResult;
    const selected = rewards.rewards.find(
      (reward) => reward.token.toLowerCase() === TOKEN.toLowerCase(),
    );
    if (!selected?.claimableNow || BigInt(selected.claimableAmount) <= 0n) {
      throw new Error(
        `Merkl live fixture ${ACCOUNT}/${TOKEN} is no longer positively claimable; ` +
          "replace MERKL_LIVE_ACCOUNT and MERKL_LIVE_TOKEN with a current public reward",
      );
    }

    const capability = await registry.action("merkl", "claim", ACCOUNT, { tokens: [TOKEN] });
    if (capability.kind !== "capability") throw new Error("expected merkl.claim Capability");
    const outcome = await createTraceSimulator(runtime, {
      receipt: (node, changes) => registry.parseReceipt(node, changes),
    }).simulate(capability);

    expect(outcome.halted).toBeUndefined();
    expect(outcome.results).toHaveLength(1);
    const result = outcome.results[0];
    expect(result?.warnings).toEqual([]);
    expect(result?.changes).toHaveLength(2);
    expect(result?.changes?.map((change) => change.kind)).toEqual(["event", "event"]);
    expect(
      result?.changes?.map((change) =>
        change.kind === "event" ? change.address.toLowerCase() : undefined,
      ),
    ).toEqual(["0x3ef3d8ba38ebe18db133cec108f4d14ce00dd9ae", TOKEN.toLowerCase()]);
    const receipt = result?.receipt;
    expect(receipt?.changes).toHaveLength(result?.changes?.length ?? -1);
    const receiptOutcome = receipt?.outcome as MerklClaimOutcome | undefined;
    expect(receiptOutcome).toMatchObject({ operation: "claim", account: ACCOUNT });
    expect(receiptOutcome?.rewards).toHaveLength(1);
    expect(receiptOutcome?.rewards[0]?.token).toBe(TOKEN);
    expect(BigInt(receiptOutcome?.rewards[0]?.amount ?? "0")).toBeGreaterThan(0n);

    console.log({
      account: ACCOUNT,
      token: TOKEN,
      claimableAmount: selected.claimableAmount,
      changes: result?.changes,
      receipt: receiptOutcome,
    });
  });
});
