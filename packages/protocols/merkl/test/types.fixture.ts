import type { ActionCtx, AddressValue, ProtocolRef } from "@themoss/core";
import type { MerklClaimOutcome, MerklProtocol, MerklRewardsResult } from "../src/index.js";

declare const merkl: MerklProtocol;
declare const ctx: ActionCtx;
declare const dependency: ProtocolRef<MerklProtocol>;

const TOKEN = "0x3bd359C1119dA7Da1D913D1C4D2B7c461115433A" as const;
const ACCOUNT = "0x461549c73FFfB676860A0E49F5DaABEcf4E8D2d7" as const;

type RewardsParams = Parameters<MerklProtocol["rewards"]>[0];
type ClaimParams = Parameters<MerklProtocol["claim"]>[0];
type RewardsResult = Awaited<ReturnType<MerklProtocol["rewards"]>>;

const rewardsParams: RewardsParams = { account: ACCOUNT };
const claimParams: ClaimParams = { tokens: [TOKEN] };
merkl.rewards(rewardsParams) satisfies Promise<MerklRewardsResult>;
merkl.claim(claimParams, ctx);
merkl.claimReceipt([]).outcome satisfies MerklClaimOutcome;
dependency.claimReceipt([]).protocol satisfies string;

const result = null as unknown as RewardsResult;
result.account satisfies AddressValue;
result.rewards[0]?.token satisfies AddressValue | undefined;
result.rewards[0]?.claimableAmount satisfies string | undefined;

// @ts-expect-error Query account must be an EVM address.
void merkl.rewards({ account: "not-an-address" });
// @ts-expect-error Query account is required.
void merkl.rewards({});
// @ts-expect-error Claim token elements must be EVM addresses.
void merkl.claim({ tokens: [42] }, ctx);
// @ts-expect-error Claim tokens are required.
void merkl.claim({}, ctx);
// @ts-expect-error Acting user comes only from ActionCtx.
void merkl.claim({ tokens: [TOKEN], user: ACCOUNT }, ctx);
// @ts-expect-error Amounts are fetched and verified, never Agent input.
void merkl.claim({ tokens: [TOKEN], amount: "1" }, ctx);
// @ts-expect-error Proofs are fetched and verified, never Agent input.
void merkl.claim({ tokens: [TOKEN], proof: [] }, ctx);
// @ts-expect-error Recipient comes from on-chain state, never Agent input.
void merkl.claim({ tokens: [TOKEN], recipient: ACCOUNT }, ctx);
// @ts-expect-error Claim requires ActionCtx.
void merkl.claim({ tokens: [TOKEN] });
// @ts-expect-error Receipt outcome is not a rewards Query result.
merkl.claimReceipt([]).outcome satisfies MerklRewardsResult;
// @ts-expect-error Dependency references expose methods, not Handles.
void dependency.distributor;

void rewardsParams;
void claimParams;
