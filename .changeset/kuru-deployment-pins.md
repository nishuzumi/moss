---
"@themoss/protocol-kuru": patch
---

Refresh the drifted Kuru Router deployment pins.

The Router proxy was upgraded on Monad mainnet, so the ERC-1967 implementation
and `orderBookImplementation()` template recorded in `abis.json` no longer
matched on chain and the scheduled ABI check failed. Both values were re-read
from the ERC-1967 slot and `orderBookImplementation()` on mainnet, and the
Moss-required surface was confirmed present in the new bytecode before updating
the pins and the verification record.
