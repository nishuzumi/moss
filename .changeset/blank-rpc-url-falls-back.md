---
"@themoss/core": patch
---

Treat a blank `MOSS_RPC_URL` as unset when resolving `DEFAULT_RPC_URL`. A workflow
that forwards an RPC endpoint from a secret sets the variable to an empty string
wherever that secret is unavailable — every fork pull request, since those receive
no secrets — and `??` forwarded the blank to viem, which rejected it with
`UrlRequiredError: No URL was provided to the Transport`.
