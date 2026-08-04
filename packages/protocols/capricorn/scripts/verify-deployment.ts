/**
 * On-chain verification of the Capricorn CLMM deployment.
 *
 * ADR 0007 requires every fixed address to cite a canonical source and carry an
 * on-chain check for deployed bytecode. Capricorn is not verified on MonadScan,
 * so the explorer tier used by `packages/protocols/pancakeswap` is unavailable.
 * This check therefore also covers the interface: it confirms the deployed
 * bytecode exposes the exact selectors the adapter will call, which an explorer
 * ABI would otherwise have established.
 *
 * Run with: pnpm --filter @themoss/protocol-capricorn verify:deployment
 */
import { createPublicClient, http, keccak256, parseAbi, slice, toHex } from "viem";

const RPC_URL = process.env.MOSS_RPC_URL ?? "https://rpc.monad.xyz";
const MONAD_CHAIN_ID = 143;

/** Source: https://capricorn.exchange/, as filed in nishuzumi/moss#150. */
const CONTRACTS = {
  SwapRouter: "0xdac97b6a3951641B177283028A8f428332333071",
  QuoterV2: "0xB430EDD2b54cdB3B25703fb3342ca3a88663A04D",
  CapricornCLFactory: "0x6B5F564339DbAD6b780249827f2198a841FEB7F3",
} as const;

/** WMON/USDC, fee 3000. The only tier with meaningful depth at time of filing. */
const TEST_POOL = "0x878750488f613e043d016f99913e639e58bc1e52";
const WMON = "0x3bd359C1119dA7Da1D913D1C4D2B7c461115433A";
const USDC = "0x754704Bc059F8C67012fEd69BC8A327a5aafb603";

/**
 * Every selector the v1 adapter will call. An absent selector means the
 * interface assumption is wrong and the adapter would revert at runtime.
 */
const SELECTORS: { signature: string; contract: keyof typeof CONTRACTS }[] = [
  {
    signature:
      "exactInputSingle((address,address,uint24,address,uint256,uint256,uint256,uint160))",
    contract: "SwapRouter",
  },
  { signature: "WETH9()", contract: "SwapRouter" },
  {
    signature: "quoteExactInputSingle((address,address,uint256,uint24,uint160))",
    contract: "QuoterV2",
  },
  { signature: "getPool(address,address,uint24)", contract: "CapricornCLFactory" },
];

const poolAbi = parseAbi([
  "function token0() view returns (address)",
  "function token1() view returns (address)",
  "function fee() view returns (uint24)",
  "function liquidity() view returns (uint128)",
]);

const factoryAbi = parseAbi(["function getPool(address,address,uint24) view returns (address)"]);

const quoterAbi = parseAbi([
  "function quoteExactInputSingle((address tokenIn,address tokenOut,uint256 amountIn,uint24 fee,uint160 sqrtPriceLimitX96)) returns (uint256 amountOut,uint160 sqrtPriceX96After,uint32 initializedTicksCrossed,uint256 gasEstimate)",
]);

function selectorOf(signature: string): `0x${string}` {
  return slice(keccak256(toHex(signature)), 0, 4);
}

const client = createPublicClient({ transport: http(RPC_URL) });
let failures = 0;

function check(label: string, ok: boolean, detail: string): void {
  console.log(`${ok ? "  ok  " : "  FAIL"}  ${label.padEnd(46)} ${detail}`);
  if (!ok) failures += 1;
}

const chainId = await client.getChainId();
check("chain is Monad mainnet", chainId === MONAD_CHAIN_ID, `chain id ${chainId}`);

console.log("\ndeployed bytecode");
for (const [name, address] of Object.entries(CONTRACTS)) {
  const code = await client.getCode({ address });
  const size = code && code !== "0x" ? (code.length - 2) / 2 : 0;
  check(name, size > 0, `${address} — ${size} bytes`);
}

console.log("\nselectors present in deployed bytecode");
for (const { signature, contract } of SELECTORS) {
  const selector = selectorOf(signature);
  const code = await client.getCode({ address: CONTRACTS[contract] });
  check(
    `${contract}.${signature.split("(")[0]}`,
    Boolean(code?.includes(selector.slice(2))),
    `${selector}`,
  );
}

console.log("\ntest pool identity");
const [token0, token1, fee, liquidity] = await Promise.all([
  client.readContract({ address: TEST_POOL, abi: poolAbi, functionName: "token0" }),
  client.readContract({ address: TEST_POOL, abi: poolAbi, functionName: "token1" }),
  client.readContract({ address: TEST_POOL, abi: poolAbi, functionName: "fee" }),
  client.readContract({ address: TEST_POOL, abi: poolAbi, functionName: "liquidity" }),
]);
check("token0 is WMON", token0.toLowerCase() === WMON.toLowerCase(), token0);
check("token1 is USDC", token1.toLowerCase() === USDC.toLowerCase(), token1);
check("fee tier is 3000", fee === 3000, String(fee));
check("pool has liquidity", liquidity > 0n, liquidity.toString());

// The factory agreeing is what makes this the canonical pool rather than some
// pool that merely holds the right pair.
const derived = await client.readContract({
  address: CONTRACTS.CapricornCLFactory,
  abi: factoryAbi,
  functionName: "getPool",
  args: [WMON, USDC, 3000],
});
check(
  "factory derives the same pool",
  derived.toLowerCase() === TEST_POOL.toLowerCase(),
  derived,
);

console.log("\nquoter responds");
// QuoterV2 is non-view in the Uniswap V3 periphery it derives from, so the
// quote has to be simulated rather than read.
const { result } = await client.simulateContract({
  address: CONTRACTS.QuoterV2,
  abi: quoterAbi,
  functionName: "quoteExactInputSingle",
  args: [{ tokenIn: WMON, tokenOut: USDC, amountIn: 10n ** 18n, fee: 3000, sqrtPriceLimitX96: 0n }],
});
check("1 WMON quotes to a positive amount", result[0] > 0n, `${result[0]} USDC base units`);

console.log("");
if (failures > 0) {
  console.error(`${failures} check(s) failed.`);
  process.exitCode = 1;
} else {
  console.log("every check passed.");
}
