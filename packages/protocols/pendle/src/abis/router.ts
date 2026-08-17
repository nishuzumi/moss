// ABI origin: vendored (ADR 0007)
//   source: @pendle/core-v2@6.8.1 (npm, dist-tags.latest)
//   tarball: sha256 733aaf24d5bb6dde1f257c7e8c03798a5443c8e6709a658273decd3108396cda
//   deployment: https://github.com/pendle-finance/pendle-core-v2-public/blob/6cd4773218e57dbda8925d10dfb672a0f594a9db/deployments/143-core.json
//   verification: the immutable manifest identifies chain 143 and Router V4;
//   live tests verify bytecode at the fixed Router address.
//   composed from the full generated artifacts in ./pendle.ts:
//   - build/artifacts/contracts/interfaces/IPAllActionV3.sol/IPAllActionV3.json
//   - build/artifacts/contracts/core/libraries/Errors.sol/Errors.json
//   This module adds no hand-authored ABI entries.
import { PendleErrorsAbi, PendleRouterAbi } from "./pendle.js";

/** The Router's callable/event interface plus the official custom errors its facets may return. */
export const PendleRouterContractAbi = [...PendleRouterAbi, ...PendleErrorsAbi] as const;
