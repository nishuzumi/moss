import {
  Address,
  type AddressValue,
  type Handle,
  type InferParams,
  type ParamsSpec,
  Protocol,
  Query,
  UnsignedIntegerString,
} from "@themoss/core";
import { NadFunLensAbi } from "./abis/lens.js";

// Official Monad mainnet Lens address.
// Source: Naddotfun/contract-v3-abi README at commit
// 35ca13bd26bb2a5418698b13ddcd07008eecc30a.
// Live verification checks deployed bytecode and read behavior.
export const NADFUN_LENS_ADDRESS = "0x7e78A8DE94f21804F7a17F4E8BF9EC2c872187ea" as const;

const PositiveBaseUnitAmount = UnsignedIntegerString.refine(
  (value) => BigInt(value) > 0n,
  "Amount must be greater than zero.",
).describe("A positive base-10 integer amount in the asset's smallest unit.");

const quoteBuyParams = {
  token: {
    type: Address,
    description: "The Nad.fun token to buy.",
  },
  amountIn: {
    type: PositiveBaseUnitAmount,
    description: "Exact input amount of native MON for the buy, in wei.",
  },
} satisfies ParamsSpec;

const quoteSellParams = {
  token: {
    type: Address,
    description: "The Nad.fun token to sell.",
  },
  amountIn: {
    type: PositiveBaseUnitAmount,
    description: "Exact input amount of the Nad.fun token, in its smallest base units.",
  },
} satisfies ParamsSpec;

const statusParams = {
  token: {
    type: Address,
    description: "Nad.fun token whose launch status is requested.",
  },
} satisfies ParamsSpec;

export interface NadFunBuyQuote {
  side: "buy";
  token: AddressValue;
  amountIn: string;
  router: AddressValue;
  amountOut: string;
}

export interface NadFunSellQuote {
  side: "sell";
  token: AddressValue;
  amountIn: string;
  router: AddressValue;
  amountOut: string;
}

export type NadFunQuote = NadFunBuyQuote | NadFunSellQuote;

export interface NadFunTokenStatus {
  token: AddressValue;
  graduated: boolean;
  locked: boolean;
  progressBps: string;
}

@Protocol({
  name: "nadfun",
  category: "dex",
  description: "Nad.fun Lens quotes token buys and sells and reads launch status on Monad mainnet.",
  contracts: {
    lens: {
      abi: NadFunLensAbi,
      addr: NADFUN_LENS_ADDRESS,
    },
  },
  labels: {
    Lens: NADFUN_LENS_ADDRESS,
  },
})
export class NadFun {
  declare lens: Handle<typeof NadFunLensAbi>;

  @Query({
    intent: "Quote a Nad.fun token buy through the protocol-selected router",
    params: quoteBuyParams,
    tags: ["quote", "buy", "bonding-curve"],
  })
  async quoteBuy(params: InferParams<typeof quoteBuyParams>): Promise<NadFunBuyQuote> {
    const [router, amountOut] = await this.lens.read.getAmountOut([
      params.token,
      BigInt(params.amountIn),
      true,
    ]);

    return {
      side: "buy",
      token: params.token,
      amountIn: params.amountIn,
      router,
      amountOut: amountOut.toString(),
    };
  }

  @Query({
    intent: "Quote a Nad.fun token sell through the protocol-selected router",
    params: quoteSellParams,
    tags: ["quote", "sell", "bonding-curve"],
  })
  async quoteSell(params: InferParams<typeof quoteSellParams>): Promise<NadFunSellQuote> {
    const [router, amountOut] = await this.lens.read.getAmountOut([
      params.token,
      BigInt(params.amountIn),
      false,
    ]);

    return {
      side: "sell",
      token: params.token,
      amountIn: params.amountIn,
      router,
      amountOut: amountOut.toString(),
    };
  }

  @Query({
    intent: "Read Nad.fun token graduation, lock, and bonding-curve progress status",
    params: statusParams,
    tags: ["status", "bonding-curve"],
  })
  async tokenStatus(params: InferParams<typeof statusParams>): Promise<NadFunTokenStatus> {
    const [graduated, locked, progress] = await Promise.all([
      this.lens.read.isGraduated([params.token]),
      this.lens.read.isLocked([params.token]),
      this.lens.read.getProgress([params.token]),
    ]);

    return {
      token: params.token,
      graduated,
      locked,
      progressBps: progress.toString(),
    };
  }
}
