export const ADDRESS = "0x3bd359C1119dA7Da1D913D1C4D2B7c461115433A";
export const KEY = "test-monadscan-api-key-DO-NOT-USE";
export const SPECIAL_KEY = "secret/key";
export const ENCODED_SPECIAL_KEY = new URLSearchParams({ apikey: SPECIAL_KEY })
  .toString()
  .slice("apikey=".length);
export const NOW = new Date("2026-07-19T00:00:00Z");
export const ABI = [
  {
    type: "function",
    name: "balanceOf",
    inputs: [{ name: "account", type: "address" }],
    outputs: [{ name: "", type: "uint256" }],
    stateMutability: "view",
  },
] as const;

export function response(body: unknown, status = 200): Response {
  return new Response(typeof body === "string" ? body : JSON.stringify(body), { status });
}
