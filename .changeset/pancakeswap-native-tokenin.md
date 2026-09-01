---
"@themoss/protocol-pancakeswap": patch
---

Fix V3 native-input Receipt evidence. The root Outcome now reports the `NATIVE` sentinel instead of the sender account, and native movements delegate to the canonical transfer parser so structured leaf data reports a native transfer rather than an invented swap. The flattened leaf text now uses the canonical ERC transfer wording.
