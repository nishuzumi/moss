import type { Handle, ProtocolRef } from "@themoss/core";
import type { iMagmaAbi } from "../src/abis/magma.js";
import type { Magma } from "../src/magma.js";

const dependency = null as unknown as ProtocolRef<Magma>;

void dependency.totalAssets;
void dependency.coreVault;
void dependency.gVault;
void dependency.rewardsFee;
void dependency.withdrawalFee;

// @ts-expect-error Injected Protocol references expose methods, not contract Handles.
void dependency.magma;

function handleFixture(handle: Handle<typeof iMagmaAbi>) {
  void handle.read.totalAssets();
  void handle.read.coreVault();
  void handle.read.pendingRedeemRequest([1n, "0x1111111111111111111111111111111111111111"]);

  // @ts-expect-error ABI-typed Handles reject unknown contract functions.
  void handle.read.unknownMethod();

  // @ts-expect-error ABI-typed Handles reject invalid address arguments.
  void handle.read.pendingRedeemRequest([1n, "not-an-address"]);
}

void handleFixture;
