import { getAddress, parseAbi } from "viem";
import { describe, expect, it } from "vitest";
import { createHandle, type TxStep } from "../src/handle.js";
import { computePlanHash, finalizePlan, plan } from "../src/plan.js";
import {
  address,
  decodeParams,
  nativeAmount,
  slippageBps,
  token,
  tokenAmount,
} from "../src/semantics.js";
import { Token } from "../src/token.js";
import { type KnownToken, TokenTable } from "../src/tokens.js";
import { NATIVE } from "../src/types.js";

// Core is pure machinery: its tests know no real chain data — only fixtures.
const USDC = getAddress("0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa");
const SPENDER = getAddress("0xbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb");
const ACCOUNT = getAddress("0xcccccccccccccccccccccccccccccccccccccccc");
const UNKNOWN = getAddress("0xdddddddddddddddddddddddddddddddddddddddd");

const FIXTURE_TOKENS: readonly KnownToken[] = [
  { symbol: "MON", name: "Native Fixture", ref: NATIVE, decimals: 18 },
  { symbol: "USDC", name: "Fixture USD", ref: USDC, decimals: 6 },
];

function fixtureTable(): TokenTable {
  const table = new TokenTable();
  for (const entry of FIXTURE_TOKENS) table.add(entry, "fixture");
  return table;
}

// No fallback wired: unknown addresses must fail loudly, not hit a chain.
const ctx = { account: ACCOUNT, token: fixtureTable().source() };

describe("semantic types", () => {
  it("checksums addresses and rejects garbage", async () => {
    const decoded = await decodeParams({ a: address }, { a: USDC.toLowerCase() }, ctx);
    expect(decoded.a).toBe(USDC);
    await expect(decodeParams({ a: address }, { a: "0x123" }, ctx)).rejects.toThrow(
      'invalid parameter "a"',
    );
  });

  it("scales tokenAmount by the sibling asset's decimals, declaration order", async () => {
    const spec = { asset: address, amount: tokenAmount("asset") };
    const decoded = await decodeParams(spec, { asset: USDC, amount: "1.5" }, ctx);
    expect(decoded.amount).toBe(1_500_000n); // 6 decimals, from the table — no RPC
  });

  it("treats native as 18 decimals without an RPC read", async () => {
    const decoded = await decodeParams(
      { x: { describe: "", decode: () => NATIVE }, amount: tokenAmount("x") },
      { x: NATIVE, amount: "2" },
      ctx,
    );
    expect(decoded.amount).toBe(2n * 10n ** 18n);
  });

  it("rejects pre-scaled garbage and unknown params", async () => {
    await expect(decodeParams({ n: nativeAmount }, { n: "-1" }, ctx)).rejects.toThrow();
    await expect(decodeParams({ n: nativeAmount }, { n: "1", extra: 1 }, ctx)).rejects.toThrow(
      "not a declared parameter",
    );
  });

  it("applies slippage defaults and bounds", async () => {
    const spec = { s: slippageBps(50) };
    expect((await decodeParams(spec, {}, ctx)).s).toBe(50);
    expect((await decodeParams(spec, { s: 100 }, ctx)).s).toBe(100);
    await expect(decodeParams(spec, { s: 20_000 }, ctx)).rejects.toThrow();
  });
});

describe("handle", () => {
  const abi = parseAbi([
    "function deposit() payable",
    "function withdraw(uint256 amount)",
    "function balanceOf(address owner) view returns (uint256)",
  ]);

  it("encodes calldata locally, with payable value via opts", () => {
    // biome-ignore lint/suspicious/noExplicitAny: read side unused in this test
    const handle = createHandle(abi, USDC, { readContract: async () => 0n } as any);
    const step = handle.deposit([], { value: 7n });
    expect(step).toMatchObject({ to: USDC, data: "0xd0e30db0", value: 7n });
    const withdrawStep = handle.withdraw([5n]);
    expect(withdrawStep.data.startsWith("0x2e1a7d4d")).toBe(true);
    expect(withdrawStep.value).toBe(0n);
  });

  it("routes reads through the client", async () => {
    let captured: unknown;
    const handle = createHandle(abi, USDC, {
      readContract: async (params: unknown) => {
        captured = params;
        return 42n;
      },
      // biome-ignore lint/suspicious/noExplicitAny: minimal client stub
    } as any);
    await expect(handle.read.balanceOf([ACCOUNT])).resolves.toBe(42n);
    expect(captured).toMatchObject({ functionName: "balanceOf", address: USDC });
  });
});

describe("token table", () => {
  it("resolves symbols case-insensitively, including native", () => {
    const table = fixtureTable();
    expect(table.resolve("usdc")?.decimals).toBe(6);
    expect(table.resolve("USDC")?.address).toBe(USDC);
    expect(table.resolve("MON")?.isNative).toBe(true);
    expect(table.resolve(USDC.toLowerCase())?.symbol).toBe("USDC");
  });

  it("rejects same-symbol redefinitions, tolerates idempotent re-registration", () => {
    const table = fixtureTable();
    // identical entry from another package: fine
    table.add({ symbol: "USDC", name: "Fixture USD", ref: USDC, decimals: 6 }, "other");
    // same symbol, different address: accident or attack — hard error
    expect(() =>
      table.add({ symbol: "USDC", name: "Fake", ref: SPENDER, decimals: 6 }, "evil"),
    ).toThrow(/conflict.*evil.*fixture/s);
    // same address, different symbol: also a redefinition — refuse
    expect(() =>
      table.add({ symbol: "USDC2", name: "Alias", ref: USDC, decimals: 6 }, "sloppy"),
    ).toThrow(/conflict/);
  });

  it("decodes symbols through the token semantic type, table-only", async () => {
    const decoded = await decodeParams({ t: token }, { t: "USDC" }, ctx);
    expect(decoded.t).toBe(USDC);
    // Unknown symbols never fall back to on-chain symbol() — same-symbol
    // fakes are the classic scam. Loud error listing the table instead.
    await expect(decodeParams({ t: token }, { t: "PEPE" }, ctx)).rejects.toThrow(
      /unknown token symbol "PEPE".*USDC/,
    );
  });

  it("still accepts explicit addresses and the native sentinel", async () => {
    const decoded = await decodeParams(
      { a: token, n: token },
      { a: USDC.toLowerCase(), n: NATIVE },
      ctx,
    );
    expect(decoded.a).toBe(USDC);
    expect(decoded.n).toBe(NATIVE);
  });

  it("unknown addresses fail loudly when no fallback is wired — core reads no contracts", async () => {
    await expect(fixtureTable().source()(UNKNOWN)).rejects.toThrow(/no fallback is configured/);
    // and route to the injected fallback when one is provided
    const fallback = async () => Token.of(UNKNOWN, 9, "UNK");
    await expect(fixtureTable().source(fallback)(UNKNOWN)).resolves.toMatchObject({
      decimals: 9,
      symbol: "UNK",
    });
  });
});

describe("token", () => {
  it("owns scaling math in both directions — and nothing else", () => {
    const usdc = Token.of(USDC, 6, "USDC");
    expect(usdc.scale("1.5")).toBe(1_500_000n);
    expect(usdc.format(1_500_000n)).toBe("1.5");
    expect(Token.native().scale("2")).toBe(2n * 10n ** 18n);
    expect(() => Token.native().address).toThrow("no contract address");
  });
});

describe("plan", () => {
  const meta = {
    protocol: "test",
    method: "supply",
    verb: "supply",
    chainId: 143,
    account: ACCOUNT,
    intent: "Supply 1.5 USDC",
    declaredRisk: ["fundOut", "approval"],
  } as const;

  // The approval-tag mechanism is core's; the ENCODING of approve lives in
  // @themoss/erc. A hand-built tagged step exercises the mechanism alone.
  const approve: TxStep = {
    to: USDC,
    data: "0x095ea7b3",
    value: 0n,
    approval: { token: USDC, spender: SPENDER, amount: 1_500_000n },
  };

  it("folds tagged approve steps into expects and seals with a hash", () => {
    const main: TxStep = { to: SPENDER, data: "0x12345678", value: 0n };
    const draft = plan([approve, main], { out: [{ token: USDC, amountMax: 1_500_000n }] });
    const built = finalizePlan(draft, { ...meta, declaredRisk: [...meta.declaredRisk] });

    expect(built.txs).toHaveLength(2);
    expect(built.txs[0]?.from).toBe(ACCOUNT);
    expect(built.expects.approvals).toEqual([
      { token: USDC, spender: SPENDER, amountMax: "1500000" },
    ]);
    expect(built.expects.out).toEqual([{ token: USDC, amountMax: "1500000" }]);
    expect(built.planHash).toBe(computePlanHash(built));
  });

  it("detects tampering: any tx or expects mutation changes the hash", () => {
    const draft = plan([{ to: SPENDER, data: "0xdead", value: 1n }]);
    const built = finalizePlan(draft, { ...meta, declaredRisk: [...meta.declaredRisk] });
    const tampered = { ...built, txs: [{ ...built.txs[0], value: "0x2" }] };
    // biome-ignore lint/suspicious/noExplicitAny: intentional structural tamper
    expect(computePlanHash(tampered as any)).not.toBe(built.planHash);
  });

  it("preserves uint256 NFT ids and amounts and seals them into the hash", () => {
    const tokenId = 2n ** 256n - 1n;
    const amount = 2n ** 255n + 17n;
    const draft = plan([{ to: USDC, data: "0xdead", value: 0n }], {
      nfts: [
        {
          collection: USDC,
          count: 1,
          direction: "out",
          items: [{ tokenId, amountMax: amount }],
        },
      ],
    });
    const built = finalizePlan(draft, { ...meta, declaredRisk: [...meta.declaredRisk] });

    expect(built.expects.nfts).toEqual([
      {
        collection: USDC,
        count: 1,
        direction: "out",
        items: [{ tokenId: tokenId.toString(), amountMax: amount.toString() }],
      },
    ]);
    const tampered = {
      ...built,
      expects: {
        ...built.expects,
        nfts: [
          {
            ...built.expects.nfts?.[0],
            items: [{ tokenId: (tokenId - 1n).toString(), amountMax: amount.toString() }],
          },
        ],
      },
    };
    // biome-ignore lint/suspicious/noExplicitAny: intentional structural tamper
    expect(computePlanHash(tampered as any)).not.toBe(built.planHash);
  });

  it("requires exact distinct token ids for NFT outflows but permits unknown mint ids", () => {
    const step: TxStep = { to: USDC, data: "0xdead", value: 0n };
    expect(() =>
      plan([step], { nfts: [{ collection: USDC, count: 1, direction: "out" }] }),
    ).toThrow(/token ids/);
    expect(() =>
      plan([step], {
        nfts: [
          {
            collection: USDC,
            count: 2,
            direction: "out",
            items: [{ tokenId: 7n }, { tokenId: 7n }],
          },
        ],
      }),
    ).toThrow(/distinct/);
    expect(() =>
      plan([step], {
        nfts: [{ collection: USDC, count: 2, direction: "out", items: [{ tokenId: 7n }] }],
      }),
    ).toThrow(/count/);
    expect(() =>
      plan([step], {
        nfts: [
          {
            collection: USDC,
            count: 1,
            direction: "out",
            items: [{ tokenId: -1n }],
          },
        ],
      }),
    ).toThrow(/uint256/);
    expect(() =>
      plan([step], {
        nfts: [
          {
            collection: USDC,
            count: 1,
            direction: "out",
            items: [{ tokenId: 1n, amountMax: -1n }],
          },
        ],
      }),
    ).toThrow(/uint256/);
    expect(() =>
      plan([step], {
        nfts: [
          {
            collection: USDC,
            count: 1,
            direction: "in",
            items: [{ tokenId: 1n, amountMax: 1n }],
          },
        ],
      }),
    ).toThrow(/inflows/);
    expect(() =>
      plan([step], {
        nfts: [
          {
            collection: USDC,
            count: 3,
            direction: "in",
            items: [{ tokenId: 1n }],
          },
        ],
      }),
    ).not.toThrow();
    expect(() =>
      plan([step], {
        nfts: [
          {
            collection: USDC,
            count: 1,
            direction: "in",
            items: [{ tokenId: 1n }, { tokenId: 2n }],
          },
        ],
      }),
    ).toThrow(/minimum count/);
    expect(() =>
      plan([step], { nfts: [{ collection: USDC, count: 1, direction: "in" }] }),
    ).not.toThrow();
  });

  it("rejects empty plans", () => {
    expect(() => plan([])).toThrow("at least one step");
  });
});
