/**
 * Official Pendle Monad deployments from the immutable upstream manifest:
 * https://github.com/pendle-finance/pendle-core-v2-public/blob/6cd4773218e57dbda8925d10dfb672a0f594a9db/deployments/143-core.json
 *
 * The manifest identifies chain 143, marketFactoryV6, router, and routerStatic.
 * Live tests below this package boundary verify that each address has bytecode.
 * Market and SY addresses are dynamic protocol state, so they are discovered and validated rather than fixed here.
 */
export const PENDLE_MARKET_FACTORY_ADDRESS = "0xA3cb62a49b66eB2536cf6F3C7AC82293784888A3" as const;
export const PENDLE_ROUTER_ADDRESS = "0x888888888889758F76e7103c6CbF23ABbF58F946" as const;
export const PENDLE_ROUTER_STATIC_ADDRESS = "0x6813d43782395A1F2AAb42f39aeEDE03ac655e09" as const;
