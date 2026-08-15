---
"@themoss/core": patch
---

Bound the Receipt-side traversal in `framework.ts`. `flattenReceipt` and the
JSON check it runs on each `outcome` and `ReceiptChange` data now walk an
explicit stack against the shared `CAPABILITY_TREE_LIMITS` parameter budget,
cumulative across one whole Receipt tree, with a Receipt nesting bound beside
it. A deeply nested Receipt now fails with a typed `CapabilityTreeError` and a
tree path instead of an untyped `RangeError`, the same way the input side does
after #142. Change identity, length and order are unchanged.
