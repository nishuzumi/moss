import {
  type Address,
  createRuntime,
  type Expects,
  finalizePlan,
  NATIVE,
  plan,
} from "@themoss/core";
import { encodeAbiParameters, padHex, toHex } from "viem";
import { describe, expect, it } from "vitest";
import {
  APPROVAL_FOR_ALL_TOPIC,
  APPROVAL_TOPIC,
  EffectsAccumulator,
  TRANSFER_BATCH_TOPIC,
  TRANSFER_SINGLE_TOPIC,
  TRANSFER_TOPIC,
  WETH_DEPOSIT_TOPIC,
  WETH_WITHDRAWAL_TOPIC,
} from "../src/effects.js";
import { createTraceSimulator } from "../src/index.js";
import { mergeDiff } from "../src/overrides.js";
import { reconcile } from "../src/reconcile.js";
import type { StateOverrides } from "../src/trace.js";

const A = "0x1111111111111111111111111111111111111111" as Address;
const B = "0x2222222222222222222222222222222222222222" as Address;
const TOKEN = "0x3333333333333333333333333333333333333333" as Address;

describe("reconcile", () => {
  const effects = (over: object) => ({
    assetsOut: [],
    assetsIn: [],
    approvals: [],
    nftApprovals: [],
    nftsOut: [],
    nftsIn: [],
    recipients: [],
    ...over,
  });

  it("warns on undeclared outflows and over-max outflows", () => {
    const expects: Expects = { out: [{ token: NATIVE, amountMax: "100" }] };
    expect(
      reconcile(expects, effects({ assetsOut: [{ token: NATIVE, amount: "100" }] })),
    ).toHaveLength(0);
    expect(
      reconcile(expects, effects({ assetsOut: [{ token: NATIVE, amount: "101" }] }))[0]?.code,
    ).toBe("OUTFLOW_EXCEEDS_MAX");
    expect(
      reconcile(expects, effects({ assetsOut: [{ token: TOKEN, amount: "1" }] }))[0]?.code,
    ).toBe("UNDECLARED_OUTFLOW");
  });

  it("matches approvals by token AND spender, capped", () => {
    const expects: Expects = { approvals: [{ token: TOKEN, spender: B, amountMax: "50" }] };
    const ok = effects({ approvals: [{ token: TOKEN, spender: B, amount: "50" }] });
    expect(reconcile(expects, ok)).toHaveLength(0);
    const wrongSpender = effects({ approvals: [{ token: TOKEN, spender: A, amount: "1" }] });
    expect(reconcile(expects, wrongSpender)[0]?.code).toBe("UNDECLARED_APPROVAL");
    const tooMuch = effects({ approvals: [{ token: TOKEN, spender: B, amount: "51" }] });
    expect(reconcile(expects, tooMuch)[0]?.code).toBe("APPROVAL_EXCEEDS_MAX");
  });

  it("declared outflow with no inflow is legitimate; unmet minimum is not", () => {
    expect(
      reconcile(
        { out: [{ token: NATIVE, amountMax: "10" }] },
        effects({ assetsOut: [{ token: NATIVE, amount: "10" }] }),
      ),
    ).toHaveLength(0);
    expect(
      reconcile(
        { in: [{ token: TOKEN, amountMin: "5" }] },
        effects({ assetsIn: [{ token: TOKEN, amount: "4" }] }),
      )[0]?.code,
    ).toBe("MIN_INFLOW_NOT_MET");
    expect(
      reconcile(
        {
          nfts: [
            { collection: TOKEN, count: 1, direction: "in" },
            { collection: TOKEN, count: 1, direction: "in" },
          ],
        },
        effects({
          nftsIn: [{ collection: TOKEN, count: 1, items: [{ tokenId: "7" }] }],
        }),
      )[0]?.code,
    ).toBe("MIN_INFLOW_NOT_MET");
    expect(
      reconcile(
        {
          nfts: [
            {
              collection: TOKEN,
              count: 3,
              direction: "in",
              items: [{ tokenId: "7" }],
            },
          ],
        },
        effects({
          nftsIn: [
            {
              collection: TOKEN,
              count: 3,
              items: [{ tokenId: "7" }, { tokenId: "8" }, { tokenId: "9" }],
            },
          ],
        }),
      ),
    ).toEqual([]);
  });

  it("requires declared NFT inflow counts and known token ids", () => {
    const actual = effects({
      nftsIn: [
        {
          collection: TOKEN,
          count: 2,
          items: [{ tokenId: "7" }, { tokenId: "8", amount: "3" }],
        },
      ],
    });
    expect(
      reconcile(
        {
          nfts: [
            {
              collection: TOKEN,
              count: 2,
              direction: "in",
              items: [{ tokenId: "7" }, { tokenId: "8" }],
            },
          ],
        },
        actual,
      ),
    ).toEqual([]);
    expect(
      reconcile({ nfts: [{ collection: TOKEN, count: 3, direction: "in" }] }, actual)[0]?.code,
    ).toBe("MIN_INFLOW_NOT_MET");
    expect(
      reconcile(
        {
          nfts: [
            {
              collection: TOKEN,
              count: 2,
              direction: "in",
              items: [{ tokenId: "7" }, { tokenId: "9" }],
            },
          ],
        },
        actual,
      )[0]?.code,
    ).toBe("MIN_INFLOW_NOT_MET");
  });
});

describe("effects accumulator", () => {
  it("sees native flows in call frames — they emit no events", () => {
    const acc = new EffectsAccumulator(A);
    acc.addFrame({
      type: "CALL",
      from: A,
      to: B,
      value: toHex(5n),
      calls: [{ type: "CALL", from: B, to: A, value: toHex(2n) }], // partial refund
    });
    const summary = acc.summary();
    expect(summary.assetsOut).toEqual([{ token: NATIVE, amount: "5" }]);
    expect(summary.assetsIn).toEqual([{ token: NATIVE, amount: "2" }]);
    expect(summary.recipients).toEqual([B]);
  });

  it("ignores value echoed on delegatecall frames", () => {
    const acc = new EffectsAccumulator(A);
    acc.addFrame({ type: "DELEGATECALL", from: A, to: B, value: toHex(5n) });
    expect(acc.summary().assetsOut).toHaveLength(0);
  });

  it("surfaces ApprovalForAll operator grants, and reconcile always warns", () => {
    const acc = new EffectsAccumulator(A);
    acc.addFrame({
      type: "CALL",
      from: A,
      to: TOKEN,
      logs: [
        {
          address: TOKEN,
          topics: [APPROVAL_FOR_ALL_TOPIC, padHex(A, { size: 32 }), padHex(B, { size: 32 })],
          data: padHex("0x01", { size: 32 }),
        },
      ],
    });
    const summary = acc.summary();
    expect(summary.nftApprovals).toEqual([{ collection: TOKEN, operator: B }]);
    // Operator grants hand over a whole collection — never declarable.
    const warnings = reconcile({}, summary);
    expect(warnings.map((w) => w.code)).toContain("NFT_OPERATOR_GRANTED");
  });

  it("extracts distinct ERC-1155 ids and reconciles each id's exact units", () => {
    const huge = 2n ** 255n;
    const acc = new EffectsAccumulator(A);
    acc.addFrame({
      type: "CALL",
      from: A,
      to: TOKEN,
      logs: [
        {
          address: TOKEN,
          topics: [
            TRANSFER_SINGLE_TOPIC,
            padHex(A, { size: 32 }),
            padHex(A, { size: 32 }),
            padHex(B, { size: 32 }),
          ],
          data: encodeAbiParameters([{ type: "uint256" }, { type: "uint256" }], [42n, huge]),
        },
        {
          address: TOKEN,
          topics: [
            TRANSFER_SINGLE_TOPIC,
            padHex(A, { size: 32 }),
            padHex(A, { size: 32 }),
            padHex(B, { size: 32 }),
          ],
          data: encodeAbiParameters([{ type: "uint256" }, { type: "uint256" }], [43n, 7n]),
        },
        {
          address: TOKEN,
          topics: [
            TRANSFER_BATCH_TOPIC,
            padHex(B, { size: 32 }),
            padHex(B, { size: 32 }),
            padHex(A, { size: 32 }),
          ],
          data: encodeAbiParameters(
            [{ type: "uint256[]" }, { type: "uint256[]" }],
            [
              [1n, 1n, 2n],
              [2n, 4n, 3n],
            ],
          ),
        },
      ],
    });
    const summary = acc.summary();
    expect(summary.nftsOut).toEqual([
      {
        collection: TOKEN,
        count: 2,
        items: [
          { tokenId: "42", amount: huge.toString() },
          { tokenId: "43", amount: "7" },
        ],
      },
    ]);
    expect(summary.nftsIn).toEqual([
      {
        collection: TOKEN,
        count: 2,
        items: [
          { tokenId: "1", amount: "6" },
          { tokenId: "2", amount: "3" },
        ],
      },
    ]);
    expect(
      reconcile(
        {
          nfts: [
            {
              collection: TOKEN,
              count: 2,
              direction: "out",
              items: [
                { tokenId: "42", amountMax: huge.toString() },
                { tokenId: "43", amountMax: "7" },
              ],
            },
          ],
        },
        summary,
      ),
    ).toEqual([]);
    expect(
      reconcile(
        {
          nfts: [
            {
              collection: TOKEN,
              count: 1,
              direction: "out",
              items: [{ tokenId: "42", amountMax: huge.toString() }],
            },
            {
              collection: TOKEN,
              count: 1,
              direction: "out",
              items: [{ tokenId: "43", amountMax: "7" }],
            },
          ],
        },
        summary,
      ),
    ).toEqual([]);
    expect(
      reconcile(
        {
          nfts: [
            {
              collection: TOKEN,
              count: 1,
              direction: "out",
              items: [{ tokenId: "42", amountMax: (huge / 2n).toString() }],
            },
            {
              collection: TOKEN,
              count: 1,
              direction: "out",
              items: [{ tokenId: "42", amountMax: (huge / 2n).toString() }],
            },
          ],
        },
        {
          ...summary,
          nftsOut: [
            {
              collection: TOKEN,
              count: 1,
              items: [{ tokenId: "42", amount: huge.toString() }],
            },
          ],
        },
      ),
    ).toEqual([]);
    expect(
      reconcile(
        {
          nfts: [
            {
              collection: TOKEN,
              count: 2,
              direction: "out",
              items: [
                { tokenId: "42", amountMax: huge.toString() },
                { tokenId: "43", amountMax: "6" },
              ],
            },
          ],
        },
        summary,
      )[0]?.code,
    ).toBe("NFT_OUT_EXCEEDS_MAX");

    const missingCap = reconcile(
      {
        nfts: [
          {
            collection: TOKEN,
            count: 2,
            direction: "out",
            items: [{ tokenId: "42" }, { tokenId: "43", amountMax: "7" }],
          },
        ],
      },
      summary,
    );
    expect(missingCap.map((warning) => warning.code)).toContain("UNDECLARED_NFT_OUT");
    expect(missingCap[0]?.message).toMatch(/amount cap/);

    const wrongId = reconcile(
      {
        nfts: [
          {
            collection: TOKEN,
            count: 2,
            direction: "out",
            items: [
              { tokenId: "42", amountMax: huge.toString() },
              { tokenId: "44", amountMax: "7" },
            ],
          },
        ],
      },
      summary,
    );
    expect(wrongId.map((warning) => warning.code)).toContain("UNDECLARED_NFT_OUT");
    expect(wrongId.some((warning) => warning.message.includes("token id 43"))).toBe(true);
  });

  it("extracts and reconciles the ERC-721 token id", () => {
    const acc = new EffectsAccumulator(A);
    acc.addFrame({
      type: "CALL",
      from: A,
      to: TOKEN,
      logs: [
        {
          address: TOKEN,
          topics: [
            TRANSFER_TOPIC,
            padHex(A, { size: 32 }),
            padHex(B, { size: 32 }),
            padHex(toHex(99n), { size: 32 }),
          ],
          data: "0x",
        },
      ],
    });
    const summary = acc.summary();
    expect(summary.nftsOut).toEqual([{ collection: TOKEN, count: 1, items: [{ tokenId: "99" }] }]);
    expect(
      reconcile(
        {
          nfts: [
            {
              collection: TOKEN,
              count: 1,
              direction: "out",
              items: [{ tokenId: "99" }],
            },
          ],
        },
        summary,
      ),
    ).toEqual([]);
  });

  it("ignores NFT self-transfers and zero-unit ERC-1155 events", () => {
    const acc = new EffectsAccumulator(A);
    acc.addFrame({
      type: "CALL",
      from: A,
      to: TOKEN,
      logs: [
        {
          address: TOKEN,
          topics: [
            TRANSFER_TOPIC,
            padHex(A, { size: 32 }),
            padHex(A, { size: 32 }),
            padHex(toHex(7n), { size: 32 }),
          ],
          data: "0x",
        },
        {
          address: TOKEN,
          topics: [
            TRANSFER_SINGLE_TOPIC,
            padHex(B, { size: 32 }),
            padHex(A, { size: 32 }),
            padHex(A, { size: 32 }),
          ],
          data: encodeAbiParameters([{ type: "uint256" }, { type: "uint256" }], [8n, 2n]),
        },
        {
          address: TOKEN,
          topics: [
            TRANSFER_BATCH_TOPIC,
            padHex(B, { size: 32 }),
            padHex(A, { size: 32 }),
            padHex(A, { size: 32 }),
          ],
          data: encodeAbiParameters([{ type: "uint256[]" }, { type: "uint256[]" }], [[9n], [3n]]),
        },
        {
          address: TOKEN,
          topics: [
            TRANSFER_SINGLE_TOPIC,
            padHex(A, { size: 32 }),
            padHex(A, { size: 32 }),
            padHex(B, { size: 32 }),
          ],
          data: encodeAbiParameters([{ type: "uint256" }, { type: "uint256" }], [10n, 0n]),
        },
      ],
    });

    expect(acc.summary().nftsOut).toEqual([]);
    expect(acc.summary().nftsIn).toEqual([]);
  });
});

// The selectors are DERIVED from signatures at module load; these pins are
// the counterpart guard: a typo'd signature diverges from the canonical hash
// and screams here instead of going silently blind in reconciliation.
describe("event topic derivation", () => {
  it("derived selectors match the canonical hashes", () => {
    expect(TRANSFER_TOPIC).toBe(
      "0xddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef",
    );
    expect(APPROVAL_TOPIC).toBe(
      "0x8c5be1e5ebec7d5bd14f71427d1e84f3dd0314c0f7b2291e5b200ac8c7c3b925",
    );
    expect(APPROVAL_FOR_ALL_TOPIC).toBe(
      "0x17307eab39ab6107e8899845ad3d59bd9653f200f220920489ca2b5937696c31",
    );
    expect(TRANSFER_SINGLE_TOPIC).toBe(
      "0xc3d58168c5ae7397731d063d5bbf3d657854427343f4c083240f7aacaa2d0f62",
    );
    expect(TRANSFER_BATCH_TOPIC).toBe(
      "0x4a39dc06d4c0dbc64b70af90fd698a233a518aa5d07e595d983b8c0526c8f7fb",
    );
    expect(WETH_DEPOSIT_TOPIC).toBe(
      "0xe1fffcc4923d04b559f4d29a8bfc6cda04eb5b0d3c460751c2402c5c5cc9109c",
    );
    expect(WETH_WITHDRAWAL_TOPIC).toBe(
      "0x7fcf532c15f0a6db0bd6d0e038bea71d30d808c7d98cb3bf7268a95bf5081b65",
    );
  });
});

describe("override merging", () => {
  it("carries balance, storage writes, and storage deletions forward", () => {
    const overrides: StateOverrides = {};
    mergeDiff(overrides, {
      pre: { [A]: { balance: "0x10", storage: { "0x01": "0xaa", "0x02": "0xbb" } } },
      post: { [A]: { balance: "0x05", nonce: 2, storage: { "0x01": "0xcc" } } },
    });
    const entry = overrides[A.toLowerCase() as Address];
    expect(entry?.balance).toBe("0x05");
    expect(entry?.nonce).toBe("0x2");
    expect(entry?.stateDiff?.["0x01"]).toBe("0xcc");
    // slot 0x02 present in pre but not post → cleared
    expect(BigInt(entry?.stateDiff?.["0x02"] ?? "0x1")).toBe(0n);
  });
});

// Live e2e against Monad mainnet: Moss never signs or sends, so this runs with
// zero funds. debug_traceCall does not enforce sender balance for value moves.
// Set MOSS_SKIP_E2E=1 in offline environments; CI always runs these.
describe.skipIf(!!process.env.MOSS_SKIP_E2E)("trace simulator (Monad mainnet e2e)", () => {
  it("simulates a native transfer plan and reconciles cleanly", { timeout: 60_000 }, async () => {
    const runtime = createRuntime({ rpcUrl: "https://rpc.monad.xyz", chainId: 143 });
    const simulator = createTraceSimulator(runtime);
    const amount = 10n ** 18n;

    const clean = finalizePlan(
      plan([{ to: B, data: "0x", value: amount }], {
        out: [{ token: NATIVE, amountMax: amount }],
      }),
      {
        protocol: "test",
        method: "send",
        verb: "transfer",
        chainId: 143,
        account: A,
        intent: "Send 1 MON",
        declaredRisk: ["fundOut"],
      },
    );

    const { results } = await simulator.simulate([clean]);
    expect(results[0]?.reverted).toBe(false);
    expect(results[0]?.planHashValid).toBe(true);
    expect(results[0]?.warnings).toHaveLength(0);
    expect(results[0]?.effects.assetsOut).toEqual([{ token: NATIVE, amount: amount.toString() }]);
  });

  it("flags tampered plans and undeclared outflows", { timeout: 60_000 }, async () => {
    const runtime = createRuntime({ rpcUrl: "https://rpc.monad.xyz", chainId: 143 });
    const simulator = createTraceSimulator(runtime);
    const amount = 10n ** 18n;

    const undeclared = finalizePlan(
      plan([{ to: B, data: "0x", value: amount }]), // no expects at all
      {
        protocol: "test",
        method: "send",
        verb: "transfer",
        chainId: 143,
        account: A,
        intent: "Send 1 MON",
        declaredRisk: ["fundOut"],
      },
    );
    const tampered = { ...undeclared, txs: [{ ...undeclared.txs[0], value: toHex(2n * amount) }] };

    // biome-ignore lint/suspicious/noExplicitAny: intentional structural tamper
    const { results } = await simulator.simulate([tampered as any]);
    const codes = results[0]?.warnings.map((w) => w.code) ?? [];
    expect(codes).toContain("PLAN_TAMPERED");
    expect(codes).toContain("UNDECLARED_OUTFLOW");
  });
});
