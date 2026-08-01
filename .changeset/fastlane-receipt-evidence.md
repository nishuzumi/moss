---
"@themoss/protocol-fastlane": patch
---

Authenticate the FastLane emitter before decoding Receipt evidence, and bind each native MON transfer to the event it settles. A validly encoded FastLane event from any other contract is no longer accepted, and `deposit`, `redeem` and `completeUnstake` now require the MON to move between the endpoints their events name rather than matching on amount alone.

`boostYield` now reads its outcome from the vault's `BoostYield` event instead of the shMON `Transfer` that settles it. The Receipt requires exactly one of each, requires the shares to be burned from the `BoostYield` sender and reports the credited yield originator, the validator and the MON the burn was worth. The Transfer-keyed parser named the burn address as the yield originator and delegated the `BoostYield` Change to the ERC-20 dependency, which failed every mainnet boostYield Receipt.
