import type { Abi } from "abitype";
import { describe, expect, it } from "vitest";
import { compareDeployedAbi } from "../src/compare-abi.js";

const transfer = {
  type: "function",
  name: "transfer",
  inputs: [
    { name: "to", type: "address", internalType: "address" },
    { name: "amount", type: "uint256", internalType: "uint256" },
  ],
  outputs: [{ name: "", type: "bool", internalType: "bool" }],
  stateMutability: "nonpayable",
} as const;

const transferEvent = {
  type: "event",
  name: "Transfer",
  anonymous: false,
  inputs: [
    { name: "from", type: "address", indexed: true },
    { name: "to", type: "address", indexed: true },
    { name: "value", type: "uint256", indexed: false },
  ],
} as const;

const denied = { type: "error", name: "Denied", inputs: [{ type: "address" }] } as const;

const reference: Abi = [transfer, transferEvent, denied];

describe("compareDeployedAbi", () => {
  it("passes when ABIs differ only in top-level order, names, and dropped metadata", () => {
    const actual: Abi = [
      denied,
      { ...transferEvent, inputs: transferEvent.inputs.map((p) => ({ ...p, name: `x${p.name}` })) },
      {
        type: "function",
        name: "transfer",
        // Parameter names, internalType, gas, and legacy flags are not
        // on-chain semantics and must not trip the comparison.
        inputs: [
          { name: "dst", type: "address" },
          { name: "wad", type: "uint256" },
        ],
        outputs: [{ name: "ok", type: "bool" }],
        stateMutability: "nonpayable",
        gas: 51_000,
        constant: false,
        payable: false,
      } as Abi[number],
    ];
    expect(compareDeployedAbi(reference, actual)).toEqual([]);
  });

  it("excludes constructors from both sides", () => {
    const withConstructor: Abi = [
      { type: "constructor", stateMutability: "nonpayable", inputs: [{ type: "address" }] },
      transfer,
    ];
    expect(compareDeployedAbi(withConstructor, [transfer])).toEqual([]);
    expect(compareDeployedAbi([transfer], withConstructor)).toEqual([]);
  });

  it("reports expected items missing from the actual ABI", () => {
    expect(compareDeployedAbi(reference, [transfer, denied])).toEqual([
      { kind: "missing", signature: "event Transfer(address,address,uint256)" },
    ]);
  });

  it("reports actual-only items unless individually allowlisted", () => {
    const extra: Abi = [
      ...reference,
      { type: "function", name: "pause", inputs: [], outputs: [], stateMutability: "nonpayable" },
    ];
    expect(compareDeployedAbi(reference, extra)).toEqual([
      { kind: "unexpected", signature: "function pause()" },
    ]);
    expect(
      compareDeployedAbi(reference, extra, { allowedActualOnly: ["function pause()"] }),
    ).toEqual([]);
  });

  it.each([
    [
      "output types",
      { ...transfer, outputs: [{ name: "", type: "uint256" }] },
      /outputs=\(bool\).*outputs=\(uint256\)/,
    ],
    ["state mutability", { ...transfer, stateMutability: "payable" }, /nonpayable.*payable/],
  ] as const)("reports mismatched function %s", (_name, changed, detail) => {
    const issues = compareDeployedAbi([transfer], [changed as Abi[number]]);
    expect(issues).toHaveLength(1);
    expect(issues[0]).toMatchObject({
      kind: "mismatch",
      signature: "function transfer(address,uint256)",
    });
    expect(issues[0]?.detail).toMatch(detail);
  });

  it.each([
    [
      "indexed layout",
      {
        ...transferEvent,
        inputs: transferEvent.inputs.map((p, i) => ({ ...p, indexed: i === 2 })),
      },
      /indexed=ii-.*indexed=--i/,
    ],
    ["anonymous flag", { ...transferEvent, anonymous: true }, /anonymous=false.*anonymous=true/],
  ] as const)("reports mismatched event %s", (_name, changed, detail) => {
    const issues = compareDeployedAbi([transferEvent], [changed as Abi[number]]);
    expect(issues).toHaveLength(1);
    expect(issues[0]?.kind).toBe("mismatch");
    expect(issues[0]?.detail).toMatch(detail);
  });

  it("keeps overloads distinct by canonical input types", () => {
    const overload = { ...transfer, inputs: [{ name: "to", type: "address" }] } as Abi[number];
    expect(compareDeployedAbi([transfer, overload], [transfer, overload])).toEqual([]);
    expect(compareDeployedAbi([transfer, overload], [transfer])).toEqual([
      { kind: "missing", signature: "function transfer(address)" },
    ]);
  });

  it("treats nested parameter and tuple-component order as identity", () => {
    const tupleFn = (components: readonly { type: string }[]) =>
      ({
        type: "function",
        name: "quote",
        inputs: [{ name: "order", type: "tuple", components }],
        outputs: [],
        stateMutability: "view",
      }) as Abi[number];
    const issues = compareDeployedAbi(
      [tupleFn([{ type: "address" }, { type: "uint96" }])],
      [tupleFn([{ type: "uint96" }, { type: "address" }])],
    );
    expect(issues).toEqual([
      { kind: "missing", signature: "function quote((address,uint96))" },
      { kind: "unexpected", signature: "function quote((uint96,address))" },
    ]);
  });

  it("expands tuple arrays and nested tuples with their suffixes", () => {
    const orders = {
      type: "function",
      name: "batch",
      inputs: [
        {
          name: "orders",
          type: "tuple[]",
          components: [
            { name: "leg", type: "tuple", components: [{ type: "address" }, { type: "bool" }] },
            { name: "sizes", type: "uint96[2]" },
          ],
        },
      ],
      outputs: [],
      stateMutability: "nonpayable",
    } as Abi[number];
    expect(compareDeployedAbi([orders], [])).toEqual([
      { kind: "missing", signature: "function batch(((address,bool),uint96[2])[])" },
    ]);
  });

  it("keeps same-name same-inputs items of different kinds distinct", () => {
    const fooFn = {
      type: "function",
      name: "Foo",
      inputs: [{ type: "address" }],
      outputs: [],
      stateMutability: "view",
    } as Abi[number];
    const fooEvent = { type: "event", name: "Foo", inputs: [{ type: "address" }] } as Abi[number];
    expect(compareDeployedAbi([fooFn, fooEvent], [fooFn, fooEvent])).toEqual([]);
    expect(compareDeployedAbi([fooFn, fooEvent], [fooFn])).toEqual([
      { kind: "missing", signature: "event Foo(address)" },
    ]);
  });

  it("treats multi-output order and error input types as identity-relevant", () => {
    const quote = (outputs: readonly { type: string }[]) =>
      ({
        type: "function",
        name: "limits",
        inputs: [],
        outputs,
        stateMutability: "view",
      }) as Abi[number];
    const swapped = compareDeployedAbi(
      [quote([{ type: "uint96" }, { type: "address" }])],
      [quote([{ type: "address" }, { type: "uint96" }])],
    );
    expect(swapped).toMatchObject([{ kind: "mismatch", signature: "function limits()" }]);

    expect(
      compareDeployedAbi(
        [{ type: "error", name: "Denied", inputs: [{ type: "address" }] }],
        [{ type: "error", name: "Denied", inputs: [{ type: "uint256" }] }],
      ),
    ).toEqual([
      { kind: "missing", signature: "error Denied(address)" },
      { kind: "unexpected", signature: "error Denied(uint256)" },
    ]);
  });

  it("compares fallback and receive mutability", () => {
    const payableFallback: Abi = [{ type: "fallback", stateMutability: "payable" }];
    const nonpayableFallback: Abi = [{ type: "fallback", stateMutability: "nonpayable" }];
    expect(compareDeployedAbi(payableFallback, payableFallback)).toEqual([]);
    expect(compareDeployedAbi(payableFallback, nonpayableFallback)).toMatchObject([
      { kind: "mismatch", signature: "fallback" },
    ]);

    const receive: Abi = [{ type: "receive", stateMutability: "payable" }];
    expect(compareDeployedAbi(receive, receive)).toEqual([]);
    expect(compareDeployedAbi(receive, [])).toEqual([{ kind: "missing", signature: "receive" }]);
  });

  it("flags duplicated canonical signatures on either side", () => {
    expect(compareDeployedAbi([transfer, { ...transfer }], [transfer])).toEqual([
      {
        kind: "duplicate",
        signature: "function transfer(address,uint256)",
        detail: "duplicated in the expected ABI",
      },
    ]);
    expect(compareDeployedAbi([transfer], [transfer, { ...transfer }])).toEqual([
      {
        kind: "duplicate",
        signature: "function transfer(address,uint256)",
        detail: "duplicated in the actual ABI",
      },
    ]);
  });
});
