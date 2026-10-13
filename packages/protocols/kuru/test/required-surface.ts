import { getAbiItem, toEventSelector, toFunctionSelector } from "viem";
import { KuruOrderbookAbi, KuruRouterAbi } from "../src/abis/kuru.js";

/** Derived from complete vendored ABI entries, never hand-maintained signatures/topics. */
export const requiredOrderbookSurface = [
  ...(["placeAndExecuteMarketBuy", "placeAndExecuteMarketSell"] as const).map((name) => ({
    name,
    hex: toFunctionSelector(getAbiItem({ abi: KuruOrderbookAbi, name })).slice(2),
  })),
  ...(["Trade", "FlipOrderUpdated", "FlippedOrderCreated"] as const).map((name) => ({
    name,
    hex: toEventSelector(getAbiItem({ abi: KuruOrderbookAbi, name })).slice(2),
  })),
];

export const requiredRouterSurface = [
  ...(["anyToAnySwap", "verifiedMarket", "orderBookImplementation"] as const).map((name) => ({
    name,
    hex: toFunctionSelector(getAbiItem({ abi: KuruRouterAbi, name })).slice(2),
  })),
  {
    name: "KuruRouterSwap",
    hex: toEventSelector(getAbiItem({ abi: KuruRouterAbi, name: "KuruRouterSwap" })).slice(2),
  },
];
