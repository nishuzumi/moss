---
"@themoss/protocol-fastlane": patch
---

Authenticate the FastLane emitter before decoding Receipt evidence, and bind each native MON transfer to the event it settles. A validly encoded FastLane event from any other contract is no longer accepted, and `deposit`, `redeem` and `completeUnstake` now require the MON to move between the endpoints their events name rather than matching on amount alone.
