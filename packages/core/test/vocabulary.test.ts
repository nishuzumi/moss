import { describe, expect, it } from "vitest";
import {
  type AddressValue,
  CATEGORIES,
  Capability,
  type Change,
  type InferParams,
  type ReceiptResult as MossReceipt,
  type MossRuntime,
  type ParamsSpec,
  PositionSide,
  PositiveDecimalString,
  Protocol,
  Receipt,
  Registry,
  RISK_LABELS,
  transaction,
  VERBS,
} from "../src/index.js";

const MARKET = "0x3333333333333333333333333333333333333333" as const;
const ACCOUNT = "0x2222222222222222222222222222222222222222" as const;

const openParams = {
  side: { type: PositionSide, description: "Direction of the position this Capability opens." },
  collateral: {
    type: PositiveDecimalString,
    description: "Collateral posted against the position, in the margin asset's display units.",
  },
} satisfies ParamsSpec;

const closeParams = {
  size: {
    type: PositiveDecimalString,
    description: "Position size this Capability unwinds, in the market's base units.",
  },
} satisfies ParamsSpec;

@Protocol({
  name: "testperps",
  category: "perps",
  description: "Fixture perpetuals Protocol pinning the position-lifecycle vocabulary.",
  contracts: {},
})
class TestPerps {
  @Capability<TestPerps, typeof openParams>({
    intent: "Open a {side} position backed by {collateral}",
    verb: "open",
    params: openParams,
    receipt: "positionReceipt",
    risk: ["fundOut", "leverage", "liquidation"],
    tags: ["perps"],
  })
  async open(_: InferParams<typeof openParams>, ctx: { account: AddressValue }) {
    return [transaction(ctx.account, MARKET, { data: "0x0001" })];
  }

  @Capability<TestPerps, typeof closeParams>({
    intent: "Close {size} of the open position",
    verb: "close",
    params: closeParams,
    receipt: "positionReceipt",
    risk: ["liquidation"],
    tags: ["perps"],
  })
  async close(_: InferParams<typeof closeParams>, ctx: { account: AddressValue }) {
    return [transaction(ctx.account, MARKET, { data: "0x0002" })];
  }

  @Receipt()
  positionReceipt(changes: readonly Change[]): MossReceipt<{ operation: "position" }> {
    return {
      kind: "receipt",
      outcome: { operation: "position" },
      text: "Observed a position change",
      changes: changes.map((change) => ({
        kind: "change",
        change,
        data: { operation: "position" },
        text: "Observed a position change",
      })),
    };
  }
}

const runtime: MossRuntime = {
  rpcUrl: "http://offline",
  // biome-ignore lint/suspicious/noExplicitAny: calls are not used by this unit test
  client: {} as any,
};

describe("capability vocabulary", () => {
  it("keeps the closed sets aligned with ADR 0003", () => {
    expect(VERBS).toEqual([
      "swap",
      "wrap",
      "unwrap",
      "supply",
      "withdraw",
      "borrow",
      "repay",
      "stake",
      "unstake",
      "claim",
      "mint",
      "transfer",
      "approve",
      "open",
      "close",
    ]);
    expect(CATEGORIES).toEqual(["dex", "perps", "lending", "staking", "rewards", "token", "nft"]);
    expect(RISK_LABELS).toEqual([
      "fundOut",
      "approval",
      "priceImpact",
      "debt",
      "leverage",
      "liquidation",
    ]);
  });

  it("discovers position-lifecycle Capabilities by their perps category and verbs", async () => {
    const registry = new Registry(runtime).use(TestPerps);

    expect(registry.discover({ category: "perps" }).map(({ method }) => method)).toEqual([
      "open",
      "close",
    ]);
    expect(
      registry.discover({ verb: "open" }).map(({ method, category }) => ({ method, category })),
    ).toEqual([{ method: "open", category: "perps" }]);
    expect(registry.discover({ verb: "close" }).map(({ method }) => method)).toEqual(["close"]);
    expect(registry.discover({ verb: "swap" })).toEqual([]);

    const [stub] = registry.load([{ protocol: "testperps", method: "open" }]);
    expect(stub).toMatchObject({
      verb: "open",
      category: "perps",
      risk: ["fundOut", "leverage", "liquidation"],
    });

    const capability = await registry.action("testperps", "open", ACCOUNT, {
      side: "long",
      collateral: "100",
    });
    if (capability.kind !== "capability") throw new Error("expected Capability");
    expect(capability.params).toEqual({ side: "long", collateral: "100" });
  });

  it("still rejects words outside the closed sets", () => {
    @Protocol({
      name: "badcategory",
      // biome-ignore lint/suspicious/noExplicitAny: proving the runtime guard, not the type guard
      category: "perpetuals" as any,
      description: "Fixture Protocol with a category outside the closed set.",
      contracts: {},
    })
    class BadCategory {
      @Capability<BadCategory, typeof closeParams>({
        intent: "Close a position",
        verb: "close",
        params: closeParams,
        receipt: "positionReceipt",
        risk: ["liquidation"],
      })
      async close(_: InferParams<typeof closeParams>, ctx: { account: AddressValue }) {
        return [transaction(ctx.account, MARKET, { data: "0x0002" })];
      }

      @Receipt()
      positionReceipt(): MossReceipt<{ operation: "position" }> {
        return { kind: "receipt", outcome: { operation: "position" }, text: "", changes: [] };
      }
    }

    @Protocol({
      name: "badverb",
      category: "perps",
      description: "Fixture Protocol with a verb outside the closed set.",
      contracts: {},
    })
    class BadVerb {
      @Capability<BadVerb, typeof closeParams>({
        intent: "Go short",
        // biome-ignore lint/suspicious/noExplicitAny: proving the runtime guard, not the type guard
        verb: "short" as any,
        params: closeParams,
        receipt: "positionReceipt",
        risk: ["liquidation"],
      })
      async short(_: InferParams<typeof closeParams>, ctx: { account: AddressValue }) {
        return [transaction(ctx.account, MARKET, { data: "0x0003" })];
      }

      @Receipt()
      positionReceipt(): MossReceipt<{ operation: "position" }> {
        return { kind: "receipt", outcome: { operation: "position" }, text: "", changes: [] };
      }
    }

    @Protocol({
      name: "badrisk",
      category: "perps",
      description: "Fixture Protocol with a risk label outside the closed set.",
      contracts: {},
    })
    class BadRisk {
      @Capability<BadRisk, typeof closeParams>({
        intent: "Close a position",
        verb: "close",
        params: closeParams,
        receipt: "positionReceipt",
        // biome-ignore lint/suspicious/noExplicitAny: proving the runtime guard, not the type guard
        risk: ["funding"] as any,
      })
      async close(_: InferParams<typeof closeParams>, ctx: { account: AddressValue }) {
        return [transaction(ctx.account, MARKET, { data: "0x0004" })];
      }

      @Receipt()
      positionReceipt(): MossReceipt<{ operation: "position" }> {
        return { kind: "receipt", outcome: { operation: "position" }, text: "", changes: [] };
      }
    }

    expect(() => new Registry(runtime).use(BadCategory)).toThrow("invalid category");
    expect(() => new Registry(runtime).use(BadVerb)).toThrow("invalid verb");
    expect(() => new Registry(runtime).use(BadRisk)).toThrow("invalid risk label");
  });
});
