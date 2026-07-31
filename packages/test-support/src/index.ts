/**
 * The endpoint every live test reaches Monad mainnet through.
 *
 * Declared here, in a leaf package with no `@themoss` dependencies, because the
 * alternatives do not work: `@themoss/system` owns `DEFAULT_RPC_URL` but must
 * stay free of environment reads (a library takes its endpoint as a parameter;
 * only applications and tests consult the environment), and `@themoss/erc`
 * cannot depend on system at all, since system imports erc and even a dev-only
 * cycle breaks `pnpm -r build`.
 *
 * Monad's public endpoint rate-limits `debug_traceCall` at roughly thirty
 * sequential calls, which the live suites exceed when several of them share one
 * source address, so CI sets `MOSS_RPC_URL` to a private endpoint.
 */
export const TEST_RPC_URL = process.env.MOSS_RPC_URL ?? "https://rpc.monad.xyz";
