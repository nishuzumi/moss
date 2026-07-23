import { type AddressValue, type Hex, transaction } from "@themoss/core";
import { encodeFunctionData, zeroAddress } from "viem";
import { PendleRouterAbi } from "./abis/pendle.js";
import { PENDLE_ROUTER_ADDRESS } from "./addresses.js";
import type { PendleApprovalRequirement, PendleQuote, PendleSwapPlan } from "./types.js";

// Pendle SwapType.NONE: no external aggregator swap, so SY is minted/redeemed directly from the token.
const EMPTY_SWAP_DATA = {
  swapType: 0,
  extRouter: zeroAddress,
  extCalldata: "0x" as Hex,
  needScale: false,
} as const;

// No limit orders: the Router fills entirely against the market.
const EMPTY_LIMIT = {
  limitRouter: zeroAddress,
  epsSkipMarket: 0n,
  normalFills: [],
  flashFills: [],
  optData: "0x" as Hex,
} as const;

/**
 * Encodes one direct Pendle Router swap for a Stage 5 quote and states the ERC20 approval it needs.
 *
 * v1 uses the simple route only: SY is minted from (or redeemed to) the market underlying with no
 * aggregator, limit order, or native value. `minOut` and `ApproxParams` are taken from the quote so
 * the executed transaction matches what was quoted.
 */
export function buildPendleSwapPlan(quote: PendleQuote, receiver: AddressValue): PendleSwapPlan {
  const approval: PendleApprovalRequirement = Object.freeze({
    token: quote.tokenIn,
    spender: PENDLE_ROUTER_ADDRESS,
    amount: quote.amountIn,
  });

  const data =
    quote.direction === "buy-pt"
      ? encodeFunctionData({
          abi: PendleRouterAbi,
          functionName: "swapExactTokenForPt",
          args: [
            receiver,
            quote.market,
            quote.minOut,
            quote.approxParams,
            {
              tokenIn: quote.tokenIn,
              netTokenIn: quote.amountIn,
              tokenMintSy: quote.tokenIn,
              pendleSwap: zeroAddress,
              swapData: EMPTY_SWAP_DATA,
            },
            EMPTY_LIMIT,
          ],
        })
      : encodeFunctionData({
          abi: PendleRouterAbi,
          functionName: "swapExactPtForToken",
          args: [
            receiver,
            quote.market,
            quote.amountIn,
            {
              tokenOut: quote.tokenOut,
              minTokenOut: quote.minOut,
              tokenRedeemSy: quote.tokenOut,
              pendleSwap: zeroAddress,
              swapData: EMPTY_SWAP_DATA,
            },
            EMPTY_LIMIT,
          ],
        });

  return Object.freeze({
    direction: quote.direction,
    approval,
    transaction: transaction(receiver, PENDLE_ROUTER_ADDRESS, { data, value: 0n }),
  });
}
