import {
  createRuntime,
  defineProtocolPackage,
  type MossRuntime,
  NATIVE,
  type Plan,
  Registry,
} from "@themoss/core";
import { createTraceSimulator } from "@themoss/simulator";
import { decodeFunctionData, getAddress } from "viem";
import { describe, expect, it } from "vitest";
import { ierc20Abi } from "../src/abis/erc.js";
import { approveStep, ERC20, ercManifest } from "../src/index.js";

const ACCOUNT = "0xCcCccCCCcCCcccCcCccccCcCCCCcccccCcCCcCcC";
const RECIPIENT = "0x1111111111111111111111111111111111111111";
// The standards layer tests know no real chain data — fixture tokens only.
const FIXTURE_USDC = getAddress("0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa");
const SPENDER = getAddress("0xbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb");

const fixtureTokens = defineProtocolPackage({
  name: "fixture",
  tokens: [{ symbol: "USDC", name: "Fixture USD", ref: FIXTURE_USDC, decimals: 6 }],
});

function offlineRegistry(): Registry {
  const runtime: MossRuntime = {
    chainId: 143,
    rpcUrl: "http://offline",
    // biome-ignore lint/suspicious/noExplicitAny: reads unused in offline tests
    client: {} as any,
  };
  const registry = new Registry(runtime);
  registry.use(fixtureTokens);
  registry.use(ercManifest);
  return registry;
}

describe("approveStep", () => {
  it("encodes per the compiled standard and tags the approval for plan()", () => {
    const step = approveStep(FIXTURE_USDC, SPENDER, 1_500_000n);
    expect(step.approval).toEqual({ token: FIXTURE_USDC, spender: SPENDER, amount: 1_500_000n });
    // Round-trip through the compiled ABI: the encoding IS the standard.
    const decoded = decodeFunctionData({ abi: ierc20Abi, data: step.data });
    expect(decoded.functionName).toBe("approve");
    expect(decoded.args).toEqual([SPENDER, 1_500_000n]);
  });
});

describe("erc20 generic protocol (offline)", () => {
  it("fills the transfer verb and loads with symbol-aware params", () => {
    const registry = offlineRegistry();
    const transfers = registry.discover({ verb: "transfer" });
    expect(transfers).toHaveLength(2); // fungible (erc20) + NFT (erc721)
    expect(transfers).toContainEqual(
      expect.objectContaining({ protocol: "erc20", method: "transfer" }),
    );
    const [stub] = registry.load([{ protocol: "erc20", method: "transfer" }]);
    expect(stub?.params.token).toContain("symbol");
    void ERC20;
  });

  it("builds a native transfer as a plain value transaction", async () => {
    const registry = offlineRegistry();
    const built = (await registry.action("erc20", "transfer", ACCOUNT, {
      token: NATIVE,
      to: RECIPIENT,
      amount: "0.5",
    })) as Plan;
    expect(built.txs).toEqual([
      { from: ACCOUNT, to: RECIPIENT, data: "0x", value: "0x6f05b59d3b20000" },
    ]);
    expect(built.expects.out).toEqual([{ token: NATIVE, amountMax: `${5n * 10n ** 17n}` }]);
  });

  it("builds an ERC-20 transfer by symbol, decimals from the table (no RPC)", async () => {
    const registry = offlineRegistry();
    const built = (await registry.action("erc20", "transfer", ACCOUNT, {
      token: "USDC",
      to: RECIPIENT,
      amount: "1.5",
    })) as Plan;
    expect(built.txs[0]?.to).toBe(FIXTURE_USDC);
    expect(built.txs[0]?.data.startsWith("0xa9059cbb")).toBe(true); // transfer(address,uint256)
    expect(built.expects.out).toEqual([{ token: FIXTURE_USDC, amountMax: "1500000" }]);
    expect(built.intent).toBe(`Transfer 1.5 USDC to ${RECIPIENT}`);
  });
});

// Live e2e with zero funds; runtime config is explicit test data here — the
// batteries-included defaults live in @themoss/system, above this layer.
describe.skipIf(!!process.env.MOSS_SKIP_E2E)("erc20 generic protocol (Monad mainnet e2e)", () => {
  it("native transfer simulates with zero warnings", { timeout: 120_000 }, async () => {
    const runtime = createRuntime({ rpcUrl: "https://rpc.monad.xyz", chainId: 143 });
    const registry = new Registry(runtime);
    registry.use(ercManifest);
    const simulator = createTraceSimulator(runtime);

    const send = (await registry.action("erc20", "transfer", ACCOUNT, {
      token: NATIVE,
      to: RECIPIENT,
      amount: "1",
    })) as Plan;
    const { results } = await simulator.simulate([send]);
    expect(results[0]?.reverted).toBe(false);
    expect(results[0]?.warnings).toEqual([]);
    expect(results[0]?.effects.assetsOut).toEqual([
      { token: NATIVE, amount: (10n ** 18n).toString() },
    ]);
  });
});
