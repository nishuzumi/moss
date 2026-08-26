---
"@themoss/protocol-pancakeswap": patch
---

Fix the V3 Receipt Outcome for a native-MON input swap. The parser derived `tokenIn` from the nativeTransfer leaf's `from`, so a native input reported the sender's own account as the input token in `outcome.tokenIn` and in the top-level Receipt text an Agent reads. It now reports the `NATIVE` sentinel, and `SwapOutcome.tokenIn` is a `TokenRef` so the Outcome can carry it. The nativeTransfer leaf, the ERC-20 input path and the exact Change identity, length and order are unchanged.
